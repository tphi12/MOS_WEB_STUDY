import { collections, withoutMongoId } from "../db.js";
import type { LessonProgress } from "../types.js";

export async function listLessonProgress(studentId: string) {
  return collections()
    .lessonProgress.find({ studentId }, withoutMongoId<LessonProgress>())
    .sort({ updatedAt: -1 })
    .toArray();
}

export async function saveLessonProgress(input: {
  studentId: string;
  lessonId: string;
  title: string;
  checkedStepIndexes: number[];
  quizAnswers: Record<string, string>;
  totalSteps: number;
  totalLessons: number;
  totalQuizQuestions: number;
  correctQuizCount: number;
}) {
  const student = await collections().users.findOne({ id: input.studentId, role: "student" });
  if (!student) throw new Error("Student not found");

  const checkedStepIndexes = [...new Set(input.checkedStepIndexes)]
    .filter((index) => index >= 0 && index < input.totalSteps)
    .sort((a, b) => a - b);
  const checklistPercent = percent(checkedStepIndexes.length, input.totalSteps);
  const quizPercent = percent(Math.min(input.correctQuizCount, input.totalQuizQuestions), input.totalQuizQuestions);
  const progress: LessonProgress = {
    ...input,
    checkedStepIndexes,
    checklistPercent,
    quizPercent,
    scorePercent: Math.round((checklistPercent + quizPercent) / 2),
    completed: checklistPercent >= 80 && quizPercent >= 80,
    updatedAt: new Date().toISOString(),
  };

  await collections().lessonProgress.replaceOne(
    { studentId: input.studentId, lessonId: input.lessonId },
    progress,
    { upsert: true },
  );
  return progress;
}

function percent(part: number, total: number) {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}
