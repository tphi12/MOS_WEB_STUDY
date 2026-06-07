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
  inlinePictureCount: number;
  ooxml: string;
};

type OfficeParagraph = {
  text: string;
  styleBuiltIn: string;
  alignment: string;
  lineSpacing: number;
  firstLineIndent: number;
  spaceBefore: number;
  spaceAfter: number;
  font: { bold: boolean | null; name: string; size: number; load: (properties: string) => void };
};

type OfficeContext = {
  document: {
    body: {
      text: string;
      paragraphs: { items: OfficeParagraph[]; load: (properties: string) => void };
      tables: { items: Array<{ values: string[][] }>; load: (properties: string) => void };
      inlinePictures: { items: unknown[]; load: (properties: string) => void };
      load: (properties: string) => void;
      insertHtml: (html: string, location: string) => void;
      getOoxml: () => { value: string };
    };
    close: (closeBehavior?: "Save" | "SkipSave") => void;
  };
  sync: () => Promise<void>;
};

type WordApi = {
  run: <T>(callback: (context: OfficeContext) => Promise<T>) => Promise<T>;
  InsertLocation: { replace: string };
};

declare global {
  interface Window {
    Word?: WordApi;
    Office?: {
      context?: { host?: string };
      onReady?: () => Promise<{ host?: string }>;
    };
  }
}

export function isWordAddinAvailable() {
  return Boolean(window.Word?.run);
}

export async function waitForWordAddin(timeoutMs = 10_000) {
  if (isWordAddinAvailable()) return true;

  const startedAt = Date.now();
  try {
    await Promise.race([
      window.Office?.onReady?.() ?? Promise.resolve(),
      new Promise((resolve) => window.setTimeout(resolve, timeoutMs)),
    ]);
  } catch {
    // Polling below still detects Word when Office.onReady is unavailable.
  }

  while (Date.now() - startedAt < timeoutMs) {
    if (isWordAddinAvailable()) return true;
    await new Promise((resolve) => window.setTimeout(resolve, 250));
  }
  return false;
}

export async function loadExamIntoWord(html: string) {
  if (!(await waitForWordAddin())) throw new Error("Office.js chưa kết nối với Microsoft Word. Hãy mở Wordie từ Task Pane trong Word.");
  const word = window.Word;
  if (!word) throw new Error("Office.js chưa kết nối với Microsoft Word.");
  await word.run(async (context) => {
    context.document.body.insertHtml(html, word.InsertLocation.replace);
    await context.sync();
  });
}

export async function collectOfficeDocumentSnapshot(): Promise<OfficeDocumentSnapshot> {
  if (!(await waitForWordAddin())) throw new Error("Office.js chưa kết nối với Microsoft Word. Hãy mở Wordie từ Task Pane trong Word.");
  const word = window.Word;
  if (!word) throw new Error("Office.js chưa kết nối với Microsoft Word.");
  return word.run(async (context) => {
    const body = context.document.body;
    body.load("text");
    body.paragraphs.load("items/text,items/styleBuiltIn,items/alignment,items/lineSpacing,items/firstLineIndent,items/spaceBefore,items/spaceAfter");
    body.tables.load("items/values");
    body.inlinePictures.load("items");
    const ooxml = body.getOoxml();
    await context.sync();

    body.paragraphs.items.forEach((paragraph) => paragraph.font.load("bold,name,size"));
    await context.sync();

    return {
      bodyText: body.text,
      paragraphs: body.paragraphs.items.map((paragraph) => ({
        text: paragraph.text,
        style: paragraph.styleBuiltIn,
        bold: paragraph.font.bold,
        fontName: paragraph.font.name,
        fontSize: paragraph.font.size,
        alignment: paragraph.alignment,
        lineSpacing: paragraph.lineSpacing,
        firstLineIndent: paragraph.firstLineIndent,
        spaceBefore: paragraph.spaceBefore,
        spaceAfter: paragraph.spaceAfter,
      })),
      tables: body.tables.items.map((table) => table.values.flat().join(" | ")),
      inlinePictureCount: body.inlinePictures.items.length,
      ooxml: ooxml.value,
    };
  });
}

export async function closeOfficeDocument() {
  if (!(await waitForWordAddin())) return;
  const word = window.Word;
  if (!word) return;
  await word.run(async (context) => {
    context.document.close("SkipSave");
  });
}
