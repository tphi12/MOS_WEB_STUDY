import { collections, withoutMongoId } from "../db.js";
import type { AttemptAnswer, ExamAttempt, ExamBlueprint, Question } from "../types.js";

export type SafeQuestion = Omit<Question, "expectedAnswer">;

export async function listQuestionBank(filters: { domain?: string; difficulty?: string; skillTag?: string }) {
  const query: Record<string, unknown> = {};
  if (filters.domain) query.domain = filters.domain;
  if (filters.difficulty) query.difficulty = filters.difficulty;
  if (filters.skillTag) query.skillTags = filters.skillTag;

  return collections().questions.find(query, withoutMongoId<Question>()).toArray();
}

export async function listSafeQuestionBank(filters: { domain?: string; difficulty?: string; skillTag?: string }) {
  const questions = await listQuestionBank(filters);
  return questions.map(maskQuestionAnswer);
}

export async function createQuestion(question: Question) {
  const existing = await collections().questions.findOne({ id: question.id });
  if (existing) throw new Error("Question id already exists");
  await collections().questions.insertOne(question);
  return question;
}

export async function createExamBlueprint(blueprint: ExamBlueprint) {
  const existing = await collections().blueprints.findOne({ id: blueprint.id });
  if (existing) throw new Error("Blueprint id already exists");
  const totalPercent = blueprint.domainMatrix.reduce((sum, row) => sum + row.percent, 0);
  if (totalPercent !== 100) throw new Error("Blueprint matrix percent must equal 100");
  await collections().blueprints.insertOne(blueprint);
  return blueprint;
}

export async function listExamBlueprints() {
  return collections().blueprints.find({}, withoutMongoId<ExamBlueprint>()).toArray();
}

export async function generateExamAttempt(studentId: string, blueprintId: string) {
  const student = await collections().users.findOne({ id: studentId, role: "student" });
  if (!student) throw new Error("Student not found");

  const blueprint = await getBlueprint(blueprintId);
  const selected = await selectQuestionsByMatrix(blueprint);
  const attempt: ExamAttempt = {
    id: `attempt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    studentId,
    blueprintId,
    questionIds: selected.map((question) => question.id),
    startedAt: new Date().toISOString(),
    answers: [],
    rawScore: 0,
    mosScore: blueprint.mosScaleMin,
  };

  await collections().attempts.insertOne(attempt);

  return {
    attempt,
    questions: selected.map(maskQuestionAnswer),
  };
}

export async function submitAttempt(attemptId: string, submittedAnswers: Array<Omit<AttemptAnswer, "isCorrect">>) {
  const attempt = await collections().attempts.findOne({ id: attemptId }, withoutMongoId<ExamAttempt>());
  if (!attempt) throw new Error("Attempt not found");
  if (attempt.submittedAt) throw new Error("Attempt already submitted");

  const duplicateQuestionId = findDuplicate(submittedAnswers.map((answer) => answer.questionId));
  if (duplicateQuestionId) throw new Error(`Duplicate answer for question ${duplicateQuestionId}`);

  const unknownQuestionId = submittedAnswers.find((answer) => !attempt.questionIds.includes(answer.questionId))?.questionId;
  if (unknownQuestionId) throw new Error(`Question ${unknownQuestionId} does not belong to this attempt`);

  const questions = (await collections()
    .questions.find({ id: { $in: attempt.questionIds } }, withoutMongoId<Question>())
    .toArray()) as Question[];
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const submittedMap = new Map(submittedAnswers.map((answer) => [answer.questionId, answer]));

  const checkedAnswers = attempt.questionIds.map((questionId) => {
    const question = questionMap.get(questionId);
    if (!question) throw new Error(`Question ${questionId} not found`);
    const submittedAnswer = submittedMap.get(questionId);
    const answer = submittedAnswer?.answer ?? (Array.isArray(question.expectedAnswer) ? [] : "");
    return {
      questionId,
      answer,
      elapsedSeconds: submittedAnswer?.elapsedSeconds ?? 0,
      isCorrect: isAnswerCorrect(question, answer),
    };
  });

  attempt.answers = checkedAnswers;
  attempt.submittedAt = new Date().toISOString();
  attempt.rawScore = checkedAnswers.reduce((total, answer) => {
    const question = questionMap.get(answer.questionId);
    return total + (answer.isCorrect ? question?.points ?? 0 : 0);
  }, 0);
  attempt.mosScore = await convertToMosScore(attempt);

  await collections().attempts.updateOne(
    { id: attempt.id },
    {
      $set: {
        answers: attempt.answers,
        submittedAt: attempt.submittedAt,
        rawScore: attempt.rawScore,
        mosScore: attempt.mosScore,
      },
    },
  );

  return attempt;
}

export async function getAttemptWithQuestions(attemptId: string) {
  const attempt = await collections().attempts.findOne({ id: attemptId }, withoutMongoId<ExamAttempt>());
  if (!attempt) throw new Error("Attempt not found");
  const questions = (await collections()
    .questions.find({ id: { $in: attempt.questionIds } }, withoutMongoId<Question>())
    .toArray()) as Question[];
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  return {
    attempt,
    questions: attempt.questionIds
      .map((questionId) => questionMap.get(questionId))
      .filter((question): question is Question => Boolean(question))
      .map(maskQuestionAnswer),
  };
}

export async function getBlueprint(blueprintId: string) {
  const blueprint = await collections().blueprints.findOne({ id: blueprintId }, withoutMongoId<ExamBlueprint>());
  if (!blueprint) throw new Error("Exam blueprint not found");
  return blueprint;
}

async function selectQuestionsByMatrix(blueprint: ExamBlueprint) {
  const selected: Question[] = [];
  const selectedIds = new Set<string>();
  const questions = await collections().questions.find({}, withoutMongoId<Question>()).toArray();

  for (const row of blueprint.domainMatrix) {
    const count = Math.max(1, Math.round((row.percent / 100) * blueprint.totalQuestions));
    const pool = questions.filter(
      (question) =>
        question.domain === row.domain && row.difficulties.includes(question.difficulty) && !selectedIds.has(question.id),
    );
    for (const question of shuffle(pool).slice(0, count)) {
      selected.push(question);
      selectedIds.add(question.id);
    }
  }

  if (selected.length < blueprint.totalQuestions) {
    const fallback = shuffle(questions.filter((question) => !selectedIds.has(question.id)));
    for (const question of fallback.slice(0, blueprint.totalQuestions - selected.length)) {
      selected.push(question);
      selectedIds.add(question.id);
    }
  }

  return shuffle(selected).slice(0, blueprint.totalQuestions);
}

function isAnswerCorrect(question: Question, answer: string | string[]) {
  if (Array.isArray(question.expectedAnswer)) {
    return Array.isArray(answer) && normalizeList(answer).join("|") === normalizeList(question.expectedAnswer).join("|");
  }

  return typeof answer === "string" && normalize(answer) === normalize(question.expectedAnswer);
}

async function convertToMosScore(attempt: ExamAttempt) {
  const blueprint = await getBlueprint(attempt.blueprintId);
  const questions = await collections()
    .questions.find({ id: { $in: attempt.questionIds } }, withoutMongoId<Question>())
    .toArray();
  const totalPoints = attempt.questionIds.reduce((total, questionId) => {
    const question = questions.find((item) => item.id === questionId);
    return total + (question?.points ?? 0);
  }, 0);
  const ratio = totalPoints === 0 ? 0 : attempt.rawScore / totalPoints;
  return Math.round(blueprint.mosScaleMin + ratio * (blueprint.mosScaleMax - blueprint.mosScaleMin));
}

export function maskQuestionAnswer(question: Question): SafeQuestion {
  const { expectedAnswer, ...safeQuestion } = question;
  return safeQuestion;
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeList(values: string[]) {
  return values.map(normalize);
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function findDuplicate(values: string[]) {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return undefined;
}
