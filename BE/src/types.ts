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
  createdAt?: string;
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

export type LessonProgress = {
  studentId: string;
  lessonId: string;
  title: string;
  checkedStepIndexes: number[];
  quizAnswers: Record<string, string>;
  totalSteps: number;
  totalLessons: number;
  totalQuizQuestions: number;
  correctQuizCount: number;
  checklistPercent: number;
  quizPercent: number;
  scorePercent: number;
  completed: boolean;
  updatedAt: string;
};

export type PracticalCheckType =
  | "contains"
  | "heading"
  | "bold"
  | "table"
  | "list"
  | "heading-text"
  | "bold-text"
  | "list-contains"
  | "table-contains"
  | "office-body-contains"
  | "office-body-not-contains"
  | "office-bold-text"
  | "office-heading-text"
  | "office-table-contains"
  | "office-font-name"
  | "office-font-size"
  | "office-line-spacing"
  | "office-alignment"
  | "office-first-line-indent"
  | "office-spacing-zero"
  | "office-no-leading-spaces"
  | "office-image-count"
  | "office-ooxml-contains"
  | "office-alignment-text";

export type OfficeDocumentSnapshot = {
  bodyText: string;
  paragraphs: Array<{
    text: string;
    style: string;
    bold: boolean | null;
    fontName?: string;
    fontSize?: number;
    alignment?: string;
    lineSpacing?: number;
    firstLineIndent?: number;
    spaceBefore?: number;
    spaceAfter?: number;
  }>;
  tables: string[];
  inlinePictureCount?: number;
  ooxml?: string;
};

export type PracticalTest = {
  id: string;
  title: string;
  description: string;
  lessonId?: string;
  deliveryMode?: "simulation" | "office-addin";
  durationMinutes: number;
  initialContent: string;
  tasks: Array<{
    id: string;
    title: string;
    instruction: string;
    checks: Array<{
      id: string;
      label: string;
      type: PracticalCheckType;
      value?: string;
      points: number;
    }>;
  }>;
};

export type PracticalAttempt = {
  id: string;
  studentId: string;
  practicalTestId: string;
  startedAt: string;
  submittedAt?: string;
  content: string;
  officeSnapshot?: OfficeDocumentSnapshot;
  score: number;
  checkResults: Array<{
    checkId: string;
    taskId: string;
    label: string;
    points: number;
    earnedPoints: number;
    passed: boolean;
  }>;
};
