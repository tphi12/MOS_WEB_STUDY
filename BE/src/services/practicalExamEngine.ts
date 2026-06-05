import { collections, withoutMongoId } from "../db.js";
import type { PracticalAttempt, PracticalCheckType, PracticalTest, User } from "../types.js";

const topics = [
  ["page-setup-document-properties", "Thiết lập tài liệu và thuộc tính", ["Khổ giấy A4", "Lề trái 3 cm", "Hướng trang ngang", "Print Preview", "Thuộc tính tài liệu"]],
  ["normal-style-paragraph", "Normal Style và Paragraph", ["Chuẩn hóa Normal Style", "Giãn dòng 1.5", "Căn đều hai lề", "Thụt dòng đầu", "Khoảng cách đoạn"]],
  ["heading-toc-navigation", "Heading và mục lục tự động", ["Chương 1 Tổng quan", "Mục 1.1 Mục tiêu", "Navigation Pane", "Mục lục tự động", "Update entire table"]],
  ["page-number-section-break", "Số trang và Section Break", ["Trang bìa không đánh số", "Section nội dung chính", "Start at 1", "Link to Previous", "Next Page Section Break"]],
  ["objects-captions-citations", "Hình, caption và citation", ["Hình 1 Sơ đồ nghiên cứu", "Insert Caption", "Cross-reference Hình 1", "Nguồn tham khảo", "Table of Figures"]],
  ["academic-forms-appendix-export", "Bảng, biểu mẫu và xuất file", ["Phụ lục khảo sát", "Cột Họ tên", "Cột Xếp loại", "Danh sách lựa chọn", "Kiểm tra trước khi xuất PDF"]],
  ["administrative-documents", "Văn bản hành chính", ["CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", "Độc lập - Tự do - Hạnh phúc", "KẾ HOẠCH CÔNG TÁC", "Nơi nhận", "Người ký duyệt"]],
  ["tips-shortcuts", "Mẹo và phím tắt Word", ["Ctrl + S Lưu tài liệu", "Ctrl + H Thay thế", "Ctrl + Enter Ngắt trang", "F4 Lặp thao tác", "Shift + F3 Đổi kiểu chữ"]],
  ["common-errors", "Soát lỗi và sửa bố cục", ["Lỗi khoảng trắng", "Lỗi nhảy font", "Lỗi bảng tràn trang", "Lỗi số trang", "Checklist kiểm tra cuối"]],
  ["mail-merge", "Mail Merge", ["Select Recipients", "Insert Merge Field", "Preview Results", "Finish & Merge", "Danh sách người nhận"]],
  ["review-protect-compare", "Review, Protect và Compare", ["Track Changes", "Accept or Reject", "New Comment", "Restrict Editing", "Compare Documents"]],
] as const;

const defaultPracticalTests: PracticalTest[] = [
  ...topics.map(([lessonId, title, phrases]) => makeTopicTest(lessonId, title, [...phrases])),
  makeFinalTest(),
];

export async function ensureDefaultPracticalTests() {
  await collections().practicalTests.deleteMany({ id: { $in: ["practical-format-report", "practical-table-summary"] } });
  await Promise.all(
    defaultPracticalTests.map((test) =>
      collections().practicalTests.replaceOne({ id: test.id }, test, { upsert: true }),
    ),
  );
}

export async function listPracticalTests() {
  return collections().practicalTests.find({}, withoutMongoId<PracticalTest>()).sort({ durationMinutes: 1, title: 1 }).toArray();
}

export async function startPracticalAttempt(studentId: string, practicalTestId: string) {
  const student = await collections().users.findOne({ id: studentId, role: "student" }, withoutMongoId<User>());
  if (!student) throw new Error("Student not found");
  const test = await getPracticalTest(practicalTestId);
  const attempt: PracticalAttempt = {
    id: `practical-attempt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    studentId,
    practicalTestId,
    startedAt: new Date().toISOString(),
    content: test.initialContent,
    score: 0,
    checkResults: [],
  };
  await collections().practicalAttempts.insertOne(attempt);
  return { attempt, test };
}

export async function submitPracticalAttempt(attemptId: string, content: string) {
  const attempt = await collections().practicalAttempts.findOne({ id: attemptId }, withoutMongoId<PracticalAttempt>());
  if (!attempt) throw new Error("Practical attempt not found");
  if (attempt.submittedAt) throw new Error("Practical attempt already submitted");
  const test = await getPracticalTest(attempt.practicalTestId);
  const checkResults = test.tasks.flatMap((task) =>
    task.checks.map((check) => {
      const passed = evaluateCheck(content, check.type, check.value);
      return { taskId: task.id, checkId: check.id, label: check.label, points: check.points, earnedPoints: passed ? check.points : 0, passed };
    }),
  );
  const score = Math.max(0, Math.min(100, checkResults.reduce((sum, result) => sum + result.earnedPoints, 0)));
  const submittedAt = new Date().toISOString();
  const submitted = { ...attempt, content, score, checkResults, submittedAt };
  await collections().practicalAttempts.updateOne({ id: attemptId }, { $set: { content, score, checkResults, submittedAt } });
  return submitted;
}

export async function listStudentPracticalAttempts(studentId: string) {
  return collections().practicalAttempts
    .find({ studentId, submittedAt: { $exists: true } }, withoutMongoId<PracticalAttempt>())
    .sort({ submittedAt: -1 })
    .toArray();
}

function makeTopicTest(lessonId: string, title: string, phrases: string[]): PracticalTest {
  return {
    id: `practical-${lessonId}`,
    title: `Thực hành: ${title}`,
    description: `Đề mô phỏng nâng cao gồm 5 câu theo chủ đề ${title}.`,
    lessonId,
    durationMinutes: 30,
    initialContent: `<p>${title.toUpperCase()}</p>${phrases.map((phrase) => `<p>${phrase}</p>`).join("")}<p>Ghi chú hoàn thành bài thực hành Wordie.</p>`,
    tasks: phrases.map((phrase, index) => makeTask(index + 1, phrase, 10)),
  };
}

function makeFinalTest(): PracticalTest {
  const phrases = topics.slice(0, 10).map(([, , values], index) => values[index % values.length]);
  return {
    id: "practical-final-word",
    title: "Bài thực hành Word tổng hợp cuối khóa",
    description: "Đề thực hành khó gồm 10 câu bao phủ toàn bộ kỹ năng Word.",
    durationMinutes: 90,
    initialContent: `<p>BÀI THỰC HÀNH WORD TỔNG HỢP</p>${phrases.map((phrase) => `<p>${phrase}</p>`).join("")}<p>Báo cáo hoàn thành Wordie</p>`,
    tasks: phrases.map((phrase, index) => makeTask(index + 1, phrase, 5)),
  };
}

function makeTask(number: number, phrase: string, pointsPerCheck: number): PracticalTest["tasks"][number] {
  const modes: Array<{ instruction: string; type: PracticalCheckType; label: string }> = [
    { instruction: "định dạng thành Heading", type: "heading-text", label: "Đúng Heading" },
    { instruction: "in đậm nội dung", type: "bold-text", label: "Đúng nội dung in đậm" },
    { instruction: "đưa vào danh sách", type: "list-contains", label: "Đúng nội dung trong danh sách" },
    { instruction: "đưa vào bảng", type: "table-contains", label: "Đúng nội dung trong bảng" },
    { instruction: "giữ nguyên và bổ sung vào tài liệu", type: "contains", label: "Có đúng nội dung yêu cầu" },
  ];
  const mode = modes[(number - 1) % modes.length];
  return {
    id: `task-${number}`,
    title: `Câu ${number}: ${phrase}`,
    instruction: `Tìm cụm “${phrase}”, ${mode.instruction}; đồng thời thêm mã xác nhận “[DONE ${number}]” vào cuối tài liệu.`,
    checks: [
      { id: `task-${number}-format`, label: `${mode.label}: ${phrase}`, type: mode.type, value: phrase, points: pointsPerCheck },
      { id: `task-${number}-confirm`, label: `Có mã xác nhận [DONE ${number}]`, type: "contains", value: `[DONE ${number}]`, points: pointsPerCheck },
    ],
  };
}

async function getPracticalTest(practicalTestId: string) {
  const test = await collections().practicalTests.findOne({ id: practicalTestId }, withoutMongoId<PracticalTest>());
  if (!test) throw new Error("Practical test not found");
  return test;
}

function evaluateCheck(html: string, type: PracticalCheckType, value?: string) {
  const normalizedHtml = html.toLowerCase();
  const expected = value?.toLowerCase() ?? "";
  const text = stripTags(html);
  if (type === "contains") return Boolean(expected && text.includes(expected));
  if (type === "heading") return Boolean(expected && new RegExp(`<${escapeRegExp(expected)}(?:\\s|>)`).test(normalizedHtml));
  if (type === "bold") return /<(strong|b)(?:\s|>)/.test(normalizedHtml);
  if (type === "table") return /<table(?:\s|>)/.test(normalizedHtml);
  if (type === "list") return /<(ul|ol)(?:\s|>)/.test(normalizedHtml);
  if (type === "heading-text") return elementContains(normalizedHtml, "h[1-6]", expected);
  if (type === "bold-text") return elementContains(normalizedHtml, "(?:strong|b)", expected);
  if (type === "list-contains") return elementContains(normalizedHtml, "(?:ul|ol)", expected);
  if (type === "table-contains") return elementContains(normalizedHtml, "table", expected);
  return false;
}

function elementContains(html: string, tagPattern: string, value: string) {
  if (!value) return false;
  const matches = html.match(new RegExp(`<(${tagPattern})(?:\\s[^>]*)?>[\\s\\S]*?<\\/\\1>`, "gi")) ?? [];
  return matches.some((match) => stripTags(match).includes(value));
}

function stripTags(html: string) {
  return decodeHtml(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim().toLowerCase();
}

function decodeHtml(value: string) {
  return value.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
