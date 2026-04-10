import React, { useState, useEffect } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import { BarChart2, Users, CheckCircle, Clock, ChevronRight, Trophy } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAdminWS } from "../context/WebSocketContext";

const API = "http://127.0.0.1:8000";

const Analytics = () => {
    const { tokens } = useTheme();
    const { lastEvent } = useAdminWS();
    const [quizzes, setQuizzes] = useState([]);
    const [selectedQuizId, setSelectedQuizId] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    const fetchQuizzes = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API}/quizzes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setQuizzes(data);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    const fetchAnalytics = async (quizId) => {
        setAnalyticsLoading(true);
        try {
            const token = localStorage.getItem("token");
            const [analyticsRes, leaderboardRes] = await Promise.all([
                fetch(`${API}/admin/analytics/quiz-analytics/${quizId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                fetch(`${API}/quizzes/${quizId}/leaderboard`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);
            if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
            if (leaderboardRes.ok) {
                const lb = await leaderboardRes.json();
                setLeaderboard(lb.leaderboard || []);
            }
        } catch {
            // silent
        } finally {
            setAnalyticsLoading(false);
        }
    };

    useEffect(() => { fetchQuizzes(); }, []);

    useEffect(() => {
        if (!selectedQuizId) return;
        fetchAnalytics(selectedQuizId);
    }, [selectedQuizId]);

    // Real-time: refresh analytics when a new submission comes in for selected quiz
    useEffect(() => {
        if (!lastEvent) return;
        const { action, quiz_id } = lastEvent;
        if (action === "NEW_SUBMISSION" && quiz_id === selectedQuizId) {
            fetchAnalytics(selectedQuizId);
        }
        if (["QUIZ_CREATED", "QUIZ_DELETED"].includes(action)) {
            fetchQuizzes();
        }
    }, [lastEvent]);

    const selectedQuiz = quizzes.find(q => q._id === selectedQuizId);

    const statusColor = (status) => {
        if (status === "live") return tokens.success;
        if (status === "finished") return tokens.textMuted;
        return tokens.primary;
    };

    const maxAccuracy = analytics?.question_stats
        ? Math.max(...analytics.question_stats.map(q => q.answered), 1)
        : 1;

    return (
        <AdminLayout>
            <h1 style={{ marginBottom: "24px", color: tokens.text }}>Analytics</h1>

            <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
                {/* Quiz List */}
                <div style={{
                    width: "280px", flexShrink: 0,
                    background: tokens.surface, border: `1px solid ${tokens.border}`,
                    borderRadius: "12px", overflow: "hidden", boxShadow: tokens.cardShadow
                }}>
                    <div style={{ padding: "16px", borderBottom: `1px solid ${tokens.border}` }}>
                        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: tokens.text }}>
                            Select a Quiz
                        </h3>
                    </div>
                    {loading ? (
                        <div style={{ padding: "24px", color: tokens.textMuted, textAlign: "center" }}>Loading...</div>
                    ) : quizzes.length === 0 ? (
                        <div style={{ padding: "24px", color: tokens.textMuted, textAlign: "center", fontSize: "13px" }}>No quizzes found.</div>
                    ) : (
                        <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
                            {quizzes.map(quiz => (
                                <div
                                    key={quiz._id}
                                    onClick={() => setSelectedQuizId(quiz._id)}
                                    style={{
                                        padding: "12px 16px",
                                        cursor: "pointer",
                                        borderBottom: `1px solid ${tokens.border}`,
                                        background: selectedQuizId === quiz._id ? tokens.surfaceHover : "transparent",
                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                        transition: "background 0.15s"
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = tokens.surfaceHover}
                                    onMouseLeave={e => e.currentTarget.style.background = selectedQuizId === quiz._id ? tokens.surfaceHover : "transparent"}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: "13px", color: tokens.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {quiz.title}
                                        </div>
                                        <div style={{ fontSize: "11px", color: statusColor(quiz.status), fontWeight: 700, textTransform: "uppercase", marginTop: "2px" }}>
                                            {quiz.status}
                                        </div>
                                    </div>
                                    <ChevronRight size={14} color={tokens.textMuted} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Analytics Panel */}
                <div style={{ flex: 1 }}>
                    {!selectedQuizId ? (
                        <div style={{
                            background: tokens.surface, border: `1px solid ${tokens.border}`,
                            borderRadius: "12px", padding: "60px",
                            textAlign: "center", color: tokens.textMuted,
                            boxShadow: tokens.cardShadow
                        }}>
                            <BarChart2 size={48} style={{ marginBottom: "16px", opacity: 0.4 }} />
                            <p style={{ fontSize: "16px", fontWeight: 600 }}>Select a quiz to view analytics</p>
                        </div>
                    ) : analyticsLoading ? (
                        <div style={{
                            background: tokens.surface, border: `1px solid ${tokens.border}`,
                            borderRadius: "12px", padding: "60px",
                            textAlign: "center", color: tokens.textMuted
                        }}>
                            Loading analytics...
                        </div>
                    ) : analytics ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            {/* Summary Cards */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                                {[
                                    { label: "Participants", value: analytics.total_participants, icon: Users, color: tokens.primary },
                                    { label: "Submissions", value: analytics.total_submissions, icon: CheckCircle, color: tokens.success },
                                    { label: "Questions", value: analytics.total_questions, icon: Clock, color: tokens.warning || "#f59e0b" },
                                ].map(({ label, value, icon: Icon, color }) => (
                                    <div key={label} style={{
                                        background: tokens.surface, border: `1px solid ${tokens.border}`,
                                        borderRadius: "12px", padding: "20px",
                                        display: "flex", alignItems: "center", gap: "16px",
                                        boxShadow: tokens.cardShadow
                                    }}>
                                        <div style={{
                                            width: 44, height: 44, borderRadius: "10px",
                                            background: `${color}20`,
                                            display: "flex", alignItems: "center", justifyContent: "center"
                                        }}>
                                            <Icon size={22} color={color} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: "26px", fontWeight: 800, color: tokens.text }}>{value}</div>
                                            <div style={{ fontSize: "12px", color: tokens.textMuted, fontWeight: 600 }}>{label}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Per-Question Accuracy */}
                            <div style={{
                                background: tokens.surface, border: `1px solid ${tokens.border}`,
                                borderRadius: "12px", padding: "24px", boxShadow: tokens.cardShadow
                            }}>
                                <h3 style={{ margin: "0 0 20px", fontSize: "15px", fontWeight: 700, color: tokens.text }}>
                                    Per-Question Accuracy
                                </h3>
                                {analytics.question_stats.length === 0 ? (
                                    <div style={{ color: tokens.textMuted, textAlign: "center", padding: "20px" }}>
                                        No submissions yet.
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                                        {analytics.question_stats.map(q => (
                                            <div key={q.index}>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                                    <span style={{
                                                        fontSize: "13px", color: tokens.text, fontWeight: 500,
                                                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                                        maxWidth: "70%"
                                                    }}>
                                                        Q{q.index + 1}. {q.question}
                                                    </span>
                                                    <span style={{ fontSize: "13px", fontWeight: 700, color: q.accuracy >= 70 ? tokens.success : q.accuracy >= 40 ? "#f59e0b" : tokens.danger }}>
                                                        {q.accuracy}%
                                                    </span>
                                                </div>
                                                <div style={{ height: "8px", background: tokens.border, borderRadius: "4px", overflow: "hidden" }}>
                                                    <div style={{
                                                        height: "100%",
                                                        width: `${q.accuracy}%`,
                                                        background: q.accuracy >= 70 ? tokens.success : q.accuracy >= 40 ? "#f59e0b" : tokens.danger,
                                                        borderRadius: "4px",
                                                        transition: "width 0.4s ease"
                                                    }} />
                                                </div>
                                                <div style={{ fontSize: "11px", color: tokens.textMuted, marginTop: "3px" }}>
                                                    {q.correct}/{q.answered} answered correctly
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Leaderboard */}
                            <div style={{
                                background: tokens.surface, border: `1px solid ${tokens.border}`,
                                borderRadius: "12px", padding: "24px", boxShadow: tokens.cardShadow
                            }}>
                                <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: tokens.text, display: "flex", alignItems: "center", gap: "8px" }}>
                                    <Trophy size={16} color={tokens.primary} /> Leaderboard
                                </h3>
                                {leaderboard.length === 0 ? (
                                    <div style={{ color: tokens.textMuted, textAlign: "center", padding: "20px", fontSize: "13px" }}>
                                        No completions yet.
                                    </div>
                                ) : (
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                                        <thead>
                                            <tr style={{ borderBottom: `1px solid ${tokens.border}` }}>
                                                {["#", "Name", "Score", "Points", "Time"].map(h => (
                                                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: tokens.textMuted, fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {leaderboard.slice(0, 10).map(row => (
                                                <tr key={row.email} style={{ borderBottom: `1px solid ${tokens.border}` }}>
                                                    <td style={{ padding: "10px 12px", fontWeight: 800, color: row.rank === 1 ? "#fbbf24" : row.rank === 2 ? "#94a3b8" : row.rank === 3 ? "#f59e0b" : tokens.textMuted }}>
                                                        #{row.rank}
                                                    </td>
                                                    <td style={{ padding: "10px 12px", fontWeight: 600, color: tokens.text }}>{row.name}</td>
                                                    <td style={{ padding: "10px 12px", color: tokens.text }}>{row.score}/{analytics.total_questions}</td>
                                                    <td style={{ padding: "10px 12px", fontWeight: 700, color: tokens.primary }}>{row.points?.toLocaleString()}</td>
                                                    <td style={{ padding: "10px 12px", color: tokens.textMuted }}>{row.time_taken_seconds}s</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </AdminLayout>
    );
};

export default Analytics;
