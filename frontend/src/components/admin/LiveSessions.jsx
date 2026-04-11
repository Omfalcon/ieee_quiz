import React, { useState, useEffect } from "react";
import { Radio, Users } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAdminWS } from "../../context/WebSocketContext";

const API = "http://127.0.0.1:8000";

const LiveSessions = () => {
    const { tokens } = useTheme();
    const { lastEvent } = useAdminWS();
    const [liveQuizzes, setLiveQuizzes] = useState([]);

    const fetchLive = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API}/quizzes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setLiveQuizzes(data.filter(q => q.status === "live"));
        } catch {
            // silent
        }
    };

    useEffect(() => { fetchLive(); }, []);

    useEffect(() => {
        if (!lastEvent) return;
        const { action } = lastEvent;
        if (["QUIZ_UPDATED", "QUIZ_CREATED", "QUIZ_DELETED", "PARTICIPANT_JOINED", "REFRESH_SESSION"].includes(action)) {
            fetchLive();
        }
    }, [lastEvent]);

    return (
        <div style={{
            background: tokens.surface,
            border: `1px solid ${tokens.border}`,
            padding: "16px",
            borderRadius: "12px",
            marginBottom: "16px",
            boxShadow: tokens.cardShadow
        }}>
            <h3 style={{
                marginBottom: "12px", fontSize: "15px", fontWeight: 700,
                display: "flex", alignItems: "center", gap: "8px", color: tokens.text
            }}>
                <Radio size={16} color={tokens.primary} /> Live Sessions
            </h3>

            {liveQuizzes.length === 0 ? (
                <div style={{ color: tokens.textMuted, fontSize: "13px", padding: "12px 0", textAlign: "center" }}>
                    No live quizzes right now.
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {liveQuizzes.map(quiz => (
                        <div key={quiz._id} style={{
                            border: `1px solid ${tokens.border}`,
                            borderRadius: "8px",
                            padding: "10px 12px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}>
                            <div>
                                <p style={{ fontWeight: 600, margin: 0, color: tokens.text, fontSize: "14px" }}>
                                    {quiz.title}
                                </p>
                            </div>
                            <div style={{
                                display: "flex", alignItems: "center", gap: "6px",
                                color: tokens.success, fontSize: "12px", fontWeight: 700
                            }}>
                                <Users size={13} />
                                <span>{quiz.participants || 0}</span>
                                <div style={{
                                    width: 6, height: 6, borderRadius: "50%",
                                    background: tokens.success, marginLeft: 4,
                                    boxShadow: `0 0 6px ${tokens.success}`
                                }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LiveSessions;
