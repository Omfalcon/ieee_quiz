import React, { useState, useEffect } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import { Users, Trash2, Clock, Trophy, ChevronRight, X, RefreshCw, Maximize, ExternalLink } from "lucide-react";
import axios from "axios";
import { useTheme } from "../context/ThemeContext";
import { useAdminWS } from "../context/WebSocketContext";

const API = "http://127.0.0.1:8000";

const LiveSessions = () => {
  const { tokens, theme } = useTheme();
  const { lastEvent } = useAdminWS();
  const [liveQuizzes, setLiveQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [activeParticipants, setActiveParticipants] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("active"); // 'active' or 'leaderboard'

  const fetchLiveQuizzes = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/quizzes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter only live quizzes
      const live = res.data.filter(q => q.status === "live");
      setLiveQuizzes(live);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveQuizzes();
  }, []);

  const fetchModalData = async (quizId) => {
    setModalLoading(true);
    try {
      const token = localStorage.getItem("token");

      // Fetch Active Participants
      const activeRes = await axios.get(`${API}/auth/admin/live-sessions/${quizId}/active-participants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveParticipants(activeRes.data);

      // Fetch Leaderboard
      const leaderboardRes = await axios.get(`${API}/quizzes/${quizId}/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeaderboard(leaderboardRes.data.leaderboard || []);

    } catch (err) {
      console.error("Failed to fetch modal data", err);
    } finally {
      setModalLoading(false);
    }
  };

  // React to centralized WebSocket events
  useEffect(() => {
    if (!lastEvent) return;
    const { action, quiz_id } = lastEvent;
    if (["REFRESH_SESSION", "PARTICIPANT_JOINED", "NEW_SUBMISSION", "QUIZ_UPDATED"].includes(action)) {
      if (selectedQuiz && selectedQuiz._id === quiz_id) {
        fetchModalData(quiz_id);
      }
      fetchLiveQuizzes();
    }
  }, [lastEvent]);

  // Load modal data once when opened
  useEffect(() => {
    if (selectedQuiz) {
      fetchModalData(selectedQuiz._id);
    }
  }, [selectedQuiz]);

  const handleCardClick = (quiz) => {
    setSelectedQuiz(quiz);
    setActiveTab("active");
  };

  const closeModal = () => {
    setSelectedQuiz(null);
    setActiveParticipants([]);
    setLeaderboard([]);
  };

  const handleKickParticipant = async (email, name) => {
    if (!window.confirm(`Kick ${name || email} from the quiz? They will lose their current progress.`)) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/auth/admin/live-sessions/${selectedQuiz._id}/participants/${email}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Refresh immediately
      fetchModalData(selectedQuiz._id);
    } catch (err) {
      console.error(err);
      alert("Failed to kick participant");
    }
  };

  if (loading) return (
    <AdminLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: tokens.primary }}>
        <RefreshCw size={24} className="animate-spin" />
        <h2 style={{ color: tokens.text }}>Synchronizing Live Data...</h2>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', background: tokens.primary, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Users size={24} />
          </div>
          <h1 style={{ margin: 0, color: tokens.text, fontSize: '28px', fontWeight: 800 }}>Live Sessions</h1>
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: "20px"
      }}>
        {liveQuizzes.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: tokens.textMuted, background: tokens.surface, borderRadius: "8px", border: `1px solid ${tokens.border}` }}>
            No live quizzes currently active.
          </div>
        ) : (
          liveQuizzes.map(quiz => (
            <div
              key={quiz._id}
              onClick={() => handleCardClick(quiz)}
              style={{
                background: tokens.surface,
                borderRadius: "12px",
                border: `1px solid ${tokens.border}`,
                padding: "20px",
                cursor: "pointer",
                boxShadow: tokens.cardShadow,
                transition: "transform 0.2s, box-shadow 0.2s",
                position: "relative",
                overflow: "hidden"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(90deg, #3b82f6, #ec4899)" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "18px", color: tokens.text, flex: 1, paddingRight: "10px" }}>{quiz.title}</h3>
                <span style={{
                  background: "rgba(16,185,129,0.1)", color: tokens.success, padding: "4px 8px",
                  borderRadius: "12px", fontSize: "12px", fontWeight: "bold",
                  display: "flex", alignItems: "center", gap: "4px",
                  animation: "pulse 2s infinite"
                }}>
                  <div style={{ width: "6px", height: "6px", background: tokens.success, borderRadius: "50%" }}></div>
                  LIVE
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: tokens.textMuted, marginBottom: "20px" }}>
                <Users size={18} />
                <span style={{ fontWeight: 600, fontSize: "16px" }}>{quiz.participants || 0} Participants</span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", color: tokens.primary, fontSize: "14px", fontWeight: 700, alignItems: "center", gap: "4px" }}>
                Monitor Live Feed <ChevronRight size={16} />
              </div>

              <style>{`
                @keyframes pulse {
                  0% { opacity: 1; }
                  50% { opacity: 0.6; }
                  100% { opacity: 1; }
                }
              `}</style>
            </div>
          ))
        )}
      </div>

      {/* EXPANDED MODAL */}
      {selectedQuiz && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15, 23, 42, 0.6)",
          display: "flex", justifyContent: "center", alignItems: "center",
          zIndex: 1000, padding: "20px"
        }}>
          <div style={{
            background: tokens.surface,
            borderRadius: "16px",
            width: "100%", maxWidth: "900px",
            maxHeight: "90vh",
            display: "flex", flexDirection: "column",
            boxShadow: tokens.cardShadow,
            border: `1px solid ${tokens.border}`,
            color: tokens.text
          }}>
            {/* Modal Header */}
            <div style={{ padding: "24px", borderBottom: `1px solid ${tokens.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: "20px", color: tokens.text }}>{selectedQuiz.title}</h2>
                <div style={{ color: tokens.textMuted, fontSize: "14px", marginTop: "4px" }}>Active Session Monitor</div>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                    onClick={() => window.open(`/leaderboard/${selectedQuiz._id}`, '_blank')}
                    style={{ 
                        background: "linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)",
                        boxShadow: "0 4px 15px rgba(59, 130, 246, 0.4)",
                        color: "white", border: "none", 
                        padding: "8px 16px", borderRadius: "8px", cursor: "pointer",
                        fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px",
                        transition: "all 0.2s"
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(59, 130, 246, 0.5)"; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 15px rgba(59, 130, 246, 0.4)"; }}
                >
                    <div style={{ width: "6px", height: "6px", background: "#4ade80", borderRadius: "50%", boxShadow: "0 0 10px #4ade80" }}></div>
                    <Trophy size={16} /> Live Leaderboard <ExternalLink size={12} style={{ opacity: 0.7 }} />
                </button>
                <button 
                  onClick={closeModal}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: "4px" }}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: "flex", borderBottom: `1px solid ${tokens.border}`, padding: "0 24px" }}>
              <button
                onClick={() => setActiveTab("active")}
                style={{
                  padding: "16px 20px", background: "none", border: "none", cursor: "pointer",
                  fontSize: "15px", fontWeight: 700,
                  color: activeTab === "active" ? tokens.primary : tokens.textMuted,
                  borderBottom: activeTab === "active" ? `2px solid ${tokens.primary}` : "2px solid transparent",
                  display: "flex", alignItems: "center", gap: "8px"
                }}
              >
                <Clock size={16} /> Active (<span style={{ color: activeParticipants.length > 0 ? tokens.success : "inherit" }}>{activeParticipants.length}</span>)
              </button>
              <button
                onClick={() => setActiveTab("leaderboard")}
                style={{
                  padding: "16px 20px", background: "none", border: "none", cursor: "pointer",
                  fontSize: "15px", fontWeight: 700,
                  color: activeTab === "leaderboard" ? tokens.primary : tokens.textMuted,
                  borderBottom: activeTab === "leaderboard" ? `2px solid ${tokens.primary}` : "2px solid transparent",
                  display: "flex", alignItems: "center", gap: "8px"
                }}
              >
                <Trophy size={16} /> Leaderboard ({leaderboard.length})
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: "24px", overflowY: "auto", flex: 1, background: theme === 'dark' ? 'rgba(0,0,0,0.2)' : tokens.surfaceHover }}>
              {modalLoading && activeParticipants.length === 0 && leaderboard.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Syncing data...</div>
              ) : activeTab === "active" ? (
                // ACTIVE PARTICIPANTS TAB
                <div>
                  {activeParticipants.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#64748b", background: "#fff", borderRadius: "8px" }}>
                      Nobody is currently taking this quiz right now.
                    </div>
                  ) : (
                    <div style={{ background: "#fff", borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                        <thead>
                          <tr style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', borderBottom: `1px solid ${tokens.border}` }}>
                            <th style={{ padding: "12px 16px", color: tokens.textMuted, fontWeight: 700, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>Student Name</th>
                            <th style={{ padding: "12px 16px", color: tokens.textMuted, fontWeight: 700, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>Started At</th>
                            <th style={{ padding: "12px 16px", color: tokens.textMuted, fontWeight: 700, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px', width: "80px" }}>Kick</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeParticipants.map(user => (
                            <tr key={user.email} style={{ borderBottom: `1px solid ${tokens.border}` }}>
                              <td style={{ padding: "12px 16px" }}>
                                <div style={{ fontWeight: 600, color: tokens.text }}>{user.name}</div>
                                <div style={{ fontSize: "12px", color: tokens.textMuted }}>{user.email}</div>
                              </td>
                              <td style={{ padding: "12px 16px", color: tokens.text, fontWeight: 500 }}>
                                {new Date(user.start_time).toLocaleTimeString()}
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                <button
                                  onClick={() => handleKickParticipant(user.email, user.name)}
                                  style={{
                                    background: "rgba(239,68,68,0.1)", color: tokens.danger, border: "none",
                                    padding: "8px", borderRadius: "8px", cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center"
                                  }}
                                  title="Kick Student"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                // LEADERBOARD TAB
                <div>
                  {leaderboard.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: tokens.textMuted, background: tokens.surface, borderRadius: "8px" }}>
                      No one has finished this quiz yet.
                    </div>
                  ) : (
                    <div style={{ background: tokens.surface, borderRadius: "12px", overflow: "hidden", border: `1px solid ${tokens.border}` }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                        <thead>
                          <tr style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', borderBottom: `1px solid ${tokens.border}` }}>
                            <th style={{ padding: "12px 16px", color: tokens.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Rank</th>
                            <th style={{ padding: "12px 16px", color: tokens.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Student</th>
                            <th style={{ padding: "12px 16px", color: tokens.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Score</th>
                            <th style={{ padding: "12px 16px", color: tokens.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Points</th>
                            <th style={{ padding: "12px 16px", color: tokens.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Accuracy</th>
                            <th style={{ padding: "12px 16px", color: tokens.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Time</th>
                            <th style={{ padding: "12px 16px", color: tokens.textMuted, fontWeight: 700, textTransform: 'uppercase', width: "80px" }}>Kick</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaderboard.map(user => (
                            <tr key={user.email} style={{ borderBottom: `1px solid ${tokens.border}`, background: user.rank <= 3 ? (theme === 'dark' ? 'rgba(251,191,36,0.05)' : 'rgba(251,191,36,0.02)') : 'transparent' }}>
                              <td style={{ padding: "12px 16px", fontWeight: "900", color: user.rank === 1 ? "#fbbf24" : user.rank === 2 ? "#94a3b8" : user.rank === 3 ? "#f59e0b" : tokens.textMuted }}>
                                #{user.rank}
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                <div style={{ fontWeight: 600, color: tokens.text }}>{user.name}</div>
                                <div style={{ fontSize: "11px", color: tokens.textMuted }}>{user.email}</div>
                              </td>
                              <td style={{ padding: "12px 16px", fontWeight: 700, color: tokens.text }}>
                                {user.score}
                              </td>
                              <td style={{ padding: "12px 16px", fontWeight: 800, color: tokens.primary }}>
                                {user.points || 0}
                              </td>
                              <td style={{ padding: "12px 16px", color: tokens.success, fontWeight: 700 }}>
                                {user.percentage}%
                              </td>
                              <td style={{ padding: "12px 16px", color: tokens.textMuted, fontWeight: 500 }}>
                                {user.time_taken_seconds}s
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                <button
                                  onClick={() => handleKickParticipant(user.email, user.name)}
                                  style={{
                                    background: "rgba(239,68,68,0.1)", color: tokens.danger, border: "none",
                                    padding: "8px", borderRadius: "8px", cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center"
                                  }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default LiveSessions;
