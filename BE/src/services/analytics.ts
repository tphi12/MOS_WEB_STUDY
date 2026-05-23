import { attempts, blueprints, questions, users } from "../seed.js";
import type { AttemptAnswer, ExamAttempt, Mastery, MosDomain, Question } from "../types.js";

export function getStudentAnalytics(studentId: string) {
  const studentAttempts = attempts.filter((attempt) => attempt.studentId === studentId && attempt.submittedAt);
  const mastery = buildMastery(studentId, studentAttempts);
  const domainMastery = buildDomainMastery(studentAttempts);
  const recommendations = buildRecommendations(mastery);
  const latestAttempt = [...studentAttempts].sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];

  return {
    student: users.find((user) => user.id === studentId),
    summary: {
      attempts: studentAttempts.length,
      averageMosScore: average(studentAttempts.map((attempt) => attempt.mosScore)),
      bestMosScore: Math.max(0, ...studentAttempts.map((attempt) => attempt.mosScore)),
      latestMosScore: latestAttempt?.mosScore ?? 0,
      passReady: (latestAttempt?.mosScore ?? 0) >= 700,
    },
    domainMastery,
    skillMastery: mastery,
    recommendations,
  };
}

export function getStudentPersonalization(studentId: string) {
  const analytics = getStudentAnalytics(studentId);
  const weakSkills = analytics.skillMastery.filter((skill) => skill.masteryPercent < 70).slice(0, 3);
  const nextFocus = weakSkills[0]?.skillTag ?? "page-setup";
  const recommendedLessonId = mapSkillToLesson(nextFocus);

  return {
    student: analytics.student,
    readiness: analytics.summary.passReady ? "exam-ready" : "needs-practice",
    mosScore: analytics.summary.latestMosScore,
    recommendedLessonId,
    reason:
      weakSkills.length > 0
        ? `Hệ thống phát hiện kỹ năng ${nextFocus} còn yếu, nên ưu tiên ôn lại bài liên quan trước khi làm đề tiếp.`
        : "Kết quả hiện tại ổn, nên tiếp tục bài kế tiếp và làm thêm đề động để giữ nhịp luyện tập.",
    weakSkills,
    recommendations: analytics.recommendations,
    learningRules: [
      "Hoàn thành checklist bài học để mở khóa khuyến nghị tiếp theo.",
      "Nếu trắc nghiệm dưới 80%, hệ thống giữ học viên ở bài hiện tại để ôn lại.",
      "Nếu một skill tag sai nhiều lần, lộ trình ưu tiên bài học liên quan skill đó.",
    ],
  };
}

export function getAdminOverview() {
  const submittedAttempts = attempts.filter((attempt) => attempt.submittedAt);
  return {
    totals: {
      students: users.filter((user) => user.role === "student").length,
      questions: questions.length,
      blueprints: blueprints.length,
      attempts: submittedAttempts.length,
    },
    examQuality: {
      averageMosScore: average(submittedAttempts.map((attempt) => attempt.mosScore)),
      passRate: percent(submittedAttempts.filter((attempt) => attempt.mosScore >= 700).length, submittedAttempts.length),
      averageDurationMinutes: average(
        submittedAttempts.map((attempt) =>
          Math.round(attempt.answers.reduce((sum, answer) => sum + answer.elapsedSeconds, 0) / 60),
        ),
      ),
    },
    weakestSkills: getWeakestSkills(submittedAttempts).slice(0, 6),
    hardestQuestions: getHardestQuestions(submittedAttempts).slice(0, 6),
    retentionAlerts: getRetentionAlerts(),
  };
}

function buildMastery(studentId: string, studentAttempts: ExamAttempt[]): Mastery[] {
  const buckets = new Map<string, { attempts: number; correct: number; seconds: number; lastPracticedAt: string }>();
  const questionMap = new Map(questions.map((question) => [question.id, question]));

  for (const attempt of studentAttempts) {
    for (const answer of attempt.answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;
      for (const skillTag of question.skillTags) {
        const current = buckets.get(skillTag) ?? { attempts: 0, correct: 0, seconds: 0, lastPracticedAt: attempt.submittedAt ?? attempt.startedAt };
        current.attempts += 1;
        current.correct += answer.isCorrect ? 1 : 0;
        current.seconds += answer.elapsedSeconds;
        current.lastPracticedAt = attempt.submittedAt ?? attempt.startedAt;
        buckets.set(skillTag, current);
      }
    }
  }

  return [...buckets.entries()]
    .map(([skillTag, bucket]) => ({
      studentId,
      skillTag,
      attempts: bucket.attempts,
      correct: bucket.correct,
      avgSeconds: Math.round(bucket.seconds / bucket.attempts),
      masteryPercent: percent(bucket.correct, bucket.attempts),
      lastPracticedAt: bucket.lastPracticedAt,
    }))
    .sort((a, b) => a.masteryPercent - b.masteryPercent);
}

function buildDomainMastery(studentAttempts: ExamAttempt[]) {
  const buckets = new Map<MosDomain, { attempts: number; correct: number }>();
  const questionMap = new Map(questions.map((question) => [question.id, question]));

  for (const attempt of studentAttempts) {
    for (const answer of attempt.answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;
      const current = buckets.get(question.domain) ?? { attempts: 0, correct: 0 };
      current.attempts += 1;
      current.correct += answer.isCorrect ? 1 : 0;
      buckets.set(question.domain, current);
    }
  }

  return [...buckets.entries()].map(([domain, bucket]) => ({
    domain,
    masteryPercent: percent(bucket.correct, bucket.attempts),
    attempts: bucket.attempts,
  }));
}

function buildRecommendations(mastery: Mastery[]) {
  const weakSkills = mastery.filter((item) => item.masteryPercent < 70).slice(0, 3);
  if (weakSkills.length === 0) {
    return [
      {
        priority: "maintenance",
        message: "Bạn đang đạt mức ổn. Hãy làm thêm đề thi động để giữ tốc độ và độ chính xác.",
        skillTags: [],
      },
    ];
  }

  return weakSkills.map((skill) => ({
    priority: skill.masteryPercent < 50 ? "urgent" : "practice",
    message: `Kỹ năng ${skill.skillTag} đang ở ${skill.masteryPercent}%. Nên ôn lại lesson liên quan và làm thêm 5 câu tagged ${skill.skillTag}.`,
    skillTags: [skill.skillTag],
  }));
}

function mapSkillToLesson(skillTag: string) {
  const map: Record<string, string> = {
    layout: "page-setup-document-properties",
    "page-setup": "page-setup-document-properties",
    "print-preview": "page-setup-document-properties",
    paragraph: "normal-style-paragraph",
    "normal-style": "normal-style-paragraph",
    "line-spacing": "normal-style-paragraph",
    table: "academic-forms-appendix-export",
    "form-layout": "academic-forms-appendix-export",
    heading: "heading-toc-navigation",
    toc: "heading-toc-navigation",
    "field-update": "heading-toc-navigation",
    caption: "objects-captions-citations",
    "cross-reference": "objects-captions-citations",
    "wrap-text": "objects-captions-citations",
    "mail-merge": "mail-merge",
    "data-source": "mail-merge",
    "preview-results": "mail-merge",
    "track-changes": "review-protect-compare",
    comments: "review-protect-compare",
    "protect-document": "review-protect-compare",
  };

  return map[skillTag] ?? "page-setup-document-properties";
}

function getWeakestSkills(submittedAttempts: ExamAttempt[]) {
  const allMastery = buildMastery("all", submittedAttempts);
  return allMastery.map(({ skillTag, masteryPercent, attempts, avgSeconds }) => ({
    skillTag,
    masteryPercent,
    attempts,
    avgSeconds,
  }));
}

function getHardestQuestions(submittedAttempts: ExamAttempt[]) {
  const buckets = new Map<string, { question: Question; answers: AttemptAnswer[] }>();
  const questionMap = new Map(questions.map((question) => [question.id, question]));

  for (const attempt of submittedAttempts) {
    for (const answer of attempt.answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;
      const current = buckets.get(question.id) ?? { question, answers: [] };
      current.answers.push(answer);
      buckets.set(question.id, current);
    }
  }

  return [...buckets.values()]
    .map(({ question, answers }) => ({
      questionId: question.id,
      title: question.title,
      domain: question.domain,
      wrongRate: 100 - percent(answers.filter((answer) => answer.isCorrect).length, answers.length),
      averageSeconds: average(answers.map((answer) => answer.elapsedSeconds)),
      attempts: answers.length,
    }))
    .sort((a, b) => b.wrongRate - a.wrongRate);
}

function getRetentionAlerts() {
  const students = users.filter((user) => user.role === "student");
  return students
    .map((student) => {
      const studentAttempts = attempts.filter((attempt) => attempt.studentId === student.id && attempt.submittedAt);
      const latestAttempts = [...studentAttempts].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 3);
      const inactiveDays = Math.floor((Date.now() - new Date(student.lastLoginAt).getTime()) / 86400000);
      const lowScoreStreak = latestAttempts.length >= 2 && latestAttempts.every((attempt) => attempt.mosScore < 500);
      return {
        studentId: student.id,
        name: student.name,
        inactiveDays,
        lowScoreStreak,
        alert:
          inactiveDays >= 7
            ? "Không đăng nhập từ 7 ngày trở lên"
            : lowScoreStreak
              ? "Nhiều lần thi thử dưới 500 điểm"
              : "",
      };
    })
    .filter((item) => item.alert);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function percent(part: number, total: number) {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}
