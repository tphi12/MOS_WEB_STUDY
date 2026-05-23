import { attempts, blueprints, questions } from "../seed.js";
import type { AttemptAnswer, ExamAttempt, ExamBlueprint, Question } from "../types.js";

export function listQuestionBank(filters: { domain?: string; difficulty?: string; skillTag?: string }) {
  return questions.filter((question) => {
    if (filters.domain && question.domain !== filters.domain) return false;
    if (filters.difficulty && question.difficulty !== filters.difficulty) return false;
    if (filters.skillTag && !question.skillTags.includes(filters.skillTag)) return false;
    return true;
  });
}

export function createQuestion(question: Question) {
  if (questions.some((item) => item.id === question.id)) throw new Error("Question id already exists");
  questions.push(question);
  return question;
}

export function createExamBlueprint(blueprint: ExamBlueprint) {
  if (blueprints.some((item) => item.id === blueprint.id)) throw new Error("Blueprint id already exists");
  const totalPercent = blueprint.domainMatrix.reduce((sum, row) => sum + row.percent, 0);
  if (totalPercent !== 100) throw new Error("Blueprint matrix percent must equal 100");
  blueprints.push(blueprint);
  return blueprint;
}

export function listExamBlueprints() {
  return blueprints;
}

export function generateExamAttempt(studentId: string, blueprintId: string) {
  const blueprint = getBlueprint(blueprintId);
  const selected = selectQuestionsByMatrix(blueprint);
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

  attempts.push(attempt);

  return {
    attempt,
    questions: selected.map(maskQuestionAnswer),
  };
}

export function submitAttempt(attemptId: string, submittedAnswers: Array<Omit<AttemptAnswer, "isCorrect">>) {
  const attempt = attempts.find((item) => item.id === attemptId);
  if (!attempt) throw new Error("Attempt not found");
  if (attempt.submittedAt) throw new Error("Attempt already submitted");

  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const checkedAnswers = submittedAnswers
    .filter((answer) => attempt.questionIds.includes(answer.questionId))
    .map((answer) => {
      const question = questionMap.get(answer.questionId);
      if (!question) throw new Error(`Question ${answer.questionId} not found`);
      return {
        ...answer,
        isCorrect: isAnswerCorrect(question, answer.answer),
      };
    });

  attempt.answers = checkedAnswers;
  attempt.submittedAt = new Date().toISOString();
  attempt.rawScore = checkedAnswers.reduce((total, answer) => {
    const question = questionMap.get(answer.questionId);
    return total + (answer.isCorrect ? question?.points ?? 0 : 0);
  }, 0);
  attempt.mosScore = convertToMosScore(attempt);

  return attempt;
}

export function getAttemptWithQuestions(attemptId: string) {
  const attempt = attempts.find((item) => item.id === attemptId);
  if (!attempt) throw new Error("Attempt not found");
  return {
    attempt,
    questions: attempt.questionIds.map((questionId) => questions.find((question) => question.id === questionId)).filter(Boolean),
  };
}

export function getBlueprint(blueprintId: string) {
  const blueprint = blueprints.find((item) => item.id === blueprintId);
  if (!blueprint) throw new Error("Exam blueprint not found");
  return blueprint;
}

function selectQuestionsByMatrix(blueprint: ExamBlueprint) {
  const selected: Question[] = [];
  const selectedIds = new Set<string>();

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

function convertToMosScore(attempt: ExamAttempt) {
  const blueprint = getBlueprint(attempt.blueprintId);
  const totalPoints = attempt.questionIds.reduce((total, questionId) => {
    const question = questions.find((item) => item.id === questionId);
    return total + (question?.points ?? 0);
  }, 0);
  const ratio = totalPoints === 0 ? 0 : attempt.rawScore / totalPoints;
  return Math.round(blueprint.mosScaleMin + ratio * (blueprint.mosScaleMax - blueprint.mosScaleMin));
}

function maskQuestionAnswer(question: Question) {
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
