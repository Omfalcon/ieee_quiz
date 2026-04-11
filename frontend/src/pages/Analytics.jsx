import React, { useState, useEffect, useCallback } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import {
  BarChart2, Users, CheckCircle, Clock, ChevronRight, ChevronLeft,
  Trophy, Search, X, User, Timer, TrendingUp, AlertCircle
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAdminWS } from "../context/WebSocketContext";

const API = "http://127.0.0.1:8000";

// ─── Helpers ───────────────────────────────────────────────────────────────
const statusColor = (status, tokens) => {
  if (status === "live")     return tokens.success;
  if (status === "finished") return tokens.textMuted;
  return tokens.primary;
};

const fmtTime = (s) => s != null ? `${s}s` : "—";

const accuracyColor = (pct, tokens) => {
  if (pct >= 70) return tokens.success;
  if (pct >= 40) return "#f59e0b";
  return tokens.danger;
};

// ─── Summary Stat Card ─────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color, tokens }) => (
  <div style={{
    background: tokens.surface, border: `1px solid ${tokens.border}`,
    borderRadius: "14px", padding: "20px 24px",
    display: "flex", alignItems: "center", gap: "16px",
    boxShadow: tokens.cardShadow, flex: 1
  }}>
    <div style={{ width: 44, height: 44, borderRadius: "12px", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={22} color={color} />
    </div>
    <div>
      <div style={{ fontSize: "28px", fontWeight: 800, color: tokens.text, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: "12px", color: tokens.textMuted, fontWeight: 600, marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</div>
    </div>
  </div>
);

// ─── Question Card ─────────────────────────────────────────────────────────
const QuestionCard = ({ q, tokens, theme }) => {
  if (!q) return null;
  const color = accuracyColor(q.accuracy, tokens);
  const typeLabel = { mcq: "MCQ", msq: "Multi-Select", truefalse: "True/False", short: "Short Answer" }[q.type] || "MCQ";

  return (
    <div style={{
      background: tokens.surface, border: `1px solid ${tokens.border}`,
      borderRadius: "16px", padding: "28px", boxShadow: tokens.cardShadow,
      transition: "all 0.25s ease"
    }}>
      {/* Type badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, background: `${tokens.primary}18`, color: tokens.primary, padding: "4px 10px", borderRadius: "20px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {typeLabel}
        </span>
        <span style={{ fontSize: "12px", color: tokens.textMuted, fontWeight: 600 }}>Q{q.index + 1}</span>
      </div>

      {/* Question text */}
      <h3 style={{ fontSize: "17px", fontWeight: 700, color: tokens.text, lineHeight: 1.5, marginBottom: "20px" }}>
        {q.question}
      </h3>

      {/* Options (MCQ/MSQ/TF) */}
      {q.options && q.options.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
          {q.options.map((opt, i) => {
            const correct = Array.isArray(q.correct_answer)
              ? q.correct_answer.includes(i)
              : q.correct_answer === i;
            return (
              <div key={i} style={{
                padding: "10px 14px", borderRadius: "10px",
                border: `1.5px solid ${correct ? tokens.success : tokens.border}`,
                background: correct ? (theme === "dark" ? "rgba(34,197,94,0.08)" : "#f0fdf4") : tokens.surfaceHover,
                display: "flex", alignItems: "center", gap: "10px"
              }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: correct ? tokens.success : tokens.textMuted, width: "16px", flexShrink: 0 }}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span style={{ fontSize: "14px", color: tokens.text, flex: 1 }}>{opt}</span>
                {correct && <CheckCircle size={15} color={tokens.success} />}
              </div>
            );
          })}
        </div>
      )}

      {/* Short answer correct */}
      {q.type === "short" && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", background: theme === "dark" ? "rgba(34,197,94,0.08)" : "#f0fdf4", border: `1.5px solid ${tokens.success}`, marginBottom: "24px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: tokens.success, display: "block", marginBottom: "4px" }}>CORRECT ANSWER</span>
          <span style={{ fontSize: "15px", color: tokens.text, fontWeight: 600 }}>{q.correct_display || "—"}</span>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "Correct", value: `${q.correct}/${q.answered}`, icon: CheckCircle, color: tokens.success },
          { label: "Wrong",   value: `${q.answered - q.correct}/${q.answered}`, icon: X, color: tokens.danger },
          { label: "Accuracy", value: `${q.accuracy}%`, icon: TrendingUp, color },
        ].map(({ label, value, icon: Icon, color: c }) => (
          <div key={label} style={{ textAlign: "center", padding: "12px", borderRadius: "10px", background: tokens.surfaceHover, border: `1px solid ${tokens.border}` }}>
            <Icon size={15} color={c} style={{ marginBottom: "4px" }} />
            <div style={{ fontSize: "16px", fontWeight: 800, color: c }}>{value}</div>
            <div style={{ fontSize: "10px", color: tokens.textMuted, fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Time row */}
      {q.answered > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {[
            { label: "Avg Time", value: fmtTime(q.avg_time), icon: Timer },
            { label: "Min Time", value: fmtTime(q.min_time), icon: Timer },
            { label: "Max Time", value: fmtTime(q.max_time), icon: Timer },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} style={{ textAlign: "center", padding: "10px", borderRadius: "10px", background: tokens.surfaceHover, border: `1px solid ${tokens.border}` }}>
              <Icon size={13} color={tokens.textMuted} style={{ marginBottom: "3px" }} />
              <div style={{ fontSize: "14px", fontWeight: 700, color: tokens.text }}>{value}</div>
              <div style={{ fontSize: "10px", color: tokens.textMuted, fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Accuracy bar */}
      <div style={{ marginTop: "20px" }}>
        <div style={{ height: "6px", background: tokens.border, borderRadius: "3px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${q.accuracy}%`, background: color, borderRadius: "3px", transition: "width 0.5s ease" }} />
        </div>
      </div>
    </div>
  );
};

// ─── User Answer Card (drilldown) ──────────────────────────────────────────
const UserAnswerCard = ({ ans, tokens, theme }) => {
  if (!ans) return null;
  const typeLabel = { mcq: "MCQ", msq: "Multi-Select", truefalse: "True/False", short: "Short Answer" }[ans.question_type] || "MCQ";
  let userDisplay = ans.user_answer;
  if (userDisplay && userDisplay.startsWith("[")) {
    try { userDisplay = JSON.parse(userDisplay).join(", "); } catch { /* keep raw */ }
  }

  return (
    <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "16px", padding: "24px", boxShadow: tokens.cardShadow }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, background: `${tokens.primary}18`, color: tokens.primary, padding: "4px 10px", borderRadius: "20px", textTransform: "uppercase" }}>{typeLabel}</span>
        <span style={{ fontSize: "12px", color: tokens.textMuted }}>{ans.elapsed_seconds}s</span>
      </div>
      <h4 style={{ fontSize: "15px", fontWeight: 700, color: tokens.text, lineHeight: 1.5, marginBottom: "16px" }}>{ans.question}</h4>

      {/* Options with user + correct highlighted */}
      {ans.options && ans.options.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginBottom: "16px" }}>
          {ans.options.map((opt, i) => {
            const isCorrect = Array.isArray(ans.correct_display) ? ans.correct_display.includes(opt) : ans.correct_display === opt;
            let userPicked = false;
            if (userDisplay) {
              userPicked = ans.question_type === "msq"
                ? userDisplay.includes(opt)
                : ans.user_answer === opt;
            }
            let bg = tokens.surfaceHover, border = tokens.border, textColor = tokens.text;
            if (isCorrect) { bg = theme === "dark" ? "rgba(34,197,94,0.08)" : "#f0fdf4"; border = tokens.success; }
            if (userPicked && !isCorrect) { bg = theme === "dark" ? "rgba(239,68,68,0.08)" : "#fef2f2"; border = tokens.danger; textColor = tokens.danger; }

            return (
              <div key={i} style={{ padding: "9px 12px", borderRadius: "9px", border: `1.5px solid ${border}`, background: bg, display: "flex", gap: "10px", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: tokens.textMuted, width: "16px", flexShrink: 0 }}>{String.fromCharCode(65 + i)}</span>
                <span style={{ fontSize: "13px", color: textColor, flex: 1 }}>{opt}</span>
                {isCorrect && <CheckCircle size={14} color={tokens.success} />}
                {userPicked && !isCorrect && <X size={14} color={tokens.danger} />}
              </div>
            );
          })}
        </div>
      )}

      {/* Short answer comparison */}
      {ans.question_type === "short" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
          <div style={{ padding: "10px 14px", borderRadius: "10px", background: theme === "dark" ? "rgba(34,197,94,0.08)" : "#f0fdf4", border: `1.5px solid ${tokens.success}` }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: tokens.success, display: "block", marginBottom: "2px" }}>CORRECT ANSWER</span>
            <span style={{ fontSize: "14px", color: tokens.text }}>{ans.correct_display}</span>
          </div>
          <div style={{ padding: "10px 14px", borderRadius: "10px", background: ans.is_correct ? (theme === "dark" ? "rgba(34,197,94,0.08)" : "#f0fdf4") : (theme === "dark" ? "rgba(239,68,68,0.08)" : "#fef2f2"), border: `1.5px solid ${ans.is_correct ? tokens.success : tokens.danger}` }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: ans.is_correct ? tokens.success : tokens.danger, display: "block", marginBottom: "2px" }}>YOUR ANSWER</span>
            <span style={{ fontSize: "14px", color: tokens.text }}>{userDisplay || <em style={{ color: tokens.textMuted }}>No answer</em>}</span>
          </div>
        </div>
      )}

      {/* Status badge */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px" }}>
        {ans.is_correct
          ? <><CheckCircle size={16} color={tokens.success} /><span style={{ fontSize: "13px", fontWeight: 700, color: tokens.success }}>Correct</span></>
          : <><AlertCircle size={16} color={tokens.danger} /><span style={{ fontSize: "13px", fontWeight: 700, color: tokens.danger }}>Incorrect</span></>
        }
        <span style={{ marginLeft: "auto", fontSize: "11px", color: tokens.textMuted }}><Timer size={11} style={{ display: "inline", verticalAlign: "middle" }} /> {ans.elapsed_seconds}s</span>
      </div>
    </div>
  );
};

// ─── Main Analytics Page ───────────────────────────────────────────────────
const Analytics = () => {
  const { tokens, theme } = useTheme();
  const { lastEvent } = useAdminWS();

  const [quizzes, setQuizzes]         = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [analytics, setAnalytics]     = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [activeTab, setActiveTab]     = useState("questions"); // questions | participants | leaderboard
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [search, setSearch]           = useState("");
  const [expandedUser, setExpandedUser] = useState(null);
  const [userAttempt, setUserAttempt] = useState(null);
  const [userAttemptQIdx, setUserAttemptQIdx] = useState(0);
  const [userLoading, setUserLoading] = useState(false);

  // ── Fetch helpers ───────────────────────────────────────────────────────
  const fetchQuizzes = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/quizzes`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setQuizzes(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  const fetchAnalytics = useCallback(async (quizId) => {
    setAnalyticsLoading(true);
    setCurrentQIdx(0);
    setExpandedUser(null);
    setUserAttempt(null);
    try {
      const token = localStorage.getItem("token");
      const [aRes, lRes] = await Promise.all([
        fetch(`${API}/admin/analytics/quiz-analytics/${quizId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/quizzes/${quizId}/leaderboard`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (aRes.ok) setAnalytics(await aRes.json());
      if (lRes.ok) { const lb = await lRes.json(); setLeaderboard(lb.leaderboard || []); }
    } catch { /* silent */ }
    finally { setAnalyticsLoading(false); }
  }, []);

  const fetchUserAttempt = async (email) => {
    if (!selectedQuizId) return;
    setUserLoading(true);
    setUserAttemptQIdx(0);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/admin/analytics/user-attempt/${selectedQuizId}/${encodeURIComponent(email)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setUserAttempt(await res.json());
    } catch { /* silent */ }
    finally { setUserLoading(false); }
  };

  // ── Effects ─────────────────────────────────────────────────────────────
  useEffect(() => { fetchQuizzes(); }, [fetchQuizzes]);

  useEffect(() => {
    if (!selectedQuizId) return;
    fetchAnalytics(selectedQuizId);
  }, [selectedQuizId, fetchAnalytics]);

  useEffect(() => {
    if (!lastEvent) return;
    const { action, quiz_id } = lastEvent;
    if (action === "NEW_SUBMISSION" && quiz_id === selectedQuizId) fetchAnalytics(selectedQuizId);
    if (["QUIZ_CREATED", "QUIZ_DELETED", "QUIZ_UPDATED"].includes(action)) fetchQuizzes();
  }, [lastEvent]);

  const handleUserClick = (email) => {
    if (expandedUser === email) {
      setExpandedUser(null);
      setUserAttempt(null);
      return;
    }
    setExpandedUser(email);
    fetchUserAttempt(email);
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const qs = analytics?.question_stats || [];
  const participants = analytics?.participants || [];
  const filteredParticipants = participants.filter(p =>
    !search || p.email.toLowerCase().includes(search.toLowerCase())
  );

  const TABS = [
    { id: "questions", label: "Questions", icon: BarChart2 },
    { id: "participants", label: "Participants", icon: Users },
    { id: "leaderboard", label: "Leaderboard", icon: Trophy },
  ];

  return (
    <AdminLayout>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.25s ease both; }
      `}</style>

      <h1 style={{ marginBottom: "24px", color: tokens.text, fontSize: "22px", fontWeight: 800 }}>Analytics</h1>

      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>

        {/* ── Quiz List Panel ── */}
        <div style={{ width: "240px", flexShrink: 0, background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "14px", overflow: "hidden", boxShadow: tokens.cardShadow }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${tokens.border}` }}>
            <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: tokens.text, textTransform: "uppercase", letterSpacing: "0.5px" }}>Select Quiz</h3>
          </div>
          {loading ? (
            <div style={{ padding: "24px", color: tokens.textMuted, textAlign: "center", fontSize: "13px" }}>Loading…</div>
          ) : quizzes.length === 0 ? (
            <div style={{ padding: "24px", color: tokens.textMuted, textAlign: "center", fontSize: "13px" }}>No quizzes found.</div>
          ) : (
            <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
              {quizzes.map(quiz => (
                <div key={quiz._id} onClick={() => setSelectedQuizId(quiz._id)}
                  style={{ padding: "11px 16px", cursor: "pointer", borderBottom: `1px solid ${tokens.border}`, background: selectedQuizId === quiz._id ? `${tokens.primary}12` : "transparent", borderLeft: selectedQuizId === quiz._id ? `3px solid ${tokens.primary}` : "3px solid transparent", transition: "all 0.15s", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  onMouseEnter={e => { if (selectedQuizId !== quiz._id) e.currentTarget.style.background = tokens.surfaceHover; }}
                  onMouseLeave={e => { e.currentTarget.style.background = selectedQuizId === quiz._id ? `${tokens.primary}12` : "transparent"; }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "13px", color: tokens.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{quiz.title}</div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: statusColor(quiz.status, tokens), textTransform: "uppercase", marginTop: "2px" }}>{quiz.status}</div>
                  </div>
                  <ChevronRight size={13} color={tokens.textMuted} style={{ flexShrink: 0 }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Analytics Panel ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedQuizId ? (
            <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "14px", padding: "80px 24px", textAlign: "center", color: tokens.textMuted, boxShadow: tokens.cardShadow }}>
              <BarChart2 size={48} style={{ marginBottom: "16px", opacity: 0.3 }} />
              <p style={{ fontSize: "16px", fontWeight: 600 }}>Select a quiz to view analytics</p>
            </div>
          ) : analyticsLoading ? (
            <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "14px", padding: "80px 24px", textAlign: "center", color: tokens.textMuted }}>
              <div style={{ width: "36px", height: "36px", border: `3px solid ${tokens.border}`, borderTopColor: tokens.primary, borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 16px" }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              Loading analytics…
            </div>
          ) : analytics ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }} className="fade-up">

              {/* Summary stats */}
              <div style={{ display: "flex", gap: "14px" }}>
                <StatCard label="Participants"  value={analytics.total_participants} icon={Users}        color={tokens.primary} tokens={tokens} />
                <StatCard label="Submissions"   value={analytics.total_submissions}  icon={CheckCircle}  color={tokens.success} tokens={tokens} />
                <StatCard label="Questions"     value={analytics.total_questions}    icon={BarChart2}    color="#f59e0b"        tokens={tokens} />
                <StatCard label="Avg Score"
                  value={analytics.total_submissions > 0
                    ? `${Math.round(analytics.participants.reduce((acc, p) => acc + p.score, 0) / analytics.participants.length * 10) / 10}`
                    : "—"}
                  icon={TrendingUp} color="#8b5cf6" tokens={tokens}
                />
              </div>

              {/* Tabs */}
              <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "14px", overflow: "hidden", boxShadow: tokens.cardShadow }}>
                <div style={{ display: "flex", borderBottom: `1px solid ${tokens.border}` }}>
                  {TABS.map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => setActiveTab(id)}
                      style={{ flex: 1, padding: "14px", background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px", color: activeTab === id ? tokens.primary : tokens.textMuted, borderBottom: activeTab === id ? `2px solid ${tokens.primary}` : "2px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", transition: "color 0.15s" }}>
                      <Icon size={15} />{label}
                    </button>
                  ))}
                </div>

                <div style={{ padding: "24px" }}>

                  {/* ── QUESTIONS TAB ── */}
                  {activeTab === "questions" && (
                    <div style={{ display: "flex", gap: "20px" }}>
                      {/* Q sidebar */}
                      <div style={{ width: "160px", flexShrink: 0 }}>
                        <div style={{ fontSize: "10px", fontWeight: 700, color: tokens.textMuted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>Questions</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                          {qs.map((q, i) => (
                            <button key={i} onClick={() => setCurrentQIdx(i)}
                              style={{ padding: "8px 12px", borderRadius: "8px", border: `1px solid ${currentQIdx === i ? tokens.primary : tokens.border}`, background: currentQIdx === i ? `${tokens.primary}12` : "transparent", color: currentQIdx === i ? tokens.primary : tokens.text, fontWeight: currentQIdx === i ? 700 : 500, fontSize: "13px", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.15s" }}>
                              <span>Q{i + 1}</span>
                              <span style={{ fontSize: "10px", fontWeight: 700, color: accuracyColor(q.accuracy, tokens) }}>{q.accuracy}%</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Q card */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {qs.length === 0 ? (
                          <div style={{ textAlign: "center", padding: "40px", color: tokens.textMuted, fontSize: "13px" }}>No submissions yet.</div>
                        ) : (
                          <>
                            <QuestionCard q={qs[currentQIdx]} tokens={tokens} theme={theme} />
                            {/* Navigation */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
                              <button onClick={() => setCurrentQIdx(p => Math.max(0, p - 1))} disabled={currentQIdx === 0}
                                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", border: `1px solid ${tokens.border}`, background: "none", color: currentQIdx === 0 ? tokens.textMuted : tokens.text, cursor: currentQIdx === 0 ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "13px", opacity: currentQIdx === 0 ? 0.5 : 1 }}>
                                <ChevronLeft size={15} /> Prev
                              </button>
                              <span style={{ fontSize: "13px", color: tokens.textMuted, fontWeight: 600 }}>{currentQIdx + 1} / {qs.length}</span>
                              <button onClick={() => setCurrentQIdx(p => Math.min(qs.length - 1, p + 1))} disabled={currentQIdx === qs.length - 1}
                                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", border: `1px solid ${tokens.border}`, background: "none", color: currentQIdx === qs.length - 1 ? tokens.textMuted : tokens.text, cursor: currentQIdx === qs.length - 1 ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "13px", opacity: currentQIdx === qs.length - 1 ? 0.5 : 1 }}>
                                Next <ChevronRight size={15} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── PARTICIPANTS TAB ── */}
                  {activeTab === "participants" && (
                    <div>
                      {/* Search */}
                      <div style={{ position: "relative", marginBottom: "16px" }}>
                        <Search size={15} color={tokens.textMuted} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                        <input
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          placeholder="Search by email…"
                          style={{ width: "100%", padding: "10px 12px 10px 36px", border: `1px solid ${tokens.border}`, borderRadius: "10px", background: tokens.surface, color: tokens.text, fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                        />
                        {search && (
                          <button onClick={() => setSearch("")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: tokens.textMuted }}>
                            <X size={15} />
                          </button>
                        )}
                      </div>

                      {filteredParticipants.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "40px", color: tokens.textMuted, fontSize: "13px" }}>
                          {search ? "No participants match your search." : "No submissions yet."}
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {filteredParticipants.map((p) => (
                            <div key={p.email}>
                              {/* Participant row */}
                              <div onClick={() => handleUserClick(p.email)}
                                style={{ padding: "14px 16px", borderRadius: "10px", border: `1px solid ${expandedUser === p.email ? tokens.primary : tokens.border}`, background: expandedUser === p.email ? `${tokens.primary}08` : tokens.surfaceHover, cursor: "pointer", display: "flex", alignItems: "center", gap: "14px", transition: "all 0.15s" }}>
                                <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${tokens.primary}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                  <User size={17} color={tokens.primary} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: "13px", fontWeight: 700, color: tokens.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.email}</div>
                                  <div style={{ fontSize: "11px", color: tokens.textMuted, marginTop: "2px" }}>
                                    Score: <strong style={{ color: tokens.success }}>{p.score}/{p.total}</strong>
                                    {p.submitted_at && <span style={{ marginLeft: "8px" }}>· {new Date(p.submitted_at).toLocaleTimeString()}</span>}
                                  </div>
                                </div>
                                <ChevronRight size={15} color={tokens.textMuted} style={{ transition: "transform 0.2s", transform: expandedUser === p.email ? "rotate(90deg)" : "none" }} />
                              </div>

                              {/* Drilldown panel */}
                              {expandedUser === p.email && (
                                <div className="fade-up" style={{ marginTop: "8px", padding: "20px", border: `1px solid ${tokens.border}`, borderRadius: "12px", background: tokens.surface }}>
                                  {userLoading ? (
                                    <div style={{ textAlign: "center", padding: "24px", color: tokens.textMuted }}>Loading answers…</div>
                                  ) : userAttempt ? (
                                    <div style={{ display: "flex", gap: "16px" }}>
                                      {/* Q sidebar */}
                                      <div style={{ width: "100px", flexShrink: 0 }}>
                                        <div style={{ fontSize: "10px", fontWeight: 700, color: tokens.textMuted, textTransform: "uppercase", marginBottom: "8px" }}>Questions</div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                          {userAttempt.answers.map((ans, i) => (
                                            <button key={i} onClick={() => setUserAttemptQIdx(i)}
                                              style={{ padding: "7px 10px", borderRadius: "7px", border: `1px solid ${userAttemptQIdx === i ? tokens.primary : tokens.border}`, background: userAttemptQIdx === i ? `${tokens.primary}12` : "transparent", color: userAttemptQIdx === i ? tokens.primary : tokens.text, fontWeight: userAttemptQIdx === i ? 700 : 500, fontSize: "12px", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                              <span>Q{i + 1}</span>
                                              {ans.is_correct ? <CheckCircle size={11} color={tokens.success} /> : <X size={11} color={tokens.danger} />}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      {/* Answer card */}
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <UserAnswerCard ans={userAttempt.answers[userAttemptQIdx]} tokens={tokens} theme={theme} />
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ textAlign: "center", padding: "24px", color: tokens.textMuted, fontSize: "13px" }}>No submission data found.</div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── LEADERBOARD TAB ── */}
                  {activeTab === "leaderboard" && (
                    <div>
                      {leaderboard.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "40px", color: tokens.textMuted, fontSize: "13px" }}>No completions yet.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {leaderboard.map((row) => {
                            const isTop3 = row.rank <= 3;
                            const rankColor = row.rank === 1 ? "#fbbf24" : row.rank === 2 ? "#94a3b8" : row.rank === 3 ? "#f59e0b" : tokens.textMuted;
                            return (
                              <div key={row.email} onClick={() => { setActiveTab("participants"); setExpandedUser(null); handleUserClick(row.email); }}
                                style={{ padding: "14px 18px", borderRadius: "12px", border: `1.5px solid ${isTop3 ? rankColor + "44" : tokens.border}`, background: isTop3 ? `${rankColor}08` : tokens.surfaceHover, display: "flex", alignItems: "center", gap: "16px", cursor: "pointer", transition: "all 0.15s" }}
                                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = tokens.cardShadow; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: `${rankColor}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                  <span style={{ fontSize: "14px", fontWeight: 900, color: rankColor }}>#{row.rank}</span>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: "14px", color: tokens.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</div>
                                  <div style={{ fontSize: "11px", color: tokens.textMuted, marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.email}</div>
                                </div>
                                <div style={{ textAlign: "center", minWidth: "70px" }}>
                                  <div style={{ fontSize: "13px", fontWeight: 700, color: tokens.success }}>{row.percentage}%</div>
                                  <div style={{ fontSize: "10px", color: tokens.textMuted, textTransform: "uppercase" }}>Accuracy</div>
                                </div>
                                <div style={{ textAlign: "center", minWidth: "60px" }}>
                                  <div style={{ fontSize: "13px", fontWeight: 700, color: tokens.textMuted }}>{row.time_taken_seconds}s</div>
                                  <div style={{ fontSize: "10px", color: tokens.textMuted, textTransform: "uppercase" }}>Time</div>
                                </div>
                                <div style={{ textAlign: "right", minWidth: "90px" }}>
                                  <div style={{ fontSize: "20px", fontWeight: 900, color: tokens.primary }}>{row.points?.toLocaleString()}</div>
                                  <div style={{ fontSize: "10px", color: tokens.textMuted, textTransform: "uppercase" }}>Points</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Analytics;
