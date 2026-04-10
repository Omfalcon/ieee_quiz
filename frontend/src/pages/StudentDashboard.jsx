import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  History, 
  Award, 
  Settings, 
  Clock, 
  Timer 
} from 'lucide-react';
import '../styles/StudentDashboard.css';
import { AuthContext } from '../context/AuthContext';

const StudentDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All Disciplines');
  const [activeNavItem, setActiveNavItem] = useState('available'); // 'available' or 'attempts'

  // Review states
  const [selectedReview, setSelectedReview] = useState(null);
  const [loadingReview, setLoadingReview] = useState(false);

  const dynamicTabs = ['All Disciplines', ...new Set(quizzes.map(q => q.category).filter(Boolean))];

  const filteredQuizzes = quizzes.filter(q => 
    activeTab === 'All Disciplines' || q.category === activeTab
  );

  const formatTime = (timeStr) => {
    if (!timeStr) return "N/A";
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeStr;
    }
  };

  const fetchAttempts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://127.0.0.1:8000/auth/student/attempts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setAttempts(data);
    } catch (error) {
      console.error('Failed to fetch attempts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchReview = async (quizId) => {
    setLoadingReview(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://127.0.0.1:8000/auth/student/attempts/${quizId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setSelectedReview(data);
    } catch (error) {
      console.error('Failed to fetch review:', error);
      alert("Failed to load review details.");
    } finally {
      setLoadingReview(false);
    }
  };

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/quizzes');
        const data = await response.json();
        setQuizzes(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch quizzes:', error);
        setLoading(false);
      }
    };

    if (activeNavItem === 'available') {
      fetchQuizzes();
    } else if (activeNavItem === 'attempts') {
      fetchAttempts();
    }
  }, [activeNavItem]);

  return (
    <div className="dashboard-container">
      {/* 🔵 TOP NAVBAR - Full Width */}
      <header className="top-header">
        <div className="brand-title">IEEE Quiz Hub</div>
        <div className="header-right">
          <div className="header-user-info">
            <span style={{ fontSize: '14px', fontWeight: '500' }}>{user?.name || 'Student'}</span>
            <div className="profile-circle">{user?.name ? user.name.charAt(0).toUpperCase() : 'S'}</div>
          </div>
        </div>
      </header>

      {/* ⚪ LAYOUT BODY (Sidebar + Main) */}
      <div className="layout-body">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div 
            className={`nav-item ${activeNavItem === 'available' ? 'active' : ''}`}
            onClick={() => setActiveNavItem('available')}
          >
            <LayoutDashboard size={18} />
            <span>Available Quizzes</span>
          </div>
          <div 
            className={`nav-item ${activeNavItem === 'attempts' ? 'active' : ''}`}
            onClick={() => setActiveNavItem('attempts')}
          >
            <History size={18} />
            <span>Recent Attempts</span>
          </div>
          <div className="nav-item">
            <Award size={18} />
            <span>Certificates</span>
          </div>
          <div className="nav-item">
            <Settings size={18} />
            <span>Settings</span>
          </div>
        </aside>

        {/* MAIN CONTENT Area */}
        <main className="main-content">
          {activeNavItem === 'available' ? (
            <>
              {/* Hero Section */}
              <section className="hero-section">
                <div className="hero-content">
                  <h1>Knowledge Treasury</h1>
                  <p>Browse and enroll in high-caliber academic assessments.</p>
                </div>
              </section>

              {/* Filter Tabs */}
              <div className="filter-tabs">
                {dynamicTabs.map(tab => (
                  <button
                    key={tab}
                    className={`filter-tab ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Quiz Grid */}
              {loading ? (
                <div className="loading-state">Loading assessments...</div>
              ) : (
                <div className="quiz-grid">
                  {filteredQuizzes.length > 0 ? filteredQuizzes.map((quiz, idx) => (
                    <div key={idx} className="quiz-card">
                      <div className="quiz-category">{quiz.category || 'GENERAL'}</div>
                      <h3 className="quiz-title">{quiz.title}</h3>
                      <p className="quiz-description">{quiz.description || "Challenge yourself with this academic assessment."}</p>

                      <div className="quiz-meta">
                        <span className="meta-item">
                          <Clock size={14} style={{ marginRight: '4px' }} />
                          {formatTime(quiz.start_time)}
                        </span>
                        <span className="meta-item">
                          <Timer size={14} style={{ marginRight: '4px' }} />
                          {quiz.duration || "30m"}
                        </span>
                      </div>
                      <button className="join-btn" onClick={() => navigate(`/student/quiz/${quiz._id}`)}>Join Assessment</button>
                    </div>
                  )) : (
                    <p className="no-quizzes">No quizzes available in this category.</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Recent Attempts View */}
              <section className="hero-section" style={{ padding: '30px', minHeight: 'auto', marginBottom: '30px' }}>
                <div className="hero-content">
                  <h1>Your Performance History</h1>
                  <p>Review your past assessments and learn from your mistakes.</p>
                </div>
              </section>

              {loading ? (
                <div className="loading-state">Loading history...</div>
              ) : (
                <div className="attempts-list">
                  {attempts.length > 0 ? (
                    <div style={{ display: 'grid', gap: '15px' }}>
                      {attempts.map((att, idx) => (
                        <div key={idx} className="attempt-card" style={{ 
                          background: 'white', padding: '20px', borderRadius: '12px',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0'
                        }}>
                          <div>
                            <span style={{ fontSize: '11px', color: '#1e63b5', fontWeight: 'bold', textTransform: 'uppercase' }}>{att.category}</span>
                            <h3 style={{ margin: '5px 0', fontSize: '18px' }}>{att.title}</h3>
                            <div style={{ fontSize: '13px', color: '#666', display: 'flex', gap: '15px' }}>
                              <span>Completed: {new Date(att.end_time).toLocaleDateString()}</span>
                              <span>Time: {Math.floor(att.time_taken / 60)}m {att.time_taken % 60}s</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '24px', fontWeight: 'bold', color: att.percentage >= 70 ? '#16a34a' : '#dc2626' }}>{att.percentage}%</div>
                              <div style={{ fontSize: '12px', color: '#999' }}>{att.score}/{att.total_questions} Points</div>
                            </div>
                            <button 
                              className="view-btn" 
                              onClick={() => handleFetchReview(att.quiz_id)}
                              style={{
                                background: '#1e63b5', color: 'white', border: 'none',
                                padding: '10px 20px', borderRadius: '8px', cursor: 'pointer',
                                fontWeight: '600', transition: 'all 0.2s'
                              }}
                            >
                              Review Questions
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px' }}>
                      <History size={48} color="#ddd" style={{ marginBottom: '15px' }} />
                      <h3>No Attempts Yet</h3>
                      <p>Completed assessments will appear here for review.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ─── REVIEW MODAL ─── */}
      {selectedReview && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center',
          alignItems: 'center', zIndex: 2000, padding: '20px'
        }}>
          <div className="review-modal" style={{
            background: '#f8fafc', width: '100%', maxWidth: '900px', height: '90vh',
            borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <div style={{ padding: '25px', background: '#1e63b5', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0 }}>{selectedReview.title} - Review</h2>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>Individual breakdown of your selections</div>
              </div>
              <button 
                onClick={() => setSelectedReview(null)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold' }}
              >✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '30px' }}>
              <div style={{ display: 'grid', gap: '25px' }}>
                {selectedReview.review.map((item, qIdx) => (
                  <div key={qIdx} style={{ 
                    background: 'white', padding: '25px', borderRadius: '12px',
                    border: '1px solid', borderColor: item.is_correct ? '#bcf0da' : '#fecaca',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#1e63b5' }}>Question {qIdx + 1}</span>
                      <span style={{ 
                        padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                        background: item.is_correct ? '#dcfce7' : '#fee2e2',
                        color: item.is_correct ? '#166534' : '#991b1b'
                      }}>
                        {item.is_correct ? 'CORRECT' : 'INCORRECT'}
                      </span>
                    </div>
                    <p style={{ fontSize: '17px', margin: '0 0 20px 0', fontWeight: '500', color: '#1f2937' }}>{item.question}</p>
                    
                    <div style={{ display: 'grid', gap: '10px' }}>
                      <div style={{ padding: '12px 15px', borderRadius: '8px', border: '1px solid #eee', background: item.is_correct ? '#f0fdf4' : '#fef2f2' }}>
                        <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Selection:</div>
                        <div style={{ fontWeight: '600', color: item.is_correct ? '#166534' : '#991b1b' }}>{item.selected_option}</div>
                      </div>

                      {!item.is_correct && (
                        <div style={{ padding: '12px 15px', borderRadius: '8px', border: '1px solid #eee', background: '#f8fafc' }}>
                          <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Correct Answer:</div>
                          <div style={{ fontWeight: '600', color: '#1e63b5' }}>{item.correct_answer}</div>
                        </div>
                      )}
                    </div>

                    {item.explanation && (
                      <div style={{ marginTop: '15px', padding: '15px', background: '#eff6ff', borderRadius: '8px', fontSize: '14px', color: '#1e40af' }}>
                        <span style={{ fontWeight: 'bold' }}>Explanation:</span> {item.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;