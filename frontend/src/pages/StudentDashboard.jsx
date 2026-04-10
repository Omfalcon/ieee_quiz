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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All Disciplines');

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

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/quizzes');
        const data = await response.json();
        setQuizzes(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch quizzes:', error);
        // Fallback dummy data for visual testing if API fails
        setQuizzes([
          { id: 1, category: 'MACHINE LEARNING', title: 'Foundations of Neural Networks', description: 'A deep dive into multi-layer perceptrons and backpropagation mathematics.', start_time: '2026-10-28T10:00:00', duration: '30m', level: 'ADVANCED' },
          { id: 2, category: 'COMPUTER SCIENCE', title: 'Algorithmic Complexity', description: 'Master O-notation and analyze the efficiency of modern sorting algorithms.', start_time: '2026-10-28T11:30:00', duration: '45m', level: 'EXPERT' },
          { id: 3, category: 'ECONOMICS', title: 'Game Theory Fundamentals', description: 'Understanding strategic decision making and the Nash Equilibrium.', start_time: '2026-10-28T14:00:00', duration: '20m', level: 'BEGINNER' },
          { id: 4, category: 'ETHICS', title: 'Ethics in Bioengineering', description: 'Exploring the moral implications of CRISPR and genetic engineering.', start_time: '2026-10-28T16:15:00', duration: '35m', level: 'INTERMEDIATE' }
        ]);
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

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
          <div className="nav-item active">
            <LayoutDashboard size={18} />
            <span>Available Quizzes</span>
          </div>
          <div className="nav-item">
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
          {/* Hero Section */}
          <section className="hero-section">
            <div className="hero-text">
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
            <p>Loading assessments...</p>
          ) : (
            <div className="quiz-grid">
              {filteredQuizzes.length > 0 ? filteredQuizzes.map((quiz, idx) => (
                <div key={idx} className="quiz-card">
                  <div className="quiz-category">{quiz.category || 'GENERAL'}</div>
                  <h3 className="quiz-title">{quiz.title}</h3>
                  <p className="quiz-description">{quiz.description || "Challenge yourself with this academic assessment and earn recognition."}</p>

                  <div className="quiz-meta">
                    <span className="meta-item">
                      <Clock size={14} style={{ marginRight: '4px' }} />
                      {formatTime(quiz.start_time || quiz.startTime)}
                    </span>
                    <span className="meta-item">
                      <Timer size={14} style={{ marginRight: '4px' }} />
                      {quiz.duration || "30m"}
                    </span>
                    {quiz.level && <span className={`level-badge ${quiz.level.toLowerCase()}`}>{quiz.level}</span>}
                  </div>

                  <button className="join-btn" onClick={() => navigate(`/student/quiz/${quiz._id || quiz.id}`)}>Join Assessment</button>
                </div>
              )) : (
                <p className="no-quizzes">No quizzes available in this category.</p>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;