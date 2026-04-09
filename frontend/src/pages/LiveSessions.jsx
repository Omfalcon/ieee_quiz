import React, { useState, useEffect } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import { Users, Trash2, Clock, Trophy, ChevronRight, X, RefreshCw } from "lucide-react";
import axios from "axios";

const API = "http://127.0.0.1:8000";

const LiveSessions = () => {
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
    // Auto refresh the main view every 10 seconds
    const interval = setInterval(fetchLiveQuizzes, 10000);
    return () => clearInterval(interval);
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

  // Poll modal data if a quiz is selected
  useEffect(() => {
    if (!selectedQuiz) return;
    
    // Fetch immediately
    fetchModalData(selectedQuiz._id);
    
    // Then poll every 5 seconds
    const interval = setInterval(() => {
      fetchModalData(selectedQuiz._id);
    }, 5000);
    
    return () => clearInterval(interval);
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

  if (loading) return <AdminLayout><h2 style={{color: "#1e293b"}}>Loading Live Sessions...</h2></AdminLayout>;

  return (
    <AdminLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ margin: 0, color: "#0f172a" }}>Live Sessions</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b", fontSize: "14px" }}>
          <RefreshCw size={14} /> Auto-refreshing
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: "20px"
      }}>
        {liveQuizzes.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "#64748b", background: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
            No live quizzes currently active. Make a quiz "Live" from the Manage Quizzes page.
          </div>
        ) : (
          liveQuizzes.map(quiz => (
            <div 
              key={quiz._id}
              onClick={() => handleCardClick(quiz)}
              style={{
                background: "#ffffff",
                borderRadius: "12px",
                border: "1px solid #3b82f6", // Blue border indicates live
                padding: "20px",
                cursor: "pointer",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
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
                <h3 style={{ margin: 0, fontSize: "18px", color: "#0f172a", flex: 1, paddingRight: "10px" }}>{quiz.title}</h3>
                <span style={{ 
                  background: "#fee2e2", color: "#dc2626", padding: "4px 8px", 
                  borderRadius: "12px", fontSize: "12px", fontWeight: "bold",
                  display: "flex", alignItems: "center", gap: "4px",
                  animation: "pulse 2s infinite"
                }}>
                  <div style={{ width: "6px", height: "6px", background: "#dc2626", borderRadius: "50%" }}></div>
                  LIVE
                </span>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569", marginBottom: "20px" }}>
                <Users size={18} />
                <span style={{ fontWeight: 600, fontSize: "16px" }}>{quiz.participants || 0} Total Entering</span>
              </div>
              
              <div style={{ display: "flex", justifyContent: "flex-end", color: "#3b82f6", fontSize: "14px", fontWeight: 500, alignItems: "center", gap: "4px" }}>
                Manage Session <ChevronRight size={16} />
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
            background: "#ffffff",
            borderRadius: "12px",
            width: "100%", maxWidth: "800px",
            maxHeight: "90vh",
            display: "flex", flexDirection: "column",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          }}>
            {/* Modal Header */}
            <div style={{ padding: "20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "20px", color: "#0f172a" }}>{selectedQuiz.title}</h2>
                <div style={{ color: "#64748b", fontSize: "14px", marginTop: "4px" }}>Live Session Management</div>
              </div>
              <button 
                onClick={closeModal}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: "4px" }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", padding: "0 20px" }}>
              <button
                onClick={() => setActiveTab("active")}
                style={{
                  padding: "16px 20px", background: "none", border: "none", cursor: "pointer",
                  fontSize: "15px", fontWeight: 600,
                  color: activeTab === "active" ? "#3b82f6" : "#64748b",
                  borderBottom: activeTab === "active" ? "2px solid #3b82f6" : "2px solid transparent",
                  display: "flex", alignItems: "center", gap: "8px"
                }}
              >
                <Clock size={16} /> Active (<span style={{color: activeParticipants.length > 0 ? "#16a34a" : "inherit"}}>{activeParticipants.length}</span>)
              </button>
              <button
                onClick={() => setActiveTab("leaderboard")}
                style={{
                  padding: "16px 20px", background: "none", border: "none", cursor: "pointer",
                  fontSize: "15px", fontWeight: 600,
                  color: activeTab === "leaderboard" ? "#3b82f6" : "#64748b",
                  borderBottom: activeTab === "leaderboard" ? "2px solid #3b82f6" : "2px solid transparent",
                  display: "flex", alignItems: "center", gap: "8px"
                }}
              >
                <Trophy size={16} /> Finished & Leaderboard ({leaderboard.length})
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: "20px", overflowY: "auto", flex: 1, background: "#f8fafc" }}>
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
                          <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
                            <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600 }}>Student Name</th>
                            <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600 }}>Started At</th>
                            <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600, width: "80px" }}>Kick</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeParticipants.map(user => (
                            <tr key={user.email} style={{ borderBottom: "1px solid #e2e8f0" }}>
                              <td style={{ padding: "12px 16px" }}>
                                <div style={{ fontWeight: 500, color: "#0f172a" }}>{user.name}</div>
                                <div style={{ fontSize: "12px", color: "#64748b" }}>{user.email}</div>
                              </td>
                              <td style={{ padding: "12px 16px", color: "#475569" }}>
                                {new Date(user.start_time).toLocaleTimeString()}
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                <button
                                  onClick={() => handleKickParticipant(user.email, user.name)}
                                  style={{
                                    background: "#fee2e2", color: "#dc2626", border: "none",
                                    padding: "6px 10px", borderRadius: "6px", cursor: "pointer",
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
                    <div style={{ textAlign: "center", padding: "40px", color: "#64748b", background: "#fff", borderRadius: "8px" }}>
                      No one has finished this quiz yet.
                    </div>
                  ) : (
                    <div style={{ background: "#fff", borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                        <thead>
                          <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
                            <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600, width: "60px" }}>Rank</th>
                            <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600 }}>Student</th>
                            <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600 }}>Score</th>
                            <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600 }}>Accuracy</th>
                            <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600 }}>Time</th>
                            <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600, width: "80px" }}>Kick</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaderboard.map(user => (
                            <tr key={user.email} style={{ borderBottom: "1px solid #e2e8f0", background: user.rank <= 3 ? "#fefce8" : "#fff" }}>
                              <td style={{ padding: "12px 16px", fontWeight: "bold", color: user.rank === 1 ? "#d97706" : user.rank === 2 ? "#94a3b8" : user.rank === 3 ? "#b45309" : "#475569" }}>
                                #{user.rank}
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                <div style={{ fontWeight: 500, color: "#0f172a" }}>{user.name}</div>
                                <div style={{ fontSize: "12px", color: "#64748b" }}>{user.email}</div>
                              </td>
                              <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0f172a" }}>
                                {user.score}
                              </td>
                              <td style={{ padding: "12px 16px", color: "#475569" }}>
                                {user.percentage}%
                              </td>
                              <td style={{ padding: "12px 16px", color: "#475569" }}>
                                {user.time_taken_seconds}s
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                <button
                                  onClick={() => handleKickParticipant(user.email, user.name)}
                                  style={{
                                    background: "#fee2e2", color: "#dc2626", border: "none",
                                    padding: "6px 10px", borderRadius: "6px", cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center"
                                  }}
                                  title="Ban Student"
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
