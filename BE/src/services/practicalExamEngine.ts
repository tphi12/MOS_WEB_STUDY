import { collections, withoutMongoId } from "../db.js";
import type { OfficeDocumentSnapshot, PracticalAttempt, PracticalCheckType, PracticalTest, User } from "../types.js";

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
  makeOfficeFinalAcademicTest(),
  makeOfficeFinalProfessionalTest(),
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

export async function submitPracticalAttempt(attemptId: string, content: string, officeSnapshot?: OfficeDocumentSnapshot) {
  const attempt = await collections().practicalAttempts.findOne({ id: attemptId }, withoutMongoId<PracticalAttempt>());
  if (!attempt) throw new Error("Practical attempt not found");
  if (attempt.submittedAt) throw new Error("Practical attempt already submitted");
  const test = await getPracticalTest(attempt.practicalTestId);
  const checkResults = test.tasks.flatMap((task) =>
    task.checks.map((check) => {
      const passed = evaluateCheck(content, check.type, check.value, officeSnapshot);
      return { taskId: task.id, checkId: check.id, label: check.label, points: check.points, earnedPoints: passed ? check.points : 0, passed };
    }),
  );
  const score = Math.max(0, Math.min(100, checkResults.reduce((sum, result) => sum + result.earnedPoints, 0)));
  const submittedAt = new Date().toISOString();
  const submitted = { ...attempt, content, officeSnapshot, score, checkResults, submittedAt };
  await collections().practicalAttempts.updateOne({ id: attemptId }, { $set: { content, officeSnapshot, score, checkResults, submittedAt } });
  return submitted;
}

export async function listStudentPracticalAttempts(studentId: string) {
  return collections().practicalAttempts
    .find({ studentId, submittedAt: { $exists: true } }, withoutMongoId<PracticalAttempt>())
    .sort({ submittedAt: -1 })
    .toArray();
}

export async function getPracticalAttempt(attemptId: string) {
  const attempt = await collections().practicalAttempts.findOne({ id: attemptId }, withoutMongoId<PracticalAttempt>());
  if (!attempt) throw new Error("Practical attempt not found");
  return attempt;
}

export async function getActiveOfficePracticalAttempt(studentId: string) {
  const attempts = await collections().practicalAttempts
    .find({ studentId, submittedAt: { $exists: false } }, withoutMongoId<PracticalAttempt>())
    .sort({ startedAt: -1 })
    .limit(20)
    .toArray();

  for (const attempt of attempts) {
    const test = await collections().practicalTests.findOne(
      { id: attempt.practicalTestId, deliveryMode: "office-addin" },
      withoutMongoId<PracticalTest>(),
    );
    if (test) return { attempt, test };
  }
  return null;
}

export async function getOfficePracticalAttempt(attemptId: string) {
  const attempt = await collections().practicalAttempts.findOne(
    { id: attemptId, submittedAt: { $exists: false } },
    withoutMongoId<PracticalAttempt>(),
  );
  if (!attempt) throw new Error("Active practical attempt not found");
  const test = await getPracticalTest(attempt.practicalTestId);
  if (test.deliveryMode !== "office-addin") throw new Error("Practical attempt is not an Office Add-in exam");
  return { attempt, test };
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

function makeOfficeFinalAcademicTest(): PracticalTest {
  return makeRubricOfficeTest({
    id: "practical-final-office-academic",
    title: "Bài thực hành 1: Tiểu luận",
    description: "Chuẩn hóa và hoàn thiện tài liệu tiểu luận theo 7 yêu cầu trong bộ đề Quản lý dự án giáo dục.",
    initialContent: [
      "<h1>BÀI TIỂU LUẬN QUẢN LÝ DỰ ÁN GIÁO DỤC</h1>",
      "<p>MỤC LỤC THỦ CÔNG</p><p>Chapter 1: Introduction ........ 1</p>",
      "<h2>Chapter 1: Introduction</h2><p>   Nội dung chương một đang dùng nhiều khoảng trắng đầu đoạn và định dạng chưa đồng nhất.</p>",
      "<h2>Chapter 2: Project Analysis</h2><table><tr><td>Hạng mục</td><td>Nội dung phân tích dự án giáo dục</td></tr><tr><td>Tiến độ</td><td>Kế hoạch triển khai</td></tr></table>",
      "<h2>Chapter 3: Communication</h2><p>Vị trí chèn hình minh họa dự án giáo dục.</p>",
      "<h2>Chapter 4: Evaluation</h2><p>Nội dung  chương bốn  có khoảng trắng dư thừa.</p>",
      "<h2>Chapter 5: Conclusion</h2><p>Kết luận của bài tiểu luận.</p>",
    ].join(""),
    tasks: [
      rubricTask(1, "Chuẩn hóa toàn bộ nội dung Chương 1", "Đặt Times New Roman, cỡ 13, giãn dòng 1.5 và căn đều hai lề cho toàn bộ nội dung.", [
        check("font", "Toàn bộ nội dung dùng Times New Roman", "office-font-name", "Times New Roman", 4),
        check("size", "Toàn bộ nội dung dùng cỡ chữ 13", "office-font-size", "13", 4),
        check("line", "Toàn bộ nội dung có giãn dòng 1.5", "office-line-spacing", "19", 4),
        check("justify", "Toàn bộ nội dung được căn đều hai lề", "office-alignment", "justify", 4),
      ]),
      rubricTask(2, "Sửa lỗi định dạng Chương 4", "Chuẩn hóa đoạn văn, đặt Before/After = 0 pt và loại bỏ khoảng trắng dư thừa.", [
        check("spacing", "Khoảng cách Before/After bằng 0 pt", "office-spacing-zero", undefined, 7),
        check("spaces", "Không còn khoảng trắng dư thừa", "office-no-leading-spaces", undefined, 7),
      ]),
      rubricTask(3, "Thiết lập thụt đầu dòng", "Xóa Space ở đầu đoạn và đặt First Line Indent = 1.27 cm cho nội dung thân bài.", [
        check("indent", "Có First Line Indent 1.27 cm", "office-first-line-indent", "36", 7),
        check("leading", "Không còn Space thừa đầu đoạn", "office-no-leading-spaces", undefined, 7),
      ]),
      rubricTask(4, "Điều chỉnh bảng Chương 2", "Dùng AutoFit to Window và điều chỉnh bảng nằm gọn trong khổ A4.", [
        check("table", "Tài liệu giữ bảng phân tích Chương 2", "office-table-contains", "Nội dung phân tích dự án giáo dục", 7),
        check("autofit", "Bảng được điều chỉnh theo chiều rộng trang", "office-ooxml-contains", "w:tblW", 7),
      ]),
      rubricTask(5, "Điều chỉnh hình ảnh Chương 3", "Chèn/thu nhỏ hình, đặt Wrap Text phù hợp và căn giữa hình trên trang.", [
        check("image", "Có hình ảnh minh họa trong tài liệu", "office-image-count", "1", 7),
        check("wrap", "Hình có thiết lập Wrap Text dạng nổi", "office-ooxml-contains", "wp:anchor", 7),
      ]),
      rubricTask(6, "Tạo mục lục tự động", "Áp dụng Heading cho các chương, tạo Automatic Table of Contents và có Chapter 5: Conclusion.", [
        check("heading", "Chapter 5: Conclusion dùng Heading", "office-heading-text", "Chapter 5: Conclusion", 7),
        check("toc", "Tài liệu có mục lục tự động", "office-ooxml-contains", "TOC", 7),
      ]),
      rubricTask(7, "Chuẩn hóa ngắt trang và số trang", "Xóa Enter thừa, dùng Page Break trước chương mới và không đánh số trang bìa.", [
        check("break", "Có Page Break đúng chuẩn", "office-ooxml-contains", "w:type=\"page\"", 7),
        check("page-number", "Có trường số trang trong tài liệu", "office-ooxml-contains", "PAGE", 7),
      ]),
    ],
  });
}

function makeOfficeFinalProfessionalTest(): PracticalTest {
  return makeRubricOfficeTest({
    id: "practical-final-office-professional",
    title: "Bài thực hành 2: Kế hoạch",
    description: "Hoàn thiện văn bản kế hoạch hành chính theo 7 yêu cầu trong bộ đề Quản lý dự án giáo dục.",
    initialContent: [
      "<p>[BIỂU TƯỢNG NHÀ TRƯỜNG]</p><h1>KẾ HOẠCH QUẢN LÝ DỰ ÁN GIÁO DỤC</h1>",
      "<h2>I. Mục đích, yêu cầu</h2><p>   Tổ chức dự án giáo dục bảo đảm hiệu quả và đúng tiến độ.</p>",
      "<h2>II. Nội dung thực hiện</h2><p>Nội dung mở đầu đang có định dạng chưa thống nhất.</p>",
      "<h2>III. Tổ chức thực hiện</h2><p>Các đơn vị phối hợp triển khai kế hoạch.</p>",
      "<p>Nơi nhận: Các đơn vị liên quan</p><p>Nguyễn Văn A</p>",
    ].join(""),
    tasks: [
      rubricTask(1, "Chèn Quốc hiệu và Tiêu ngữ", "Chèn đúng Quốc hiệu, Tiêu ngữ; căn giữa, in đậm và kẻ đường dưới Tiêu ngữ.", [
        check("country", "Có Quốc hiệu in đậm", "office-bold-text", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", 8),
        check("motto", "Có Tiêu ngữ in đậm", "office-bold-text", "Độc lập - Tự do - Hạnh phúc", 8),
      ]),
      rubricTask(2, "Chuẩn hóa phần chữ ký", "Đưa chữ ký sang bên phải, chèn chức danh HIỆU TRƯỞNG và căn chỉnh họ tên.", [
        check("principal", "Có chức danh HIỆU TRƯỞNG", "office-body-contains", "HIỆU TRƯỞNG", 7),
        check("right", "Chức danh HIỆU TRƯỞNG được căn phải", "office-alignment-text", "right::HIỆU TRƯỞNG", 7),
      ]),
      rubricTask(3, "Chuẩn hóa phần mở đầu", "Đặt Times New Roman, cỡ 13, giãn dòng 1.5, căn đều hai lề và xóa khoảng trắng dư.", [
        check("font", "Nội dung dùng Times New Roman", "office-font-name", "Times New Roman", 4),
        check("size", "Nội dung dùng cỡ chữ 13", "office-font-size", "13", 4),
        check("line", "Nội dung có giãn dòng 1.5", "office-line-spacing", "19", 3),
        check("spaces", "Không còn khoảng trắng dư thừa", "office-no-leading-spaces", undefined, 3),
      ]),
      rubricTask(4, "Chuẩn hóa phần Mục đích, yêu cầu", "Căn đều hai lề và đặt First Line Indent = 1.27 cm.", [
        check("justify", "Các đoạn nội dung được căn đều hai lề", "office-alignment", "justify", 7),
        check("indent", "Có First Line Indent 1.27 cm", "office-first-line-indent", "36", 7),
      ]),
      rubricTask(5, "Đồng bộ phần Tổ chức thực hiện", "Sử dụng Styles hoặc Format Painter để định dạng phần nội dung thống nhất.", [
        check("heading", "Tổ chức thực hiện dùng Heading", "office-heading-text", "III. Tổ chức thực hiện", 7),
        check("spacing", "Khoảng cách đoạn được đồng bộ", "office-spacing-zero", undefined, 7),
      ]),
      rubricTask(6, "Chỉnh vị trí và kích thước logo", "Di chuyển logo, chỉnh kích thước cân đối và thiết lập Wrap Text phù hợp.", [
        check("image", "Có logo dạng hình ảnh", "office-image-count", "1", 7),
        check("wrap", "Logo có Wrap Text dạng nổi", "office-ooxml-contains", "wp:anchor", 7),
      ]),
      rubricTask(7, "Thay logo giả lập", "Thay phần [BIỂU TƯỢNG NHÀ TRƯỜNG] bằng hình ảnh và căn chỉnh phù hợp.", [
        check("placeholder", "Đã xóa văn bản logo giả lập", "office-body-not-contains", "[BIỂU TƯỢNG NHÀ TRƯỜNG]", 7),
        check("center", "Có đoạn chứa hình/logo được căn giữa", "office-ooxml-contains", "w:jc w:val=\"center\"", 7),
      ]),
    ],
  });
}

function makeRubricOfficeTest(input: Pick<PracticalTest, "id" | "title" | "description" | "initialContent" | "tasks">): PracticalTest {
  return {
    ...input,
    deliveryMode: "office-addin",
    durationMinutes: 90,
  };
}

function rubricTask(number: number, title: string, instruction: string, checks: PracticalTest["tasks"][number]["checks"]): PracticalTest["tasks"][number] {
  return { id: `task-${number}`, title: `Câu ${number}: ${title}`, instruction, checks };
}

function check(id: string, label: string, type: PracticalCheckType, value: string | undefined, points: number) {
  return { id, label, type, value, points };
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

function evaluateCheck(html: string, type: PracticalCheckType, value?: string, officeSnapshot?: OfficeDocumentSnapshot) {
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
  if (type === "office-body-contains") return normalizeText(officeSnapshot?.bodyText).includes(expected);
  if (type === "office-body-not-contains") return !normalizeText(officeSnapshot?.bodyText).includes(expected);
  if (type === "office-bold-text") return officeSnapshot?.paragraphs.some((paragraph) => paragraph.bold === true && normalizeText(paragraph.text).includes(expected)) ?? false;
  if (type === "office-heading-text") return officeSnapshot?.paragraphs.some((paragraph) => normalizeText(paragraph.style).includes("heading") && normalizeText(paragraph.text).includes(expected)) ?? false;
  if (type === "office-table-contains") return officeSnapshot?.tables.some((table) => normalizeText(table).includes(expected)) ?? false;
  if (type === "office-font-name") return paragraphRatio(officeSnapshot, (paragraph) => normalizeText(paragraph.fontName) === expected) >= 0.8;
  if (type === "office-font-size") return paragraphRatio(officeSnapshot, (paragraph) => near(paragraph.fontSize, Number(expected), 0.6)) >= 0.8;
  if (type === "office-line-spacing") return paragraphRatio(officeSnapshot, (paragraph) => (paragraph.lineSpacing ?? 0) >= Number(expected)) >= 0.7;
  if (type === "office-alignment") return paragraphRatio(officeSnapshot, (paragraph) => normalizeText(paragraph.alignment).includes(expected), true) >= 0.7;
  if (type === "office-first-line-indent") return paragraphRatio(officeSnapshot, (paragraph) => near(paragraph.firstLineIndent, Number(expected), 2), true) >= 0.6;
  if (type === "office-spacing-zero") return paragraphRatio(officeSnapshot, (paragraph) => near(paragraph.spaceBefore, 0, 0.5) && near(paragraph.spaceAfter, 0, 0.5), true) >= 0.7;
  if (type === "office-no-leading-spaces") return !(officeSnapshot?.bodyText.split(/\r?\n/).some((line) => /^\s{2,}\S/.test(line)) ?? true);
  if (type === "office-image-count") return (officeSnapshot?.inlinePictureCount ?? 0) >= Number(expected);
  if (type === "office-ooxml-contains") return normalizeText(officeSnapshot?.ooxml).includes(expected.toLowerCase());
  if (type === "office-alignment-text") {
    const [alignment, textValue] = (value ?? "").split("::");
    return officeSnapshot?.paragraphs.some((paragraph) =>
      normalizeText(paragraph.alignment).includes(normalizeText(alignment)) &&
      normalizeText(paragraph.text).includes(normalizeText(textValue)),
    ) ?? false;
  }
  return false;
}

function paragraphRatio(snapshot: OfficeDocumentSnapshot | undefined, predicate: (paragraph: OfficeDocumentSnapshot["paragraphs"][number]) => boolean, normalOnly = false) {
  const paragraphs = (snapshot?.paragraphs ?? []).filter((paragraph) =>
    normalizeText(paragraph.text).length > 0 &&
    (!normalOnly || !normalizeText(paragraph.style).includes("heading")),
  );
  if (!paragraphs.length) return 0;
  return paragraphs.filter(predicate).length / paragraphs.length;
}

function near(actual: number | undefined, expected: number, tolerance: number) {
  return typeof actual === "number" && Math.abs(actual - expected) <= tolerance;
}

function normalizeText(value?: string) {
  return (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
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
