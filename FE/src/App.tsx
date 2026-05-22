import { useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  BookOpen,
  Brain,
  CheckCircle2,
  Clipboard,
  Filter,
  GraduationCap,
  LayoutList,
  Lightbulb,
  Menu,
  PenLine,
  Search,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { commonErrors, groupLabels, lessons, shortcuts } from "./data";
import type { Lesson, Shortcut } from "./types";

type SearchResult = {
  type: string;
  title: string;
  detail: string;
  lessonId?: string;
};

type PracticeLab = {
  title: string;
  brief: string;
  starterText: string;
  tasks: string[];
  selfCheck: string[];
};

type KnowledgeQuestion = {
  question: string;
  options: string[];
  answer: string;
};

const shortcutCategories: Array<Shortcut["category"] | "Tất cả"> = [
  "Tất cả",
  "Định dạng",
  "Di chuyển",
  "Tài liệu",
  "Nâng cao",
];

export function App() {
  const [activeLessonId, setActiveLessonId] = useState(lessons[0].id);
  const [query, setQuery] = useState("");
  const [shortcutCategory, setShortcutCategory] = useState<(typeof shortcutCategories)[number]>("Tất cả");
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [practiceInputs, setPracticeInputs] = useState<Record<string, string>>({});
  const [revealedPractice, setRevealedPractice] = useState<Record<string, boolean>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [shortcutFeedback, setShortcutFeedback] = useState<Record<string, string>>({});
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? lessons[0];
  const activeIndex = lessons.findIndex((lesson) => lesson.id === activeLesson.id);
  const lessonStepKeys = activeLesson.steps.map((_, index) => `${activeLesson.id}-${index}`);
  const completedSteps = lessonStepKeys.filter((key) => checkedSteps[key]).length;
  const lessonProgress = Math.round((completedSteps / activeLesson.steps.length) * 100);
  const theoryBlocks = getTheoryBlocks(activeLesson);
  const practiceLabs = getPracticeLabs(activeLesson);
  const knowledgeChecks = getKnowledgeChecks(activeLesson);
  const correctQuizCount = knowledgeChecks.filter((question, index) => {
    const key = `${activeLesson.id}-mcq-${index}`;
    return quizAnswers[key] === question.answer;
  }).length;

  const searchResults = useMemo<SearchResult[]>(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return [
      ...commonErrors
        .filter((item) =>
          [item.title, item.symptoms, item.fix, ...item.tags].some((value) => value.toLowerCase().includes(normalized)),
        )
        .map((item) => ({ type: "Lỗi thường gặp", title: item.title, detail: item.fix })),
      ...lessons
        .filter((lesson) =>
          [
            lesson.title,
            lesson.subtitle,
            lesson.outcome,
            ...lesson.steps,
            ...lesson.tips,
            ...lesson.mistakes,
            ...lesson.examples.flatMap((example) => [example.title, example.brief, example.sample, ...example.expected]),
            ...lesson.exercises.flatMap((exercise) => [
              exercise.title,
              exercise.prompt,
              ...exercise.tasks,
              ...exercise.selfCheck,
            ]),
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalized),
        )
        .map((lesson) => ({ type: "Bài học", title: lesson.title, detail: lesson.subtitle, lessonId: lesson.id })),
      ...shortcuts
        .filter((shortcut) => [shortcut.keys, shortcut.action, shortcut.category].join(" ").toLowerCase().includes(normalized))
        .map((shortcut) => ({ type: "Phím tắt", title: shortcut.keys, detail: shortcut.action })),
    ].slice(0, 8);
  }, [query]);

  const filteredShortcuts =
    shortcutCategory === "Tất cả" ? shortcuts : shortcuts.filter((shortcut) => shortcut.category === shortcutCategory);

  async function copyText(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1500);
  }

  function selectLesson(id: string) {
    setActiveLessonId(id);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setPracticeValue(key: string, value: string) {
    setPracticeInputs((current) => ({ ...current, [key]: value }));
  }

  function resetPracticeValue(key: string) {
    setPracticeInputs((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function runLabShortcut(labKey: string, action: string, currentText: string) {
    const nextText = applyShortcutAction(action, currentText);
    setPracticeValue(labKey, nextText);
    setShortcutFeedback((current) => ({ ...current, [labKey]: `Đã nhận: ${action}` }));
  }

  function handleLabShortcut(event: KeyboardEvent<HTMLTextAreaElement>, labKey: string, currentText: string) {
    const action = getShortcutAction(event);
    if (!action) return;
    event.preventDefault();
    runLabShortcut(labKey, action, currentText);
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "is-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">W</div>
          <div>
            <strong>MOS Word</strong>
            <span>Learning Hub</span>
          </div>
        </div>

        <nav className="lesson-nav" aria-label="Danh sách bài học">
          {(Object.keys(groupLabels) as Array<Lesson["group"]>).map((group) => (
            <section key={group}>
              <p className="nav-group">{groupLabels[group]}</p>
              {lessons
                .filter((lesson) => lesson.group === group)
                .map((lesson) => (
                  <button
                    key={lesson.id}
                    className={`nav-item ${activeLesson.id === lesson.id ? "active" : ""}`}
                    onClick={() => selectLesson(lesson.id)}
                  >
                    <span>{lesson.title}</span>
                    <small>{lesson.minutes} phút</small>
                  </button>
                ))}
            </section>
          ))}
        </nav>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setMobileNavOpen(true)} aria-label="Mở menu">
            <Menu size={20} />
          </button>
          <div className="search-box">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm: lệch bảng, mất số trang, nhảy font..."
            />
            <kbd>Ctrl K</kbd>
          </div>
          <div className="study-streak">
            <Sparkles size={16} />
            <span>{lessons.length} bài trọng tâm</span>
          </div>
        </header>

        {query && (
          <section className="search-results" aria-label="Kết quả tìm kiếm">
            <div className="section-heading">
              <strong>Kết quả tra cứu nhanh</strong>
              <button onClick={() => setQuery("")}>
                <X size={16} /> Đóng
              </button>
            </div>
            {searchResults.length ? (
              <div className="result-list">
                {searchResults.map((result) => (
                  <button
                    key={`${result.type}-${result.title}`}
                    onClick={() => "lessonId" in result && result.lessonId && selectLesson(result.lessonId)}
                  >
                    <span>{result.type}</span>
                    <strong>{result.title}</strong>
                    <small>{result.detail}</small>
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted">Chưa thấy kết quả phù hợp. Thử từ khóa ngắn hơn như “bảng”, “font”, “section”.</p>
            )}
          </section>
        )}

        <section className="hero-panel">
          <div>
            <p className="eyebrow">Lộ trình tự học MOS Word</p>
            <h1>Học bằng checklist, sửa lỗi đúng lúc, luyện lại bằng flashcard.</h1>
            <p>
              Hub này biến tài liệu Word rời rạc thành từng nhiệm vụ nhỏ: hiểu mục tiêu, làm từng bước, tự kiểm tra và tra cứu
              nhanh khi bị kẹt.
            </p>
            <div className="hero-actions">
              <a href="#lesson" className="primary-action">
                Vào bài đang học
              </a>
              <a href="#quick-tools" className="secondary-action">
                Mở công cụ tra cứu
              </a>
            </div>
          </div>
          <div className="route-map" aria-label="Tổng quan lộ trình">
            {Object.entries(groupLabels).map(([key, label], index) => (
              <div key={key} className="route-step">
                <span>{index + 1}</span>
                <strong>{label}</strong>
                <small>{lessons.filter((lesson) => lesson.group === key).length} bài</small>
              </div>
            ))}
          </div>
        </section>

        <div className="content-grid">
          <article id="lesson" className="lesson-content">
            <div className="progress-rail">
              <span style={{ width: `${lessonProgress}%` }} />
            </div>

            <div className="lesson-header">
              <div>
                <p className="eyebrow">{groupLabels[activeLesson.group]}</p>
                <h2>{activeLesson.title}</h2>
                <p>{activeLesson.subtitle}</p>
              </div>
              <div className="lesson-meta">
                <span>{activeLesson.minutes} phút</span>
                <span>{activeLesson.difficulty}</span>
                <span>{lessonProgress}% xong</span>
              </div>
            </div>

            <section className="outcome-band">
              <Target size={22} />
              <div>
                <strong>Mục tiêu sau bài học</strong>
                <p>{activeLesson.outcome}</p>
              </div>
            </section>

            <section className="learning-block theory-section">
              <h3>Lý thuyết cần đọc trước</h3>
              <div className="theory-grid">
                {theoryBlocks.map((block) => (
                  <article key={block.title} className="theory-card">
                    <span>{block.kicker}</span>
                    <strong>{block.title}</strong>
                    <p>{block.body}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="learning-block">
              <h3>Điểm cần nắm</h3>
              <div className="checkpoint-row">
                {activeLesson.checkpoints.map((checkpoint) => (
                  <span key={checkpoint}>
                    <CheckCircle2 size={16} /> {checkpoint}
                  </span>
                ))}
              </div>
            </section>

            <section className="learning-block">
              <h3>Checklist thực hành</h3>
              <div className="step-list">
                {activeLesson.steps.map((step, index) => {
                  const key = `${activeLesson.id}-${index}`;
                  return (
                    <label key={key} className={`step-item ${checkedSteps[key] ? "done" : ""}`}>
                      <input
                        type="checkbox"
                        checked={Boolean(checkedSteps[key])}
                        onChange={(event) => setCheckedSteps((current) => ({ ...current, [key]: event.target.checked }))}
                      />
                      <span>{index + 1}</span>
                      <p>{step}</p>
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="learning-block">
              <div className="callout-grid">
                <div className="callout info">
                  <Lightbulb size={20} />
                  <strong>Mẹo học nhanh</strong>
                  {activeLesson.tips.map((tip) => (
                    <p key={tip}>{tip}</p>
                  ))}
                </div>
                <div className="callout warning">
                  <Filter size={20} />
                  <strong>Lỗi dễ mất điểm</strong>
                  {activeLesson.mistakes.map((mistake) => (
                    <p key={mistake}>{mistake}</p>
                  ))}
                </div>
              </div>
            </section>

            <section className="learning-block">
              <h3>Copy nhanh thông số</h3>
              <div className="command-list">
                {activeLesson.quickCommands.map((command) => (
                  <div key={command.label} className="command-item">
                    <div>
                      <strong>{command.label}</strong>
                      <code>{command.value}</code>
                      <small>{command.note}</small>
                    </div>
                    <button onClick={() => copyText(command.value, command.label)}>
                      <Clipboard size={16} /> {copied === command.label ? "Đã copy" : "Copy"}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="learning-block">
              <h3>Flashcard tự kiểm tra</h3>
              <div className="flashcard-grid">
                {activeLesson.miniQuiz.map((card, index) => {
                  const key = `${activeLesson.id}-quiz-${index}`;
                  return (
                    <button
                      key={key}
                      className={`flashcard ${flippedCards[key] ? "flipped" : ""}`}
                      onClick={() => setFlippedCards((current) => ({ ...current, [key]: !current[key] }))}
                    >
                      <span>{flippedCards[key] ? "Đáp án" : "Câu hỏi"}</span>
                      <strong>{flippedCards[key] ? card.answer : card.question}</strong>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="learning-block">
              <h3>Practice lab trên web</h3>
              <p className="section-note">
                Làm trực tiếp trong ô soạn thảo mini trước, sau đó mở Word và lặp lại thao tác bằng ribbon thật.
              </p>
              <div className="practice-lab-list">
                {practiceLabs.map((lab, index) => {
                  const labKey = `${activeLesson.id}-lab-${index}`;
                  const draft = practiceInputs[labKey] ?? lab.starterText;
                  return (
                    <article key={labKey} className="practice-lab">
                      <div className="practice-lab-head">
                        <span>Lab {index + 1}</span>
                        <strong>{lab.title}</strong>
                        <p>{lab.brief}</p>
                      </div>
                      <div className="mini-editor">
                        <div className="mini-toolbar" aria-label="Thanh công cụ mô phỏng">
                          <button onClick={() => runLabShortcut(labKey, "Shift + F3", draft)}>Shift + F3</button>
                          <button onClick={() => runLabShortcut(labKey, "Ctrl + B", draft)}>Ctrl + B</button>
                          <button onClick={() => runLabShortcut(labKey, "Ctrl + Enter", draft)}>Ctrl + Enter</button>
                          <button onClick={() => runLabShortcut(labKey, "Ctrl + Shift + 8", draft)}>Ctrl + Shift + 8</button>
                          <button onClick={() => runLabShortcut(labKey, "F4", draft)}>F4</button>
                          <button onClick={() => resetPracticeValue(labKey)}>Reset</button>
                        </div>
                        <div className="shortcut-practice-strip">
                          <PenLine size={16} />
                          <span>Đặt con trỏ trong ô và bấm phím tắt thật: Ctrl+B, Ctrl+Enter, Ctrl+Shift+8, F4, Shift+F3.</span>
                        </div>
                        <textarea
                          value={draft}
                          onChange={(event) => setPracticeValue(labKey, event.target.value)}
                          onKeyDown={(event) => handleLabShortcut(event, labKey, draft)}
                          aria-label={`Bài thực hành ${lab.title}`}
                        />
                        {shortcutFeedback[labKey] && <p className="shortcut-feedback">{shortcutFeedback[labKey]}</p>}
                      </div>
                      <div className="practice-columns">
                        <div>
                          <strong>Nhiệm vụ cần làm</strong>
                          {lab.tasks.map((task, taskIndex) => {
                            const taskKey = `${labKey}-task-${taskIndex}`;
                            return (
                              <label key={taskKey} className="micro-check">
                                <input
                                  type="checkbox"
                                  checked={Boolean(checkedSteps[taskKey])}
                                  onChange={(event) =>
                                    setCheckedSteps((current) => ({ ...current, [taskKey]: event.target.checked }))
                                  }
                                />
                                <span>{task}</span>
                              </label>
                            );
                          })}
                        </div>
                        <div>
                          <div className="self-check-head">
                            <strong>Đáp án / tiêu chí đúng</strong>
                            <button
                              onClick={() =>
                                setRevealedPractice((current) => ({ ...current, [labKey]: !current[labKey] }))
                              }
                            >
                              {revealedPractice[labKey] ? "Ẩn" : "Xem đáp án"}
                            </button>
                          </div>
                          {revealedPractice[labKey] ? (
                            <ul>
                              {lab.selfCheck.map((check) => (
                                <li key={check}>{check}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="muted">Hoàn thành bài trước, rồi mở đáp án để tự chấm.</p>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="learning-block">
              <div className="quiz-title-row">
                <div>
                  <h3>Test trắc nghiệm</h3>
                  <p className="section-note">Chọn đáp án để xem phản hồi ngay. Mỗi bài có 5-10 câu tùy lượng nội dung.</p>
                </div>
                <div className="quiz-score">
                  <Brain size={18} />
                  <span>
                    {correctQuizCount}/{knowledgeChecks.length} đúng
                  </span>
                </div>
              </div>
              <div className="mcq-list">
                {knowledgeChecks.map((question, index) => {
                  const questionKey = `${activeLesson.id}-mcq-${index}`;
                  const selected = quizAnswers[questionKey];
                  return (
                    <article key={questionKey} className="mcq-item">
                      <strong>
                        Câu {index + 1}. {question.question}
                      </strong>
                      <div className="mcq-options">
                        {question.options.map((option) => {
                          const isSelected = selected === option;
                          const isCorrect = question.answer === option;
                          const className = selected ? (isCorrect ? "correct" : isSelected ? "wrong" : "") : "";
                          return (
                            <button
                              key={option}
                              className={className}
                              onClick={() => setQuizAnswers((current) => ({ ...current, [questionKey]: option }))}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                      {selected && (
                        <p className={`quiz-feedback ${selected === question.answer ? "good" : "bad"}`}>
                          {selected === question.answer ? "Đúng." : `Chưa đúng. Đáp án đúng: ${question.answer}`}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>

            <footer className="lesson-switcher">
              <button disabled={activeIndex === 0} onClick={() => selectLesson(lessons[activeIndex - 1].id)}>
                Bài trước
              </button>
              <button disabled={activeIndex === lessons.length - 1} onClick={() => selectLesson(lessons[activeIndex + 1].id)}>
                Bài tiếp theo
              </button>
            </footer>
          </article>

          <aside id="quick-tools" className="quick-tools">
            <section>
              <div className="tool-heading">
                <BookOpen size={18} />
                <strong>Phím tắt thông minh</strong>
              </div>
              <div className="chip-row">
                {shortcutCategories.map((category) => (
                  <button
                    key={category}
                    className={shortcutCategory === category ? "selected" : ""}
                    onClick={() => setShortcutCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="shortcut-list">
                {filteredShortcuts.map((shortcut) => (
                  <div key={`${shortcut.keys}-${shortcut.action}`}>
                    <kbd>{shortcut.keys}</kbd>
                    <span>{shortcut.action}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="tool-heading">
                <LayoutList size={18} />
                <strong>Lỗi thường gặp</strong>
              </div>
              <div className="error-list">
                {commonErrors.slice(0, 4).map((error) => (
                  <details key={error.title}>
                    <summary>{error.title}</summary>
                    <p>{error.symptoms}</p>
                    <strong>{error.fix}</strong>
                  </details>
                ))}
              </div>
            </section>

            <section className="exam-note">
              <GraduationCap size={20} />
              <strong>Gợi ý học hiệu quả</strong>
              <p>Học viên nên mở Word song song, hoàn thành checklist trước, sau đó lật flashcard để tự nói lại thao tác.</p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

function getTheoryBlocks(lesson: Lesson) {
  return [
    {
      kicker: "Ý chính",
      title: "Học phần này giải quyết vấn đề gì?",
      body: `${lesson.subtitle} ${lesson.outcome}`,
    },
    {
      kicker: "Quy tắc",
      title: "Nguyên tắc cần nhớ",
      body: lesson.tips[0] ?? "Đọc mục tiêu, làm checklist, sau đó tự kiểm tra bằng bài tập và trắc nghiệm.",
    },
    {
      kicker: "Cảnh báo",
      title: "Lỗi dễ làm sai",
      body: lesson.mistakes[0] ?? "Không nên làm thủ công bằng Space hoặc Enter khi Word đã có công cụ chuyên dụng.",
    },
  ];
}

function getPracticeLabs(lesson: Lesson): PracticeLab[] {
  const labs: PracticeLab[] = [];

  lesson.examples.slice(0, 2).forEach((example) => {
    labs.push({
      title: example.title,
      brief: example.brief,
      starterText: example.sample,
      tasks: example.expected,
      selfCheck: example.expected,
    });
  });

  lesson.exercises.slice(0, 1).forEach((exercise) => {
    labs.push({
      title: exercise.title,
      brief: exercise.prompt,
      starterText: buildStarterText(lesson),
      tasks: exercise.tasks,
      selfCheck: exercise.selfCheck,
    });
  });

  labs.push({
    title: `Áp dụng nhanh: ${lesson.title}`,
    brief: "Tự tạo một phiên bản nhỏ của thao tác trong bài ngay trên web trước khi làm trong Word.",
    starterText: [
      lesson.title,
      "",
      "Mục tiêu:",
      lesson.outcome,
      "",
      "Nội dung nháp: hãy chỉnh, thêm checklist, đánh dấu Page Break hoặc viết lại theo yêu cầu.",
    ].join("\n"),
    tasks: [
      lesson.steps[0] ?? "Đọc kỹ yêu cầu của bài.",
      lesson.steps[1] ?? "Thực hiện thao tác chính trong Word.",
      lesson.quickCommands[0]?.value ?? "Ghi lại thông số hoặc lệnh cần nhớ.",
    ],
    selfCheck: [
      lesson.checkpoints[0] ?? "Kết quả đúng mục tiêu bài học.",
      lesson.checkpoints[1] ?? "Không dùng thao tác thủ công dễ lệch.",
      lesson.tips[0] ?? "Có thể giải thích lại vì sao làm như vậy.",
    ],
  });

  return labs.slice(0, 3);
}

function buildStarterText(lesson: Lesson) {
  const command = lesson.quickCommands[0]?.value ? `\nThông số gợi ý: ${lesson.quickCommands[0].value}` : "";
  return `${lesson.title}\n\nĐoạn nháp thực hành:\n${lesson.subtitle}${command}\n\nViệc cần làm:\n- Chỉnh nội dung theo yêu cầu.\n- Tự kiểm tra bằng checklist bên dưới.`;
}

function getShortcutAction(event: KeyboardEvent<HTMLTextAreaElement>) {
  const key = event.key.toLowerCase();
  if (event.ctrlKey && key === "b") return "Ctrl + B";
  if (event.ctrlKey && key === "i") return "Ctrl + I";
  if (event.ctrlKey && key === "u") return "Ctrl + U";
  if (event.ctrlKey && key === "enter") return "Ctrl + Enter";
  if (event.ctrlKey && event.shiftKey && (event.key === "8" || event.key === "*")) return "Ctrl + Shift + 8";
  if (event.shiftKey && key === "f3") return "Shift + F3";
  if (key === "f4") return "F4";
  return "";
}

function applyShortcutAction(action: string, text: string) {
  switch (action) {
    case "Ctrl + B":
      return wrapLastLine(text, "**", "**");
    case "Ctrl + I":
      return wrapLastLine(text, "_", "_");
    case "Ctrl + U":
      return wrapLastLine(text, "__", "__");
    case "Ctrl + Enter":
      return `${text}\n\n[Page Break]\n`;
    case "Ctrl + Shift + 8":
      return `${text}\n\n¶ Hiển thị ký tự định dạng: dấu đoạn, tab, page break, section break.`;
    case "Shift + F3":
      return cycleCase(text);
    case "F4":
      return `${text}\n\n[Lặp lại thao tác gần nhất]`;
    default:
      return text;
  }
}

function wrapLastLine(text: string, prefix: string, suffix: string) {
  const lines = text.split("\n");
  const lastIndex = Math.max(0, lines.length - 1);
  lines[lastIndex] = `${prefix}${lines[lastIndex] || "văn bản đã chọn"}${suffix}`;
  return lines.join("\n");
}

function cycleCase(text: string) {
  if (text === text.toUpperCase()) return text.toLowerCase();
  return text.toUpperCase();
}

function getKnowledgeChecks(lesson: Lesson): KnowledgeQuestion[] {
  const distractors = [
    "Dùng nhiều dấu cách để căn chỉnh nhanh",
    "Nhấn Enter nhiều lần để đẩy nội dung",
    "Gõ thủ công để dễ kiểm soát hơn",
    "Bỏ qua bước kiểm tra vì Word tự xử lý",
    "Chỉ tô đậm chữ, không cần dùng tính năng",
    "Xuất file ngay mà không xem lại",
  ];

  const fromCards = lesson.miniQuiz.map((card, index) => ({
    question: card.question,
    answer: card.answer,
    options: makeOptions(card.answer, lesson.miniQuiz.map((item) => item.answer), distractors, index),
  }));

  const generated: KnowledgeQuestion[] = [
    {
      question: `Mục tiêu đúng nhất của bài "${lesson.title}" là gì?`,
      answer: lesson.outcome,
      options: makeOptions(lesson.outcome, lesson.mistakes, distractors, 1),
    },
    {
      question: "Thao tác nào nên ưu tiên khi luyện bài này?",
      answer: lesson.steps[0] ?? lesson.outcome,
      options: makeOptions(lesson.steps[0] ?? lesson.outcome, lesson.mistakes, distractors, 2),
    },
    {
      question: "Lỗi nào cần tránh trong bài này?",
      answer: lesson.mistakes[0] ?? "Làm thủ công bằng Space hoặc Enter khi có công cụ đúng.",
      options: makeOptions(lesson.mistakes[0] ?? "Làm thủ công bằng Space hoặc Enter khi có công cụ đúng.", lesson.tips, distractors, 3),
    },
    {
      question: "Mẹo nào giúp làm bài hiệu quả hơn?",
      answer: lesson.tips[0] ?? lesson.outcome,
      options: makeOptions(lesson.tips[0] ?? lesson.outcome, lesson.mistakes, distractors, 4),
    },
  ];

  return [...fromCards, ...generated].slice(0, 10).slice(0, Math.max(5, Math.min(10, fromCards.length + generated.length)));
}

function makeOptions(answer: string, nearby: string[], fallback: string[], seed: number) {
  const options = [answer, ...nearby.filter((item) => item !== answer), ...fallback.filter((item) => item !== answer)]
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 4);

  while (options.length < 4) {
    options.push(fallback[options.length] ?? "Kiểm tra lại bằng Print Preview");
  }

  return rotate(options, seed);
}

function rotate<T>(items: T[], seed: number) {
  const offset = seed % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}
