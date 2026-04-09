import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";

const API = "http://127.0.0.1:8000";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getStatus = (quiz) => {
  if (!quiz?.start_time || !quiz?.end_time) return "Draft";
  const now = new Date();
  const s = new Date(quiz.start_time);
  const e = new Date(quiz.end_time);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return "Draft";
  if (now < s) return "Scheduled";
  if (now >= s && now <= e) return "Live";
  return "Finished";
};

const fmtTime = (secs) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

// ─── Design tokens (mirrors admin palette) ────────────────────────────────────
const C = {
  primary:  "#2563EB",
  success:  "#16A34A",
  danger:   "#DC2626",
  warning:  "#D97706",
  bg:       "#F8FAFC",
  card:     "#FFFFFF",
  border:   "#E2E8F0",
  text:     "#1E293B",
  muted:    "#64748B",
  faint:    "#94A3B8",
};

// ─── Shell screens (full-viewport centered card) ──────────────────────────────
const Shell = ({ children }) => (
  <div
    style={{
      minHeight: "100vh",
      background: C.bg,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "24px",
    }}
  >
    <div
      style={{
        background: C.card,
        borderRadius: "16px",
        border: `1px solid ${C.border}`,
        padding: "48px 40px",
        maxWidth: "500px",
        width: "100%",
        textAlign: "center",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
      }}
    >
      {children}
    </div>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────
const QuizAttempt = () => {
  const { quizId }  = useParams();
  const navigate    = useNavigate();
  const { user }    = useContext(AuthContext);

  // ── Core state ──
  const [quiz,       setQuiz]       = useState(null);
  const [pageLoad,   setPageLoad]   = useState(true);   // first fetch
  const [started,    setStarted]    = useState(false);
  const [currentQ,   setCurrentQ]   = useState(0);
  const [answers,    setAnswers]    = useState([]);      // null = unanswered
  const [elapsed,    setElapsed]    = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result,     setResult]     = useState(null);

  const timerRef = useRef(null);
  const statusPollRef = useRef(null);

  // ── Auth header ──
  const authHeader = useCallback(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // ── Fetch quiz ──
  const fetchQuiz = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/quizzes/${quizId}`);
      setQuiz(res.data);
      setAnswers(Array(res.data.questions?.length ?? 0).fill(null));
    } catch {
      setQuiz(null);
    } finally {
      setPageLoad(false);
    }
  }, [quizId]);

  useEffect(() => { fetchQuiz(); }, [fetchQuiz]);

  // ── Poll quiz status every 10 s while waiting for it to go Live ──
  useEffect(() => {
    if (statusPollRef.current) clearInterval(statusPollRef.current);
    if (!started && quiz && getStatus(quiz) === "Scheduled") {
      statusPollRef.current = setInterval(fetchQuiz, 10_000);
    }
    return () => clearInterval(statusPollRef.current);
  }, [started, quiz, fetchQuiz]);

  // ── Count-up timer — runs only while quiz is active ──
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (started && !result) {
      timerRef.current = setInterval(
        () => setElapsed((e) => e + 1),
        1000,
      );
    }
    return () => clearInterval(timerRef.current);
  }, [started, result]);

  // ── Handlers ──
  const handleStart = async () => {
    if (!user) { navigate("/login"); return; }
    try {
      await axios.post(
        `${API}/quiz-start/${quizId}`,
        {},
        { headers: authHeader() },
      );
    } catch (err) {
      // If it's a 403 the quiz isn't live — surface it
      const detail = err.response?.data?.detail ?? "";
      if (err.response?.status === 403) {
        alert(detail || "Quiz is not live right now.");
        return;
      }
      // Other errors (network, 401) are non-fatal for the UX
      console.warn("quiz-start warning:", detail);
    }
    setStarted(true);
  };

  const handleSelect = (optIdx) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentQ] = optIdx;
      return next;
    });
  };

  const handleSubmit = async () => {
    clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const res = await axios.post(
        `${API}/quiz-attempt`,
        {
          quiz_id:    quizId,
          answers:    answers.map((a) => (a === null ? -1 : a)),
          time_taken: elapsed,
        },
        { headers: authHeader() },
      );
      setResult(res.data);
    } catch (err) {
      // Restart timer so the student can retry
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      alert(
        err.response?.data?.detail ||
          "Submission failed. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ════════════════════════════════════════════════════════════════
  //  RENDER STATES
  // ════════════════════════════════════════════════════════════════

  if (pageLoad) {
    return (
      <Shell>
        <p style={{ color: C.muted, fontSize: "15px" }}>Loading quiz…</p>
      </Shell>
    );
  }

  if (!quiz) {
    return (
      <Shell>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>❌</div>
        <h2 style={{ color: C.text, marginBottom: "10px" }}>Quiz not found</h2>
        <p style={{ color: C.muted, fontSize: "14px" }}>
          This quiz doesn't exist or has been removed.
        </p>
      </Shell>
    );
  }

  const status    = getStatus(quiz);
  const questions = quiz.questions ?? [];

  // ── Result screen ────────────────────────────────────────────────
  if (result) {
    const pct = result.percentage;
    const {
      emoji,
      grade,
      gradeColor,
    } =
      pct >= 80
        ? { emoji: "🏆", grade: "Excellent!",         gradeColor: C.success }
        : pct >= 60
        ? { emoji: "🎯", grade: "Good job!",           gradeColor: "#D97706" }
        : pct >= 40
        ? { emoji: "📚", grade: "Keep practising!",    gradeColor: C.warning }
        : { emoji: "💪", grade: "Better luck next time!", gradeColor: C.danger };

    return (
      <Shell>
        <div style={{ fontSize: "60px", marginBottom: "16px" }}>{emoji}</div>
        <h1
          style={{
            fontSize: "26px",
            fontWeight: "800",
            color: C.text,
            marginBottom: "6px",
          }}
        >
          Quiz Complete!
        </h1>
        <p style={{ color: C.muted, marginBottom: "28px", fontSize: "14px" }}>
          {quiz.title}
        </p>

        {/* Score grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "12px",
            marginBottom: "28px",
          }}
        >
          {[
            { label: "Score",    value: `${result.score}/${result.total}`, color: gradeColor },
            { label: "Accuracy", value: `${result.percentage}%`,           color: gradeColor },
            { label: "Time",     value: fmtTime(result.time_taken),        color: C.primary  },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                background: C.bg,
                borderRadius: "10px",
                padding: "16px 8px",
                border: `1px solid ${C.border}`,
              }}
            >
              <div
                style={{ fontSize: "20px", fontWeight: "800", color }}
              >
                {value}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: C.faint,
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                  marginTop: "4px",
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        <p
          style={{
            fontSize: "18px",
            fontWeight: "700",
            color: gradeColor,
            marginBottom: "28px",
          }}
        >
          {grade}
        </p>

        <button
          onClick={() => navigate("/student/dashboard")}
          style={{
            width: "100%",
            background: C.primary,
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            padding: "13px",
            fontSize: "15px",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          Back to Dashboard
        </button>
      </Shell>
    );
  }

  // ── Scheduled ───────────────────────────────────────────────────
  if (status === "Scheduled") {
    return (
      <Shell>
        <div style={{ fontSize: "52px", marginBottom: "16px" }}>⏳</div>
        <h2
          style={{ color: C.text, fontSize: "22px", fontWeight: "700", marginBottom: "8px" }}
        >
          {quiz.title}
        </h2>
        <span
          style={{
            display: "inline-block",
            background: "#FEF9C3",
            color: "#B45309",
            padding: "4px 14px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "700",
            marginBottom: "20px",
          }}
        >
          Scheduled
        </span>
        <p style={{ color: C.muted, fontSize: "14px", marginBottom: "6px" }}>
          This quiz hasn't started yet.
        </p>
        <p style={{ color: C.faint, fontSize: "13px" }}>
          Starts:{" "}
          {quiz.start_time
            ? new Date(quiz.start_time).toLocaleString()
            : "—"}
        </p>
      </Shell>
    );
  }

  // ── Finished ─────────────────────────────────────────────────────
  if (status === "Finished") {
    return (
      <Shell>
        <div style={{ fontSize: "52px", marginBottom: "16px" }}>🏁</div>
        <h2
          style={{ color: C.text, fontSize: "22px", fontWeight: "700", marginBottom: "8px" }}
        >
          {quiz.title}
        </h2>
        <span
          style={{
            display: "inline-block",
            background: "#F1F5F9",
            color: "#475569",
            padding: "4px 14px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "700",
            marginBottom: "20px",
          }}
        >
          Finished
        </span>
        <p style={{ color: C.muted, fontSize: "14px" }}>
          This quiz has ended.
        </p>
        {quiz.end_time && (
          <p style={{ color: C.faint, fontSize: "13px", marginTop: "8px" }}>
            Ended: {new Date(quiz.end_time).toLocaleString()}
          </p>
        )}
      </Shell>
    );
  }

  // ── Draft / unknown ──────────────────────────────────────────────
  if (status !== "Live") {
    return (
      <Shell>
        <div style={{ fontSize: "52px", marginBottom: "16px" }}>📋</div>
        <h2
          style={{ color: C.text, fontSize: "22px", fontWeight: "700", marginBottom: "8px" }}
        >
          {quiz.title}
        </h2>
        <p style={{ color: C.muted, fontSize: "14px" }}>
          This quiz is not available right now.
        </p>
      </Shell>
    );
  }

  // ── Pre-start lobby (Live, student hasn't clicked Start yet) ─────
  if (!started) {
    return (
      <Shell>
        {/* Live badge with pulse dot */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            background: "#DCFCE7",
            padding: "5px 14px",
            borderRadius: "20px",
            marginBottom: "20px",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: C.success,
              display: "inline-block",
            }}
          />
          <span
            style={{ fontSize: "12px", fontWeight: "700", color: C.success }}
          >
            LIVE NOW
          </span>
        </div>

        <h1
          style={{
            fontSize: "26px",
            fontWeight: "800",
            color: C.text,
            marginBottom: "6px",
          }}
        >
          {quiz.title}
        </h1>
        {quiz.category && (
          <p style={{ color: C.muted, fontSize: "14px", marginBottom: "4px" }}>
            {quiz.category}
          </p>
        )}

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            margin: "24px 0",
          }}
        >
          {[
            { icon: "❓", label: "Questions",    value: questions.length },
            { icon: "👥", label: "Participants", value: quiz.participants ?? 0 },
          ].map(({ icon, label, value }) => (
            <div
              key={label}
              style={{
                background: C.bg,
                borderRadius: "10px",
                padding: "16px 12px",
                border: `1px solid ${C.border}`,
              }}
            >
              <div
                style={{ fontSize: "22px", fontWeight: "800", color: C.text }}
              >
                {icon} {value}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: C.faint,
                  fontWeight: "600",
                  textTransform: "uppercase",
                  marginTop: "4px",
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        {!user && (
          <p
            style={{
              color: C.danger,
              fontSize: "13px",
              marginBottom: "14px",
              fontWeight: "600",
            }}
          >
            You must be logged in to attempt this quiz.
          </p>
        )}

        <button
          onClick={handleStart}
          style={{
            width: "100%",
            background: C.primary,
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            padding: "14px",
            fontSize: "16px",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          {user ? "Start Quiz →" : "Log in to Start"}
        </button>
      </Shell>
    );
  }

  // ════════════════════════════════════════════════════════════════
  //  ACTIVE QUIZ UI
  // ════════════════════════════════════════════════════════════════

  const q          = questions[currentQ];
  const answered   = answers[currentQ];
  const answeredN  = answers.filter((a) => a !== null).length;
  const allDone    = answeredN === questions.length;
  const isLast     = currentQ === questions.length - 1;
  const progressPct = (answeredN / questions.length) * 100;

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      {/* ── Top bar ── */}
      <div
        style={{
          background: C.card,
          borderBottom: `1px solid ${C.border}`,
          padding: "12px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ fontWeight: "700", fontSize: "15px", color: C.text }}>
          {quiz.title}
        </div>

        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          {/* Progress */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "10px",
                fontWeight: "600",
                color: C.faint,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Progress
            </div>
            <div style={{ fontWeight: "700", color: C.primary, fontSize: "14px" }}>
              {answeredN}/{questions.length}
            </div>
          </div>

          {/* Timer */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "10px",
                fontWeight: "600",
                color: C.faint,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Time
            </div>
            <div
              style={{
                fontWeight: "700",
                fontSize: "18px",
                fontFamily: "monospace",
                color: elapsed > 3600 ? C.danger : C.text,
              }}
            >
              {fmtTime(elapsed)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div style={{ height: "4px", background: C.border }}>
        <div
          style={{
            height: "100%",
            background: C.primary,
            width: `${progressPct}%`,
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* ── Body ── */}
      <div
        style={{ maxWidth: "800px", margin: "0 auto", padding: "32px 20px" }}
      >
        <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
          {/* Question palette */}
          <div style={{ width: "52px", flexShrink: 0 }}>
            {questions.map((_, i) => {
              const isActive   = i === currentQ;
              const isAnswered = answers[i] !== null;
              return (
                <div
                  key={i}
                  onClick={() => setCurrentQ(i)}
                  title={`Question ${i + 1}`}
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    marginBottom: "8px",
                    fontWeight: "700",
                    fontSize: "13px",
                    transition: "all 0.15s",
                    background: isActive
                      ? C.primary
                      : isAnswered
                      ? "#DCFCE7"
                      : "#F1F5F9",
                    color: isActive
                      ? "#fff"
                      : isAnswered
                      ? C.success
                      : C.muted,
                    border: isActive
                      ? "none"
                      : isAnswered
                      ? "1px solid #86EFAC"
                      : `1px solid ${C.border}`,
                  }}
                >
                  {i + 1}
                </div>
              );
            })}
          </div>

          {/* Question card */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                background: C.card,
                borderRadius: "12px",
                border: `1px solid ${C.border}`,
                padding: "28px 28px 24px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              {/* Question meta */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <span
                  style={{
                    background: "#EFF6FF",
                    color: C.primary,
                    padding: "4px 12px",
                    borderRadius: "6px",
                    fontWeight: "700",
                    fontSize: "13px",
                  }}
                >
                  Question {currentQ + 1} of {questions.length}
                </span>
                {answered !== null && (
                  <span
                    style={{
                      color: C.success,
                      fontSize: "12px",
                      fontWeight: "700",
                    }}
                  >
                    ✓ Answered
                  </span>
                )}
              </div>

              {/* Question text */}
              <p
                style={{
                  fontSize: "17px",
                  fontWeight: "600",
                  color: C.text,
                  lineHeight: "1.65",
                  marginBottom: "22px",
                }}
              >
                {q.question}
              </p>

              {/* Options */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {q.options.map((opt, oi) => {
                  const isChosen = answered === oi;
                  return (
                    <div
                      key={oi}
                      onClick={() => handleSelect(oi)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        padding: "14px 18px",
                        borderRadius: "10px",
                        border: isChosen
                          ? `2px solid ${C.primary}`
                          : `1.5px solid ${C.border}`,
                        background: isChosen ? "#EFF6FF" : "#FAFAFA",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        userSelect: "none",
                      }}
                    >
                      {/* Circle label */}
                      <div
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "50%",
                          flexShrink: 0,
                          background: isChosen ? C.primary : "#E2E8F0",
                          color: isChosen ? "#fff" : C.muted,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "700",
                          fontSize: "13px",
                          transition: "all 0.15s",
                        }}
                      >
                        {String.fromCharCode(65 + oi)}
                      </div>
                      <span
                        style={{
                          fontSize: "15px",
                          color: isChosen ? C.primary : C.text,
                          fontWeight: isChosen ? "600" : "400",
                        }}
                      >
                        {opt}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Navigation row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "28px",
                  gap: "10px",
                }}
              >
                <button
                  disabled={currentQ === 0}
                  onClick={() => setCurrentQ((i) => i - 1)}
                  style={{
                    background: "#F1F5F9",
                    color: currentQ === 0 ? C.faint : C.text,
                    border: `1px solid ${C.border}`,
                    borderRadius: "8px",
                    padding: "10px 20px",
                    fontWeight: "600",
                    cursor: currentQ === 0 ? "not-allowed" : "pointer",
                    opacity: currentQ === 0 ? 0.5 : 1,
                    fontSize: "14px",
                  }}
                >
                  ← Previous
                </button>

                {!isLast ? (
                  <button
                    onClick={() => setCurrentQ((i) => i + 1)}
                    style={{
                      background: C.primary,
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "10px 24px",
                      fontWeight: "600",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{
                      background: C.success,
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "10px 24px",
                      fontWeight: "700",
                      cursor: submitting ? "not-allowed" : "pointer",
                      opacity: submitting ? 0.7 : 1,
                      fontSize: "14px",
                    }}
                  >
                    {submitting
                      ? "Submitting…"
                      : allDone
                      ? "Submit Quiz ✓"
                      : `Submit  (${answeredN}/${questions.length} answered)`}
                  </button>
                )}
              </div>

              {/* Submit early — visible once at least one question answered */}
              {!isLast && answeredN > 0 && (
                <div style={{ textAlign: "right", marginTop: "10px" }}>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{
                      background: "transparent",
                      color: C.muted,
                      border: "none",
                      fontSize: "13px",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Submit early ({answeredN}/{questions.length} answered)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizAttempt;
