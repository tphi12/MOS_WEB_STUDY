import { useEffect, useMemo, useState } from "react";
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
  Music,
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

type KnowledgeQuestion = {
  question: string;
  options: string[];
  answer: string;
};

type MosTheory = {
  objective: string;
  overview: string;
  concepts: string[];
  standardSteps: string[];
  avoid: string[];
  selfCheck: string[];
};

type SequenceQuestion = {
  prompt: string;
  steps: string[];
  initialSteps: string[];
};

type ShortcutChallenge = {
  prompt: string;
  expected: string;
  hint: string;
};

type PersonalizedPlan = {
  readiness: "exam-ready" | "needs-practice";
  mosScore: number;
  recommendedLessonId: string;
  reason: string;
  weakSkills: Array<{ skillTag: string; masteryPercent: number; avgSeconds?: number }>;
  recommendations: Array<{ priority: string; message: string; skillTags: string[] }>;
  learningRules: string[];
};

const shortcutCategories: Array<Shortcut["category"] | "Tất cả"> = [
  "Tất cả",
  "Định dạng",
  "Di chuyển",
  "Tài liệu",
  "Nâng cao",
];

const spotifyStations = [
  {
    id: "deep-focus",
    label: "Deep Focus",
    mood: "Nhạc nền tập trung",
    embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DX8NTLI2TtZa6?utm_source=generator",
    openUrl: "https://open.spotify.com/playlist/37i9dQZF1DX8NTLI2TtZa6",
  },
  {
    id: "peaceful-piano",
    label: "Peaceful Piano",
    mood: "Nhẹ, ít lời",
    embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LiO?utm_source=generator",
    openUrl: "https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO",
  },
  {
    id: "lofi-focus",
    label: "Lofi Focus",
    mood: "Làm quiz thư thái",
    embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DX3PFzdbtx1Us?utm_source=generator",
    openUrl: "https://open.spotify.com/playlist/37i9dQZF1DX3PFzdbtx1Us",
  },
];

export function App() {
  const [activeLessonId, setActiveLessonId] = useState(lessons[0].id);
  const [query, setQuery] = useState("");
  const [shortcutCategory, setShortcutCategory] = useState<(typeof shortcutCategories)[number]>("Tất cả");
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [sequenceOrders, setSequenceOrders] = useState<Record<string, string[]>>({});
  const [sequenceChecked, setSequenceChecked] = useState<Record<string, boolean>>({});
  const [shortcutCaptures, setShortcutCaptures] = useState<Record<string, string>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [remotePlan, setRemotePlan] = useState<PersonalizedPlan | null>(null);
  const [activeSpotifyId, setActiveSpotifyId] = useState(spotifyStations[0].id);
  const [customSpotifyInput, setCustomSpotifyInput] = useState("");
  const [customSpotifyStation, setCustomSpotifyStation] = useState<(typeof spotifyStations)[number] | null>(null);
  const [customSpotifyError, setCustomSpotifyError] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? lessons[0];
  const activeIndex = lessons.findIndex((lesson) => lesson.id === activeLesson.id);
  const lessonStepKeys = activeLesson.steps.map((_, index) => `${activeLesson.id}-${index}`);
  const completedSteps = lessonStepKeys.filter((key) => checkedSteps[key]).length;
  const lessonProgress = Math.round((completedSteps / activeLesson.steps.length) * 100);
  const theoryBlocks = getTheoryBlocks(activeLesson);
  const mosTheory = getMosTheory(activeLesson);
  const knowledgeChecks = getKnowledgeChecks(activeLesson);
  const sequenceQuestions = getSequenceQuestions(activeLesson);
  const shortcutChallenges = getShortcutChallenges(activeLesson);
  const correctQuizCount = knowledgeChecks.filter((question, index) => {
    const key = `${activeLesson.id}-mcq-${index}`;
    return quizAnswers[key] === question.answer;
  }).length;
  const localPlan = useMemo(
    () => buildLocalPersonalizedPlan(checkedSteps, quizAnswers, activeLesson.id),
    [activeLesson.id, checkedSteps, quizAnswers],
  );
  const personalizedPlan = remotePlan ?? localPlan;
  const recommendedLesson = lessons.find((lesson) => lesson.id === personalizedPlan.recommendedLessonId) ?? activeLesson;
  const availableSpotifyStations = customSpotifyStation ? [customSpotifyStation, ...spotifyStations] : spotifyStations;
  const activeSpotify = availableSpotifyStations.find((station) => station.id === activeSpotifyId) ?? availableSpotifyStations[0];

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

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
    fetch(`${apiUrl}/api/students/u-student-1/personalization`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Cannot load personalization"))))
      .then((data: PersonalizedPlan) => setRemotePlan(data))
      .catch(() => setRemotePlan(null));
  }, []);

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

  function moveSequenceStep(questionKey: string, fallbackSteps: string[], index: number, direction: -1 | 1) {
    const current = sequenceOrders[questionKey] ?? fallbackSteps;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= current.length) return;
    const next = [...current];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setSequenceOrders((state) => ({ ...state, [questionKey]: next }));
    setSequenceChecked((state) => ({ ...state, [questionKey]: false }));
  }

  function resetSequence(questionKey: string) {
    setSequenceOrders((state) => {
      const next = { ...state };
      delete next[questionKey];
      return next;
    });
    setSequenceChecked((state) => ({ ...state, [questionKey]: false }));
  }

  function useCustomSpotifyPlaylist() {
    const playlistId = extractSpotifyPlaylistId(customSpotifyInput);
    if (!playlistId) {
      setCustomSpotifyError("Dán link playlist Spotify dạng open.spotify.com/playlist/... hoặc spotify:playlist:...");
      return;
    }

    const nextStation = {
      id: "custom-playlist",
      label: "Playlist của tôi",
      mood: "Từ Spotify cá nhân",
      embedUrl: `https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator`,
      openUrl: `https://open.spotify.com/playlist/${playlistId}`,
    };
    setCustomSpotifyStation(nextStation);
    setActiveSpotifyId(nextStation.id);
    setCustomSpotifyError("");
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
            <h1>Chung Khả Vy dễ thương.</h1>
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

        <section className="personalized-panel" aria-label="Lộ trình cá nhân hóa">
          <div className="personalized-copy">
            <p className="eyebrow">Lộ trình cá nhân hóa</p>
            <h2>{personalizedPlan.readiness === "exam-ready" ? "Đã sẵn sàng luyện đề chuẩn MOS" : "Nên ôn theo kỹ năng yếu trước"}</h2>
            <p>{personalizedPlan.reason}</p>
            <button onClick={() => selectLesson(recommendedLesson.id)}>Học bài được gợi ý</button>
          </div>
          <div className="recommended-lesson-card">
            <span>Bài nên học tiếp</span>
            <strong>{recommendedLesson.title}</strong>
            <small>{recommendedLesson.subtitle}</small>
          </div>
          <div className="mastery-card">
            <span>Skill Mastery</span>
            {personalizedPlan.weakSkills.length ? (
              personalizedPlan.weakSkills.slice(0, 3).map((skill) => (
                <div key={skill.skillTag} className="mastery-row">
                  <div>
                    <strong>{skill.skillTag}</strong>
                    <small>{skill.masteryPercent}% thành thạo</small>
                  </div>
                  <span style={{ width: `${skill.masteryPercent}%` }} />
                </div>
              ))
            ) : (
              <p className="muted">Chưa có dữ liệu yếu rõ ràng. Hệ thống sẽ cập nhật sau khi bạn làm quiz/test.</p>
            )}
          </div>
        </section>

        <section className="spotify-study-panel" aria-label="Spotify study music">
          <div className="spotify-panel-head">
            <div>
              {/* <p className="eyebrow">Study music</p> */}
              <h2>
                <Music size={22} /> Nghe Spotify khi học
              </h2>
              {/* <p>Bật nhạc nền nhẹ để đọc lý thuyết, làm flashcard hoặc luyện quiz lâu hơn mà đỡ khô.</p> */}
            </div>
            <a href={activeSpotify.openUrl} target="_blank" rel="noreferrer">
              Mở trên Spotify
            </a>
          </div>
          <div className="spotify-tabs" role="tablist" aria-label="Chọn playlist Spotify">
            {availableSpotifyStations.map((station) => (
              <button
                key={station.id}
                className={activeSpotify.id === station.id ? "active" : ""}
                onClick={() => setActiveSpotifyId(station.id)}
              >
                <strong>{station.label}</strong>
                <small>{station.mood}</small>
              </button>
            ))}
          </div>
          <div className="spotify-custom-form">
            <input
              value={customSpotifyInput}
              onChange={(event) => setCustomSpotifyInput(event.target.value)}
              placeholder="Dán link playlist Spotify của bạn"
              aria-label="Link playlist Spotify cá nhân"
            />
            <button onClick={useCustomSpotifyPlaylist}>Dùng playlist này</button>
          </div>
          {customSpotifyError && <p className="spotify-error">{customSpotifyError}</p>}
          <iframe
            title={`Spotify playlist ${activeSpotify.label}`}
            src={activeSpotify.embedUrl}
            width="100%"
            height="152"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
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

            <section className="learning-block mos-theory-block">
              <div className="mos-theory-card">
                <span>Lý thuyết MOS Word 2021</span>
                <strong>{mosTheory.objective}</strong>
                <p>{mosTheory.overview}</p>
                <div className="mos-theory-grid">
                  {[
                    ["Khái niệm cần hiểu", mosTheory.concepts],
                    ["Quy trình thao tác chuẩn", mosTheory.standardSteps],
                    ["Lỗi cần tránh", mosTheory.avoid],
                    ["Tự kiểm tra", mosTheory.selfCheck],
                  ].map(([title, items]) => (
                    <article key={title as string} className="mos-theory-panel">
                      <h4>{title as string}</h4>
                      <ul>
                        {(items as string[]).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className="learning-block theory-section">
              <h3>Lý thuyết cần nắm</h3>
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
              <div className="quiz-title-row">
                <div>
                  <h3>Thực hành tương tác</h3>
                  {/* <p className="section-note">Luyện thứ tự thao tác và phím tắt theo tình huống, không chỉ chọn đáp án.</p> */}
                </div>
              </div>
              <div className="interactive-grid">
                <div className="sequence-list">
                  {sequenceQuestions.map((question, questionIndex) => {
                    const questionKey = `${activeLesson.id}-sequence-${questionIndex}`;
                    const currentOrder = sequenceOrders[questionKey] ?? question.initialSteps;
                    const isChecked = sequenceChecked[questionKey];
                    const isCorrect = arraysEqual(currentOrder, question.steps);
                    return (
                      <article key={questionKey} className="sequence-card">
                        <span>Sequence Matching</span>
                        <strong>{question.prompt}</strong>
                        <div className="sequence-steps">
                          {currentOrder.map((step, index) => (
                            <div key={`${questionKey}-${step}`} className="sequence-step">
                              <b>{index + 1}</b>
                              <p>{step}</p>
                              <div>
                                <button onClick={() => moveSequenceStep(questionKey, question.initialSteps, index, -1)} disabled={index === 0}>
                                  ↑
                                </button>
                                <button
                                  onClick={() => moveSequenceStep(questionKey, question.initialSteps, index, 1)}
                                  disabled={index === currentOrder.length - 1}
                                >
                                  ↓
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="practice-actions">
                          <button onClick={() => setSequenceChecked((state) => ({ ...state, [questionKey]: true }))}>Kiểm tra</button>
                          <button onClick={() => resetSequence(questionKey)}>Reset</button>
                        </div>
                        {isChecked && (
                          <p className={`quiz-feedback ${isCorrect ? "good" : "bad"}`}>
                            {isCorrect ? "Đúng thứ tự thao tác." : "Chưa đúng thứ tự. Hãy xem lại checklist của bài."}
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>

                <div className="shortcut-master-list">
                  {shortcutChallenges.map((challenge, challengeIndex) => {
                    const challengeKey = `${activeLesson.id}-shortcut-${challengeIndex}`;
                    const captured = shortcutCaptures[challengeKey] ?? "";
                    const isCorrect = captured === challenge.expected;
                    return (
                      <article key={challengeKey} className="shortcut-master-card">
                        <span>Shortcut Master</span>
                        <strong>{challenge.prompt}</strong>
                        <button
                          className={`shortcut-capture ${captured ? (isCorrect ? "correct" : "wrong") : ""}`}
                          onKeyDown={(event) => {
                            event.preventDefault();
                            setShortcutCaptures((state) => ({ ...state, [challengeKey]: formatShortcutEvent(event) }));
                          }}
                        >
                          {captured || "Bấm tổ hợp phím tại đây"}
                        </button>
                        <small>{captured && !isCorrect ? `Gợi ý: ${challenge.hint}` : challenge.hint}</small>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="learning-block">
              <div className="quiz-title-row">
                <div>
                  <h3>Test trắc nghiệm</h3>
                  {/* <p className="section-note">Chọn đáp án để xem phản hồi ngay. Mỗi bài có 5-10 câu tùy lượng nội dung.</p> */}
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

function getSequenceQuestions(lesson: Lesson): SequenceQuestion[] {
  const primarySteps = lesson.steps.slice(1, 5).length >= 3 ? lesson.steps.slice(1, 5) : lesson.steps.slice(0, 4);
  const commandSteps = lesson.quickCommands.slice(0, 3).map((command) => command.value);
  const questions: SequenceQuestion[] = [];

  if (primarySteps.length >= 3) {
    questions.push({
      prompt: `Sắp xếp quy trình thao tác chính của bài "${lesson.title}".`,
      steps: primarySteps,
      initialSteps: rotate(primarySteps, 1),
    });
  }

  if (commandSteps.length >= 3) {
    questions.push({
      prompt: "Sắp xếp các lệnh nhanh theo thứ tự nên kiểm tra khi làm bài.",
      steps: commandSteps,
      initialSteps: rotate(commandSteps, 2),
    });
  }

  return questions.slice(0, 2);
}

function getShortcutChallenges(lesson: Lesson): ShortcutChallenge[] {
  const byLesson: Record<string, ShortcutChallenge[]> = {
    "page-setup-document-properties": [
      { prompt: "Chèn ngắt trang nhanh", expected: "Ctrl + Enter", hint: "Ctrl + Enter" },
      { prompt: "Lưu tài liệu trước khi xuất PDF", expected: "Ctrl + S", hint: "Ctrl + S" },
    ],
    "normal-style-paragraph": [
      { prompt: "Căn đều hai bên đoạn văn", expected: "Ctrl + J", hint: "Ctrl + J" },
      { prompt: "Giãn dòng 1.5", expected: "Ctrl + 5", hint: "Ctrl + 5" },
    ],
    "heading-toc-navigation": [
      { prompt: "Mở Navigation Pane / tìm kiếm", expected: "Ctrl + F", hint: "Ctrl + F" },
      { prompt: "Cập nhật field đang chọn", expected: "F9", hint: "F9" },
    ],
    "page-number-section-break": [
      { prompt: "Hiện ký tự ẩn để kiểm tra break", expected: "Ctrl + Shift + 8", hint: "Ctrl + Shift + 8" },
      { prompt: "Chèn Page Break nhanh", expected: "Ctrl + Enter", hint: "Ctrl + Enter" },
    ],
    "academic-forms-appendix-export": [
      { prompt: "Lưu tài liệu", expected: "Ctrl + S", hint: "Ctrl + S" },
      { prompt: "Chọn toàn bộ nội dung để kiểm tra field", expected: "Ctrl + A", hint: "Ctrl + A" },
    ],
    "administrative-documents": [
      { prompt: "Căn giữa quốc hiệu - tiêu ngữ", expected: "Ctrl + E", hint: "Ctrl + E" },
      { prompt: "In đậm dòng tiêu đề", expected: "Ctrl + B", hint: "Ctrl + B" },
    ],
    "tips-shortcuts": [
      { prompt: "Lặp lại thao tác gần nhất", expected: "F4", hint: "F4" },
      { prompt: "Đổi hoa/thường vùng chọn", expected: "Shift + F3", hint: "Shift + F3" },
    ],
    "common-errors": [
      { prompt: "Hiện ký tự ẩn để bắt lỗi Enter dư", expected: "Ctrl + Shift + 8", hint: "Ctrl + Shift + 8" },
      { prompt: "Cập nhật toàn bộ field sau khi sửa", expected: "Ctrl + A", hint: "Bước 1 là Ctrl + A, sau đó F9" },
    ],
    "review-protect-compare": [
      { prompt: "Thêm comment nhanh", expected: "Ctrl + Alt + M", hint: "Ctrl + Alt + M" },
      { prompt: "Lưu bản trước khi Compare", expected: "Ctrl + S", hint: "Ctrl + S" },
    ],
  };

  return (
    byLesson[lesson.id] ?? [
      { prompt: "Lưu tài liệu", expected: "Ctrl + S", hint: "Ctrl + S" },
      { prompt: "Chọn toàn bộ văn bản", expected: "Ctrl + A", hint: "Ctrl + A" },
    ]
  );
}

function formatShortcutEvent(event: KeyboardEvent<HTMLButtonElement>) {
  const parts: string[] = [];
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");

  const keyMap: Record<string, string> = {
    " ": "Space",
    Control: "",
    Alt: "",
    Shift: "",
    Meta: "",
    Enter: "Enter",
    F3: "F3",
    F4: "F4",
    F9: "F9",
  };
  const key = keyMap[event.key] ?? event.key.toUpperCase();
  if (key) parts.push(key);
  return parts.join(" + ");
}

function arraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function extractSpotifyPlaylistId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const uriMatch = trimmed.match(/^spotify:playlist:([A-Za-z0-9]+)$/);
  if (uriMatch) return uriMatch[1];

  const urlMatch = trimmed.match(/open\.spotify\.com\/playlist\/([A-Za-z0-9]+)/);
  if (urlMatch) return urlMatch[1];

  const idMatch = trimmed.match(/^[A-Za-z0-9]{16,}$/);
  return idMatch ? trimmed : "";
}

function buildLocalPersonalizedPlan(
  checkedSteps: Record<string, boolean>,
  quizAnswers: Record<string, string>,
  activeLessonId: string,
): PersonalizedPlan {
  const progressByLesson = lessons.map((lesson) => {
    const completedSteps = lesson.steps.filter((_, index) => checkedSteps[`${lesson.id}-${index}`]).length;
    const progress = lesson.steps.length ? Math.round((completedSteps / lesson.steps.length) * 100) : 0;
    const checks = getKnowledgeChecks(lesson);
    const correctQuiz = checks.filter((question, index) => quizAnswers[`${lesson.id}-mcq-${index}`] === question.answer).length;
    const quizPercent = checks.length ? Math.round((correctQuiz / checks.length) * 100) : 0;
    return { lesson, progress, quizPercent };
  });
  const activeProgress = progressByLesson.find((item) => item.lesson.id === activeLessonId) ?? progressByLesson[0];
  const nextBlocked =
    progressByLesson.find((item) => item.progress < 80 || item.quizPercent < 80) ??
    progressByLesson[Math.min(progressByLesson.length - 1, progressByLesson.findIndex((item) => item.lesson.id === activeLessonId) + 1)] ??
    progressByLesson[0];
  const weakSkill = mapLessonToSkill(nextBlocked.lesson.id);

  return {
    readiness: activeProgress.progress >= 80 && activeProgress.quizPercent >= 80 ? "exam-ready" : "needs-practice",
    mosScore: Math.round(100 + ((activeProgress.progress + activeProgress.quizPercent) / 200) * 900),
    recommendedLessonId: nextBlocked.lesson.id,
    reason:
      activeProgress.progress < 80
        ? "Bạn chưa hoàn thành đủ checklist của bài hiện tại, nên hệ thống ưu tiên giữ nhịp học ở bài này."
        : activeProgress.quizPercent < 80
          ? "Điểm kiểm tra của bài hiện tại chưa đạt ngưỡng 80%, nên hệ thống đề xuất ôn lại trước khi sang bài mới."
          : "Bạn đang đi đúng nhịp. Hệ thống đề xuất bài kế tiếp trong lộ trình để tiếp tục mở rộng kỹ năng.",
    weakSkills: [
      {
        skillTag: weakSkill,
        masteryPercent: Math.max(20, Math.min(95, Math.round((nextBlocked.progress + nextBlocked.quizPercent) / 2))),
      },
    ],
    recommendations: [
      {
        priority: "practice",
        message: `Ôn lại ${weakSkill}, hoàn thành checklist và làm đúng tối thiểu 80% câu hỏi của bài.`,
        skillTags: [weakSkill],
      },
    ],
    learningRules: [
      "Checklist dưới 80%: chưa nên chuyển bài.",
      "Quiz dưới 80%: hệ thống đề xuất ôn lại lý thuyết và flashcard.",
      "Khi đủ tiến độ và quiz, bài kế tiếp sẽ được ưu tiên.",
    ],
  };
}

function mapLessonToSkill(lessonId: string) {
  const map: Record<string, string> = {
    "page-setup-document-properties": "layout",
    "normal-style-paragraph": "paragraph",
    "heading-toc-navigation": "heading-toc",
    "page-number-section-break": "section-page-number",
    "objects-captions-citations": "caption-reference",
    "academic-forms-appendix-export": "tables-forms",
    "administrative-documents": "document-format",
    "tips-shortcuts": "shortcut-speed",
    "common-errors": "troubleshooting",
    "mail-merge": "mail-merge",
    "review-protect-compare": "review-protect",
  };

  return map[lessonId] ?? "word-foundation";
}

function getMosTheory(lesson: Lesson): MosTheory {
  const theory: Record<string, { objective: string; body: string; bullets: string[] }> = {
    "page-setup-document-properties": {
      objective: "Manage documents - Format documents",
      body: "Trong MOS Word 2021, định dạng tài liệu không chỉ là làm đẹp. Học viên cần kiểm soát page setup, vùng in, hướng giấy, lề, theme/font và kiểm tra trước khi in hoặc xuất PDF.",
      bullets: ["Thiết lập Size, Orientation, Margins trước khi nhập nhiều nội dung.", "Dùng Print Preview để phát hiện tràn lề, sai khổ giấy, sai hướng trang.", "Không dùng Space hoặc Enter để thay thế lề, tab, page break hay section break."],
    },
    "normal-style-paragraph": {
      objective: "Insert and format text, paragraphs, and sections",
      body: "MOS chấm khả năng dùng công cụ định dạng đúng chỗ: Style, Paragraph, indentation, spacing và line spacing. Normal Style giúp toàn bộ thân bài đồng bộ thay vì sửa thủ công từng đoạn.",
      bullets: ["Ưu tiên Modify Style thay vì quét chọn toàn bộ rồi chỉnh rời rạc.", "First line indent và spacing phải đến từ Paragraph, không phải Space/Enter.", "Justify, line spacing và font size cần thống nhất trên toàn tài liệu."],
    },
    "heading-toc-navigation": {
      objective: "Create and manage reference tables",
      body: "Mục lục tự động trong Word phụ thuộc vào Heading Styles. Nếu chỉ tô đậm hoặc phóng to tiêu đề, Word không hiểu đó là cấu trúc tài liệu.",
      bullets: ["Heading 1/2/3 tạo cấu trúc cho Navigation Pane và Table of Contents.", "Sau khi sửa tiêu đề hoặc thêm mục, phải Update entire table.", "Không gõ mục lục thủ công bằng dấu chấm vì số trang sẽ sai khi nội dung đổi."],
    },
    "page-number-section-break": {
      objective: "Create and configure document sections",
      body: "Section là ranh giới để mỗi phần có header/footer, số trang, hướng giấy hoặc bố cục riêng. Đây là nhóm kỹ năng rất hay xuất hiện trong bài thi MOS.",
      bullets: ["Page Break chỉ sang trang mới; Section Break tạo vùng cấu hình riêng.", "Muốn bìa không số nhưng nội dung bắt đầu từ 1, cần Section Break và Format Page Numbers.", "Link to Previous là điểm phải kiểm tra khi header/footer nối sai."],
    },
    "objects-captions-citations": {
      objective: "Insert graphic elements and create reference elements",
      body: "Với tài liệu học thuật, hình/bảng cần được chèn, căn, đặt Wrap Text và đánh caption bằng công cụ References để có thể cập nhật tự động.",
      bullets: ["Không gõ caption bằng tay nếu tài liệu có nhiều hình/bảng.", "Cross-reference giúp tham chiếu tự cập nhật khi số thứ tự thay đổi.", "Wrap Text quyết định ảnh có đẩy chữ, che chữ hay đứng đúng vị trí."],
    },
    "academic-forms-appendix-export": {
      objective: "Manage tables, lists, and document output",
      body: "Biểu mẫu, phụ lục và phiếu khảo sát trong MOS thường kiểm tra Table, checkbox/symbol, tab leader, heading và xuất file đúng định dạng.",
      bullets: ["Dùng Table để giữ bố cục biểu mẫu ổn định.", "Tab leader tốt hơn gõ dấu chấm thủ công.", "Trước khi nộp, mở lại PDF hoặc Print Preview để kiểm tra font và layout."],
    },
    "administrative-documents": {
      objective: "Format documents and inspect documents",
      body: "Văn bản hành chính cần bố cục ổn định, căn chỉnh bằng công cụ Word và kiểm tra thông tin ẩn trước khi gửi.",
      bullets: ["Dùng Center, table không viền hoặc tab để căn thay vì Space.", "Logo/chữ ký cần Wrap Text phù hợp để không phá bố cục.", "Inspect Document giúp phát hiện metadata hoặc comment ẩn."],
    },
    "tips-shortcuts": {
      objective: "Efficient document editing",
      body: "Phím tắt không phải mục tiêu riêng, nhưng là kỹ năng tăng tốc trong bài thi MOS vì thời gian giới hạn.",
      bullets: ["Học phím tắt theo tình huống: căn, lưu, ngắt trang, cập nhật field.", "F4 hữu ích để lặp lại thao tác định dạng gần nhất.", "Shift+F3 giúp xử lý nhanh chữ hoa/thường khi đề yêu cầu."],
    },
    "common-errors": {
      objective: "Inspect, troubleshoot, and update document elements",
      body: "Khi tài liệu lỗi, MOS yêu cầu chọn đúng nhóm công cụ để sửa: formatting, breaks, pictures, tables, fields hoặc page numbering.",
      bullets: ["Bật Show/Hide để tìm Enter dư, tab, page break và section break.", "Dùng Clear Formatting/Keep Text Only khi copy làm nhảy font.", "Ctrl+A rồi F9 giúp cập nhật toàn bộ field như mục lục, caption, cross-reference."],
    },
    "mail-merge": {
      objective: "Create mail merge documents",
      body: "Mail Merge kiểm tra quy trình trọn vẹn: chọn loại tài liệu, kết nối nguồn dữ liệu, chèn merge field, preview và finish merge.",
      bullets: ["Nguồn dữ liệu phải có header rõ, không gộp ô, không dòng trống đầu bảng.", "Merge field là placeholder, không phải text gõ tay.", "Preview Results trước khi Finish & Merge để phát hiện dữ liệu dài hoặc thiếu."],
    },
    "review-protect-compare": {
      objective: "Manage document collaboration",
      body: "Nhóm Review trong MOS tập trung vào Track Changes, Comments, Accept/Reject, Protect Document và Compare.",
      bullets: ["Track Changes ghi lại chỉnh sửa; Comments dùng để trao đổi/góp ý.", "Ẩn markup không đồng nghĩa với xóa thay đổi.", "Trước bản cuối, kiểm tra còn comment hoặc tracked changes nào không."],
    },
  };

  const base = theory[lesson.id] ?? theory["page-setup-document-properties"];

  return {
    objective: base.objective,
    overview: base.body,
    concepts: [...base.bullets, ...getMosConcepts(lesson)].slice(0, 6),
    standardSteps: getMosStandardSteps(lesson),
    avoid: getMosAvoidanceNotes(lesson),
    selfCheck: getMosSelfCheck(lesson),
  };
}

function getMosConcepts(lesson: Lesson) {
  const concepts: Record<string, string[]> = {
    "page-setup-document-properties": [
      "Page Setup quyết định vùng in thật của tài liệu: khổ giấy, hướng giấy, lề và khoảng cách header/footer.",
      "Lề trang là thuộc tính của trang, không phải khoảng trắng tạo bằng Space hoặc Tab.",
      "Print Preview là bước kiểm tra bắt buộc vì nhiều lỗi chỉ xuất hiện khi in hoặc xuất PDF.",
    ],
    "normal-style-paragraph": [
      "Style là bộ định dạng có thể tái sử dụng; sửa Style một lần sẽ đồng bộ nhiều đoạn cùng loại.",
      "Paragraph spacing khác với Enter trống: spacing là thuộc tính, Enter là ký tự đoạn mới.",
      "Indentation điều khiển thụt lề chính xác hơn Space, đặc biệt với đoạn văn dài.",
    ],
    "heading-toc-navigation": [
      "Heading 1, Heading 2, Heading 3 tạo cấu trúc tài liệu để Word sinh Navigation Pane và mục lục.",
      "Table of Contents là field tự động, vì vậy cần Update Table sau khi sửa tiêu đề hoặc số trang.",
      "Cấp heading phải phản ánh quan hệ nội dung, không chỉ dùng để làm chữ to hoặc đậm.",
    ],
    "page-number-section-break": [
      "Page Break chỉ chuyển sang trang mới; Section Break tạo một vùng tài liệu có thiết lập riêng.",
      "Next Page Section Break vừa tách section vừa đưa nội dung sau break sang trang mới.",
      "Header/Footer có thể kế thừa section trước qua Link to Previous, nên cần tắt khi muốn định dạng độc lập.",
    ],
    "objects-captions-citations": [
      "Hình, bảng và biểu đồ nên có caption tự động để giữ số thứ tự chính xác khi thêm hoặc xóa đối tượng.",
      "Wrap Text quyết định cách văn bản chảy quanh đối tượng và ảnh hưởng trực tiếp đến bố cục.",
      "Cross-reference liên kết tới caption/heading để tham chiếu tự cập nhật khi tài liệu thay đổi.",
    ],
    "academic-forms-appendix-export": [
      "Table giúp dựng biểu mẫu ổn định hơn việc căn bằng Space, đặc biệt khi có nhiều dòng nhập liệu.",
      "Appendix nên dùng heading riêng để mục lục và điều hướng vẫn nhận diện được.",
      "Export PDF cần giữ layout, font, số trang, caption và mục lục như bản Word cuối cùng.",
    ],
    "administrative-documents": [
      "Văn bản hành chính cần đúng bố cục, thể thức, căn lề và thông tin ẩn trước khi gửi ra ngoài.",
      "Bảng không viền hoặc tab stop thường phù hợp để căn các khối thông tin như quốc hiệu, nơi nhận, chữ ký.",
      "Inspect Document giúp kiểm tra comment, metadata và thông tin cá nhân còn sót trong file.",
    ],
    "tips-shortcuts": [
      "Phím tắt là công cụ tăng tốc, nhưng trong MOS vẫn cần hiểu đúng lệnh Word đang được kích hoạt.",
      "Các phím liên quan field như F9 giúp cập nhật mục lục, caption và cross-reference.",
      "F4 lặp lại thao tác gần nhất, hữu ích khi phải áp dụng cùng định dạng cho nhiều vị trí.",
    ],
    "common-errors": [
      "Show/Hide giúp nhìn thấy ký tự ẩn như paragraph mark, tab, page break và section break.",
      "Nhiều lỗi bố cục đến từ ký tự thừa, định dạng copy từ nguồn khác hoặc field chưa cập nhật.",
      "Sửa lỗi Word nên bắt đầu bằng việc xác định loại lỗi: đoạn văn, trang, section, đối tượng hay field.",
    ],
    "mail-merge": [
      "Mail Merge gồm main document, data source và merge fields; thiếu một phần thì không thể trộn chính xác.",
      "Nguồn dữ liệu cần có hàng tiêu đề rõ ràng để Word nhận biết từng trường thông tin.",
      "Preview Results cho biết dữ liệu thật có vừa bố cục hay không trước khi tạo hàng loạt.",
    ],
    "review-protect-compare": [
      "Track Changes lưu lịch sử chỉnh sửa; Comments dùng để trao đổi mà không sửa trực tiếp nội dung.",
      "Ẩn markup không có nghĩa là đã chấp nhận hoặc xóa thay đổi.",
      "Protect Document giới hạn quyền sửa để bảo vệ cấu trúc hoặc nội dung quan trọng.",
    ],
  };

  return concepts[lesson.id] ?? concepts["page-setup-document-properties"];
}

function getMosStandardSteps(lesson: Lesson) {
  const mapped = lesson.steps.slice(0, 5).map((step, index) => `${index + 1}. ${step}`);
  const finalStep =
    lesson.id === "mail-merge"
      ? "Kiểm tra Preview Results với nhiều bản ghi trước khi Finish & Merge."
      : lesson.id === "heading-toc-navigation"
        ? "Cập nhật toàn bộ mục lục sau khi thay đổi tiêu đề hoặc số trang."
        : lesson.id === "page-number-section-break"
          ? "Bật Show/Hide để kiểm tra đúng loại break và vị trí section."
          : "Dùng Print Preview hoặc đọc lại bằng checklist trước khi chuyển sang bài tiếp theo.";

  return [...mapped, finalStep].slice(0, 6);
}

function getMosAvoidanceNotes(lesson: Lesson) {
  const general = [
    "Không dùng Space hoặc Enter để giả lập lề, khoảng cách, mục lục hay ngắt trang.",
    "Không chỉ nhìn bằng mắt; hãy kiểm tra lại bằng công cụ đúng như ruler, paragraph dialog, field update hoặc preview.",
  ];

  return [...lesson.mistakes.slice(0, 3), ...general].slice(0, 5);
}

function getMosSelfCheck(lesson: Lesson) {
  const checks = lesson.checkpoints.slice(0, 4);
  return [
    ...checks,
    "Có thể giải thích vì sao dùng công cụ đó thay vì thao tác thủ công.",
    "Khi thay đổi nội dung mẫu, bố cục vẫn giữ đúng và các field tự động vẫn cập nhật được.",
  ].slice(0, 6);
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
