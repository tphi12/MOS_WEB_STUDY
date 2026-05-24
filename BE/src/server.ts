import cors from "cors";
import express from "express";
import { z } from "zod";
import { collections, connectDb, withoutMongoId } from "./db.js";
import { getAdminOverview, getStudentAnalytics, getStudentPersonalization } from "./services/analytics.js";
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

app.use(cors());
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ ok: true, service: "mos-word-education-api" });
});

app.get("/api/users", async (_request, response) => {
  response.json(await collections().users.find({}, withoutMongoId<User>()).toArray());
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
  estimatedSeconds: z.number().int().positive(),
  points: z.number().int().positive(),
});

const blueprintSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  totalQuestions: z.number().int().positive(),
  durationMinutes: z.number().int().positive(),
  mosScaleMin: z.number().int(),
  mosScaleMax: z.number().int(),
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
