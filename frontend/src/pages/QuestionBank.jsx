import React, { useState } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { Sparkles, ArrowLeft, CheckCircle2, Circle, AlertCircle } from "lucide-react";

const API = "http://127.0.0.1:8000";

const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const COUNTS = [5, 10, 15, 20];

const QTYPE_CONFIG = [
  { value: "mcq",       label: "MCQ",           color: "#1e63b5" },
  { value: "msq",       label: "Multi-Select",   color: "#7c3aed" },
  { value: "truefalse", label: "True / False",   color: "#059669" },
  { value: "short",     label: "Short Answer",   color: "#d97706" },
];

const TYPE_MAP = Object.fromEntries(QTYPE_CONFIG.map(t => [t.value, t]));

// ── Input label ────────────────────────────────────────────────
const Label = ({ children, tokens }) => (
  <label style={{
    fontSize: "11px", fontWeight: 700, color: tokens.textMuted,
    display: "block", marginBottom: "7px",
    textTransform: "uppercase", letterSpacing: "0.5px",
  }}>
    {children}
  </label>
);

// ── Generated question card ────────────────────────────────────
const QuestionCard = ({ q, index, isSelected, onToggle, tokens }) => {
  const cfg = TYPE_MAP[q.type] || TYPE_MAP.mcq;

  return (
    <div
      onClick={onToggle}
      style={{
        background: tokens.surface,
        border: isSelected ? `2px solid ${cfg.color}` : `1px solid ${tokens.border}`,
        borderRadius: "14px",
        padding: "20px",
        cursor: "pointer",
        boxShadow: isSelected
          ? `0 0 0 4px ${cfg.color}1a, ${tokens.cardShadow}`
          : tokens.cardShadow,
        transition: "box-shadow 0.18s, border-color 0.18s",
        position: "relative",
      }}
    >
      {/* Selection circle */}
      <div style={{ position: "absolute", top: "16px", right: "16px" }}>
        {isSelected
          ? <CheckCircle2 size={20} color={cfg.color} />
          : <Circle size={20} color={tokens.border} />}
      </div>

      {/* Type badge + question number */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <span style={{
          display: "inline-block", padding: "3px 10px", borderRadius: "20px",
          fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px",
          background: `${cfg.color}18`, color: cfg.color,
        }}>
          {cfg.label}
        </span>
        <span style={{ fontSize: "11px", fontWeight: 700, color: tokens.textMuted }}>
          Q{index + 1}
        </span>
      </div>

      {/* Question text */}
      <p style={{
        fontSize: "14px", fontWeight: 600, color: tokens.text,
        lineHeight: 1.55, margin: "0 0 14px 0", paddingRight: "28px",
      }}>
        {q.question}
      </p>

      {/* Options (mcq / msq / truefalse) */}
      {q.options && q.options.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {q.options.map((opt, oi) => {
            const isCorrect = Array.isArray(q.correct_answer)
              ? q.correct_answer.includes(oi)
              : q.correct_answer === oi;
            return (
              <div key={oi} style={{
                padding: "6px 12px", borderRadius: "8px", fontSize: "13px",
                display: "flex", alignItems: "center", gap: "8px",
                background: isCorrect ? `${tokens.success}15` : tokens.inputBg,
                border: `1px solid ${isCorrect ? tokens.success : tokens.border}`,
                color: isCorrect ? tokens.success : tokens.text,
                fontWeight: isCorrect ? 600 : 400,
              }}>
                <span style={{
                  fontSize: "10px", fontWeight: 700, flexShrink: 0, width: "14px",
                  color: isCorrect ? tokens.success : tokens.textMuted,
                }}>
                  {String.fromCharCode(65 + oi)}
                </span>
                <span style={{ flex: 1 }}>{opt}</span>
                {isCorrect && (
                  <span style={{ fontSize: "11px", flexShrink: 0 }}>✓</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Short answer */}
      {q.type === "short" && (
        <div style={{
          background: `${tokens.success}12`,
          border: `1px solid ${tokens.success}40`,
          borderRadius: "8px", padding: "8px 12px",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: tokens.success, textTransform: "uppercase", letterSpacing: "0.3px", flexShrink: 0 }}>
            Answer:
          </span>
          <span style={{ fontSize: "13px", color: tokens.text }}>{q.correct_answer}</span>
        </div>
      )}
    </div>
  );
};


// ══════════════════════════════════════════════════════════════
export default function QuestionBank() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tokens } = useTheme();

  // Where to go back to (passed by ManageQuizzes via route state)
  const returnTo = location.state?.returnTo || "/admin/manage-quizzes/create";

  // Form state
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [selectedTypes, setSelectedTypes] = useState(["mcq"]);
  const [count, setCount] = useState(10);
  const [tags, setTags] = useState("");

  // Result state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState(new Set());

  // ── Type toggle (at least one must be selected) ────────────
  const toggleType = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.length > 1 ? prev.filter(t => t !== type) : prev
        : [...prev, type]
    );
  };

  // ── Card selection ─────────────────────────────────────────
  const toggleCard = (i) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(questions.map((_, i) => i)));
  const clearAll  = () => setSelected(new Set());

  // ── Generate ───────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!topic.trim()) { setError("Please enter a topic."); return; }
    setError(null);
    setLoading(true);
    setQuestions([]);
    setSelected(new Set());

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API}/ai/question-bank/generate`,
        {
          topic: topic.trim(),
          difficulty: difficulty.toLowerCase(),
          types: selectedTypes,
          count,
          tags: tags.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setQuestions(res.data.questions || []);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        "Failed to generate questions. Check your API key or try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Use selected ───────────────────────────────────────────
  const handleUseSelected = () => {
    const picked = [...selected]
      .sort((a, b) => a - b)
      .map(i => questions[i]);

    // Pass selected questions back to ManageQuizzes via route state
    navigate(returnTo, { state: { injectedQuestions: picked } });
  };

  const selCount = selected.size;

  // ── Shared style helpers ───────────────────────────────────
  const inputStyle = {
    width: "100%", padding: "10px 14px",
    border: `1px solid ${tokens.border}`, borderRadius: "8px",
    fontSize: "14px", color: tokens.text, background: tokens.inputBg,
    boxSizing: "border-box", outline: "none", fontFamily: "inherit",
  };

  const segmentBtn = (active, color) => ({
    flex: 1, padding: "9px 4px", borderRadius: "8px",
    fontSize: "13px", fontWeight: 600, cursor: "pointer",
    border: active ? `2px solid ${color}` : `1px solid ${tokens.border}`,
    background: active ? `${color}14` : tokens.inputBg,
    color: active ? color : tokens.textMuted,
    transition: "all 0.15s",
  });

  return (
    <AdminLayout>
      <div style={{ padding: "28px 32px", maxWidth: "1100px", paddingBottom: selCount > 0 ? "110px" : "28px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "26px" }}>
          <button
            onClick={() => navigate(returnTo)}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: tokens.textMuted, display: "flex", alignItems: "center", padding: "8px", borderRadius: "8px" }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: tokens.text, margin: 0 }}>
              AI Question Generator
            </h1>
            <p style={{ fontSize: "13px", color: tokens.textMuted, margin: "3px 0 0" }}>
              Generate questions with AI, select the ones you like, and add them to your quiz.
            </p>
          </div>
        </div>

        {/* ── Prompt builder card ── */}
        <div style={{
          background: tokens.surface, border: `1px solid ${tokens.border}`,
          borderRadius: "16px", padding: "26px", marginBottom: "24px",
          boxShadow: tokens.cardShadow,
        }}>
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: tokens.text, margin: "0 0 22px 0" }}>
            Configure Generation
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

            {/* Topic — full width */}
            <div style={{ gridColumn: "1 / -1" }}>
              <Label tokens={tokens}>Topic *</Label>
              <input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !loading && handleGenerate()}
                placeholder="e.g. Python Fundamentals, Data Structures, Machine Learning..."
                style={inputStyle}
              />
            </div>

            {/* Difficulty */}
            <div>
              <Label tokens={tokens}>Difficulty</Label>
              <div style={{ display: "flex", gap: "8px" }}>
                {DIFFICULTIES.map(d => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    style={segmentBtn(difficulty === d, tokens.primary)}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Count */}
            <div>
              <Label tokens={tokens}>Number of Questions</Label>
              <div style={{ display: "flex", gap: "8px" }}>
                {COUNTS.map(n => (
                  <button key={n} onClick={() => setCount(n)}
                    style={segmentBtn(count === n, tokens.primary)}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Question types */}
            <div>
              <Label tokens={tokens}>Question Types</Label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {QTYPE_CONFIG.map(t => {
                  const active = selectedTypes.includes(t.value);
                  return (
                    <button key={t.value} onClick={() => toggleType(t.value)} style={{
                      padding: "7px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                      border: active ? `2px solid ${t.color}` : `1px solid ${tokens.border}`,
                      background: active ? `${t.color}18` : tokens.inputBg,
                      color: active ? t.color : tokens.textMuted,
                      transition: "all 0.15s",
                    }}>
                      {active ? "✓ " : ""}{t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label tokens={tokens}>
                Keywords&nbsp;
                <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: "11px" }}>
                  (optional)
                </span>
              </Label>
              <input
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="e.g. loops, functions, OOP..."
                style={inputStyle}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "10px",
              background: "#FEF2F2", border: "1px solid #FECACA",
              borderRadius: "10px", padding: "12px 16px", marginTop: "18px",
            }}>
              <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: "1px" }} />
              <span style={{ fontSize: "13px", color: "#DC2626", lineHeight: 1.5 }}>{error}</span>
            </div>
          )}

          {/* Generate button */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "22px" }}>
            <button
              onClick={handleGenerate}
              disabled={loading}
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                background: loading
                  ? tokens.border
                  : `linear-gradient(135deg, ${tokens.primary} 0%, #7c3aed 100%)`,
                color: loading ? tokens.textMuted : "#fff",
                border: "none", borderRadius: "10px", padding: "11px 28px",
                fontSize: "14px", fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "0 4px 16px rgba(30,99,181,0.28)",
                transition: "all 0.2s",
              }}
            >
              {loading ? (
                <>
                  <span style={{ display: "inline-block", width: "16px", height: "16px", border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "qb-spin 0.8s linear infinite" }} />
                  Generating…
                </>
              ) : (
                <><Sparkles size={16} /> Generate Questions</>
              )}
            </button>
          </div>
        </div>

        {/* ── Results ── */}
        {questions.length > 0 && (
          <>
            {/* Results toolbar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "16px", fontWeight: 700, color: tokens.text }}>
                  {questions.length} Questions Generated
                </span>
                {selCount > 0 && (
                  <span style={{ fontSize: "13px", color: tokens.primary, fontWeight: 600, marginLeft: "10px" }}>
                    · {selCount} selected
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={selectAll} style={{
                  padding: "7px 14px", borderRadius: "7px", fontSize: "13px", fontWeight: 600,
                  cursor: "pointer", background: tokens.inputBg, color: tokens.textMuted,
                  border: `1px solid ${tokens.border}`,
                }}>
                  Select All
                </button>
                <button onClick={clearAll} style={{
                  padding: "7px 14px", borderRadius: "7px", fontSize: "13px", fontWeight: 600,
                  cursor: "pointer", background: tokens.inputBg, color: tokens.textMuted,
                  border: `1px solid ${tokens.border}`,
                }}>
                  Clear
                </button>
              </div>
            </div>

            {/* Card grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              {questions.map((q, i) => (
                <QuestionCard
                  key={i}
                  q={q}
                  index={i}
                  isSelected={selected.has(i)}
                  onToggle={() => toggleCard(i)}
                  tokens={tokens}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Fixed bottom action bar ── */}
      {selCount > 0 && (
        <div style={{
          position: "fixed", bottom: 0, left: "220px", right: 0, zIndex: 100,
          background: tokens.surface, borderTop: `1px solid ${tokens.border}`,
          padding: "14px 32px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.10)",
        }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: tokens.text }}>
            {selCount} question{selCount !== 1 ? "s" : ""} selected
          </span>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={clearAll} style={{
              padding: "10px 20px", borderRadius: "8px", fontSize: "14px", fontWeight: 600,
              cursor: "pointer", background: tokens.inputBg, color: tokens.textMuted,
              border: `1px solid ${tokens.border}`,
            }}>
              Clear Selection
            </button>
            <button onClick={handleUseSelected} style={{
              padding: "10px 26px", borderRadius: "8px", fontSize: "14px", fontWeight: 700,
              cursor: "pointer", border: "none", color: "#fff",
              background: `linear-gradient(135deg, ${tokens.primary} 0%, #7c3aed 100%)`,
              boxShadow: "0 4px 16px rgba(30,99,181,0.28)",
            }}>
              Use {selCount} Selected Question{selCount !== 1 ? "s" : ""} →
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes qb-spin { to { transform: rotate(360deg); } }`}</style>
    </AdminLayout>
  );
}
