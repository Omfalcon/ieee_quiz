import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { useTheme, ThemeToggle } from "../context/ThemeContext";
import { LogOut, Layout, Clock, Globe, Shield, HelpCircle, ArrowRight, Calendar, Info } from "lucide-react";
import '../styles/StudentDashboard.css';

const API = "http://127.0.0.1:8000";

const fmtDT = (val) => {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch { return String(val); }
};

const calcDuration = (start, end) => {
  if (!start || !end) return "Not specified";
  const s = new Date(start), e = new Date(end);
  if (isNaN(s) || isNaN(e)) return "Not specified";
  const mins = Math.round((e - s) / 60000);
  return mins > 0 ? `${mins} min` : "Not specified";
};

const InfoCell = ({ label, value, icon, highlight, tokens }) => (
  <div style={{
    background: highlight ? `${tokens.primary}10` : tokens.surfaceHover,
    border: `1px solid ${highlight ? tokens.primary : tokens.border}`,
    borderRadius: 14, padding: "16px 20px", display: 'flex', flexDirection: 'column', gap: 4,
    transition: 'all 0.2s', flex: 1, minWidth: '140px'
  }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: tokens.textMuted, textTransform: "uppercase", letterSpacing: "1px", display: 'flex', alignItems: 'center', gap: 6 }}>
      {icon} {label}
    </div>
    <div style={{ fontSize: 16, fontWeight: 800, color: tokens.text }}>{value}</div>
  </div>
);

const StudentQuizIntro = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { theme, tokens } = useTheme();
  const { logout } = useContext(AuthContext);

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    axios.get(`${API}/quizzes/${id}`)
      .then(r => setQuiz(r.data))
      .catch((err) => {
        console.error(err);
        setError("Quiz not found or could not be loaded.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleStart = () => {
    if (quiz.status !== "live") {
      alert(`This quiz is currently "${quiz.status}". It can only be attempted when Live.`);
      return;
    }
    const token = localStorage.getItem("token");
    if (!user || !token) {
      localStorage.removeItem("token");
      navigate(`/login?redirect=/student/quiz/${id}`);
      return;
    }
    setDisplayName(user?.name || "");
    setShowNamePrompt(true);
  };

  const handleConfirmStart = async () => {
    if (!displayName.trim()) { alert("Please enter a display name."); return; }
    setStarting(true);
    try {
      const token = localStorage.getItem("token");
      const nameRes = await axios.patch(
        `${API}/auth/student/me/name`, { name: displayName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (nameRes.data.access_token) localStorage.setItem("token", nameRes.data.access_token);
      await axios.post(`${API}/quizzes/${id}/attempt`, {}, { headers: { Authorization: `Bearer ${token}` } });
      navigate(`/student/quiz/${id}/play`);
    } catch (err) {
      alert("Error starting quiz: " + (err.response?.data?.detail || err.message));
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ ...styles.fullPage, background: tokens.bg }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ ...styles.spinner, borderTopColor: tokens.primary }} />
          <p style={{ color: tokens.primary, fontWeight: 600, marginTop: 16, fontFamily: "Inter, sans-serif" }}>Preparing quiz lobby...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div style={{ ...styles.fullPage, background: tokens.bg }}>
        <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", padding: 20 }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>🧭</div>
          <h2 style={{ color: tokens.text, marginBottom: 8, fontSize: 28, fontWeight: 800 }}>Quiz Not Found</h2>
          <p style={{ color: tokens.textMuted, fontSize: 16 }}>{error}</p>
          <button
            onClick={() => navigate('/student/dashboard')}
            style={{ 
              marginTop: 32, padding: '12px 28px', background: tokens.primary, 
              color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer',
              fontWeight: 700, fontSize: 15, boxShadow: '0 4px 12px rgba(30, 99, 181, 0.2)'
            }}
          >Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const isLive = quiz?.status === "live";
  const isFinished = quiz?.status === "finished";
  const statusColor = isLive ? "var(--success)" : isFinished ? "var(--text-muted)" : "#B45309";
  const statusBg = isLive ? "rgba(16,185,129,0.1)" : isFinished ? "var(--surface-hover)" : "rgba(180,83,9,0.1)";
  const statusLabel = quiz?.status ? quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1) : "Scheduled";

  return (
    <div style={{ ...styles.page, background: tokens.bg }}>
      {/* ══ HEADER ══════════════════════════════════════════════ */}
      <header className="top-header">
        <div className="brand-area" onClick={() => navigate('/student/dashboard')} style={{ cursor: 'pointer' }}>
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/IEEE_logo.svg/1200px-IEEE_logo.svg.png"
            alt="IEEE" style={{ height: 22, filter: 'brightness(0) invert(1)' }}
          />
          <span className="brand-title">QuizHub</span>
          <span className="brand-badge">CONTEST</span>
        </div>

        <div className="header-right">
          <ThemeToggle />
          <div className="header-divider" />
          <div className="header-user-info">
            <span>{user?.name || 'Student'}</span>
            <div className="profile-circle">
              {user?.name ? user.name.charAt(0).toUpperCase() : <Shield size={14} />}
            </div>
          </div>
          <button
            className="icon-btn"
            title="Logout"
            onClick={() => { logout(); navigate('/login'); }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div style={styles.outer}>
        <div style={{ 
          ...styles.card, 
          background: tokens.surface, 
          border: `1px solid ${tokens.border}`, 
          boxShadow: tokens.cardShadow,
          animation: 'fadeUp 0.6s ease-out'
        }}>
          {/* Category + Status Row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
            {quiz.category && (
              <span style={{ ...styles.categoryBadge, background: tokens.activeItem, color: tokens.activeText, borderColor: tokens.border }}>
                <Layout size={12} style={{ marginRight: 6 }} /> {quiz.category}
              </span>
            )}
            <span style={{ ...styles.statusBadge, background: statusBg, color: statusColor }}>
              {isLive && <span style={styles.liveDot} />}
              {statusLabel}
            </span>
            <span style={{ ...styles.questionCount, color: tokens.textMuted }}>
               <Info size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {quiz.questions?.length || 0} Questions
            </span>
          </div>

          {/* Quiz Title */}
          <h1 style={{ ...styles.quizTitle, color: tokens.text }}>{quiz.title}</h1>

          {/* Description */}
          {quiz.description && (
            <p style={{ ...styles.description, color: tokens.textMuted }}>{quiz.description}</p>
          )}

          {/* Info Grid */}
          <div style={styles.infoGrid}>
            <InfoCell label="Starts At" value={fmtDT(quiz.start_time)} icon={<Calendar size={14} />} tokens={tokens} />
            <InfoCell label="Ends At" value={fmtDT(quiz.end_time)} icon={<Clock size={14} />} tokens={tokens} />
            <InfoCell label="Duration" value={calcDuration(quiz.start_time, quiz.end_time)} icon={<Clock size={14} />} tokens={tokens} />
            </div>

          <div style={{ height: '1px', background: tokens.border, margin: '24px 0' }} />

          {/* Rules */}
          <div style={{ ...styles.rulesBox, background: tokens.surfaceHover, borderColor: tokens.border }}>
            <p style={{ ...styles.rulesTitle, color: tokens.textMuted }}> <HelpCircle size={14} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Instructions & Rules</p>
            <ul style={{ ...styles.rulesList, color: tokens.text }}>
              <li>Each correct answer earns base points + speed bonus.</li>
              <li>Faster responses secure higher positions on the leaderboard.</li>
              <li>Once you start, the timer cannot be paused.</li>
              <li>Maintain a stable internet connection throughout the quiz.</li>
            </ul>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleStart}
            disabled={!isLive}
            style={{
              ...styles.ctaBtn,
              background: isLive ? tokens.primary : tokens.surfaceHover,
              color: isLive ? "#fff" : tokens.textMuted,
              cursor: isLive ? "pointer" : "not-allowed",
              boxShadow: isLive ? "0 8px 20px rgba(37, 99, 235, 0.2)" : "none",
              border: isLive ? 'none' : `1px solid ${tokens.border}`,
              marginTop: 8
            }}
          >
            {isLive
              ? user ? <><ArrowRight size={18} style={{ marginRight: 8 }} /> Start Quiz Now</> : "🔐  Login to Attempt"
              : isFinished
                ? "This contest has ended"
                : "⏳  Waiting for Host to start"}
          </button>

          {isLive && !user && (
            <p style={{ textAlign: "center", fontSize: 13, color: tokens.textMuted, marginTop: 16 }}>
              You'll be redirected back here after a quick login.
            </p>
          )}
        </div>
      </div>

      {/* Name Prompt Modal */}
      {showNamePrompt && (
        <div style={styles.overlay}>
          <div style={{ ...styles.modal, background: tokens.surface, color: tokens.text }}>
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ ...styles.modalTitle, color: tokens.text }}>Verify Your Contest Name</h3>
              <p style={{ ...styles.modalSubtitle, color: tokens.textMuted }}>
                This is how you'll be identified on the global leaderboard.
              </p>
            </div>

            <label style={{ ...styles.inputLabel, color: tokens.text }}>Leaderboard Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleConfirmStart()}
              placeholder="e.g. John Doe"
              style={{ ...styles.input, background: tokens.surfaceHover, borderColor: tokens.border, color: tokens.text }}
              disabled={starting}
              autoFocus
            />

            <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
              <button
                onClick={() => setShowNamePrompt(false)}
                disabled={starting}
                style={{ ...styles.cancelBtn, background: tokens.surfaceHover, borderColor: tokens.border, color: tokens.textMuted }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStart}
                disabled={starting || !displayName.trim()}
                style={{
                  ...styles.confirmBtn,
                  background: tokens.primary,
                  opacity: (starting || !displayName.trim()) ? 0.6 : 1,
                  cursor: (starting || !displayName.trim()) ? "not-allowed" : "pointer",
                }}
              >
                {starting ? "Initializing..." : "Proceed to Quiz"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

const styles = {
  page: {
    minHeight: "100vh",
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    transition: 'background 0.3s'
  },
  fullPage: {
    display: "flex", justifyContent: "center", alignItems: "center",
    height: "100vh",
  },
  spinner: {
    width: 44, height: 44, borderRadius: "50%",
    border: "4px solid var(--border)", borderTopColor: "var(--primary)",
    animation: "spin 0.8s linear infinite", margin: "0 auto",
  },
  outer: {
    maxWidth: 720, margin: "0 auto", padding: "40px 20px",
  },
  card: {
    borderRadius: 24,
    padding: "48px",
    display: 'flex', flexDirection: 'column',
    transition: 'background 0.3s, border-color 0.3s'
  },
  categoryBadge: {
    padding: "6px 16px", borderRadius: 20,
    fontSize: 12, fontWeight: 700, border: "1px solid",
    display: 'flex', alignItems: 'center'
  },
  statusBadge: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
  },
  liveDot: {
    width: 8, height: 8, borderRadius: "50%",
    background: "var(--success)", boxShadow: "0 0 8px var(--success)",
    display: "inline-block", animation: "spin 2s linear infinite",
  },
  questionCount: {
    fontSize: 13, fontWeight: 600,
    marginLeft: "auto",
  },
  quizTitle: {
    fontSize: 32, fontWeight: 800,
    margin: "0 0 16px 0", lineHeight: 1.25,
  },
  description: {
    fontSize: 16, lineHeight: 1.7,
    marginBottom: 32, whiteSpace: "pre-wrap",
  },
  infoGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 16, marginBottom: 32,
  },
  rulesBox: {
    border: "1px solid",
    borderRadius: 16, padding: "24px", marginBottom: 32,
  },
  rulesTitle: {
    fontSize: 12, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 14px 0",
    display: 'flex', alignItems: 'center'
  },
  rulesList: {
    paddingLeft: 20, margin: 0,
    display: "flex", flexDirection: "column", gap: 10,
    fontSize: 14, lineHeight: 1.6,
  },
  ctaBtn: {
    width: "100%", border: "none",
    borderRadius: 14, padding: "18px",
    fontSize: 16, fontWeight: 700, letterSpacing: "0.2px",
    transition: "all 0.2s",
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  // Modal
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(6px)",
    display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000,
  },
  modal: {
    borderRadius: 24,
    padding: "40px", width: "95%", maxWidth: 460,
    boxShadow: "0 40px 120px rgba(0,0,0,0.4)",
    animation: "fadeUp 0.3s ease-out",
  },
  modalTitle: { margin: "0 0 8px 0", fontSize: 24, fontWeight: 800 },
  modalSubtitle: { margin: 0, fontSize: 15, lineHeight: 1.6 },
  inputLabel: { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 10, letterSpacing: '0.5px' },
  input: {
    width: "100%", padding: "16px",
    border: "2px solid", borderRadius: 14,
    fontSize: 16, boxSizing: "border-box", outline: "none",
    fontFamily: "Inter, sans-serif",
    transition: "all 0.2s",
  },
  cancelBtn: {
    flex: 1, padding: "14px",
    border: "1px solid", borderRadius: 14,
    fontSize: 15, fontWeight: 600, cursor: "pointer",
  },
  confirmBtn: {
    flex: 2, padding: "14px",
    border: "none", borderRadius: 14,
    fontSize: 15, fontWeight: 700, color: "#fff",
  },
};

export default StudentQuizIntro;
