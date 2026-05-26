import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  Bold,
  ClassicEditor,
  Essentials,
  Heading,
  Italic,
  Link as CkLink,
  List,
  Paragraph,
  Table,
  TableToolbar,
  Undo,
} from "ckeditor5";
import {
  BookOpen,
  Brain,
  CheckCircle2,
  Clipboard,
  Filter,
  GraduationCap,
  Lightbulb,
  Lock,
  LogIn,
  LogOut,
  MessageCircle,
  Menu,
  Music,
  Send,
  Search,
  Sparkles,
  Target,
  UserPlus,
  X,
} from "lucide-react";
import { groupLabels, lessons, shortcuts } from "./data";
import type { Lesson, Shortcut, WordLab, WordLabCheck } from "./types";
import "ckeditor5/ckeditor5.css";

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
  source?: "backend" | "local";
  localProgress?: {
    activeLessonProgress: number;
    activeQuizPercent: number;
    startedLessons: number;
    completedLessons: number;
    totalLessons: number;
  };
  lessonProgress?: Array<{
    lessonId: string;
    title: string;
    progress: number;
    quizPercent: number;
    scorePercent: number;
  }>;
  summary?: {
    attempts: number;
    averageMosScore: number;
    bestMosScore: number;
    latestMosScore: number;
    passReady: boolean;
  };
  domainMastery?: Array<{ domain: string; masteryPercent: number; attempts: number }>;
  skillMastery?: Array<{
    skillTag: string;
    attempts: number;
    correct?: number;
    avgSeconds?: number;
    masteryPercent: number;
    lastPracticedAt?: string;
  }>;
  latestAttempt?: ExamAttempt;
  recommendedLessonId: string;
  reason: string;
  weakSkills: Array<{ skillTag: string; masteryPercent: number; avgSeconds?: number }>;
  recommendations: Array<{ priority: string; message: string; skillTags: string[] }>;
  nextActions?: string[];
  focusPlan?: {
    recommendedLessonId: string;
    targetMasteryPercent: number;
    dailyMinutes: number;
    skillTags: string[];
  };
  learningRules: string[];
};

type ExamBlueprint = {
  id: string;
  name: string;
  description?: string;
  lessonId?: string;
  totalQuestions: number;
  durationMinutes: number;
};

type ExamQuestion = {
  id: string;
  title: string;
  prompt: string;
  options?: string[];
  estimatedSeconds: number;
};

type ExamAttempt = {
  id: string;
  blueprintId: string;
  questionIds: string[];
  mosScore: number;
  rawScore: number;
};

type ExamResult = ExamAttempt & {
  answers: Array<{ questionId: string; answer: string | string[]; isCorrect: boolean }>;
  submittedAt?: string;
};

type AuthUser = {
  id: string;
  role: "student" | "admin";
  name: string;
  email: string;
  lastLoginAt: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  source?: "gemini" | "fallback";
};

type AssistantContext = {
  route: string;
  lessonTitle?: string;
  lessonSubtitle?: string;
  activeTestName?: string;
  selectedQuestion?: string;
  includePageContext?: boolean;
  studentId?: string;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const AUTH_STORAGE_KEY = "mos-word-auth-user";

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
  const location = useLocation();
  const navigate = useNavigate();
  const orderedLessons = useMemo(() => orderLessons(lessons), []);
  const [activeLessonId, setActiveLessonId] = useState(orderedLessons[0].id);
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
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => readStoredUser());

  const activeLesson = orderedLessons.find((lesson) => lesson.id === activeLessonId) ?? orderedLessons[0];
  const activeIndex = orderedLessons.findIndex((lesson) => lesson.id === activeLesson.id);
  const isTheoryOnlyLesson = activeLesson.id === "common-errors";
  const lessonStepKeys = activeLesson.steps.map((_, index) => `${activeLesson.id}-${index}`);
  const completedSteps = lessonStepKeys.filter((key) => checkedSteps[key]).length;
  const lessonProgress = Math.round((completedSteps / activeLesson.steps.length) * 100);
  const theoryBlocks = getTheoryBlocks(activeLesson);
  const mosTheory = getMosTheory(activeLesson);
  const knowledgeChecks = isTheoryOnlyLesson ? [] : getKnowledgeChecks(activeLesson);
  const sequenceQuestions = isTheoryOnlyLesson ? [] : getSequenceQuestions(activeLesson);
  const shortcutChallenges = isTheoryOnlyLesson ? [] : getShortcutChallenges(activeLesson);
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
  const isHomeRoute = location.pathname === "/";
  const isLearnRoute = location.pathname === "/learn";
  const isTestsRoute = location.pathname === "/tests";
  const isPersonalizeRoute = location.pathname === "/personalize";

  const searchResults = useMemo<SearchResult[]>(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return [
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
    if (!authUser) {
      setRemotePlan(null);
      return;
    }

    fetch(`${API_URL}/api/students/${authUser.id}/personalization`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Cannot load personalization"))))
      .then((data: PersonalizedPlan) => setRemotePlan(data))
      .catch(() => setRemotePlan(null));
  }, [authUser]);

  function handleAuth(user: AuthUser) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    setAuthUser(user);
  }

  function handleLogout() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthUser(null);
    setRemotePlan(null);
  }

  async function copyText(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1500);
  }

  function selectLesson(id: string) {
    setActiveLessonId(id);
    setMobileNavOpen(false);
    navigate("/learn");
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
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
          <button className="sidebar-close mobile-only" onClick={() => setMobileNavOpen(false)} aria-label="Đóng menu">
            <X size={18} />
          </button>
        </div>

        <Link className={`side-route-link ${isHomeRoute ? "active" : ""}`} to="/">
          <GraduationCap size={17} />
          <span>Tổng quan</span>
        </Link>

        <Link className={`side-route-link ${isLearnRoute ? "active" : ""}`} to="/learn">
          <BookOpen size={17} />
          <span>Bài học</span>
        </Link>

        <Link className={`side-route-link ${isTestsRoute ? "active" : ""}`} to="/tests">
          <Clipboard size={17} />
          <span>Làm test</span>
        </Link>

        <Link className={`side-route-link ${isPersonalizeRoute ? "active" : ""}`} to="/personalize">
          <Sparkles size={17} />
          <span>Lộ trình cá nhân hóa</span>
        </Link>

        <nav className="lesson-nav" aria-label="Danh sách bài học">
          {(Object.keys(groupLabels) as Array<Lesson["group"]>).map((group) => (
            <section key={group}>
              <p className="nav-group">{groupLabels[group]}</p>
              {orderedLessons
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
            {authUser ? (
              <>
                <Sparkles size={16} />
                <Link to="/personalize">{authUser.name}</Link>
                <button onClick={handleLogout} aria-label="Đăng xuất">
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <>
                <LogIn size={16} />
                <Link to="/tests">Đăng nhập</Link>
              </>
            )}
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

        {isHomeRoute ? (
          <LandingPage lessons={orderedLessons} authUser={authUser} selectLesson={selectLesson} />
        ) : isTestsRoute ? (
          <TestsPage lessons={orderedLessons} authUser={authUser} onAuth={handleAuth} onPersonalizationUpdated={setRemotePlan} />
        ) : isPersonalizeRoute ? (
          <PersonalizePage
            plan={personalizedPlan}
            recommendedLesson={recommendedLesson}
            activeLesson={activeLesson}
            selectLesson={selectLesson}
          />
        ) : (
          <>
        <section className="hero-panel">
          <div>
            <p className="eyebrow">Lộ trình tự học MOS Word</p>
            <h1>Tự học cùng MOS Word.</h1>
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
                <small>{orderedLessons.filter((lesson) => lesson.group === key).length} bài</small>
              </div>
            ))}
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

            {activeLesson.lab && <WordLabPanel lab={activeLesson.lab} />}

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

            {activeLesson.quickCommands.length > 0 && (
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
            )}

            {activeLesson.miniQuiz.length > 0 && (
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
            )}

            {(sequenceQuestions.length > 0 || shortcutChallenges.length > 0) && (
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
            )}

            {knowledgeChecks.length > 0 && (
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
            )}

            <footer className="lesson-switcher">
              <button disabled={activeIndex === 0} onClick={() => selectLesson(orderedLessons[activeIndex - 1].id)}>
                Bài trước
              </button>
              <button disabled={activeIndex === orderedLessons.length - 1} onClick={() => selectLesson(orderedLessons[activeIndex + 1].id)}>
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

            <section className="exam-note">
              <GraduationCap size={20} />
              <strong>Gợi ý học hiệu quả</strong>
              <p>Học viên nên mở Word song song, hoàn thành checklist trước, sau đó lật flashcard để tự nói lại thao tác.</p>
            </section>
          </aside>
        </div>
          </>
        )}
      </main>
      <MosAssistantWidget
        authUser={authUser}
        context={{
          route: location.pathname,
          lessonTitle: activeLesson.title,
          lessonSubtitle: activeLesson.subtitle,
          studentId: authUser?.id,
        }}
      />
    </div>
  );
}

function LandingPage({
  lessons,
  authUser,
  selectLesson,
}: {
  lessons: Lesson[];
  authUser: AuthUser | null;
  selectLesson: (id: string) => void;
}) {
  const totalMinutes = lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);

  return (
    <section className="landing-page" aria-label="MOS Word landing page">
      <div className="landing-hero">
        <div className="landing-copy">
          <span>MOS Word Learning Hub</span>
          <h1>Học Word hiệu quả nhất.</h1>
          <p> Trang web tự học MOS Word miễn phí, hiệu quả và chất lượng.</p>
          <div className="landing-actions">
            <button onClick={() => selectLesson(lessons[0].id)}>Học ngay</button>
            <Link to="/tests">{authUser ? "Vào phòng test" : "Đăng nhập làm test"}</Link>
          </div>
        </div>
        <div className="landing-proof" aria-label="Tổng quan hệ thống">
          <div>
            <strong>{lessons.length}</strong>
            <small>bài học</small>
          </div>
          <div>
            <strong>20</strong>
            <small>câu mỗi phần</small>
          </div>
          <div>
            <strong>50</strong>
            <small>câu cuối khóa</small>
          </div>
        </div>
      </div>

      <div className="home-choice-grid">
        <article className="home-choice">
          <BookOpen size={28} />
          <span>Bài học</span>
          <h2>{lessons.length} bài học MOS Word</h2>
          <div className="home-metrics">
            <strong>{totalMinutes} phút</strong>
          </div>
          <button onClick={() => selectLesson(lessons[0].id)}>Mở bài học</button>
        </article>

        <article className="home-choice test-choice">
          <Clipboard size={28} />
          <span>Làm test</span>
          <h2>20 câu mỗi phần, 50 câu cuối khóa</h2>
          <div className="home-metrics">
            <strong>12 bài test</strong>
          </div>
          <Link to="/tests">Mở test</Link>
        </article>
      </div>
    </section>
  );
}

function MosAssistantWidget({ authUser, context }: { authUser: AuthUser | null; context: AssistantContext }) {
  const [open, setOpen] = useState(false);
  const [includeContext, setIncludeContext] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Chào bạn, mình là siêu trợ lý AI MOS. Mọi thông tin bạn hãy hỏi mình nhé.",
    },
  ]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = { id: `u-${Date.now()}`, role: "user", text };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages
            .filter((message) => message.id !== "welcome")
            .slice(-12)
            .map((message) => ({ role: message.role, text: message.text })),
          context: includeContext
            ? {
                ...context,
                includePageContext: true,
                studentId: authUser?.id,
              }
            : { route: context.route, studentId: authUser?.id },
        }),
      });
      if (!response.ok) throw new Error("Cannot ask assistant");
      const data = (await response.json()) as { answer: string; source?: "gemini" | "fallback" };
      setMessages((current) => [
        ...current,
        { id: `a-${Date.now()}`, role: "assistant", text: data.answer, source: data.source },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: "Trợ lý đang bận một chút. Bạn thử hỏi lại sau nhé.",
          source: "fallback",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleChatKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  return (
    <div className={`assistant-widget ${open ? "open" : ""}`}>
      {open && (
        <section className="assistant-panel" aria-label="Trợ lý AI MOS Word">
          <header>
            <div>
              <span>MOS Word Master</span>
              <strong>Trợ lý AI MOS Word</strong>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Đóng trợ lý">
              <X size={18} />
            </button>
          </header>

          <div className="assistant-context">
            <label>
              <input type="checkbox" checked={includeContext} onChange={(event) => setIncludeContext(event.target.checked)} />
              Gửi ngữ cảnh bài hiện tại
            </label>
            <small>{context.lessonTitle ?? "MOS Word"}</small>
          </div>

          <div className="assistant-messages">
            {messages.map((message) => (
              <article key={message.id} className={message.role}>
                <p>{message.text}</p>
                {message.source === "fallback" && <span>local fallback</span>}
              </article>
            ))}
            {loading && (
              <article className="assistant">
                <p>Đang suy nghĩ...</p>
              </article>
            )}
          </div>

          <div className="assistant-input">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleChatKeyDown}
              placeholder="Hỏi: tạo mục lục, chỉnh lề, section break..."
              rows={2}
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()} aria-label="Gửi câu hỏi">
              <Send size={17} />
            </button>
          </div>
        </section>
      )}

      <button className="assistant-fab" onClick={() => setOpen((current) => !current)} aria-label="Mở trợ lý AI MOS Word">
        <MessageCircle size={24} />
      </button>
    </div>
  );
}

function TestsPage({
  lessons,
  authUser,
  onAuth,
  onPersonalizationUpdated,
}: {
  lessons: Lesson[];
  authUser: AuthUser | null;
  onAuth: (user: AuthUser) => void;
  onPersonalizationUpdated: (plan: PersonalizedPlan | null) => void;
}) {
  const [blueprints, setBlueprints] = useState<ExamBlueprint[]>([]);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState("");
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ExamResult | null>(null);
  const [attemptStartedAt, setAttemptStartedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedBlueprint = blueprints.find((blueprint) => blueprint.id === selectedBlueprintId);
  const answeredCount = questions.filter((question) => answers[question.id]).length;

  useEffect(() => {
    fetch(`${API_URL}/api/exam-blueprints`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Cannot load tests"))))
      .then((data: ExamBlueprint[]) => {
        const sorted = [...data].sort((left, right) => Number(left.totalQuestions === 50) - Number(right.totalQuestions === 50));
        setBlueprints(sorted);
        setSelectedBlueprintId(sorted[0]?.id ?? "");
      })
      .catch(() => setError("Không tải được danh sách test từ backend."));
  }, []);

  async function startTest(blueprintId = selectedBlueprintId) {
    if (!authUser) return;
    if (!blueprintId) return;
    setLoading(true);
    setError("");
    setResult(null);
    setAnswers({});
    try {
      const response = await fetch(`${API_URL}/api/exam-blueprints/${blueprintId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: authUser.id }),
      });
      if (!response.ok) throw new Error("Cannot start test");
      const data = (await response.json()) as { attempt: ExamAttempt; questions: ExamQuestion[] };
      setAttempt(data.attempt);
      setAttemptStartedAt(Date.now());
      setQuestions(data.questions.filter((question) => question.options?.length));
    } catch {
      setError("Không bắt đầu được bài test. Hãy kiểm tra backend và dữ liệu seed.");
    } finally {
      setLoading(false);
    }
  }

  async function submitTest() {
    if (!attempt || !authUser) return;
    setLoading(true);
    setError("");
    try {
      const elapsedSeconds = Math.max(10, Math.round((Date.now() - (attemptStartedAt ?? Date.now())) / 1000));
      const response = await fetch(`${API_URL}/api/attempts/${attempt.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: questions.map((question) => ({
            questionId: question.id,
            answer: answers[question.id] ?? "",
            elapsedSeconds: elapsedSeconds || question.estimatedSeconds,
          })),
        }),
      });
      if (!response.ok) throw new Error("Cannot submit test");
      const submitted = (await response.json()) as ExamResult;
      setResult(submitted);
      const planResponse = await fetch(`${API_URL}/api/students/${authUser.id}/personalization`);
      if (planResponse.ok) onPersonalizationUpdated((await planResponse.json()) as PersonalizedPlan);
    } catch {
      setError("Không nộp được bài test. Hãy thử lại sau khi backend sẵn sàng.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="tests-page" aria-label="Làm test">
      <div className="tests-hero">
        <div>
          <p className="eyebrow">Test multiple-choice</p>
        </div>
        <div className="score-dial">
          <strong>{selectedBlueprint?.totalQuestions ?? 0}</strong>
          <small>câu hỏi</small>
        </div>
      </div>

      {error && <p className="test-error">{error}</p>}

      {!authUser && <AuthPanel onAuth={onAuth} />}

      <div className="test-layout">
        <aside className="test-picker">
          <strong>Danh sách test</strong>
          {blueprints.map((blueprint) => {
            const lesson = lessons.find((item) => item.id === blueprint.lessonId);
            return (
              <button
                key={blueprint.id}
                className={blueprint.id === selectedBlueprintId ? "active" : ""}
                onClick={() => {
                  setSelectedBlueprintId(blueprint.id);
                  setAttempt(null);
                  setAttemptStartedAt(null);
                  setQuestions([]);
                  setResult(null);
                  setAnswers({});
                }}
              >
                <span>{blueprint.totalQuestions === 50 ? "Cuối khóa" : "Học phần"}</span>
                <strong>{lesson?.title ?? blueprint.name}</strong>
                <small>{blueprint.totalQuestions} câu · {blueprint.durationMinutes} phút</small>
              </button>
            );
          })}
        </aside>

        <main className={`test-workspace ${!authUser ? "locked" : ""}`}>
          <div className="test-toolbar">
            <div>
              <strong>{selectedBlueprint?.name ?? "Chọn bài test"}</strong>
              <span>
                {authUser
                  ? `${answeredCount}/${questions.length || selectedBlueprint?.totalQuestions || 0} câu đã trả lời`
                  : "Đăng nhập hoặc đăng ký để bắt đầu test"}
              </span>
            </div>
            <button onClick={() => startTest()} disabled={!authUser || !selectedBlueprintId || loading}>
              {attempt ? "Làm lại" : "Bắt đầu"}
            </button>
          </div>

          {questions.length > 0 && (
            <div className="backend-mcq-list">
              {questions.map((question, index) => {
                const submittedAnswer = result?.answers.find((answer) => answer.questionId === question.id);
                return (
                  <article key={question.id} className="mcq-item">
                    <strong>Câu {index + 1}. {question.prompt}</strong>
                    <div className="mcq-options">
                      {question.options?.map((option) => {
                        const selected = answers[question.id] === option;
                        const className = submittedAnswer
                          ? submittedAnswer.answer === option
                            ? submittedAnswer.isCorrect
                              ? "correct"
                              : "wrong"
                            : ""
                          : selected
                            ? "correct"
                            : "";
                        return (
                          <button
                            key={option}
                            className={className}
                            disabled={Boolean(result)}
                            onClick={() => setAnswers((current) => ({ ...current, [question.id]: option }))}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {attempt && !result && questions.length > 0 && (
            <button className="submit-test-button" onClick={submitTest} disabled={loading || answeredCount === 0}>
              Nộp bài
            </button>
          )}

          {result && (
            <section className="test-result">
              <CheckCircle2 size={22} />
              <div>
                <strong>MOS score: {result.mosScore}</strong>
                <p>{result.answers.filter((answer) => answer.isCorrect).length}/{result.answers.length} câu đúng.</p>
              </div>
            </section>
          )}
        </main>
      </div>
    </section>
  );
}

function AuthPanel({ onAuth }: { onAuth: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("Nhập Email...");
  const [password, setPassword] = useState("123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submitAuth() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "register" ? { name, email, password } : { email, password }),
      });
      if (!response.ok) throw new Error("Auth failed");
      onAuth((await response.json()) as AuthUser);
    } catch {
      setError(mode === "register" ? "Không đăng ký được. Kiểm tra email hoặc mật khẩu." : "Email hoặc mật khẩu chưa đúng.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-panel" aria-label="Đăng nhập làm test">
      <div>
        <Lock size={24} />
        <span>Tài khoản học viên</span>
        <h2>{mode === "login" ? "Đăng nhập để làm test" : "Tạo tài khoản làm test"}</h2>
      </div>

      <div className="auth-form">
        <div className="auth-tabs" role="tablist" aria-label="Chọn đăng nhập hoặc đăng ký">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
            <LogIn size={16} /> Đăng nhập
          </button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
            <UserPlus size={16} /> Đăng ký
          </button>
        </div>

        {mode === "register" && (
          <label>
            Họ tên
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nguyễn Văn A" />
          </label>
        )}
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="email@domain.com" />
        </label>
        <label>
          Mật khẩu
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Tối thiểu 6 ký tự" />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button onClick={submitAuth} disabled={loading || !email || !password || (mode === "register" && !name)}>
          {mode === "login" ? "Vào phòng test" : "Tạo tài khoản"}
        </button>
      </div>
    </section>
  );
}

function PersonalizePage({
  plan,
  recommendedLesson,
  activeLesson,
  selectLesson,
}: {
  plan: PersonalizedPlan;
  recommendedLesson: Lesson;
  activeLesson: Lesson;
  selectLesson: (id: string) => void;
}) {
  const actions = plan.nextActions ?? [
    "Ôn lại lesson được gợi ý.",
    "Hoàn thành checklist và quiz tối thiểu 80%.",
    "Làm thêm mock test sau khi kỹ năng yếu ổn định.",
  ];
  const targetMastery = plan.focusPlan?.targetMasteryPercent ?? 80;
  const dailyMinutes = plan.focusPlan?.dailyMinutes ?? recommendedLesson.minutes;
  const focusSkills = plan.focusPlan?.skillTags?.length
    ? plan.focusPlan.skillTags
    : plan.weakSkills.map((skill) => skill.skillTag);
  const hasBackendAnalytics = plan.source !== "local" && Boolean(plan.summary);
  const localReadiness = Math.round(
    ((plan.localProgress?.activeLessonProgress ?? 0) + (plan.localProgress?.activeQuizPercent ?? 0)) / 2,
  );
  const displayedScore = hasBackendAnalytics ? plan.mosScore : localReadiness;
  const scorePercent = hasBackendAnalytics ? clampPercent(Math.round((plan.mosScore / 1000) * 100)) : clampPercent(localReadiness);
  const scoreStyle = { "--score-percent": `${scorePercent}%` } as CSSProperties;
  const summaryStats = hasBackendAnalytics
    ? [
        { label: "Attempts", value: plan.summary?.attempts ?? 0 },
        { label: "Avg MOS", value: plan.summary?.averageMosScore ?? plan.mosScore },
        { label: "Best", value: plan.summary?.bestMosScore ?? plan.mosScore },
        { label: "Latest", value: plan.summary?.latestMosScore ?? plan.mosScore },
      ]
    : [
        { label: "Checklist", value: `${plan.localProgress?.activeLessonProgress ?? 0}%` },
        { label: "Quiz", value: `${plan.localProgress?.activeQuizPercent ?? 0}%` },
        { label: "Đã mở", value: plan.localProgress?.startedLessons ?? 0 },
        { label: "Hoàn thành", value: `${plan.localProgress?.completedLessons ?? 0}/${plan.localProgress?.totalLessons ?? lessons.length}` },
      ];
  const progressRows = hasBackendAnalytics ? normalizeDomainRows(plan.domainMastery) : normalizeLessonProgressRows(plan.lessonProgress);
  const skillRows = normalizeSkillRows(plan.skillMastery, plan.weakSkills);

  return (
    <section className="personalize-page" aria-label="Lộ trình cá nhân hóa">
      <div className="personalize-hero">
        <div>
          <p className="eyebrow">Personalize</p>
          <h1>{plan.readiness === "exam-ready" ? "Sẵn sàng luyện đề MOS" : "Ưu tiên đúng kỹ năng yếu"}</h1>
          <p>{plan.reason}</p>
          <div className="personalize-actions">
            <button onClick={() => selectLesson(recommendedLesson.id)}>Mở bài được gợi ý</button>
            <Link to="/learn">Quay lại lớp học</Link>
          </div>
        </div>
        <div className="score-donut-card" aria-label={hasBackendAnalytics ? `MOS score ${plan.mosScore}` : `Study readiness ${displayedScore}%`}>
          <div className="score-donut" style={scoreStyle}>
            <span>{hasBackendAnalytics ? displayedScore : `${displayedScore}%`}</span>
          </div>
          <div>
            <strong>{hasBackendAnalytics ? "MOS score" : "Study readiness"}</strong>
            <small>{hasBackendAnalytics ? (plan.readiness === "exam-ready" ? "Exam-ready" : "Needs practice") : "Chưa đăng nhập"}</small>
          </div>
        </div>
      </div>

      <div className="personalize-grid">
        <section className="personalize-section personalize-analytics">
          <div className="section-heading">
            <strong>{hasBackendAnalytics ? "Tổng quan từ bài test" : "Tạm tính từ bài học"}</strong>
            <span>{hasBackendAnalytics ? "MOS Analytics" : "Local progress"}</span>
          </div>
          {!hasBackendAnalytics && (
            <div className="personalize-login-note">
              <Link to="/tests">Đăng nhập làm test</Link>
            </div>
          )}
          <div className="stat-strip">
            {summaryStats.map((stat) => (
              <div key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>
          <div className="domain-chart" aria-label="Domain mastery chart">
            {progressRows.length ? (
              progressRows.map((row) => (
                <div key={row.id} className="domain-bar-row">
                  <div>
                    <strong>{row.label}</strong>
                    <small>{row.detail}</small>
                  </div>
                  <div className="domain-bar" aria-hidden="true">
                    <span style={{ width: `${Math.max(4, row.percent)}%` }} />
                  </div>
                  <b>{row.percent}%</b>
                </div>
              ))
            ) : (
              <p className="muted">Làm test để hệ thống vẽ mastery theo từng phần MOS Word.</p>
            )}
          </div>
        </section>

        <section className="personalize-section recommended-path">
          <div className="section-heading">
            <strong>Bài nên học tiếp</strong>
            <span>{dailyMinutes} phút/ngày</span>
          </div>
          <h2>{recommendedLesson.title}</h2>
          <p>{recommendedLesson.subtitle}</p>
          <div className="path-metrics">
            <div>
              <span>Mục tiêu mastery</span>
              <strong>{targetMastery}%</strong>
            </div>
            <div>
              <span>Bài đang mở</span>
              <strong>{activeLesson.minutes} phút</strong>
            </div>
          </div>
        </section>

        <section className="personalize-section skill-chart-panel">
          <div className="section-heading">
            <strong>{hasBackendAnalytics ? "Skill yếu" : "Skill gợi ý ôn"}</strong>
            <span>{focusSkills.length || 1} focus</span>
          </div>
          <div className="skill-chart">
            {skillRows.length ? (
              skillRows.map((skill) => (
                <div key={skill.skillTag} className="skill-chart-row">
                  <div>
                    <strong>{skill.skillTag}</strong>
                    <small>{skill.avgSeconds ? `${skill.avgSeconds}s trung bình` : "Cần luyện thêm"}</small>
                  </div>
                  <div className="skill-track" aria-hidden="true">
                    <span style={{ width: `${Math.max(5, skill.masteryPercent)}%` }} />
                  </div>
                  <b>{skill.masteryPercent}%</b>
                </div>
              ))
            ) : (
              <p className="muted">Chưa có skill yếu rõ ràng. Hệ thống sẽ cập nhật sau khi có thêm attempt.</p>
            )}
          </div>
        </section>

        <section className="personalize-section">
          <div className="section-heading">
            <strong>Việc cần làm</strong>
          </div>
          <ol className="action-list">
            {actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ol>
        </section>

        <section className="personalize-section">
          <div className="section-heading">
            <strong>Luật học</strong>
          </div>
          <div className="rule-list">
            {plan.learningRules.map((rule) => (
              <p key={rule}>{rule}</p>
            ))}
          </div>
        </section>

        <section className="personalize-section recommendations-panel">
          <div className="section-heading">
            <strong>Khuyến nghị</strong>
          </div>
          {plan.recommendations.map((recommendation) => (
            <article key={`${recommendation.priority}-${recommendation.message}`}>
              <span>{recommendation.priority}</span>
              <p>{recommendation.message}</p>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function normalizeDomainRows(rows?: PersonalizedPlan["domainMastery"]) {
  return [...(rows ?? [])]
    .filter((row) => row.attempts > 0)
    .sort((a, b) => a.masteryPercent - b.masteryPercent)
    .slice(0, 6)
    .map((row) => ({
      id: row.domain,
      label: formatDomainLabel(row.domain),
      detail: `${row.attempts} câu đã làm`,
      percent: row.masteryPercent,
    }));
}

function normalizeLessonProgressRows(rows?: PersonalizedPlan["lessonProgress"]) {
  return [...(rows ?? [])]
    .sort((a, b) => a.scorePercent - b.scorePercent)
    .slice(0, 6)
    .map((row) => ({
      id: row.lessonId,
      label: row.title,
      detail: `Checklist ${row.progress}% · quiz ${row.quizPercent}%`,
      percent: row.scorePercent,
    }));
}

function normalizeSkillRows(rows?: PersonalizedPlan["skillMastery"], fallback: PersonalizedPlan["weakSkills"] = []) {
  const source = rows?.length
    ? rows
    : fallback.map((skill) => ({
        ...skill,
        attempts: 0,
      }));

  return [...source].sort((a, b) => a.masteryPercent - b.masteryPercent).slice(0, 6);
}

function formatDomainLabel(domain: string) {
  const labels: Record<string, string> = {
    manage_documents: "Manage documents",
    insert_format_text: "Text & paragraphs",
    manage_tables_lists: "Tables & lists",
    references_graphics: "References & graphics",
    collaboration: "Review & collaboration",
    mail_merge: "Mail merge",
  };

  return labels[domain] ?? domain.replace(/[-_]/g, " ");
}

function WordLabPanel({ lab }: { lab: WordLab }) {
  const [content, setContent] = useState(lab.initialContent);
  const results = useMemo(() => lab.checks.map((check) => ({ ...check, passed: evaluateLabCheck(content, check) })), [content, lab]);
  const passedCount = results.filter((result) => result.passed).length;

  useEffect(() => {
    setContent(lab.initialContent);
  }, [lab]);

  const editorConfig = useMemo(
    () => ({
      licenseKey: "GPL",
      plugins: [Essentials, Paragraph, Heading, Bold, Italic, CkLink, List, Table, TableToolbar, Undo],
      toolbar: ["undo", "redo", "|", "heading", "|", "bold", "italic", "link", "|", "bulletedList", "numberedList", "|", "insertTable"],
      heading: {
        options: [
          { model: "paragraph", title: "Paragraph", class: "ck-heading_paragraph" },
          { model: "heading1", view: "h2", title: "Heading 1", class: "ck-heading_heading1" },
          { model: "heading2", view: "h3", title: "Heading 2", class: "ck-heading_heading2" },
        ],
      },
      table: {
        contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
      },
    }) as Record<string, unknown>,
    [],
  );

  return (
    <section className="learning-block word-lab">
      <div className="word-lab-head">
        <div>
          <p className="eyebrow">Word lab</p>
          <h3>{lab.title}</h3>
          <p>{lab.brief}</p>
        </div>
        <div className="lab-score">
          {passedCount}/{results.length}
        </div>
      </div>

      <div className="word-lab-grid">
        <aside className="lab-brief">
          <strong>Yêu cầu lab</strong>
          <ol>
            {lab.instructions.map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
          </ol>
          <div className="lab-checks">
            {results.map((result) => (
              <div key={result.id} className={result.passed ? "passed" : ""}>
                <CheckCircle2 size={16} />
                <span>{result.label}</span>
              </div>
            ))}
          </div>
        </aside>

        <div className="word-editor-shell">
          <CKEditor
            editor={ClassicEditor}
            config={editorConfig}
            data={lab.initialContent}
            onChange={(_, editor) => setContent(editor.getData())}
          />
        </div>
      </div>
    </section>
  );
}

function evaluateLabCheck(html: string, check: WordLabCheck) {
  const document = new DOMParser().parseFromString(html, "text/html");
  const text = document.body.textContent?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
  const value = check.value?.toLowerCase() ?? "";

  if (check.type === "contains") return Boolean(value) && text.includes(value);
  if (check.type === "heading") return Boolean(check.value && document.body.querySelector(check.value));
  if (check.type === "bold") return Boolean(document.body.querySelector("strong, b"));
  if (check.type === "table") return Boolean(document.body.querySelector("table"));
  if (check.type === "list") return Boolean(document.body.querySelector("ul, ol"));
  return false;
}

function readStoredUser(): AuthUser | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function orderLessons(items: Lesson[]) {
  return [...items].sort((left, right) => {
    if (left.id === "common-errors") return 1;
    if (right.id === "common-errors") return -1;
    return 0;
  });
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
  const completedLessons = progressByLesson.filter((item) => item.progress >= 80 && item.quizPercent >= 80).length;
  const startedLessons = progressByLesson.filter((item) => item.progress > 0 || item.quizPercent > 0).length;
  const lessonProgress = [
    activeProgress,
    nextBlocked,
    ...progressByLesson.filter((item) => item.lesson.id !== activeProgress.lesson.id && item.lesson.id !== nextBlocked.lesson.id),
  ]
    .filter((item, index, array) => array.findIndex((candidate) => candidate.lesson.id === item.lesson.id) === index)
    .slice(0, 6)
    .map((item) => ({
      lessonId: item.lesson.id,
      title: item.lesson.title,
      progress: item.progress,
      quizPercent: item.quizPercent,
      scorePercent: Math.round((item.progress + item.quizPercent) / 2),
    }));

  return {
    source: "local",
    readiness: activeProgress.progress >= 80 && activeProgress.quizPercent >= 80 ? "exam-ready" : "needs-practice",
    mosScore: Math.round((activeProgress.progress + activeProgress.quizPercent) / 2),
    localProgress: {
      activeLessonProgress: activeProgress.progress,
      activeQuizPercent: activeProgress.quizPercent,
      startedLessons,
      completedLessons,
      totalLessons: lessons.length,
    },
    lessonProgress,
    recommendedLessonId: nextBlocked.lesson.id,
    reason:
      activeProgress.progress < 80
        ? "Bạn chưa đăng nhập nên lộ trình đang tạm tính từ checklist và quiz trên máy này. Hãy hoàn thành bài hiện tại, rồi đăng nhập làm test để có phân tích chính xác."
        : activeProgress.quizPercent < 80
          ? "Quiz của bài hiện tại chưa đạt 80%. Đây là gợi ý tạm thời từ dữ liệu học local, chưa phải personalize từ bài test backend."
          : "Bạn đang đi đúng nhịp học local. Đăng nhập và làm test sẽ mở biểu đồ mastery theo từng phần MOS Word.",
    weakSkills: [
      {
        skillTag: weakSkill,
        masteryPercent: Math.max(20, Math.min(95, Math.round((nextBlocked.progress + nextBlocked.quizPercent) / 2))),
      },
    ],
    recommendations: [
      {
        priority: "practice",
        message: `Ôn lại ${weakSkill}, hoàn thành checklist và làm đúng tối thiểu 80% câu hỏi của bài. Sau đó đăng nhập làm test để lưu dữ liệu personalize.`,
        skillTags: [weakSkill],
      },
    ],
    nextActions: [
      `Tiếp tục bài "${nextBlocked.lesson.title}" đến khi checklist và quiz đều đạt 80%.`,
      "Đăng nhập hoặc đăng ký trước khi làm test để backend lưu kết quả.",
      "Làm test theo phần 20 câu để mở biểu đồ mastery thật.",
    ],
    learningRules: [
      "Chưa đăng nhập: chỉ dùng dữ liệu học local, không xem là điểm MOS thật.",
      "Sau khi làm test: backend dùng câu đúng/sai theo skill tag để cá nhân hóa.",
      "Checklist và quiz vẫn giúp gợi ý bài nên học tiếp trong lúc chưa có attempt.",
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
