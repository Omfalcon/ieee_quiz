import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Clock, User, ArrowLeft, Medal, Crown, Star, Maximize, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API = "http://127.0.0.1:8000";

const EventLeaderboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [leaderboard, setLeaderboard] = useState([]);
    const [quizInfo, setQuizInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const fetchData = async () => {
        try {
            const [leaderboardRes, quizRes] = await Promise.all([
                axios.get(`${API}/quizzes/${id}/leaderboard`),
                axios.get(`${API}/quizzes/${id}`)
            ]);
            setLeaderboard(leaderboardRes.data.leaderboard || []);
            setQuizInfo(quizRes.data);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Failed to fetch leaderboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // 5s for projector mode
        return () => clearInterval(interval);
    }, [id]);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#020617' }}>
                <div style={{ textAlign: 'center' }}>
                    <RefreshCw size={48} style={{ color: '#3b82f6', marginBottom: '16px' }} />
                    <p style={{ fontSize: '18px', fontWeight: '600', color: '#94a3b8' }}>Initializing Live Stream...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: 'radial-gradient(circle at top, #1e293b 0%, #020617 100%)', 
            color: 'white', 
            padding: '40px 20px',
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Control Bar (Auto-hides in some contexts, simplified here) */}
            <div style={{ 
                position: 'fixed', top: '20px', left: '20px', right: '20px', 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                zIndex: 100
            }}>
                <button 
                    onClick={() => navigate(-1)}
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px', 
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                        color: '#94a3b8', padding: '8px 16px', borderRadius: '12px',
                        cursor: 'pointer', fontWeight: '600', backdropFilter: 'blur(10px)'
                    }}
                >
                    <ArrowLeft size={20} /> Exit
                </button>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ 
                         background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                         color: '#10b981', padding: '8px 16px', borderRadius: '12px',
                         fontSize: '12px', fontWeight: '700', backdropFilter: 'blur(10px)',
                         display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                        <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 10px #10b981' }} />
                        LIVE UPDATING
                    </div>
                    <button 
                        onClick={toggleFullScreen}
                        style={{ 
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                            color: 'white', padding: '8px 16px', borderRadius: '12px',
                            cursor: 'pointer', backdropFilter: 'blur(10px)'
                        }}
                    >
                        <Maximize size={20} />
                    </button>
                </div>
            </div>

            <div style={{ maxWidth: '1200px', margin: '60px auto 0' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                    <div style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '12px', 
                        background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)',
                        padding: '8px 24px', borderRadius: '100px', color: '#60a5fa',
                        fontSize: '14px', fontWeight: '700', letterSpacing: '2px', marginBottom: '20px'
                    }}>
                        IEEE UPES QUIZHUB CHAMPIONSHIP
                    </div>
                    <h1 style={{ fontSize: '48px', fontWeight: '900', marginBottom: '12px', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {quizInfo?.title || 'Global Tournament'}
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '18px' }}>Tracking {leaderboard.length} active challengers</p>
                </div>

                {/* Top 3 Podium (Premium View) */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                    gap: '30px', 
                    marginBottom: '80px',
                    perspective: '1000px'
                }}>
                    {/* 2nd Place */}
                    {leaderboard[1] && (
                        <div style={{ alignSelf: 'flex-end', animation: 'slideInLeft 0.8s ease-out' }}>
                            <div style={{ 
                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', 
                                borderRadius: '32px', padding: '40px 30px', textAlign: 'center', 
                                backdropFilter: 'blur(20px)', position: 'relative', overflow: 'hidden'
                            }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#94a3b8' }} />
                                <div style={{ width: '80px', height: '80px', margin: '0 auto 20px', background: '#94a3b822', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Medal size={40} color="#94a3b8" />
                                </div>
                                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>{leaderboard[1]?.name || "Challenger"}</h3>
                                <div style={{ fontSize: '32px', fontWeight: '900', color: '#94a3b8' }}>{leaderboard[1]?.points?.toLocaleString() || 0}</div>
                                <div style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>RANK #2</div>
                            </div>
                        </div>
                    )}

                    {/* 1st Place (The King) */}
                    {leaderboard[0] && (
                        <div style={{ animation: 'bounceIn 1s cubic-bezier(0.68, -0.55, 0.265, 1.55)' }}>
                            <div style={{ 
                                background: 'rgba(251, 191, 36, 0.05)', border: '2px solid #fbbf24', 
                                borderRadius: '40px', padding: '60px 40px', textAlign: 'center', 
                                backdropFilter: 'blur(20px)', position: 'relative', overflow: 'hidden',
                                transform: 'scale(1.1)', boxShadow: '0 0 50px rgba(251, 191, 36, 0.1)'
                            }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#fbbf24', boxShadow: '0 0 15px #fbbf24' }} />
                                <div style={{ width: '100px', height: '100px', margin: '0 auto 24px', background: '#fbbf2422', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Crown size={60} color="#fbbf24" />
                                </div>
                                <h3 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '12px' }}>{leaderboard[0]?.name || "Champion"}</h3>
                                <div style={{ fontSize: '48px', fontWeight: '900', color: '#fbbf24' }}>{leaderboard[0]?.points?.toLocaleString() || 0}</div>
                                <div style={{ color: '#fbbf24', fontSize: '14px', fontWeight: '700', letterSpacing: '2px', marginTop: '8px' }}>CHAMPION</div>
                            </div>
                        </div>
                    )}

                    {/* 3rd Place */}
                    {leaderboard[2] && (
                        <div style={{ alignSelf: 'flex-end', animation: 'slideInRight 0.8s ease-out' }}>
                            <div style={{ 
                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', 
                                borderRadius: '32px', padding: '40px 30px', textAlign: 'center', 
                                backdropFilter: 'blur(20px)', position: 'relative', overflow: 'hidden'
                            }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#f59e0b' }} />
                                <div style={{ width: '80px', height: '80px', margin: '0 auto 20px', background: '#92400e22', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Star size={40} color="#f59e0b" />
                                </div>
                                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>{leaderboard[2]?.name || "Challenger"}</h3>
                                <div style={{ fontSize: '32px', fontWeight: '900', color: '#f59e0b' }}>{leaderboard[2]?.points?.toLocaleString() || 0}</div>
                                <div style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>RANK #3</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Others Table */}
                <div style={{ 
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '32px', padding: '40px', backdropFilter: 'blur(10px)',
                    marginBottom: '60px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', padding: '0 20px' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: '700' }}>Full Rankings</h2>
                        <div style={{ color: '#64748b', fontSize: '14px' }}>Last refined: {lastUpdated.toLocaleTimeString()}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {leaderboard.length > 3 ? (
                            leaderboard.slice(3).map((user, idx) => (
                                <div key={user.email} style={{ 
                                    display: 'flex', alignItems: 'center', gap: '20px',
                                    background: 'rgba(255,255,255,0.02)', padding: '20px 30px', 
                                    borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)',
                                    transition: 'all 0.3s'
                                }}>
                                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#475569', width: '40px' }}>#{idx + 4}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '18px', fontWeight: '600' }}>{user?.name || "Participant"}</div>
                                        <div style={{ fontSize: '12px', color: '#475569' }}>{user?.email?.split('@')[0] || "anon"}***@***</div>
                                    </div>
                                    <div style={{ textAlign: 'center', minWidth: '100px' }}>
                                        <div style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>ACCURACY</div>
                                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#10b981' }}>{user?.percentage || 0}%</div>
                                    </div>
                                    <div style={{ textAlign: 'center', minWidth: '100px' }}>
                                        <div style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>TIME</div>
                                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#3b82f6' }}>{user?.time_taken_seconds || 0}s</div>
                                    </div>
                                    <div style={{ fontSize: '24px', fontWeight: '900', color: 'white', minWidth: '120px', textAlign: 'right' }}>
                                        {user?.points?.toLocaleString?.() || 0}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>
                                Waiting for more participants to cross the finish line...
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Footer Brand */}
                <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.3 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', letterSpacing: '4px' }}>POWERED BY ANTIGRAVITY</div>
                </div>
            </div>

            <style>{`
                @keyframes bounceIn {
                    0% { transform: scale(0.3); opacity: 0; }
                    50% { transform: scale(1.05); }
                    70% { transform: scale(0.9); }
                    100% { transform: scale(1.1); opacity: 1; }
                }
                @keyframes slideInLeft {
                    from { transform: translateX(-100px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideInRight {
                    from { transform: translateX(100px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes pulseLive {
                    0% { opacity: 0.5; }
                    50% { opacity: 1; }
                    100% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
};

export default EventLeaderboard;
