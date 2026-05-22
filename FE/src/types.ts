export type LessonGroup = "research" | "admin" | "advanced";

export type Lesson = {
  id: string;
  group: LessonGroup;
  title: string;
  subtitle: string;
  minutes: number;
  difficulty: "Nền tảng" | "Cần luyện" | "Nâng cao";
  outcome: string;
  checkpoints: string[];
  steps: string[];
  tips: string[];
  mistakes: string[];
  quickCommands: { label: string; value: string; note: string }[];
  miniQuiz: { question: string; answer: string }[];
  examples: {
    title: string;
    brief: string;
    sample: string;
    expected: string[];
  }[];
  exercises: {
    title: string;
    prompt: string;
    tasks: string[];
    selfCheck: string[];
  }[];
};

export type Shortcut = {
  keys: string;
  action: string;
  category: "Định dạng" | "Di chuyển" | "Tài liệu" | "Nâng cao";
};

export type CommonError = {
  title: string;
  symptoms: string;
  fix: string;
  tags: string[];
};
