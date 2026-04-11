import React, { useEffect, useState, useRef, useCallback } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import axios from "axios";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ClipboardList,
  FileText,
  Users,
  Plus,
  ArrowLeft,
  Trophy,
  CheckCircle,
  Copy,
  Trash2,
  Edit3,
  Maximize,
  FileSignature,
  RefreshCw
} from "lucide-react";

const API = "http://127.0.0.1:8000";

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "",
  start_time: "",
  end_time: "",
  questions: [],
};

const QUESTION_TYPES = [
  { value: "mcq",       label: "Multiple Choice (Single)" },
  { value: "msq",       label: "Multiple Select (Multi-answer)" },
  { value: "truefalse", label: "True / False" },
  { value: "short",     label: "Short Answer" },
];

const mkQuestion = (type = "mcq") => {
  if (type === "truefalse") return { type: "truefalse", question: "", options: ["True", "False"], correct_answer: 0 };
  if (type === "short")     return { type: "short",     question: "", options: [], correct_answer: "" };
  if (type === "msq")       return { type: "msq",       question: "", options: ["", "", "", ""], correct_answer: [] };
  return { type: "mcq", question: "", options: ["", "", "", ""], correct_answer: 0 };
};

// ─── Status: read directly from DB field (live / scheduled / finished) ───
const getStatus = (quiz) => {
  const s = quiz?.status || "scheduled";
  return s.charAt(0).toUpperCase() + s.slice(1); // "live" → "Live"
};

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

// Duration display — prefer stored fields to avoid inflated end_time - start_time
// after re-toggles. Falls back to time diff only for legacy quizzes.
const calcDuration = (quiz) => {
  if (quiz?.total_active_minutes > 0) return `${quiz.total_active_minutes} min`;
  if (quiz?.duration) return `${quiz.duration} min`;
  const start = quiz?.start_time;
  const end   = quiz?.end_time;
  if (!start || !end) return "—";
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return "—";
  const diffMins = Math.round((e - s) / 60000);
  return diffMins > 0 ? `${diffMins} min` : "—";
};

// ─── Design tokens ───
const COLOR = {
  primary: "#2563EB",
  success: "#16A34A",
  danger: "#DC2626",
  warning: "#D97706",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#1E293B",
  muted: "#64748B",
  faint: "#94A3B8",
};

const STATUS_MAP = {
  Live: { bg: "#DCFCE7", color: "#16A34A" },
  Scheduled: { bg: "#FEF9C3", color: "#B45309" },
  Finished: { bg: "#F1F5F9", color: "#475569" },
  Draft: { bg: "#F1F5F9", color: "#94A3B8" },
};

// ─── Reusable style objects ───
const S = {
  page: { padding: "28px 32px", maxWidth: "1100px" },

  h1: { fontSize: "22px", fontWeight: "700", color: COLOR.text, margin: 0 },
  h2: { fontSize: "16px", fontWeight: "600", color: COLOR.text, margin: "0 0 14px 0" },
  label: {
    fontSize: "12px", fontWeight: "600", color: COLOR.muted,
    marginBottom: "6px", display: "block", textTransform: "uppercase",
    letterSpacing: "0.4px",
  },

  card: {
    background: COLOR.card,
    borderRadius: "10px",
    border: `1px solid ${COLOR.border}`,
    padding: "20px 22px",
    marginBottom: "14px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  },

  input: {
    width: "100%",
    padding: "9px 12px",
    border: `1px solid ${COLOR.border}`,
    borderRadius: "7px",
    fontSize: "14px",
    color: COLOR.text,
    background: "#fff",
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
  },

  btnPrimary: {
    background: COLOR.primary, color: "#fff",
    border: "none", borderRadius: "7px",
    padding: "9px 20px", fontSize: "14px", fontWeight: "600", cursor: "pointer",
  },
  btnSecondary: {
    background: "#F1F5F9", color: COLOR.text,
    border: `1px solid ${COLOR.border}`, borderRadius: "7px",
    padding: "9px 18px", fontSize: "14px", fontWeight: "600", cursor: "pointer",
  },
  btnDanger: {
    background: "#FEF2F2", color: COLOR.danger,
    border: "1px solid #FECACA", borderRadius: "7px",
    padding: "9px 18px", fontSize: "14px", fontWeight: "600", cursor: "pointer",
  },
  btnSuccess: {
    background: "#F0FDF4", color: COLOR.success,
    border: "1px solid #BBF7D0", borderRadius: "7px",
    padding: "9px 18px", fontSize: "14px", fontWeight: "600", cursor: "pointer",
  },
  btnGhost: {
    background: "transparent", color: COLOR.muted,
    border: "none", borderRadius: "7px",
    padding: "8px 12px", fontSize: "14px", cursor: "pointer",
  },

  row: { display: "flex", alignItems: "center", gap: "12px" },
  between: { display: "flex", justifyContent: "space-between", alignItems: "center" },

  badge: (status) => {
    const cfg = STATUS_MAP[status] || STATUS_MAP.Draft;
    return {
      display: "inline-flex", alignItems: "center", gap: "5px",
      background: cfg.bg, color: cfg.color,
      padding: "3px 10px", borderRadius: "20px",
      fontSize: "12px", fontWeight: "600",
    };
  },
};

// ══════════════════════════════════════════════════════════════
const ManageQuizzes = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const isList = location.pathname === "/admin/manage-quizzes";
  const isView = location.pathname.includes("/view/");
  const isCreate = location.pathname.includes("/create");
  const isEdit = location.pathname.includes("/edit/");

  const [quizzes, setQuizzes] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [selQ, setSelQ] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [footfall, setFootfall] = useState(0);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef(null);

  // ─── Fetch helpers ───
  const fetchQuizzes = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/quizzes`);
      setQuizzes(res.data);
    } catch { /* silent */ }
  }, []);

  const fetchQuiz = useCallback(async () => {
    if (!id) return;
    try {
      const res = await axios.get(`${API}/quizzes/${id}`);
      const clean = {
        ...res.data,
        questions: (res.data.questions || []).map((q) => {
          const type = q.type || "mcq";
          return {
            type,
            question: q.question || "",
            options: Array.isArray(q.options) ? q.options : (type === "truefalse" ? ["True", "False"] : ["", "", "", ""]),
            correct_answer: q.correct_answer ?? (type === "msq" ? [] : type === "short" ? "" : 0),
          };
        }),
      };
      setQuiz(clean);
      if (isEdit) {
        // Check if Question Bank injected questions are waiting (stored in sessionStorage)
        const qbKey = `qb_inject_${id}`;
        const pending = sessionStorage.getItem(qbKey);
        if (pending) {
          try {
            const extra = JSON.parse(pending);
            sessionStorage.removeItem(qbKey);
            setForm({ ...clean, questions: [...clean.questions, ...extra] });
            return;
          } catch {
            sessionStorage.removeItem(qbKey);
          }
        }
        setForm(clean);
      }
    } catch { /* silent */ }
  }, [id, isEdit]);

  const fetchLeaderboard = useCallback(async () => {
    if (!id) return;
    try {
      const res = await axios.get(`${API}/quizzes/${id}/leaderboard`);
      setLeaderboard(res.data.leaderboard || []);
      setFootfall(res.data.total || 0);
    } catch { /* silent — collection may not exist yet */ }
  }, [id]);

  // ─── Effects ───
  useEffect(() => { fetchQuizzes(); }, [fetchQuizzes]);

  useEffect(() => {
    if (id) fetchQuiz();
  }, [id, fetchQuiz]);

  // CRITICAL FIX: always reset form to blank when navigating to /create
  useEffect(() => {
    if (isCreate) {
      setForm({ title: "", description: "", category: "", start_time: "", end_time: "", questions: [] });
    }
  }, [isCreate]);

  // Inject questions returned from the AI Question Bank page
  // Must be declared AFTER the isCreate reset so the functional update wins
  useEffect(() => {
    const injected = location.state?.injectedQuestions;
    if (!injected || injected.length === 0) return;

    // Normalise AI-generated questions so the editor never receives undefined
    // options/correct_answer — which would crash the options .map() calls below.
    const normalize = (q) => {
      const type = q.type || "mcq";
      let opts = Array.isArray(q.options) ? q.options : [];
      // Pad to 4 options for choice-based types
      if (type !== "short") {
        while (opts.length < 4) opts = [...opts, ""];
        opts = opts.slice(0, 4);
      }
      let correct = q.correct_answer ?? q.correctAnswer ?? 0;
      if (typeof correct === "string") {
        if (correct.toUpperCase() in { A: 0, B: 1, C: 2, D: 3 }) {
          correct = correct.toUpperCase().charCodeAt(0) - 65;
        } else {
          correct = parseInt(correct, 10) || 0;
        }
      }
      return { type, question: q.question || "", options: opts, correct_answer: correct };
    };

    const normalized = injected.map(normalize);

    if (isCreate) {
      // Restore any form data saved before navigating to the question bank
      let base = { title: "", description: "", category: "", start_time: "", end_time: "", questions: [] };
      const saved = sessionStorage.getItem("qb_form");
      if (saved) {
        try { base = JSON.parse(saved); } catch { /* ignore */ }
        sessionStorage.removeItem("qb_form");
      }
      setForm({ ...base, questions: [...(base.questions || []), ...normalized] });
    } else if (isEdit && id) {
      // fetchQuiz is async — store injected so it can pick them up after loading
      sessionStorage.setItem(`qb_inject_${id}`, JSON.stringify(normalized));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.injectedQuestions]);

  // Load leaderboard once when entering view mode
  useEffect(() => {
    if (isView && id) {
      fetchLeaderboard();
    }
  }, [isView, id, fetchLeaderboard]);

  // ─── Mutations ───
  const handleCreate = async () => {
    if (!form.title.trim()) return alert("Title is required");
    if (!form.questions || form.questions.length === 0) {
      return alert("Quiz must have at least 1 question.");
    }
    if (!form.start_time || !form.end_time) {
      return alert("Start and End times are required.");
    }
    if (new Date(form.end_time) <= new Date(form.start_time)) {
      return alert("End time must be after the start time.");
    }

    setLoading(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description?.trim() || "",
        category: form.category?.trim() || "",
        start_time: form.start_time,
        end_time: form.end_time,
        questions: form.questions.map((q) => ({
          type: q.type || "mcq",
          question: q.question,
          options: q.options,
          correct_answer: q.correct_answer,
        })),
      };
      await axios.post(`${API}/quizzes`, payload);
      await fetchQuizzes();
      setForm({ ...EMPTY_FORM });
      navigate("/admin/manage-quizzes");
    } catch {
      alert("Failed to create quiz. Check the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!form.title.trim()) return alert("Title is required");
    if (!form.questions || form.questions.length === 0) {
      return alert("Quiz must have at least 1 question.");
    }
    if (!form.start_time || !form.end_time) {
      return alert("Start and End times are required.");
    }
    if (new Date(form.end_time) <= new Date(form.start_time)) {
      return alert("End time must be after the start time.");
    }

    setLoading(true);
    try {
      // eslint-disable-next-line no-unused-vars
      const { _id, participants, is_active, ...payload } = form;
      payload.questions = payload.questions.map((q) => ({
        type: q.type || "mcq",
        question: q.question,
        options: q.options,
        correct_answer: q.correct_answer,
      }));
      await axios.put(`${API}/quizzes/${id}`, payload);
      navigate(`/admin/manage-quizzes/view/${id}`);
    } catch {
      alert("Failed to update quiz.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    try {
      const res = await axios.put(`${API}/quizzes/toggle/${id}`);
      // Backend returns the updated quiz — use it directly
      if (res.data && res.data._id) {
        const clean = {
          ...res.data,
          questions: (res.data.questions || []).map((q) => {
            const type = q.type || "mcq";
            return {
              type,
              question: q.question || "",
              options: Array.isArray(q.options) ? q.options : (type === "truefalse" ? ["True", "False"] : ["", "", "", ""]),
              correct_answer: q.correct_answer ?? (type === "msq" ? [] : type === "short" ? "" : 0),
            };
          }),
        };
        setQuiz(clean);
      } else {
        await fetchQuiz();
      }
    } catch {
      alert("Toggle failed. Check the server.");
    }
  };

  const handleDelete = async (qid, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this quiz? This cannot be undone.")) return;
    try {
      await axios.delete(`${API}/quizzes/${qid}`);
      fetchQuizzes();
    } catch {
      alert("Failed to delete quiz.");
    }
  };

  // ─── Navigate to AI Question Bank ───
  const handleGoToQuestionBank = () => {
    // Persist current form so we can restore it when returning in create mode
    if (isCreate) {
      sessionStorage.setItem("qb_form", JSON.stringify(form));
    }
    navigate("/admin/question-bank", {
      state: { returnTo: location.pathname },
    });
  };

  // ─── Question form helpers ───
  const addQuestion = (type = "mcq") =>
    setForm((p) => ({ ...p, questions: [...p.questions, mkQuestion(type)] }));

  const changeQuestionType = (qi, newType) =>
    setForm((p) => ({
      ...p,
      questions: p.questions.map((q, i) => i === qi ? mkQuestion(newType) : q),
    }));

  const removeQuestion = (qi) =>
    setForm((p) => ({ ...p, questions: p.questions.filter((_, i) => i !== qi) }));

  const updateQuestion = (qi, field, value) =>
    setForm((p) => ({
      ...p,
      questions: p.questions.map((q, i) =>
        i === qi ? { ...q, [field]: value } : q
      ),
    }));

  const updateOption = (qi, oi, value) =>
    setForm((p) => ({
      ...p,
      questions: p.questions.map((q, i) => {
        if (i !== qi) return q;
        const opts = q.options.map((o, j) => (j === oi ? value : o));
        return { ...q, options: opts };
      }),
    }));

  // ══════════════════════════════════════════════════════════════
  // LIST VIEW
  // ══════════════════════════════════════════════════════════════
  if (isList) {
    return (
      <AdminLayout>
        <div style={S.page}>
          {/* Header */}
          <div style={{ ...S.between, marginBottom: "24px" }}>
            <div>
              <h1 style={S.h1}>Manage Quizzes</h1>
              <p style={{ fontSize: "13px", color: COLOR.muted, marginTop: "4px" }}>
                {quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""}
              </p>
            </div>
            <button
              style={S.btnPrimary}
              onClick={() => navigate("/admin/manage-quizzes/create")}
            >
              Create New Quiz
            </button>
          </div>

          {/* Empty state */}
          {quizzes.length === 0 && (
            <div
              style={{
                ...S.card,
                textAlign: "center",
                padding: "56px 24px",
                color: COLOR.faint,
                border: `2px dashed ${COLOR.border}`,
                background: COLOR.bg,
              }}
            >
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px", color: COLOR.faint }}>
                <ClipboardList size={48} />
              </div>
              <p style={{ fontWeight: "600", fontSize: "15px", color: COLOR.muted }}>
                No quizzes yet
              </p>
              <p style={{ fontSize: "13px", marginTop: "6px" }}>
                Click "Create New Quiz" to start your first quiz
              </p>
            </div>
          )}

          {/* Quiz list */}
          {quizzes.map((q) => {
            const status = getStatus(q);
            const sc = STATUS_MAP[status] || STATUS_MAP.Draft;
            return (
              <div
                key={q._id}
                style={{
                  ...S.card,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  marginBottom: "10px",
                }}
                onClick={() => navigate(`/admin/manage-quizzes/view/${q._id}`)}
              >
                {/* Left: icon + info */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div
                    style={{
                      width: "42px", height: "42px",
                      borderRadius: "10px",
                      background: "#EFF6FF",
                      display: "flex", alignItems: "center",
                      justifyContent: "center",
                      color: COLOR.primary,
                      flexShrink: 0,
                    }}
                  >
                    <FileSignature size={20} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: "600", color: COLOR.text,
                        fontSize: "15px", marginBottom: "5px",
                      }}
                    >
                      {q.title}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {q.category && (
                        <span style={{ fontSize: "12px", color: COLOR.muted }}>
                          {q.category}
                        </span>
                      )}
                      <span
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "5px",
                          background: sc.bg, color: sc.color,
                          padding: "2px 9px", borderRadius: "20px",
                          fontSize: "11px", fontWeight: "600",
                        }}
                      >
                        {status === "Live" && (
                          <span
                            style={{
                              width: "6px", height: "6px", borderRadius: "50%",
                              background: COLOR.success, display: "inline-block",
                            }}
                          />
                        )}
                        {status}
                      </span>
                      <span style={{ fontSize: "12px", color: COLOR.faint }}>
                        {(q.questions || []).length} Q
                      </span>
                      {(q.participants ?? 0) > 0 && (
                        <span style={{ fontSize: "12px", color: COLOR.faint, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          · <Users size={12} /> {q.participants}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: actions */}
                <div
                  style={{ display: "flex", gap: "8px" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    style={{
                      ...S.btnSecondary,
                      padding: "7px 14px",
                      fontSize: "13px",
                    }}
                    onClick={() => {
                      const link = `${window.location.origin}/student/quiz/${q._id}`;
                      navigator.clipboard.writeText(link);
                      alert("Attempt link copied to clipboard!");
                    }}
                  >
                    Copy Link
                  </button>
                  <button
                    style={{ ...S.btnDanger, padding: "7px 14px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}
                    onClick={(e) => handleDelete(q._id, e)}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </AdminLayout>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // CREATE / EDIT FORM VIEW
  // ══════════════════════════════════════════════════════════════
  if (isCreate || isEdit) {
    return (
      <AdminLayout>
        <div style={S.page}>

          {/* Details card */}
          <div style={S.card}>
            <h2 style={S.h2}>Quiz Details</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              <div>
                <label style={S.label}>Title *</label>
                <input
                  style={S.input}
                  placeholder="e.g. Python Fundamentals"
                  value={form.title}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title: e.target.value }))
                  }
                />
              </div>
              <div>
                <label style={S.label}>Category</label>
                <input
                  style={S.input}
                  placeholder="e.g. Programming"
                  value={form.category}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, category: e.target.value }))
                  }
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={S.label}>Description</label>
                <textarea
                  style={{ ...S.input, minHeight: "80px", resize: "vertical" }}
                  placeholder="Enter a description for the quiz..."
                  value={form.description || ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                />
              </div>
              <div>
                <label style={S.label}>Start Time</label>
                <input
                  type="datetime-local"
                  style={S.input}
                  value={form.start_time}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, start_time: e.target.value }))
                  }
                />
              </div>
              <div>
                <label style={S.label}>End Time</label>
                <input
                  type="datetime-local"
                  style={S.input}
                  value={form.end_time}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, end_time: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          {/* AI Generate Questions CTA */}
          <div style={{ marginBottom: "16px" }}>
            <button
              onClick={handleGoToQuestionBank}
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                background: "linear-gradient(135deg, #1e63b5 0%, #7c3aed 100%)",
                color: "#fff", border: "none", borderRadius: "10px",
                padding: "11px 22px", fontSize: "14px", fontWeight: 700,
                cursor: "pointer", boxShadow: "0 4px 14px rgba(30,99,181,0.25)",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
            >
              <span style={{ fontSize: "16px" }}>✨</span> Generate Questions with AI
            </button>
            <span style={{ fontSize: "12px", color: COLOR.muted, marginLeft: "12px" }}>
              AI-generated questions will be added to your quiz below.
            </span>
          </div>

          {/* Questions header */}
          <div
            style={{ ...S.between, marginBottom: "12px", marginTop: "4px" }}
          >
            <h2 style={{ ...S.h2, margin: 0 }}>
              Questions&nbsp;
              <span style={{ color: COLOR.muted, fontWeight: "400" }}>
                ({form.questions.length})
              </span>
            </h2>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <select
                id="add-q-type"
                defaultValue="mcq"
                style={{ ...S.input, width: "auto", fontSize: "13px", padding: "7px 12px" }}
              >
                {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <button style={S.btnSecondary} onClick={() => {
                const sel = document.getElementById("add-q-type");
                addQuestion(sel?.value || "mcq");
              }}>
                + Add Question
              </button>
            </div>
          </div>

          {/* Empty questions state */}
          {form.questions.length === 0 && (
            <div
              style={{
                ...S.card,
                textAlign: "center",
                padding: "36px",
                border: `2px dashed ${COLOR.border}`,
                background: COLOR.bg,
                color: COLOR.faint,
              }}
            >
              <p style={{ fontWeight: "600" }}>No questions yet</p>
              <p style={{ fontSize: "13px", marginTop: "4px" }}>
                Click "Add New Question" to start building your quiz
              </p>
            </div>
          )}

          {/* Question cards */}
          {form.questions.map((q, qi) => {
            const qType = q.type || "mcq";
            return (
            <div key={qi} style={{ ...S.card, marginBottom: "12px" }}>
              {/* Question header: badge + type selector + remove */}
              <div style={{ ...S.between, marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ background: "#EFF6FF", color: COLOR.primary, padding: "3px 12px", borderRadius: "6px", fontWeight: "700", fontSize: "13px" }}>
                    Q{qi + 1}
                  </span>
                  <select
                    value={qType}
                    onChange={(e) => changeQuestionType(qi, e.target.value)}
                    style={{ ...S.input, width: "auto", fontSize: "12px", padding: "4px 10px", cursor: "pointer" }}
                  >
                    {QUESTION_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  style={{ background: "#FEF2F2", color: COLOR.danger, border: "1px solid #FECACA", borderRadius: "6px", padding: "4px 12px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
                  onClick={() => removeQuestion(qi)}
                >
                  Remove
                </button>
              </div>

              {/* Question text */}
              <div style={{ marginBottom: "14px" }}>
                <label style={S.label}>Question</label>
                <input
                  style={S.input}
                  placeholder="Enter the question..."
                  value={q.question}
                  onChange={(e) => updateQuestion(qi, "question", e.target.value)}
                />
              </div>

              {/* ── MCQ ── radio + 4 option inputs */}
              {qType === "mcq" && (
                <>
                  <label style={S.label}>Options — click radio to mark correct answer</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    {(q.options || ["", "", "", ""]).map((opt, oi) => {
                      const isCorrect = q.correct_answer === oi;
                      return (
                        <div key={oi} style={{ display: "flex", alignItems: "center", gap: "10px", background: isCorrect ? "#F0FDF4" : "#F8FAFC", border: isCorrect ? "1.5px solid #86EFAC" : `1px solid ${COLOR.border}`, borderRadius: "8px", padding: "9px 12px" }}>
                          <input type="radio" name={`q${qi}-correct`} checked={isCorrect} onChange={() => updateQuestion(qi, "correct_answer", oi)} style={{ cursor: "pointer", accentColor: COLOR.success, flexShrink: 0 }} />
                          <span style={{ fontSize: "11px", fontWeight: "700", color: isCorrect ? COLOR.success : COLOR.faint, flexShrink: 0, width: "14px" }}>{String.fromCharCode(65 + oi)}</span>
                          <input style={{ ...S.input, border: "none", background: "transparent", padding: "2px 4px", fontSize: "13px" }} placeholder={`Option ${String.fromCharCode(65 + oi)}`} value={opt} onChange={(e) => updateOption(qi, oi, e.target.value)} />
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* ── MSQ ── checkboxes + 4 option inputs */}
              {qType === "msq" && (
                <>
                  <label style={S.label}>Options — check all correct answers</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    {(q.options || ["", "", "", ""]).map((opt, oi) => {
                      const correctArr = Array.isArray(q.correct_answer) ? q.correct_answer : [];
                      const isCorrect = correctArr.includes(oi);
                      const toggleMSQ = () => {
                        const next = isCorrect ? correctArr.filter(x => x !== oi) : [...correctArr, oi];
                        updateQuestion(qi, "correct_answer", next.sort((a,b) => a-b));
                      };
                      return (
                        <div key={oi} style={{ display: "flex", alignItems: "center", gap: "10px", background: isCorrect ? "#F0FDF4" : "#F8FAFC", border: isCorrect ? "1.5px solid #86EFAC" : `1px solid ${COLOR.border}`, borderRadius: "8px", padding: "9px 12px" }}>
                          <input type="checkbox" checked={isCorrect} onChange={toggleMSQ} style={{ cursor: "pointer", accentColor: COLOR.success, flexShrink: 0, width: "16px", height: "16px" }} />
                          <span style={{ fontSize: "11px", fontWeight: "700", color: isCorrect ? COLOR.success : COLOR.faint, flexShrink: 0, width: "14px" }}>{String.fromCharCode(65 + oi)}</span>
                          <input style={{ ...S.input, border: "none", background: "transparent", padding: "2px 4px", fontSize: "13px" }} placeholder={`Option ${String.fromCharCode(65 + oi)}`} value={opt} onChange={(e) => updateOption(qi, oi, e.target.value)} />
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* ── TRUE/FALSE ── 2-button toggle */}
              {qType === "truefalse" && (
                <>
                  <label style={S.label}>Select correct answer</label>
                  <div style={{ display: "flex", gap: "12px" }}>
                    {["True", "False"].map((label, oi) => {
                      const isCorrect = q.correct_answer === oi;
                      return (
                        <button key={oi} type="button" onClick={() => updateQuestion(qi, "correct_answer", oi)}
                          style={{ flex: 1, padding: "14px", borderRadius: "10px", fontWeight: "700", fontSize: "15px", cursor: "pointer", border: isCorrect ? `2px solid ${COLOR.success}` : `1px solid ${COLOR.border}`, background: isCorrect ? "#F0FDF4" : "#F8FAFC", color: isCorrect ? COLOR.success : COLOR.muted, transition: "all 0.15s" }}>
                          {label === "True" ? "✓ True" : "✗ False"}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* ── SHORT ANSWER ── text field */}
              {qType === "short" && (
                <>
                  <label style={S.label}>Correct Answer (case-insensitive match)</label>
                  <input
                    style={{ ...S.input, borderColor: COLOR.success, background: "#F0FDF4" }}
                    placeholder="Enter the expected answer..."
                    value={q.correct_answer || ""}
                    onChange={(e) => updateQuestion(qi, "correct_answer", e.target.value)}
                  />
                  <p style={{ fontSize: "11px", color: COLOR.muted, marginTop: "6px" }}>Student answers are trimmed and compared case-insensitively.</p>
                </>
              )}
            </div>
            );
          })}

          {/* Footer */}
          <div
            style={{
              ...S.row,
              justifyContent: "flex-end",
              marginTop: "8px",
              gap: "10px",
            }}
          >
            <button
              style={S.btnSecondary}
              onClick={() =>
                isEdit
                  ? navigate(`/admin/manage-quizzes/view/${id}`)
                  : navigate("/admin/manage-quizzes")
              }
            >
              Cancel
            </button>
            <button
              style={{ ...S.btnPrimary, opacity: loading ? 0.65 : 1 }}
              disabled={loading}
              onClick={isCreate ? handleCreate : handleUpdate}
            >
              {loading
                ? "Saving..."
                : isCreate
                  ? "Create Quiz"
                  : "Save Changes"}
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // VIEW MODE
  // ══════════════════════════════════════════════════════════════
  if (isView) {
    if (!quiz) {
      return (
        <AdminLayout>
          <div
            style={{
              ...S.page,
              textAlign: "center",
              paddingTop: "64px",
              color: COLOR.muted,
            }}
          >
            Loading quiz...
          </div>
        </AdminLayout>
      );
    }

    const status = getStatus(quiz);
    const sc = STATUS_MAP[status] || STATUS_MAP.Scheduled;
    const currentQ = quiz.questions[selQ] ?? null;

    // Toggle button: Live → "End Quiz" (danger), else → "Go Live" (success)
    const toggleLabel =
      status === "Live" ? "End Quiz" : "Go Live Now";

    const toggleStyle =
      status === "Live" ? S.btnDanger : S.btnSuccess;

    return (
      <AdminLayout>
        <div style={S.page}>
          {/* ── Header ── */}
          <div style={{ ...S.between, marginBottom: "20px" }}>
            <div style={S.row}>
              <button
                style={{ ...S.btnGhost, display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px" }}
                onClick={() => navigate("/admin/manage-quizzes")}
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 style={S.h1}>{quiz.title}</h1>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "5px",
                  }}
                >
                  {quiz.category && (
                    <span style={{ fontSize: "13px", color: COLOR.muted }}>
                      {quiz.category}
                    </span>
                  )}
                  <span
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "5px",
                      background: sc.bg, color: sc.color,
                      padding: "3px 10px", borderRadius: "20px",
                      fontSize: "12px", fontWeight: "600",
                    }}
                  >
                    {status === "Live" && (
                      <span
                        style={{
                          width: "6px", height: "6px", borderRadius: "50%",
                          background: COLOR.success, display: "inline-block",
                        }}
                      />
                    )}
                    {status}
                  </span>
                </div>
              </div>
            </div>

            <div style={S.row}>
              <button
                style={{ ...S.btnSecondary, background: "#fff" }}
                onClick={() => {
                  const link = `${window.location.origin}/student/quiz/${id}`;
                  navigator.clipboard.writeText(link);
                  alert("Attempt link copied to clipboard!");
                }}
              >
                Copy Link
              </button>
              <button style={toggleStyle} onClick={handleToggle}>
                {toggleLabel}
              </button>
              <button
                style={S.btnSecondary}
                onClick={() =>
                  navigate(`/admin/manage-quizzes/edit/${id}`)
                }
              >
                Edit Quiz
              </button>
              <button
                style={{ 
                  ...S.btnPrimary, 
                  background: "#4f46e5",
                  display: "flex", alignItems: "center", gap: "8px",
                  border: "none"
                }}
                onClick={() => window.open(`/leaderboard/${id}`, '_blank')}
              >
                <div style={{ width: "8px", height: "8px", background: "#4ade80", borderRadius: "50%" }}></div>
                <Trophy size={18} />
                Live Leaderboard
              </button>
            </div>
          </div>

          {/* ── Info strip ── */}
          {quiz.description && (
            <div style={{ ...S.card, marginBottom: "18px", color: COLOR.text, fontSize: "14px" }}>
              <strong style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: COLOR.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Description</strong>
              {quiz.description}
            </div>
          )}
          <div
            style={{
              ...S.card,
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              padding: 0,
              overflow: "hidden",
              marginBottom: "18px",
            }}
          >
            {[
              { label: "Start Time", value: fmtDT(quiz.start_time) },
              { label: "End Time", value: fmtDT(quiz.end_time) },
              { label: "Duration", value: calcDuration(quiz) },
              { label: "Questions", value: quiz.questions.length },
              { label: "Participants", value: quiz.participants ?? 0 },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  padding: "16px 20px",
                  borderRight:
                    i < 3 ? `1px solid ${COLOR.border}` : "none",
                }}
              >
                <div
                  style={{
                    fontSize: "11px", color: COLOR.faint, fontWeight: "600",
                    textTransform: "uppercase", letterSpacing: "0.5px",
                    marginBottom: "4px",
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: "16px", fontWeight: "700", color: COLOR.text,
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* ── Questions section ── */}
          {quiz.questions.length === 0 ? (
            <div
              style={{
                ...S.card,
                textAlign: "center",
                padding: "48px",
                color: COLOR.faint,
              }}
            >
              <p style={{ fontWeight: "600" }}>No questions in this quiz</p>
              <button
                style={{ ...S.btnPrimary, marginTop: "14px" }}
                onClick={() =>
                  navigate(`/admin/manage-quizzes/edit/${id}`)
                }
              >
                Add Questions
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              {/* Sidebar nav */}
              <div style={{ width: "170px", flexShrink: 0 }}>
                <div
                  style={{
                    background: "#fff",
                    border: `1px solid ${COLOR.border}`,
                    borderRadius: "10px",
                    overflow: "hidden",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                  }}
                >
                  <div
                    style={{
                      padding: "11px 16px",
                      borderBottom: `1px solid ${COLOR.border}`,
                      fontSize: "11px", fontWeight: "700",
                      color: COLOR.faint, textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Questions
                  </div>
                  {quiz.questions.map((q, i) => (
                    <div
                      key={i}
                      onClick={() => setSelQ(i)}
                      style={{
                        padding: "10px 16px",
                        cursor: "pointer",
                        background: selQ === i ? "#EFF6FF" : "transparent",
                        borderLeft:
                          selQ === i
                            ? `3px solid ${COLOR.primary}`
                            : "3px solid transparent",
                        borderBottom: `1px solid #F8FAFC`,
                        fontSize: "13px",
                        fontWeight: selQ === i ? "600" : "400",
                        color: selQ === i ? COLOR.primary : "#475569",
                      }}
                    >
                      Q{i + 1}
                      {q.question && (
                        <div
                          style={{
                            fontSize: "11px", color: COLOR.faint,
                            marginTop: "2px", fontWeight: "400",
                            overflow: "hidden", textOverflow: "ellipsis",
                            whiteSpace: "nowrap", maxWidth: "128px",
                          }}
                        >
                          {q.question}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Question detail */}
              {currentQ && (
                <div style={{ flex: 1 }}>
                  <div style={S.card}>
                    {/* Navigation */}
                    <div style={{ ...S.between, marginBottom: "18px" }}>
                      <span
                        style={{
                          background: "#EFF6FF", color: COLOR.primary,
                          padding: "4px 12px", borderRadius: "6px",
                          fontWeight: "700", fontSize: "13px",
                        }}
                      >
                        Question {selQ + 1} of {quiz.questions.length}
                      </span>
                      <div style={S.row}>
                        <button
                          style={{
                            ...S.btnSecondary,
                            padding: "6px 14px", fontSize: "13px",
                            opacity: selQ === 0 ? 0.4 : 1,
                          }}
                          disabled={selQ === 0}
                          onClick={() => setSelQ((i) => i - 1)}
                        >
                          Previous
                        </button>
                        <button
                          style={{
                            ...S.btnSecondary,
                            padding: "6px 14px", fontSize: "13px",
                            opacity:
                              selQ === quiz.questions.length - 1 ? 0.4 : 1,
                          }}
                          disabled={selQ === quiz.questions.length - 1}
                          onClick={() => setSelQ((i) => i + 1)}
                        >
                          Next
                        </button>
                      </div>
                    </div>

                    {/* Type badge + Question text */}
                    <div style={{ marginBottom: "6px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, background: "#EFF6FF", color: COLOR.primary, padding: "3px 10px", borderRadius: "20px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                        {{ mcq: "Multiple Choice", msq: "Multi-Select", truefalse: "True / False", short: "Short Answer" }[currentQ.type || "mcq"] || "MCQ"}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: "16px", fontWeight: "600",
                        color: COLOR.text, lineHeight: "1.6",
                        marginBottom: "20px",
                      }}
                    >
                      {currentQ.question || (
                        <span style={{ color: COLOR.faint, fontStyle: "italic" }}>
                          No question text
                        </span>
                      )}
                    </p>

                    {/* Short answer: just show the correct answer */}
                    {(currentQ.type === "short") && (
                      <div style={{ padding: "12px 16px", borderRadius: "8px", background: "#F0FDF4", border: "1.5px solid #86EFAC", marginBottom: "10px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: COLOR.success, marginBottom: "4px", textTransform: "uppercase" }}>Correct Answer</div>
                        <div style={{ fontSize: "15px", color: COLOR.text, fontWeight: 600 }}>{currentQ.correct_answer || <span style={{ color: COLOR.faint, fontStyle: "italic" }}>Not set</span>}</div>
                      </div>
                    )}

                    {/* Options (MCQ / MSQ / True-False) */}
                    {currentQ.type !== "short" && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: currentQ.type === "truefalse" ? "1fr 1fr" : "1fr 1fr",
                        gap: "10px",
                      }}
                    >
                      {currentQ.options.map((opt, oi) => {
                        const correctArr = Array.isArray(currentQ.correct_answer) ? currentQ.correct_answer : [];
                        const correct = currentQ.type === "msq"
                          ? correctArr.includes(oi)
                          : currentQ.correct_answer === oi;
                        return (
                          <div
                            key={oi}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              padding: "12px 16px",
                              borderRadius: "8px",
                              background: correct ? "#F0FDF4" : "#F8FAFC",
                              border: correct
                                ? "1.5px solid #86EFAC"
                                : `1px solid ${COLOR.border}`,
                            }}
                          >
                            <div
                              style={{
                                width: "26px", height: "26px",
                                borderRadius: currentQ.type === "msq" ? "6px" : "50%", flexShrink: 0,
                                background: correct ? COLOR.success : "#E2E8F0",
                                color: correct ? "#fff" : COLOR.muted,
                                display: "flex", alignItems: "center",
                                justifyContent: "center",
                                fontSize: "12px", fontWeight: "700",
                              }}
                            >
                              {String.fromCharCode(65 + oi)}
                            </div>
                            <span
                              style={{
                                fontSize: "14px",
                                color: correct ? "#15803D" : "#374151",
                                fontWeight: correct ? "600" : "400",
                                flex: 1,
                              }}
                            >
                              {opt || (
                                <span
                                  style={{
                                    color: COLOR.faint,
                                    fontStyle: "italic",
                                  }}
                                >
                                  Empty option
                                </span>
                              )}
                            </span>
                            {correct && (
                              <span
                                style={{
                                  fontSize: "12px", fontWeight: "600",
                                  color: COLOR.success, marginLeft: "auto",
                                  flexShrink: 0,
                                }}
                              >
                                ✓ Correct
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Leaderboard (Show if participants exist) ── */}
          {leaderboard.length > 0 && (
            <div style={{ ...S.card, marginTop: "20px" }}>
              <div style={{ ...S.between, marginBottom: "16px" }}>
                <div>
                  <h2 style={{ ...S.h2, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                    <Trophy size={18} color="#D97706" /> Leaderboard
                  </h2>
                </div>
                <div
                  style={{
                    background: "#EFF6FF", color: COLOR.primary,
                    padding: "10px 18px", borderRadius: "8px",
                    fontWeight: "700", fontSize: "15px",
                    display: "flex", alignItems: "center", gap: "8px"
                  }}
                >
                  <Users size={18} /> {footfall} participant{footfall !== 1 ? "s" : ""}
                </div>
              </div>

              {leaderboard.length === 0 ? (
                <div
                  style={{
                    textAlign: "center", padding: "32px",
                    background: COLOR.bg, borderRadius: "8px",
                    color: COLOR.faint,
                  }}
                >
                  <p style={{ fontWeight: "600" }}>No submissions yet</p>
                  <p style={{ fontSize: "13px", marginTop: "4px" }}>
                    {status === "Live"
                      ? "Waiting for students to submit..."
                      : "No one participated in this quiz."}
                  </p>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${COLOR.border}` }}>
                      {["Rank", "Name", "Score", "Points", "Time Taken"].map((h, i) => (
                        <th
                          key={h}
                          style={{
                            textAlign: i === 0 ? "center" : "left",
                            padding: "10px 14px",
                            fontSize: "11px", fontWeight: "700",
                            color: COLOR.faint, textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((row, i) => {
                      const medalBg =
                        i === 0 ? "#FDE68A"
                          : i === 1 ? "#E2E8F0"
                            : i === 2 ? "#FDBA74"
                              : "#F1F5F9";
                      return (
                        <tr
                          key={i}
                          style={{
                            borderBottom: `1px solid #F8FAFC`,
                            background:
                              i === 0
                                ? "#FFFBEB"
                                : i % 2 === 0
                                  ? "#FAFAFA"
                                  : "#fff",
                          }}
                        >
                          <td
                            style={{
                              textAlign: "center",
                              padding: "12px 14px",
                            }}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                width: "28px", height: "28px",
                                borderRadius: "50%",
                                alignItems: "center", justifyContent: "center",
                                fontWeight: "700", fontSize: "13px",
                                background: medalBg, color: COLOR.text,
                              }}
                            >
                              {row.rank}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "12px 14px",
                              fontWeight: "600",
                              color: COLOR.text,
                              fontSize: "14px",
                            }}
                          >
                            {row.name}
                          </td>
                          <td
                            style={{
                              padding: "12px 14px",
                              color: COLOR.success,
                              fontWeight: "700",
                              fontSize: "14px",
                            }}
                          >
                            {row.score}
                          </td>
                          <td
                            style={{
                              padding: "12px 14px",
                              color: COLOR.primary,
                              fontWeight: "700",
                              fontSize: "14px",
                            }}
                          >
                            {row.points || 0}
                          </td>
                          <td
                            style={{
                              padding: "12px 14px",
                              color: COLOR.muted,
                              fontSize: "13px",
                            }}
                          >
                            {row.time_taken_seconds != null ? `${row.time_taken_seconds}s` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </AdminLayout>
    );
  }

  // Fallback
  return (
    <AdminLayout>
      <div
        style={{
          ...S.page,
          textAlign: "center",
          paddingTop: "64px",
          color: COLOR.muted,
        }}
      >
        Loading...
      </div>
    </AdminLayout>
  );
};

export default ManageQuizzes;
