import "dotenv/config";
import cors from "cors";
import { randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import express from "express";
import { z } from "zod";
import { collections, connectDb, withoutMongoId } from "./db.js";
import { getAdminOverview, getStudentAnalytics, getStudentPersonalization } from "./services/analytics.js";
import { askMosAssistant } from "./services/mosAssistant.js";
import {
  createExamBlueprint,
  createQuestion,
  generateExamAttempt,
  getAttemptWithQuestions,
  listExamBlueprints,
  listSafeQuestionBank,
  submitAttempt,
} from "./services/examEngine.js";
import type { ExamBlueprint, Question, User } from "./types.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const chatRateLimit = new Map<string, { count: number; resetAt: number }>();

app.use(cors());
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ ok: true, service: "mos-word-education-api" });
});

app.get("/api/users", async (_request, response) => {
  response.json(await collections().users.find({}, withoutMongoId<User>()).toArray());
});

app.post("/api/auth/register", async (request, response) => {
  const parsed = authRegisterSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });

  const email = parsed.data.email.toLowerCase();
  const existing = await collections().users.findOne({ email });
  if (existing) return response.status(409).json({ error: "Email already exists" });

  const user: User = {
    id: `u-${randomUUID()}`,
    role: "student",
    name: parsed.data.name,
    email,
    passwordHash: hashPassword(parsed.data.password),
    lastLoginAt: new Date().toISOString(),
  };

  await collections().users.insertOne(user);
  response.status(201).json(toSafeUser(user));
});

app.post("/api/auth/login", async (request, response) => {
  const parsed = authLoginSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });

  const email = parsed.data.email.toLowerCase();
  const user = await collections().users.findOne({ email }, withoutMongoId<User>());
  if (!user?.passwordHash || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return response.status(401).json({ error: "Invalid email or password" });
  }

  await collections().users.updateOne({ id: user.id }, { $set: { lastLoginAt: new Date().toISOString() } });
  response.json(toSafeUser({ ...user, lastLoginAt: new Date().toISOString() }));
});

app.get("/api/questions", async (request, response) => {
  response.json(
    await listSafeQuestionBank({
      domain: asString(request.query.domain),
      difficulty: asString(request.query.difficulty),
      skillTag: asString(request.query.skillTag),
    }),
  );
});

app.post("/api/questions", async (request, response) => {
  const parsed = questionSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });
  try {
    response.status(201).json(await createQuestion(parsed.data));
  } catch (error) {
    response.status(409).json({ error: getErrorMessage(error) });
  }
});

app.get("/api/exam-blueprints", async (_request, response) => {
  response.json(await listExamBlueprints());
});

app.post("/api/exam-blueprints", async (request, response) => {
  const parsed = blueprintSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });
  try {
    response.status(201).json(await createExamBlueprint(parsed.data));
  } catch (error) {
    response.status(409).json({ error: getErrorMessage(error) });
  }
});

app.post("/api/exam-blueprints/:blueprintId/start", async (request, response) => {
  const parsed = z.object({ studentId: z.string().min(1) }).safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });
  try {
    response.status(201).json(await generateExamAttempt(parsed.data.studentId, request.params.blueprintId));
  } catch (error) {
    response.status(404).json({ error: getErrorMessage(error) });
  }
});

app.get("/api/attempts/:attemptId", async (request, response) => {
  try {
    response.json(await getAttemptWithQuestions(request.params.attemptId));
  } catch (error) {
    response.status(404).json({ error: getErrorMessage(error) });
  }
});

app.post("/api/attempts/:attemptId/submit", async (request, response) => {
  const parsed = z.object({ answers: z.array(answerSchema) }).safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });
  try {
    response.json(await submitAttempt(request.params.attemptId, parsed.data.answers));
  } catch (error) {
    response.status(400).json({ error: getErrorMessage(error) });
  }
});

app.get("/api/students/:studentId/analytics", async (request, response) => {
  try {
    response.json(await getStudentAnalytics(request.params.studentId));
  } catch (error) {
    response.status(404).json({ error: getErrorMessage(error) });
  }
});

app.get("/api/students/:studentId/personalization", async (request, response) => {
  try {
    response.json(await getStudentPersonalization(request.params.studentId));
  } catch (error) {
    response.status(404).json({ error: getErrorMessage(error) });
  }
});

app.get("/api/admin/overview", async (_request, response) => {
  response.json(await getAdminOverview());
});

app.post("/api/assistant/chat", async (request, response) => {
  const parsed = assistantChatSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });

  const rateKey = parsed.data.context?.studentId ?? request.ip ?? "anonymous";
  if (!allowChat(rateKey)) return response.status(429).json({ error: "Bạn hỏi hơi nhanh. Hãy chờ một chút rồi thử lại." });

  try {
    response.json(await askMosAssistant(parsed.data));
  } catch (error) {
    response.status(502).json({
      error: "Trợ lý AI đang bận. Hãy thử lại sau.",
      detail: process.env.NODE_ENV === "production" ? undefined : getErrorMessage(error),
    });
  }
});

app.get("/api/meta", async (_request, response) => {
  const [questionCount, blueprintCount] = await Promise.all([
    collections().questions.countDocuments(),
    collections().blueprints.countDocuments(),
  ]);
  response.json({
    domains: [
      "manage-documents",
      "insert-format-text",
      "manage-tables-lists",
      "create-manage-references",
      "insert-format-graphic-elements",
      "manage-collaboration",
    ],
    difficulties: ["foundation", "medium", "advanced"],
    questionTypes: ["sequence", "shortcut", "multiple-choice", "project-task"],
    questionCount,
    blueprintCount,
  });
});

await connectDb();

app.listen(port, () => {
  console.log(`MOS education API running on http://localhost:${port}`);
});

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function hashPassword(password: string) {
  const salt = randomUUID();
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, passwordHash: string) {
  const [salt, stored] = passwordHash.split(":");
  if (!salt || !stored) return false;
  const hash = scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(stored, "hex");
  return storedBuffer.length === hash.length && timingSafeEqual(storedBuffer, hash);
}

function toSafeUser(user: User) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function allowChat(key: string) {
  const nowMs = Date.now();
  const current = chatRateLimit.get(key);
  if (!current || current.resetAt < nowMs) {
    chatRateLimit.set(key, { count: 1, resetAt: nowMs + 60_000 });
    return true;
  }
  if (current.count >= 20) return false;
  current.count += 1;
  return true;
}

const authRegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const authLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const difficultySchema = z.enum(["foundation", "medium", "advanced"]);
const domainSchema = z.enum([
  "manage-documents",
  "insert-format-text",
  "manage-tables-lists",
  "create-manage-references",
  "insert-format-graphic-elements",
  "manage-collaboration",
]);

const questionSchema = z.object({
  id: z.string().min(1),
  domain: domainSchema,
  skillTags: z.array(z.string().min(1)).min(1),
  type: z.enum(["sequence", "shortcut", "multiple-choice", "project-task"]),
  difficulty: difficultySchema,
  title: z.string().min(1),
  prompt: z.string().min(1),
  expectedAnswer: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
  options: z.array(z.string().min(1)).min(2).optional(),
  estimatedSeconds: z.number().int().positive(),
  points: z.number().int().positive(),
});

const blueprintSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  lessonId: z.string().min(1).optional(),
  totalQuestions: z.number().int().positive(),
  durationMinutes: z.number().int().positive(),
  mosScaleMin: z.number().int(),
  mosScaleMax: z.number().int(),
  questionTypes: z.array(z.enum(["sequence", "shortcut", "multiple-choice", "project-task"])).min(1).optional(),
  domainMatrix: z.array(
    z.object({
      domain: domainSchema,
      percent: z.number().int().positive(),
      difficulties: z.array(difficultySchema).min(1),
    }),
  ),
});

const answerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.union([z.string(), z.array(z.string())]),
  elapsedSeconds: z.number().int().nonnegative(),
});

const chatTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().min(1).max(2000),
});

const assistantChatSchema = z.object({
  message: z.string().min(1).max(1200),
  history: z.array(chatTurnSchema).max(12).optional(),
  context: z
    .object({
      route: z.string().max(120).optional(),
      lessonTitle: z.string().max(200).optional(),
      lessonSubtitle: z.string().max(300).optional(),
      activeTestName: z.string().max(200).optional(),
      selectedQuestion: z.string().max(600).optional(),
      includePageContext: z.boolean().optional(),
      studentId: z.string().max(120).optional(),
    })
    .optional(),
});
