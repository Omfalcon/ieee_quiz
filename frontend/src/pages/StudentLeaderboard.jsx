import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Clock, User, ArrowLeft, Medal, Crown, Star } from 'lucide-react';
import axios from 'axios';

const API = "http://127.0.0.1:8000";

const StudentLeaderboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [leaderboard, setLeaderboard] = useState([]);
    const [quizInfo, setQuizInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [leaderboardRes, quizRes] = await Promise.all([
                    axios.get(`${API}/quizzes/${id}/leaderboard`),
                    axios.get(`${API}/quizzes/${id}`)
                ]);
                setLeaderboard(leaderboardRes.data.leaderboard || []);
                setQuizInfo(quizRes.data);
            } catch (error) {
                console.error('Failed to fetch leaderboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
                <div style={{ textAlign: 'center' }}>
                    <Trophy size={48} className="animate-bounce" style={{ color: '#1e63b5', marginBottom: '16px' }} />
                    <p style={{ fontSize: '18px', fontWeight: '600', color: '#475569' }}>Loading Rankings...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                {/* Header Actions */}
                <button 
                    onClick={() => navigate(-1)}
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px', 
                        background: 'none', border: 'none', color: '#64748b', 
                        cursor: 'pointer', marginBottom: '24px', fontWeight: '600' 
                    }}
                >
                    <ArrowLeft size={20} /> Back to Quiz
                </button>

                {/* Hero Section */}
                <div style={{ 
                    background: 'linear-gradient(135deg, #1e63b5 0%, #1e3a8a 100%)', 
                    borderRadius: '24px', padding: '40px', color: 'white', 
                    marginBottom: '40px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' 
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <Trophy size={64} style={{ marginBottom: '16px', color: '#fbbf24' }} />
                        <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>Leaderboard</h1>
                        <p style={{ opacity: 0.9, fontSize: '18px' }}>{quizInfo?.title || 'Competitive Quiz'}</p>
                    </div>
                </div>

                {/* Top 3 Podiums */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '40px' }}>
                    {/* 2nd Place */}
                    {leaderboard[1] && (
                        <div style={{ alignSelf: 'flex-end', animation: 'fadeInUp 0.5s ease-out' }}>
                            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                <div style={{ position: 'relative', width: '60px', height: '60px', margin: '0 auto 12px' }}>
                                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Medal size={32} color="#94a3b8" />
                                    </div>
                                    <div style={{ position: 'absolute', bottom: -5, right: -5, background: '#94a3b8', color: 'white', width: '24px', height: '24px', borderRadius: '50%', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</div>
                                </div>
                                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>{leaderboard[1].name}</h3>
                                <p style={{ color: '#1e63b5', fontWeight: '800', fontSize: '18px' }}>{leaderboard[1].points} pts</p>
                            </div>
                        </div>
                    )}

                    {/* 1st Place */}
                    {leaderboard[0] && (
                        <div style={{ animation: 'fadeInUp 0.8s ease-out' }}>
                            <div style={{ 
                                background: 'white', borderRadius: '24px', padding: '32px 24px', 
                                textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                                border: '2px solid #fbbf24', transform: 'scale(1.1)' 
                            }}>
                                <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 16px' }}>
                                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Crown size={48} color="#d97706" />
                                    </div>
                                    <div style={{ position: 'absolute', bottom: -5, right: -5, background: '#f59e0b', color: 'white', width: '28px', height: '28px', borderRadius: '50%', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</div>
                                </div>
                                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', marginBottom: '4px' }}>{leaderboard[0].name}</h3>
                                <p style={{ color: '#d97706', fontWeight: '900', fontSize: '24px' }}>{leaderboard[0].points} pts</p>
                            </div>
                        </div>
                    )}

                    {/* 3rd Place */}
                    {leaderboard[2] && (
                        <div style={{ alignSelf: 'flex-end', animation: 'fadeInUp 1.1s ease-out' }}>
                            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                <div style={{ position: 'relative', width: '60px', height: '60px', margin: '0 auto 12px' }}>
                                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Star size={32} color="#f97316" />
                                    </div>
                                    <div style={{ position: 'absolute', bottom: -5, right: -5, background: '#f97316', color: 'white', width: '24px', height: '24px', borderRadius: '50%', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</div>
                                </div>
                                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>{leaderboard[2].name}</h3>
                                <p style={{ color: '#ea580c', fontWeight: '800', fontSize: '18px' }}>{leaderboard[2].points} pts</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Table for All Rankings */}
                <div style={{ background: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Rank</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Student</th>
                                <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Score</th>
                                <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '13px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaderboard.map((user, idx) => (
                                <tr key={user.email} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} className="hover:bg-slate-50">
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ 
                                            width: '32px', height: '32px', borderRadius: '50%', 
                                            background: idx < 3 ? 'transparent' : '#f1f5f9', 
                                            color: idx < 3 ? '#1e293b' : '#64748b',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: '700', fontSize: '14px'
                                        }}>
                                            #{idx + 1}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{user.name}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>{user.email.split('@')[0]}***</div>
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', color: '#16a34a', padding: '4px 12px', borderRadius: '12px', fontWeight: '700', fontSize: '13px' }}>
                                            {user.score} / {quizInfo?.questions?.length || '?' }
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: '800', color: '#1e63b5', fontSize: '16px' }}>
                                        {user.points}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default StudentLeaderboard;
