import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";

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

const StudentQuizIntro = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    axios.get(`${API}/quizzes/${id}`)
      .then(r => setQuiz(r.data))
      .catch(() => setError("Quiz not found or could not be loaded."))
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

  const isLive = quiz?.status === "live";
  const isFinished = quiz?.status === "finished";

  const statusColor = isLive ? "#15803d" : isFinished ? "#6B7280" : "#B45309";
  const statusBg = isLive ? "#DCFCE7" : isFinished ? "#F3F4F6" : "#FEF3C7";
  const statusLabel = quiz?.status ? quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1) : "Scheduled";

  if (loading) {
    return (
      <div style={styles.fullPage}>
        <div style={{ textAlign: "center" }}>
          <div style={styles.spinner} />
          <p style={{ color: "#1e63b5", fontWeight: 600, marginTop: 16, fontFamily: "Inter, sans-serif" }}>Loading quiz...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div style={styles.fullPage}>
        <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: "#1E293B", marginBottom: 8 }}>Quiz Not Found</h2>
          <p style={{ color: "#64748B" }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header Banner */}
      <div style={styles.banner}>
        <div style={styles.bannerInner}>
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/IEEE_logo.svg/1200px-IEEE_logo.svg.png"
            alt="IEEE Logo"
            style={{ height: 28, filter: "brightness(0) invert(1)" }}
          />
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>IEEE UPES QuizHub</span>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.outer}>
        <div style={styles.card}>
          {/* Category + Status Row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            {quiz.category && (
              <span style={styles.categoryBadge}>{quiz.category}</span>
            )}
            <span style={{ ...styles.statusBadge, background: statusBg, color: statusColor }}>
              {isLive && <span style={styles.liveDot} />}
              {statusLabel}
            </span>
            <span style={styles.questionCount}>{quiz.questions?.length || 0} Questions</span>
          </div>

          {/* Quiz Title */}
          <h1 style={styles.quizTitle}>{quiz.title}</h1>

          {/* Description */}
          {quiz.description && (
            <p style={styles.description}>{quiz.description}</p>
          )}

          {/* Info Grid */}
          <div style={styles.infoGrid}>
            <InfoCell label="Start Time" value={fmtDT(quiz.start_time)} />
            <InfoCell label="End Time" value={fmtDT(quiz.end_time)} />
            <InfoCell label="Duration" value={calcDuration(quiz.start_time, quiz.end_time)} />
            <InfoCell label="Questions" value={`${quiz.questions?.length || 0} Q`} highlight />
          </div>

          {/* Rules */}
          <div style={styles.rulesBox}>
            <p style={styles.rulesTitle}>Quiz Rules</p>
            <ul style={styles.rulesList}>
              <li>Each correct answer earns 1000 base points + time bonus.</li>
              <li>Faster answers score more — speed matters!</li>
              <li>Once started, you cannot pause or restart.</li>
              <li>Your name will appear on the leaderboard.</li>
            </ul>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleStart}
            disabled={!isLive}
            style={{
              ...styles.ctaBtn,
              background: isLive ? "linear-gradient(135deg, #1e63b5 0%, #2563EB 100%)" : "#CBD5E1",
              cursor: isLive ? "pointer" : "not-allowed",
              boxShadow: isLive ? "0 4px 14px rgba(30, 99, 181, 0.4)" : "none",
            }}
          >
            {isLive
              ? user ? "🚀  Start Quiz Now" : "🔐  Login to Attempt"
              : isFinished
                ? "This quiz has ended"
                : "⏳  Quiz hasn't started yet"}
          </button>

          {isLive && !user && (
            <p style={{ textAlign: "center", fontSize: 13, color: "#64748B", marginTop: 12 }}>
              You'll be redirected back here after login.
            </p>
          )}
        </div>
      </div>

      {/* Name Prompt Modal */}
      {showNamePrompt && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={{ marginBottom: 20 }}>
              <h3 style={styles.modalTitle}>Confirm Your Display Name</h3>
              <p style={styles.modalSubtitle}>
                This name will appear on the live leaderboard. Make it count!
              </p>
            </div>

            <label style={styles.inputLabel}>Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleConfirmStart()}
              placeholder="e.g. John Doe"
              style={styles.input}
              disabled={starting}
              autoFocus
            />

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setShowNamePrompt(false)}
                disabled={starting}
                style={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStart}
                disabled={starting || !displayName.trim()}
                style={{
                  ...styles.confirmBtn,
                  opacity: (starting || !displayName.trim()) ? 0.6 : 1,
                  cursor: (starting || !displayName.trim()) ? "not-allowed" : "pointer",
                }}
              >
                {starting ? "Starting..." : "Let's Go →"}
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

const InfoCell = ({ label, value, highlight }) => (
  <div style={{
    background: highlight ? "#EFF6FF" : "#F8FAFC",
    border: `1px solid ${highlight ? "#BFDBFE" : "#E2E8F0"}`,
    borderRadius: 10, padding: "14px 18px"
  }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
      {label}
    </div>
    <div style={{ fontSize: 15, fontWeight: 700, color: highlight ? "#1e63b5" : "#1E293B" }}>{value}</div>
  </div>
);

const styles = {
  page: {
    minHeight: "100vh",
    background: "#F0F5FF",
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  },
  banner: {
    background: "linear-gradient(135deg, #1e3a6e 0%, #1e63b5 100%)",
    padding: "14px 32px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  },
  bannerInner: {
    maxWidth: 720, margin: "0 auto",
    display: "flex", alignItems: "center", gap: 14,
  },
  fullPage: {
    display: "flex", justifyContent: "center", alignItems: "center",
    height: "100vh", background: "#F0F5FF",
  },
  spinner: {
    width: 44, height: 44, borderRadius: "50%",
    border: "4px solid #BFDBFE", borderTopColor: "#1e63b5",
    animation: "spin 0.8s linear infinite", margin: "0 auto",
  },
  outer: {
    maxWidth: 700, margin: "0 auto", padding: "40px 20px",
  },
  card: {
    background: "#fff",
    borderRadius: 20,
    boxShadow: "0 8px 40px rgba(30, 99, 181, 0.10), 0 2px 8px rgba(0,0,0,0.05)",
    padding: "40px 44px",
    animation: "fadeUp 0.4s ease-out",
  },
  categoryBadge: {
    background: "#EFF6FF", color: "#1e63b5",
    padding: "4px 14px", borderRadius: 20,
    fontSize: 12, fontWeight: 700, border: "1px solid #BFDBFE",
  },
  statusBadge: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
  },
  liveDot: {
    width: 7, height: 7, borderRadius: "50%",
    background: "#16A34A", boxShadow: "0 0 6px #16A34A",
    display: "inline-block", animation: "spin 2s linear infinite",
  },
  questionCount: {
    fontSize: 13, color: "#64748B", fontWeight: 500,
    marginLeft: "auto",
  },
  quizTitle: {
    fontSize: 28, fontWeight: 800, color: "#0F172A",
    margin: "0 0 14px 0", lineHeight: 1.3,
  },
  description: {
    fontSize: 15, color: "#475569", lineHeight: 1.7,
    marginBottom: 28, whiteSpace: "pre-wrap",
  },
  infoGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr",
    gap: 14, marginBottom: 28,
  },
  rulesBox: {
    background: "#F8FAFC", border: "1px solid #E2E8F0",
    borderRadius: 12, padding: "18px 22px", marginBottom: 28,
  },
  rulesTitle: {
    fontSize: 12, fontWeight: 700, color: "#64748B",
    textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 10px 0",
  },
  rulesList: {
    paddingLeft: 18, margin: 0,
    display: "flex", flexDirection: "column", gap: 6,
    color: "#475569", fontSize: 14, lineHeight: 1.6,
  },
  ctaBtn: {
    width: "100%", color: "#fff", border: "none",
    borderRadius: 12, padding: "15px",
    fontSize: 16, fontWeight: 700, letterSpacing: "0.3px",
    transition: "all 0.2s",
  },
  // Modal
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)",
    display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000,
  },
  modal: {
    background: "#fff", borderRadius: 20,
    padding: "32px", width: "90%", maxWidth: 420,
    boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
    animation: "fadeUp 0.3s ease-out",
  },
  modalTitle: { margin: "0 0 8px 0", fontSize: 20, fontWeight: 700, color: "#0F172A" },
  modalSubtitle: { margin: 0, color: "#64748B", fontSize: 14, lineHeight: 1.6 },
  inputLabel: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 },
  input: {
    width: "100%", padding: "12px 14px",
    border: "1.5px solid #E2E8F0", borderRadius: 10,
    fontSize: 15, boxSizing: "border-box", outline: "none",
    color: "#1E293B", fontFamily: "Inter, sans-serif",
    transition: "border-color 0.2s",
  },
  cancelBtn: {
    flex: 1, padding: "11px", background: "#F8FAFC",
    border: "1px solid #E2E8F0", borderRadius: 10,
    fontSize: 14, fontWeight: 600, color: "#64748B", cursor: "pointer",
  },
  confirmBtn: {
    flex: 2, padding: "11px",
    background: "linear-gradient(135deg, #1e63b5 0%, #2563EB 100%)",
    border: "none", borderRadius: 10,
    fontSize: 14, fontWeight: 700, color: "#fff",
    boxShadow: "0 4px 12px rgba(30, 99, 181, 0.3)",
  },
};

export default StudentQuizIntro;
