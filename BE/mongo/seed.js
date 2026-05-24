const database = db.getSiblingDB("mos_web_study");
const now = new Date();

database.users.drop();
database.questions.drop();
database.blueprints.drop();
database.attempts.drop();

database.users.insertMany([
  {
    id: "u-admin",
    role: "admin",
    name: "Admin MOS Center",
    email: "admin@mos.edu.vn",
    lastLoginAt: now.toISOString(),
  },
  {
    id: "u-student-1",
    role: "student",
    name: "Tran Minh Anh",
    email: "anh@student.edu.vn",
    lastLoginAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
  },
  {
    id: "u-student-2",
    role: "student",
    name: "Le Quoc Bao",
    email: "bao@student.edu.vn",
    lastLoginAt: new Date(now.getTime() - 9 * 86400000).toISOString(),
  },
]);

database.questions.insertMany([
  {
    id: "q-layout-1",
    domain: "manage-documents",
    skillTags: ["layout", "page-setup", "print-preview"],
    type: "project-task",
    difficulty: "foundation",
    title: "Thiet lap tai lieu A4",
    prompt: "Dat kho giay A4, Portrait, le trai 3cm va kiem tra Print Preview.",
    expectedAnswer: ["A4", "Portrait", "Left 3cm", "Print Preview"],
    estimatedSeconds: 180,
    points: 10,
  },
  {
    id: "q-format-1",
    domain: "insert-format-text",
    skillTags: ["paragraph", "normal-style", "line-spacing"],
    type: "sequence",
    difficulty: "medium",
    title: "Chuan hoa Normal Style",
    prompt: "Sap xep cac buoc chinh Normal Style cho than bai hoc thuat.",
    expectedAnswer: ["Home > Styles", "Right click Normal", "Modify", "Format > Paragraph", "OK"],
    estimatedSeconds: 150,
    points: 10,
  },
  {
    id: "q-table-1",
    domain: "manage-tables-lists",
    skillTags: ["table", "form-layout"],
    type: "sequence",
    difficulty: "medium",
    title: "Tao bieu mau bang Table",
    prompt: "Sap xep thao tac tao bieu mau khao sat bang bang.",
    expectedAnswer: ["Insert > Table", "Nhap du lieu", "Distribute Rows", "Borders", "Save"],
    estimatedSeconds: 210,
    points: 10,
  },
  {
    id: "q-reference-1",
    domain: "create-manage-references",
    skillTags: ["heading", "toc", "field-update"],
    type: "project-task",
    difficulty: "advanced",
    title: "Tao muc luc tu dong",
    prompt: "Ap dung Heading 1/2, chen Table of Contents va cap nhat toan bo muc luc.",
    expectedAnswer: ["Heading 1", "Heading 2", "Table of Contents", "Update entire table"],
    estimatedSeconds: 240,
    points: 15,
  },
  {
    id: "q-graphic-1",
    domain: "insert-format-graphic-elements",
    skillTags: ["caption", "cross-reference", "wrap-text"],
    type: "project-task",
    difficulty: "medium",
    title: "Caption va tham chieu hinh",
    prompt: "Chen caption cho hinh va tao cross-reference trong doan van.",
    expectedAnswer: ["Insert Caption", "Figure label", "Cross-reference"],
    estimatedSeconds: 220,
    points: 10,
  },
  {
    id: "q-review-1",
    domain: "manage-collaboration",
    skillTags: ["track-changes", "comments", "protect-document"],
    type: "multiple-choice",
    difficulty: "foundation",
    title: "Hieu Track Changes",
    prompt: "An markup co dong nghia voi viec da xoa thay doi khong?",
    expectedAnswer: "Khong. Phai Accept hoac Reject thay doi.",
    estimatedSeconds: 45,
    points: 5,
  },
  {
    id: "q-mailmerge-1",
    domain: "manage-documents",
    skillTags: ["mail-merge", "data-source", "preview-results"],
    type: "project-task",
    difficulty: "advanced",
    title: "Mail Merge thu moi",
    prompt: "Ket noi danh sach Excel, chen merge fields va Preview Results truoc khi Finish.",
    expectedAnswer: ["Select Recipients", "Insert Merge Field", "Preview Results", "Finish & Merge"],
    estimatedSeconds: 300,
    points: 15,
  },
]);

database.blueprints.insertOne({
  id: "mos-word-mock-1",
  name: "MOS Word Mock Test 1",
  totalQuestions: 5,
  durationMinutes: 50,
  mosScaleMin: 100,
  mosScaleMax: 1000,
  domainMatrix: [
    { domain: "manage-documents", percent: 30, difficulties: ["foundation", "medium", "advanced"] },
    { domain: "insert-format-text", percent: 20, difficulties: ["foundation", "medium"] },
    { domain: "manage-tables-lists", percent: 20, difficulties: ["medium"] },
    { domain: "create-manage-references", percent: 20, difficulties: ["medium", "advanced"] },
    { domain: "manage-collaboration", percent: 10, difficulties: ["foundation"] },
  ],
});

database.attempts.insertMany([
  {
    id: "attempt-seed-1",
    studentId: "u-student-1",
    blueprintId: "mos-word-mock-1",
    questionIds: ["q-layout-1", "q-format-1", "q-table-1", "q-reference-1", "q-review-1"],
    startedAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
    submittedAt: new Date(now.getTime() - 3 * 86400000 + 42 * 60000).toISOString(),
    rawScore: 35,
    mosScore: 700,
    answers: [
      { questionId: "q-layout-1", answer: ["A4", "Portrait", "Left 3cm", "Print Preview"], elapsedSeconds: 170, isCorrect: true },
      { questionId: "q-format-1", answer: ["Home > Styles", "Right click Normal", "Modify", "Format > Paragraph", "OK"], elapsedSeconds: 160, isCorrect: true },
      { questionId: "q-table-1", answer: ["Insert > Table", "Borders", "Nhap du lieu", "Distribute Rows", "Save"], elapsedSeconds: 280, isCorrect: false },
      { questionId: "q-reference-1", answer: ["Heading 1", "Heading 2", "Table of Contents", "Update entire table"], elapsedSeconds: 260, isCorrect: true },
      { questionId: "q-review-1", answer: "Khong. Phai Accept hoac Reject thay doi.", elapsedSeconds: 55, isCorrect: true },
    ],
  },
  {
    id: "attempt-seed-2",
    studentId: "u-student-2",
    blueprintId: "mos-word-mock-1",
    questionIds: ["q-layout-1", "q-format-1", "q-table-1", "q-mailmerge-1", "q-review-1"],
    startedAt: new Date(now.getTime() - 10 * 86400000).toISOString(),
    submittedAt: new Date(now.getTime() - 10 * 86400000 + 48 * 60000).toISOString(),
    rawScore: 20,
    mosScore: 460,
    answers: [
      { questionId: "q-layout-1", answer: ["A4", "Portrait", "Left 3cm", "Print Preview"], elapsedSeconds: 210, isCorrect: true },
      { questionId: "q-format-1", answer: ["Modify", "Home > Styles", "Right click Normal", "Format > Paragraph", "OK"], elapsedSeconds: 220, isCorrect: false },
      { questionId: "q-table-1", answer: ["Insert > Table", "Nhap du lieu", "Distribute Rows", "Borders", "Save"], elapsedSeconds: 260, isCorrect: true },
      { questionId: "q-mailmerge-1", answer: ["Insert Merge Field", "Select Recipients", "Finish & Merge"], elapsedSeconds: 390, isCorrect: false },
      { questionId: "q-review-1", answer: "Co", elapsedSeconds: 70, isCorrect: false },
    ],
  },
]);

database.users.createIndex({ id: 1 }, { unique: true });
database.questions.createIndex({ id: 1 }, { unique: true });
database.questions.createIndex({ domain: 1, difficulty: 1 });
database.questions.createIndex({ skillTags: 1 });
database.blueprints.createIndex({ id: 1 }, { unique: true });
database.attempts.createIndex({ id: 1 }, { unique: true });
database.attempts.createIndex({ studentId: 1, submittedAt: -1 });

printjson({
  ok: 1,
  database: "mos_web_study",
  users: database.users.countDocuments(),
  questions: database.questions.countDocuments(),
  blueprints: database.blueprints.countDocuments(),
  attempts: database.attempts.countDocuments(),
});
