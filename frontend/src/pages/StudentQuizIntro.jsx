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
    if (!user) {
      // Send to login, carry quiz URL so login bounces back here
      navigate(`/login?redirect=/student/quiz/${id}`);
      return;
    }
    // navigate(`/student/quiz/${id}/play`);
    alert("Starting quiz! (This feature is coming soon)");
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
            ? (user ? "Attempt Quiz Now" : "Sign up to Attempt Quiz")
            : quiz.status === "finished"
              ? "This quiz has ended"
              : "Quiz not yet live"}
        </button>
      </div>
    </div>
  );
};

export default StudentQuizIntro;
