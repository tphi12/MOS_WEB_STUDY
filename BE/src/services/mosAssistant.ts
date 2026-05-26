import { collections, withoutMongoId } from "../db.js";
import type { Mastery, User } from "../types.js";
import { getStudentAnalytics } from "./analytics.js";

type AssistantContext = {
  route?: string;
  lessonTitle?: string;
  lessonSubtitle?: string;
  activeTestName?: string;
  selectedQuestion?: string;
  includePageContext?: boolean;
  studentId?: string;
};

type ChatTurn = {
  role: "user" | "assistant";
  text: string;
};

type AssistantRequest = {
  message: string;
  history?: ChatTurn[];
  context?: AssistantContext;
};

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-2.5-flash";
const MAX_HISTORY_TURNS = 6;

export async function askMosAssistant(input: AssistantRequest) {
  const contextText = await buildContextText(input.context);
  const systemInstruction = buildSystemInstruction(contextText);

  if (!process.env.GEMINI_API_KEY) {
    return {
      answer: buildFallbackAnswer(input.message, contextText),
      source: "fallback",
    };
  }

  const answer = await callGemini({
    systemInstruction,
    message: input.message,
    history: input.history ?? [],
  });

  return { answer, source: "gemini" };
}

async function buildContextText(context?: AssistantContext) {
  const lines = [
    `Route hiện tại: ${context?.route ?? "không rõ"}`,
    context?.lessonTitle ? `Bài học đang mở: ${context.lessonTitle}` : "",
    context?.lessonSubtitle ? `Mô tả bài: ${context.lessonSubtitle}` : "",
    context?.activeTestName ? `Bài test đang chọn: ${context.activeTestName}` : "",
    context?.selectedQuestion ? `Câu hỏi đang làm: ${context.selectedQuestion}` : "",
  ].filter(Boolean);

  if (context?.studentId) {
    const [student, analytics] = await Promise.all([
      collections().users.findOne({ id: context.studentId }, withoutMongoId<User>()),
      getStudentAnalytics(context.studentId).catch(() => null),
    ]);
    if (student) lines.push(`Học viên: ${student.name}`);
    const weakSkills = analytics?.skillMastery?.slice(0, 3).map(formatSkill).join(", ");
    if (weakSkills) lines.push(`Skill yếu gần đây: ${weakSkills}`);
    if (analytics?.summary) lines.push(`MOS score gần nhất: ${analytics.summary.latestMosScore}`);
  }

  return lines.join("\n");
}

function buildSystemInstruction(contextText: string) {
  return `Bạn là "MOS Word Master", trợ lý AI siêu tốc trong nền tảng tự học MOS Word.
Nhiệm vụ: giải đáp thắc mắc của học viên ngắn gọn, trực quan, tập trung Microsoft Word và chứng chỉ MOS Word 2016, 2019, Microsoft 365.

QUY TẮC:
1. Chỉ trả lời câu hỏi liên quan Microsoft Word hoặc MOS Word. Nếu hỏi ngoài phạm vi, từ chối khéo và kéo về Word.
2. Trả lời bằng tiếng Việt, ngắn gọn. Ưu tiên gạch đầu dòng hoặc các bước 1-2-3.
3. In đậm tên tab, nhóm lệnh và lệnh, ví dụ: **Home** -> **Paragraph** -> **Line and Paragraph Spacing**.
4. Nếu câu hỏi giống đang làm bài thi, không lan man lý thuyết; hãy chỉ rõ thao tác đúng và mẹo tránh mất điểm.
5. Không bịa phím/tên lệnh. Nếu không chắc, nói cách kiểm tra trong Word.

NGỮ CẢNH ẨN TỪ HỆ THỐNG:
${contextText || "Không có ngữ cảnh bổ sung."}`;
}

async function callGemini({
  systemInstruction,
  message,
  history,
}: {
  systemInstruction: string;
  message: string;
  history: ChatTurn[];
}) {
  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  const formattedContents = formatGeminiContents(history, message);

  const response = await fetch(`${GEMINI_ENDPOINT}/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: formattedContents,
      generationConfig: {
        temperature: 0.25,
        maxOutputTokens: 600,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini request failed: ${response.status} ${detail}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  return text || "Mình chưa tạo được câu trả lời. Bạn thử hỏi lại ngắn hơn nhé.";
}

function formatGeminiContents(history: ChatTurn[], message: string) {
  const maxMessages = MAX_HISTORY_TURNS * 2;
  const slicedHistory = history
    .filter((turn) => turn.text.trim())
    .slice(-maxMessages);

  while (slicedHistory[0]?.role === "assistant") {
    slicedHistory.shift();
  }

  return [
    ...slicedHistory.map((turn) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.text }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];
}
function buildFallbackAnswer(message: string, contextText: string) {
  const normalized = message.toLowerCase();
  if (!isWordQuestion(normalized, contextText)) {
    return "Mình chỉ hỗ trợ câu hỏi về Microsoft Word và MOS Word. Bạn gửi câu hỏi liên quan thao tác Word, mình sẽ chỉ từng bước thật ngắn gọn nhé.";
  }

  if (normalized.includes("mục lục") || normalized.includes("muc luc") || normalized.includes("toc") || normalized.includes("table of contents")) {
    return [
      "Tạo mục lục tự động trong Word:",
      "1. Gán tiêu đề bằng **Home** -> **Styles** -> **Heading 1/Heading 2**.",
      "2. Đặt con trỏ tại nơi cần chèn mục lục.",
      "3. Vào **References** -> **Table of Contents** -> chọn mẫu theo đề.",
      "Mẹo MOS: sau khi sửa tiêu đề, bấm **Update Table** -> **Update entire table**.",
    ].join("\n");
  }

  if (normalized.includes("margin") || normalized.includes("lề")) {
    return [
      "Chỉnh lề trong Word:",
      "1. Vào **Layout** -> **Margins**.",
      "2. Chọn mẫu có sẵn hoặc **Custom Margins**.",
      "3. Nhập Top/Bottom/Left/Right đúng đề bài.",
      "Mẹo MOS: kiểm tra lại bằng **File** -> **Print** để tránh tràn lề.",
    ].join("\n");
  }

  if (normalized.includes("mail merge") || normalized.includes("trộn thư")) {
    return [
      "Làm Mail Merge nhanh:",
      "1. Vào **Mailings** -> **Start Mail Merge** -> **Letters**.",
      "2. Chọn **Select Recipients** -> **Use Existing List**.",
      "3. Chèn trường bằng **Insert Merge Field**.",
      "4. Kiểm tra bằng **Preview Results**, rồi **Finish & Merge**.",
    ].join("\n");
  }

  return [
    "Mình đang ở chế độ fallback vì backend chưa có `GEMINI_API_KEY`.",
    "Với câu hỏi MOS Word, bạn hãy nêu rõ: tab/lệnh đang tìm, yêu cầu đề bài, hoặc lỗi đang gặp.",
    contextText ? `Ngữ cảnh mình đang thấy:\n${contextText}` : "Nếu đang làm bài, bật gửi ngữ cảnh để mình gợi ý sát hơn.",
  ].join("\n");
}

function isWordQuestion(normalized: string, contextText = "") {
  if (contextText.toLowerCase().includes("word") || contextText.toLowerCase().includes("bài học")) return true;
  return [
    "word",
    "mos",
    "mục lục",
    "muc luc",
    "heading",
    "style",
    "margin",
    "lề",
    "section",
    "page number",
    "số trang",
    "caption",
    "mail merge",
    "trộn thư",
    "table",
    "bảng",
    "paragraph",
    "font",
    "track changes",
    "comment",
  ].some((keyword) => normalized.includes(keyword));
}

function formatSkill(skill: Mastery) {
  return `${skill.skillTag} ${skill.masteryPercent}%`;
}