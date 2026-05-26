export type Difficulty = "foundation" | "medium" | "advanced";

export type MosDomain =
  | "manage-documents"
  | "insert-format-text"
  | "manage-tables-lists"
  | "create-manage-references"
  | "insert-format-graphic-elements"
  | "manage-collaboration";

export type QuestionType = "sequence" | "shortcut" | "multiple-choice" | "project-task";

export type Role = "student" | "admin";

export type User = {
  id: string;
  role: Role;
  name: string;
  email: string;
  passwordHash?: string;
  lastLoginAt: string;
};

export type Question = {
  id: string;
  domain: MosDomain;
  skillTags: string[];
  type: QuestionType;
  difficulty: Difficulty;
  title: string;
  prompt: string;
  options?: string[];
  expectedAnswer: string | string[];
  estimatedSeconds: number;
  points: number;
};

export type ExamBlueprint = {
  id: string;
  name: string;
  description?: string;
  lessonId?: string;
  totalQuestions: number;
  durationMinutes: number;
  mosScaleMin: number;
  mosScaleMax: number;
  questionTypes?: QuestionType[];
  domainMatrix: Array<{
    domain: MosDomain;
    percent: number;
    difficulties: Difficulty[];
  }>;
};

export type ExamAttempt = {
  id: string;
  studentId: string;
  blueprintId: string;
  questionIds: string[];
  startedAt: string;
  submittedAt?: string;
  answers: AttemptAnswer[];
  rawScore: number;
  mosScore: number;
};

export type AttemptAnswer = {
  questionId: string;
  answer: string | string[];
  elapsedSeconds: number;
  isCorrect: boolean;
};

export type Mastery = {
  studentId: string;
  skillTag: string;
  attempts: number;
  correct: number;
  avgSeconds: number;
  masteryPercent: number;
  lastPracticedAt: string;
};
