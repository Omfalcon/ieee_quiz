import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Clock, User, ArrowLeft, Medal, Crown, Star, Maximize, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { useTheme, ThemeToggle } from '../context/ThemeContext';

const API = "http://127.0.0.1:8000";

const EventLeaderboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { theme, tokens } = useTheme();
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
    }, [id]);

    // Connect to the public leaderboard WebSocket — no auth required
    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//127.0.0.1:8000/ws/leaderboard/${id}`);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.action === "NEW_SUBMISSION") {
                    fetchData();
                }
            } catch {
                // ignore
            }
        };

        return () => ws.close(1000, 'Unmounting');
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
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: tokens.bg }}>
                <div style={{ textAlign: 'center' }}>
                    <RefreshCw size={48} style={{ color: tokens.primary, marginBottom: '16px' }} className="animate-spin" />
                    <p style={{ fontSize: '18px', fontWeight: '600', color: tokens.textMuted }}>Initializing Live Stream...</p>
                </div>
            </div>
        );
    }

    const bgGradient = theme === 'dark' 
        ? 'radial-gradient(circle at top, #1e293b 0%, #020617 100%)'
        : 'radial-gradient(circle at top, #f0f7ff 0%, #ffffff 100%)';

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: bgGradient,
            color: tokens.text, 
            padding: '40px 20px',
            fontFamily: "'Inter', sans-serif",
            transition: 'background 0.3s, color 0.3s'
        }}>
            {/* Control Bar (Auto-hides in some contexts, simplified here) */}
            <div style={{ 
                position: 'fixed', top: '24px', left: '24px', right: '24px', 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                zIndex: 100
            }}>
                <button 
                    onClick={() => navigate(-1)}
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px', 
                        background: tokens.surface, border: `1px solid ${tokens.border}`, 
                        color: tokens.textMuted, padding: '10px 20px', borderRadius: '14px',
                        cursor: 'pointer', fontWeight: '600', backdropFilter: 'blur(10px)',
                        boxShadow: tokens.cardShadow
                    }}
                >
                    <ArrowLeft size={18} /> Exit
                </button>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <ThemeToggle />
                    <div style={{ 
                         background: tokens.surface, border: `1px solid ${tokens.border}`, 
                         color: tokens.success, padding: '10px 20px', borderRadius: '14px',
                         fontSize: '12px', fontWeight: '800', backdropFilter: 'blur(10px)',
                         display: 'flex', alignItems: 'center', gap: '8px',
                         boxShadow: tokens.cardShadow
                    }}>
                        <div style={{ width: '8px', height: '8px', background: tokens.success, borderRadius: '50%', boxShadow: `0 0 10px ${tokens.success}` }} />
                        <span style={{ letterSpacing: '1px' }}>LIVE STREAM</span>
                    </div>
                    <button 
                        onClick={toggleFullScreen}
                        style={{ 
                            background: tokens.surface, border: `1px solid ${tokens.border}`, 
                            color: tokens.text, padding: '10px 20px', borderRadius: '14px',
                            cursor: 'pointer', backdropFilter: 'blur(10px)',
                            boxShadow: tokens.cardShadow
                        }}
                    >
                        <Maximize size={18} />
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
                                background: tokens.surface, border: `1px solid ${tokens.border}`, 
                                borderRadius: '32px', padding: '40px 30px', textAlign: 'center', 
                                backdropFilter: 'blur(20px)', position: 'relative', overflow: 'hidden',
                                boxShadow: tokens.cardShadow
                            }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#94a3b8' }} />
                                <div style={{ width: '80px', height: '80px', margin: '0 auto 20px', background: 'rgba(148,163,184,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Medal size={40} color="#94a3b8" />
                                </div>
                                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: tokens.text }}>{leaderboard[1]?.name || "Challenger"}</h3>
                                <div style={{ fontSize: '32px', fontWeight: '900', color: tokens.primary }}>{leaderboard[1]?.points?.toLocaleString() || 0}</div>
                                <div style={{ color: tokens.textMuted, fontSize: '14px', marginTop: '4px', fontWeight: 700 }}>RANK #2</div>
                            </div>
                        </div>
                    )}

                    {/* 1st Place (The King) */}
                    {leaderboard[0] && (
                        <div style={{ animation: 'bounceIn 1s cubic-bezier(0.68, -0.55, 0.265, 1.55)' }}>
                            <div style={{ 
                                background: theme === 'dark' ? 'rgba(251, 191, 36, 0.05)' : 'rgba(251, 191, 36, 0.1)', 
                                border: '2px solid #fbbf24', 
                                borderRadius: '40px', padding: '60px 40px', textAlign: 'center', 
                                backdropFilter: 'blur(20px)', position: 'relative', overflow: 'hidden',
                                transform: 'scale(1.1)', boxShadow: '0 20px 60px rgba(251, 191, 36, 0.15)'
                            }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#fbbf24', boxShadow: '0 0 15px #fbbf24' }} />
                                <div style={{ width: '100px', height: '100px', margin: '0 auto 24px', background: 'rgba(251,191,36,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Crown size={60} color="#fbbf24" />
                                </div>
                                <h3 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '12px', color: tokens.text }}>{leaderboard[0]?.name || "Champion"}</h3>
                                <div style={{ fontSize: '48px', fontWeight: '900', color: '#fbbf24' }}>{leaderboard[0]?.points?.toLocaleString() || 0}</div>
                                <div style={{ color: '#fbbf24', fontSize: '14px', fontWeight: '800', letterSpacing: '3px', marginTop: '8px' }}>GRAND CHAMPION</div>
                            </div>
                        </div>
                    )}

                    {/* 3rd Place */}
                    {leaderboard[2] && (
                        <div style={{ alignSelf: 'flex-end', animation: 'slideInRight 0.8s ease-out' }}>
                            <div style={{ 
                                background: tokens.surface, border: `1px solid ${tokens.border}`, 
                                borderRadius: '32px', padding: '40px 30px', textAlign: 'center', 
                                backdropFilter: 'blur(20px)', position: 'relative', overflow: 'hidden',
                                boxShadow: tokens.cardShadow
                            }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#f59e0b' }} />
                                <div style={{ width: '80px', height: '80px', margin: '0 auto 20px', background: 'rgba(245,158,11,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Star size={40} color="#f59e0b" />
                                </div>
                                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: tokens.text }}>{leaderboard[2]?.name || "Challenger"}</h3>
                                <div style={{ fontSize: '32px', fontWeight: '900', color: '#f59e0b' }}>{leaderboard[2]?.points?.toLocaleString() || 0}</div>
                                <div style={{ color: tokens.textMuted, fontSize: '14px', marginTop: '4px', fontWeight: 700 }}>RANK #3</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Others Table */}
                <div style={{ 
                    background: tokens.surface, border: `1px solid ${tokens.border}`, 
                    borderRadius: '32px', padding: '40px', backdropFilter: 'blur(10px)',
                    marginBottom: '60px', boxShadow: tokens.cardShadow
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', padding: '0 20px' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: '800', color: tokens.text }}>Full Rankings</h2>
                        <div style={{ color: tokens.textMuted, fontSize: '14px', fontWeight: 600 }}>Refreshed: {lastUpdated.toLocaleTimeString()}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {leaderboard.length > 3 ? (
                            leaderboard.slice(3).map((user, idx) => (
                                <div key={user.email} style={{ 
                                    display: 'flex', alignItems: 'center', gap: '20px',
                                    background: tokens.surfaceHover, padding: '24px 32px', 
                                    borderRadius: '24px', border: `1px solid ${tokens.border}`,
                                    transition: 'all 0.2s',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                                }}>
                                    <div style={{ fontSize: '18px', fontWeight: '900', color: tokens.textMuted, width: '40px' }}>#{idx + 4}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '18px', fontWeight: '700', color: tokens.text }}>{user?.name || "Participant"}</div>
                                        <div style={{ fontSize: '12px', color: tokens.textMuted, fontWeight: 500 }}>{user?.email?.split('@')[0] || "anon"}***</div>
                                    </div>
                                    <div style={{ textAlign: 'center', minWidth: '100px' }}>
                                        <div style={{ fontSize: '12px', color: tokens.textMuted, marginBottom: '4px', fontWeight: 700 }}>ACCURACY</div>
                                        <div style={{ fontSize: '16px', fontWeight: '800', color: tokens.success }}>{user?.percentage || 0}%</div>
                                    </div>
                                    <div style={{ textAlign: 'center', minWidth: '100px' }}>
                                        <div style={{ fontSize: '12px', color: tokens.textMuted, marginBottom: '4px', fontWeight: 700 }}>SPEED</div>
                                        <div style={{ fontSize: '16px', fontWeight: '800', color: tokens.primary }}>{user?.time_taken_seconds || 0}s</div>
                                    </div>
                                    <div style={{ fontSize: '26px', fontWeight: '900', color: tokens.text, minWidth: '140px', textAlign: 'right' }}>
                                        {user?.points?.toLocaleString?.() || 0}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', padding: '60px', color: tokens.textMuted, fontWeight: 500, fontStyle: 'italic' }}>
                                Waiting for more participants to cross the finish line...
                            </div>
                        )}
                    </div>
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
