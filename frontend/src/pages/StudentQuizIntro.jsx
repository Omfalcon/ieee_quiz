import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";

const API = "http://127.0.0.1:8000";

const fmtDT = (val) => {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(val);
  }
};

const calcDuration = (start, end) => {
  if (!start || !end) return "Not specified";
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return "Not specified";
  const diffMins = Math.round((e - s) / 60000);
  return diffMins > 0 ? `${diffMins} Minutes` : "Not specified";
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
    const fetchQuiz = async () => {
      try {
        const res = await axios.get(`${API}/quizzes/${id}`);
        setQuiz(res.data);
      } catch (err) {
        setError("Failed to load quiz details. It may not exist.");
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [id]);

  const handleStart = () => {
    if (quiz.status !== "live") {
      alert(`This quiz is currently ${quiz.status}. You can only attempt a quiz when it is Live.`);
      return;
    }
    
    const token = localStorage.getItem("token");
    if (!user || !token) {
      // Force clear any stale state
      localStorage.removeItem("token");
      // Send to login, carry quiz URL so login bounces back here
      navigate(`/login?redirect=/student/quiz/${id}`);
      return;
    }
    
    setDisplayName(user?.name || "");
    setShowNamePrompt(true);
  };

  const handleConfirmStart = async () => {
    if (!displayName.trim()) {
      alert("Please enter a valid display name.");
      return;
    }
    
    setStarting(true);
    try {
      const token = localStorage.getItem("token");
      
      // 1. Update Display Name
      const nameRes = await axios.patch(
        `${API}/auth/student/me/name`, 
        { name: displayName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh local token token
      if (nameRes.data.access_token) {
        localStorage.setItem("token", nameRes.data.access_token);
      }
      
      // 2. Attempt Quiz
      await axios.post(
        `${API}/quizzes/${id}/attempt`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      navigate(`/student/quiz/${id}/play`);
    } catch (err) {
      console.error(err);
      alert("Error starting quiz: " + (err.response?.data?.detail || err.message));
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#F8FAFC" }}>
        Loading quiz details...
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#F8FAFC" }}>
        <p style={{ color: "#DC2626" }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F8FAFC",
      display: "flex",
      justifyContent: "center",
      paddingTop: "60px",
      fontFamily: "Inter, sans-serif"
    }}>
      <div style={{
        background: "#fff",
        maxWidth: "600px",
        width: "100%",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        padding: "40px",
        height: "fit-content"
      }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px" }}>
          {quiz.category && (
            <span style={{
              background: "#EFF6FF", color: "#2563EB", padding: "4px 12px",
              borderRadius: "20px", fontSize: "13px", fontWeight: "600"
            }}>
              {quiz.category}
            </span>
          )}
          <span style={{ fontSize: "13px", color: "#64748B", fontWeight: "500" }}>
            {quiz.questions?.length || 0} Questions
          </span>
        </div>

        <h1 style={{ fontSize: "28px", color: "#1E293B", margin: "0 0 16px 0", fontWeight: "700" }}>
          {quiz.title}
        </h1>

        {quiz.description && (
          <p style={{ fontSize: "15px", color: "#475569", lineHeight: "1.6", marginBottom: "32px", whiteSpace: "pre-wrap" }}>
            {quiz.description}
          </p>
        )}

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          padding: "20px",
          background: "#F8FAFC",
          borderRadius: "8px",
          marginBottom: "32px"
        }}>
          <div>
            <div style={{ fontSize: "12px", color: "#64748B", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px" }}>Start Time</div>
            <div style={{ fontSize: "15px", color: "#1E293B", fontWeight: "600" }}>{fmtDT(quiz.start_time)}</div>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748B", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px" }}>End Time</div>
            <div style={{ fontSize: "15px", color: "#1E293B", fontWeight: "600" }}>{fmtDT(quiz.end_time)}</div>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748B", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px" }}>Total Duration</div>
            <div style={{ fontSize: "15px", color: "#1E293B", fontWeight: "600" }}>
              {calcDuration(quiz.start_time, quiz.end_time)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748B", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px" }}>Status</div>
            <div style={{
              fontSize: "15px",
              fontWeight: "600",
              color: quiz.status === "live" ? "#16A34A" : quiz.status === "finished" ? "#6c757d" : "#D97706"
            }}>
              {quiz.status ? quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1) : "Scheduled"}
            </div>
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={quiz.status !== "live"}
          style={{
            width: "100%",
            background: quiz.status === "live" ? "#2563EB" : "#94A3B8",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "14px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: quiz.status === "live" ? "pointer" : "not-allowed",
            transition: "background 0.2s"
          }}
          onMouseOver={(e) => { if (quiz.status === "live") e.target.style.background = "#1D4ED8"; }}
          onMouseOut={(e) => { if (quiz.status === "live") e.target.style.background = "#2563EB"; }}
        >
          {quiz.status === "live"
            ? (user ? "Attempt Quiz Now" : "Login to Attempt Quiz")
            : quiz.status === "finished"
              ? "This quiz has ended"
              : "Quiz not yet live"}
        </button>
      </div>

      {showNamePrompt && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
          justifyContent: "center", alignItems: "center", zIndex: 1000
        }}>
          <div style={{
            background: "#fff", padding: "2rem", borderRadius: "12px",
            width: "90%", maxWidth: "400px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
          }}>
            <h3 style={{ marginTop: 0, marginBottom: "0.5rem", color: "#1E293B" }}>
              Confirm Display Name
            </h3>
            <p style={{ color: "#64748B", fontSize: "14px", marginBottom: "1.5rem", lineHeight: "1.5" }}>
              This is the name that will appear on the leaderboard and participant list for this quiz.
            </p>
            
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "14px", fontWeight: "500", color: "#334155" }}>
                Your Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                style={{
                  width: "100%", padding: "10px 14px", border: "1px solid #CBD5E1",
                  borderRadius: "8px", fontSize: "16px", boxSizing: "border-box"
                }}
                disabled={starting}
                autoFocus
              />
            </div>
            
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowNamePrompt(false)}
                disabled={starting}
                style={{
                  padding: "10px 16px", background: "transparent", border: "1px solid #CBD5E1",
                  borderRadius: "6px", cursor: "pointer", color: "#64748B", fontWeight: "500"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStart}
                disabled={starting || !displayName.trim()}
                style={{
                  padding: "10px 16px", background: "#2563EB", border: "none",
                  borderRadius: "6px", cursor: starting ? "not-allowed" : "pointer", 
                  color: "#fff", fontWeight: "500", opacity: starting ? 0.7 : 1
                }}
              >
                {starting ? "Starting..." : "Start Quiz"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentQuizIntro;
