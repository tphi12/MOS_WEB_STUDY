import { collections, withoutMongoId } from "../db.js";
import type { AttemptAnswer, ExamAttempt, Mastery, MosDomain, PracticalAttempt, PracticalTest, Question, User } from "../types.js";

export async function getStudentAnalytics(studentId: string) {
  const [student, studentAttempts, practicalAttempts, practicalTests, questions] = await Promise.all([
    collections().users.findOne({ id: studentId }, withoutMongoId<User>()),
    collections()
      .attempts.find({ studentId, submittedAt: { $exists: true } }, withoutMongoId<ExamAttempt>())
      .toArray(),
    collections()
      .practicalAttempts.find({ studentId, submittedAt: { $exists: true } }, withoutMongoId<PracticalAttempt>())
      .toArray(),
    collections().practicalTests.find({}, withoutMongoId<PracticalTest>()).toArray(),
    collections().questions.find({}, withoutMongoId<Question>()).toArray(),
  ]);

  const practicalTestIds = new Set(practicalTests.map((test) => test.id));
  const activePracticalAttempts = practicalAttempts.filter((attempt) => practicalTestIds.has(attempt.practicalTestId));
  const mastery = buildMastery(studentId, studentAttempts, questions, activePracticalAttempts, practicalTests);
  const domainMastery = buildDomainMastery(studentAttempts, questions, activePracticalAttempts, practicalTests);
  const recommendations = buildRecommendations(mastery);
  const latestAttempt = [...studentAttempts].sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  const combinedAttempts = [
    ...studentAttempts.map((attempt) => ({ testId: attempt.blueprintId, score: attempt.mosScore, submittedAt: attempt.submittedAt ?? attempt.startedAt })),
    ...activePracticalAttempts.map((attempt) => ({ testId: attempt.practicalTestId, score: attempt.score, submittedAt: attempt.submittedAt ?? attempt.startedAt })),
  ];
  const latestCombinedAttempt = [...combinedAttempts].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
  const bestScoresByTest = [...combinedAttempts.reduce((scores, attempt) => {
    scores.set(attempt.testId, Math.max(scores.get(attempt.testId) ?? 0, attempt.score));
    return scores;
  }, new Map<string, number>()).values()];
  const processMosScore = average(bestScoresByTest);

  return {
    student,
    summary: {
      attempts: combinedAttempts.length,
      completedTests: bestScoresByTest.length,
      processMosScore,
      averageMosScore: average(combinedAttempts.map((attempt) => attempt.score)),
      bestMosScore: Math.max(0, ...combinedAttempts.map((attempt) => attempt.score)),
      latestMosScore: latestCombinedAttempt?.score ?? 0,
      passReady: processMosScore >= 80,
    },
    domainMastery,
    skillMastery: mastery,
    recommendations,
    latestAttempt,
  };
}

export async function getStudentPersonalization(studentId: string) {
  const analytics = await getStudentAnalytics(studentId);
  if (!analytics.student) throw new Error("Student not found");

  const weakSkills = analytics.skillMastery.filter((skill) => skill.masteryPercent < 70).slice(0, 3);
  const nextFocus = weakSkills[0]?.skillTag ?? "page-setup";
  const nextFocusLabel = formatSkillLabel(nextFocus);
  const recommendedLessonId = mapSkillToLesson(nextFocus);
  const passReady = analytics.summary.passReady;

  return {
    student: analytics.student,
    readiness: passReady ? "exam-ready" : "needs-practice",
    mosScore: analytics.summary.processMosScore,
    summary: analytics.summary,
    domainMastery: analytics.domainMastery,
    skillMastery: analytics.skillMastery,
    latestAttempt: analytics.latestAttempt,
    recommendedLessonId,
    reason:
      weakSkills.length > 0
        ? `Hệ thống phát hiện kỹ năng ${nextFocusLabel} còn yếu dựa trên cả bài trắc nghiệm và bài mô phỏng đã nộp, nên ưu tiên ôn lại bài liên quan trước khi làm đề tiếp.`
        : "Kết quả hiện tại ổn định, nên tiếp tục bài kế tiếp và làm thêm đề đồng bộ để giữ nhịp luyện tập.",
    weakSkills,
    recommendations: analytics.recommendations,
    nextActions: buildNextActions(weakSkills, passReady),
    focusPlan: buildFocusPlan(weakSkills, recommendedLessonId),
    learningRules: [
      "Hoàn thành checklist bài học để mở khóa gợi ý tiếp theo.",
      "Nếu bài test dưới 80 điểm, hệ thống ưu tiên ôn lại trước khi chuyển sang đề khó hơn.",
      "Nếu một kỹ năng có tỷ lệ đạt thấp trong nhiều câu trắc nghiệm hoặc tiêu chí mô phỏng, lộ trình sẽ ưu tiên bài học liên quan kỹ năng đó.",
    ],
  };
}

export async function getAdminOverview() {
  const [users, questions, blueprints, submittedAttempts] = await Promise.all([
    collections().users.find({}, withoutMongoId<User>()).toArray(),
    collections().questions.find({}, withoutMongoId<Question>()).toArray(),
    collections().blueprints.find({}, withoutMongoId()).toArray(),
    collections().attempts.find({ submittedAt: { $exists: true } }, withoutMongoId<ExamAttempt>()).toArray(),
  ]);

  return {
    totals: {
      students: users.filter((user) => user.role === "student").length,
      questions: questions.length,
      blueprints: blueprints.length,
      attempts: submittedAttempts.length,
    },
    examQuality: {
      averageMosScore: average(submittedAttempts.map((attempt) => attempt.mosScore)),
      passRate: percent(submittedAttempts.filter((attempt) => attempt.mosScore >= 80).length, submittedAttempts.length),
      averageDurationMinutes: average(
        submittedAttempts.map((attempt) =>
          Math.round(attempt.answers.reduce((sum, answer) => sum + answer.elapsedSeconds, 0) / 60),
        ),
      ),
    },
    weakestSkills: getWeakestSkills(submittedAttempts, questions).slice(0, 6),
    hardestQuestions: getHardestQuestions(submittedAttempts, questions).slice(0, 6),
    retentionAlerts: getRetentionAlerts(users, submittedAttempts),
  };
}

function buildMastery(
  studentId: string,
  studentAttempts: ExamAttempt[],
  questions: Question[],
  practicalAttempts: PracticalAttempt[] = [],
  practicalTests: PracticalTest[] = [],
): Mastery[] {
  const buckets = new Map<string, { attempts: number; correct: number; seconds: number; lastPracticedAt: string }>();
  const questionMap = new Map(questions.map((question) => [question.id, question]));

  for (const attempt of studentAttempts) {
    for (const answer of attempt.answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;
      for (const skillTag of question.skillTags) {
        const current = buckets.get(skillTag) ?? {
          attempts: 0,
          correct: 0,
          seconds: 0,
          lastPracticedAt: attempt.submittedAt ?? attempt.startedAt,
        };
        current.attempts += 1;
        current.correct += answer.isCorrect ? 1 : 0;
        current.seconds += answer.elapsedSeconds;
        current.lastPracticedAt = attempt.submittedAt ?? attempt.startedAt;
        buckets.set(skillTag, current);
      }
    }
  }

  const practicalTestMap = new Map(practicalTests.map((test) => [test.id, test]));
  for (const attempt of practicalAttempts) {
    const test = practicalTestMap.get(attempt.practicalTestId);
    if (!test) continue;
    const taskIndexes = new Map(test.tasks.map((task, index) => [task.id, index]));
    for (const result of attempt.checkResults) {
      for (const skillTag of getPracticalSkillTags(test.lessonId, taskIndexes.get(result.taskId) ?? 0)) {
        const current = buckets.get(skillTag) ?? {
          attempts: 0,
          correct: 0,
          seconds: 0,
          lastPracticedAt: attempt.submittedAt ?? attempt.startedAt,
        };
        current.attempts += 1;
        current.correct += result.passed ? 1 : 0;
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

function buildDomainMastery(
  studentAttempts: ExamAttempt[],
  questions: Question[],
  practicalAttempts: PracticalAttempt[] = [],
  practicalTests: PracticalTest[] = [],
) {
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

  const practicalTestMap = new Map(practicalTests.map((test) => [test.id, test]));
  for (const attempt of practicalAttempts) {
    const test = practicalTestMap.get(attempt.practicalTestId);
    if (!test) continue;
    const taskIndexes = new Map(test.tasks.map((task, index) => [task.id, index]));
    for (const result of attempt.checkResults) {
      const domain = getPracticalDomain(test.lessonId, taskIndexes.get(result.taskId) ?? 0);
      const current = buckets.get(domain) ?? { attempts: 0, correct: 0 };
      current.attempts += 1;
      current.correct += result.passed ? 1 : 0;
      buckets.set(domain, current);
    }
  }

  return [...buckets.entries()].map(([domain, bucket]) => ({
    domain,
    masteryPercent: percent(bucket.correct, bucket.attempts),
    attempts: bucket.attempts,
  }));
}

const practicalSkillMap: Record<string, { domain: MosDomain; skillTags: string[] }> = {
  "page-setup-document-properties": { domain: "manage-documents", skillTags: ["layout", "page-setup", "print-preview"] },
  "normal-style-paragraph": { domain: "insert-format-text", skillTags: ["paragraph", "normal-style", "line-spacing"] },
  "heading-toc-navigation": { domain: "create-manage-references", skillTags: ["heading", "toc", "field-update"] },
  "page-number-section-break": { domain: "manage-documents", skillTags: ["section-page-number", "header-footer", "page-number"] },
  "objects-captions-citations": { domain: "insert-format-graphic-elements", skillTags: ["caption", "cross-reference", "wrap-text"] },
  "academic-forms-appendix-export": { domain: "manage-tables-lists", skillTags: ["table", "form-layout"] },
  "administrative-documents": { domain: "manage-documents", skillTags: ["document-format", "official-layout"] },
  "tips-shortcuts": { domain: "insert-format-text", skillTags: ["shortcut-speed", "editing-speed"] },
  "common-errors": { domain: "manage-documents", skillTags: ["troubleshooting", "document-format"] },
  "mail-merge": { domain: "manage-documents", skillTags: ["mail-merge", "data-source", "preview-results"] },
  "review-protect-compare": { domain: "manage-collaboration", skillTags: ["track-changes", "comments", "protect-document"] },
};

const practicalLessonOrder = Object.keys(practicalSkillMap);

function getPracticalSkillTags(lessonId: string | undefined, taskIndex: number) {
  const resolvedLessonId = lessonId ?? practicalLessonOrder[taskIndex % practicalLessonOrder.length];
  return practicalSkillMap[resolvedLessonId]?.skillTags ?? ["page-setup"];
}

function getPracticalDomain(lessonId: string | undefined, taskIndex: number) {
  const resolvedLessonId = lessonId ?? practicalLessonOrder[taskIndex % practicalLessonOrder.length];
  return practicalSkillMap[resolvedLessonId]?.domain ?? "manage-documents";
}

function buildRecommendations(mastery: Mastery[]) {
  const weakSkills = mastery.filter((item) => item.masteryPercent < 70).slice(0, 3);
  if (weakSkills.length === 0) {
    return [
      {
        priority: "maintenance",
        message: "Bạn đang đạt mức ổn. Hãy làm thêm đề thi đồng bộ để giữ tốc độ và độ chính xác.",
        skillTags: [],
      },
    ];
  }

  return weakSkills.map((skill) => ({
    priority: skill.masteryPercent < 50 ? "urgent" : "practice",
    message: `Kỹ năng ${formatSkillLabel(skill.skillTag)} đang ở ${skill.masteryPercent}%. Nên ôn lại bài liên quan và làm thêm 5 câu thuộc kỹ năng này.`,
    skillTags: [skill.skillTag],
  }));
}

function buildNextActions(weakSkills: Mastery[], passReady: boolean) {
  if (passReady && weakSkills.length === 0) {
    return [
      "Làm thêm một đề mock đầy đủ thời gian để giữ nhịp.",
      "Ôn lại các thao tác dễ mất điểm: cập nhật field, section break, review.",
      "Tự chấm lại tốc độ thao tác trước ngày thi.",
    ];
  }

  return [
    `Ôn lại bài gắn với kỹ năng ${formatSkillLabel(weakSkills[0]?.skillTag ?? "page-setup")}.`,
    "Làm 5 câu luyện tập đúng kỹ năng yếu trước khi làm đề mới.",
    "Sau khi đạt tối thiểu 80 điểm, chuyển sang mock test đủ thời gian.",
  ];
}

function formatSkillLabel(skillTag: string) {
  const labels: Record<string, string> = {
    layout: "bố cục trang",
    "page-setup": "thiết lập trang",
    "print-preview": "xem trước khi in",
    paragraph: "định dạng đoạn văn",
    "normal-style": "Normal Style",
    "line-spacing": "giãn dòng",
    table: "bảng",
    "form-layout": "bố cục biểu mẫu",
    heading: "Heading",
    toc: "mục lục",
    "field-update": "cập nhật field",
    caption: "caption",
    "cross-reference": "tham chiếu chéo",
    "wrap-text": "Wrap Text",
    "mail-merge": "Mail Merge",
    "data-source": "nguồn dữ liệu",
    "preview-results": "Preview Results",
    "track-changes": "Track Changes",
    comments: "comment",
    "protect-document": "bảo vệ tài liệu",
    "section-page-number": "section và số trang",
    "header-footer": "header và footer",
    "page-number": "số trang",
    "document-format": "thể thức văn bản",
    "inspect-document": "kiểm tra metadata",
    "official-layout": "bố cục hành chính",
    "shortcut-speed": "tốc độ phím tắt",
    "editing-speed": "tốc độ chỉnh sửa",
    autocorrect: "AutoCorrect",
    troubleshooting: "sửa lỗi Word",
  };

  return labels[skillTag] ?? skillTag.replace(/[-_]/g, " ");
}

function buildFocusPlan(weakSkills: Mastery[], recommendedLessonId: string) {
  return {
    recommendedLessonId,
    targetMasteryPercent: 80,
    dailyMinutes: weakSkills.some((skill) => skill.masteryPercent < 50) ? 35 : 25,
    skillTags: weakSkills.map((skill) => skill.skillTag),
  };
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

function getWeakestSkills(submittedAttempts: ExamAttempt[], questions: Question[]) {
  const allMastery = buildMastery("all", submittedAttempts, questions);
  return allMastery.map(({ skillTag, masteryPercent, attempts, avgSeconds }) => ({
    skillTag,
    masteryPercent,
    attempts,
    avgSeconds,
  }));
}

function getHardestQuestions(submittedAttempts: ExamAttempt[], questions: Question[]) {
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

function getRetentionAlerts(users: User[], attempts: ExamAttempt[]) {
  const students = users.filter((user) => user.role === "student");
  return students
    .map((student) => {
      const studentAttempts = attempts.filter((attempt) => attempt.studentId === student.id && attempt.submittedAt);
      const latestAttempts = [...studentAttempts].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 3);
      const inactiveDays = Math.floor((Date.now() - new Date(student.lastLoginAt).getTime()) / 86400000);
      const lowScoreStreak = latestAttempts.length >= 2 && latestAttempts.every((attempt) => attempt.mosScore < 40);
      return {
        studentId: student.id,
        name: student.name,
        inactiveDays,
        lowScoreStreak,
        alert:
          inactiveDays >= 7
            ? "Không đăng nhập từ 7 ngày trở lên"
            : lowScoreStreak
              ? "Nhiều lần thi thử dưới 40 điểm"
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
