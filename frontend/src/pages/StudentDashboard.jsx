import React, { useState, useEffect } from 'react';
import LiveQuizzes from '../components/user/LiveQuizzes';
import UpcomingQuizzes from '../components/user/UpcomingQuizzes';
import PreviousQuizzes from '../components/user/PreviousQuizzes';

import '../styles/StudentDashboard.css';

const StudentDashboard = () => {
  const [userData, setUserData] = useState({
    name: '[USER NAME]',
    totalQuizzes: 25,
    averageScore: 85
  });

  const [quizzes, setQuizzes] = useState([
    // Live Quizzes
    {
      id: 1,
      title: '5G Network Architecture',
      type: 'quiz',
      status: 'LIVE',
      duration: '30 min',
      timeRemaining: '15 min'
    },
    {
      id: 2,
      title: '5G Network Architecture',
      type: 'quiz',
      status: 'LIVE',
      duration: '30 min',
      timeRemaining: '20 min'
    },
    // Upcoming Quizzes
    {
      id: 3,
      title: 'Quiz Title Scheduling 1',
      status: 'upcoming',
      scheduledDate: 'Oct 28',
      scheduledTime: '10 AM GMT',
      duration: '30 min'
    },
    {
      id: 4,
      title: 'Quiz Title Scheduling 2',
      status: 'upcoming',
      scheduledDate: 'Oct 28',
      scheduledTime: '10 AM GMT',
      duration: '30 min'
    },
    {
      id: 5,
      title: 'Quiz Title Scheduling 3',
      status: 'upcoming',
      scheduledDate: 'Oct 28',
      scheduledTime: '10 AM GMT',
      duration: '30 min'
    },
    // Completed Quizzes
    {
      id: 6,
      title: 'Quiz Title 5G Network Architecture',
      status: 'completed',
      completionDate: 'Oct 28, 2021',
      score: 92,
      totalMarks: 100
    },
    {
      id: 7,
      title: 'Quiz Title 5G Retesting 2',
      status: 'completed',
      completionDate: 'Oct 28, 2021',
      score: 92,
      totalMarks: 100
    },
    {
      id: 8,
      title: 'Quiz Title 5G Retesting 3',
      status: 'completed',
      completionDate: 'Oct 28, 2021',
      score: 92,
      totalMarks: 100
    },
    {
      id: 9,
      title: 'Quiz Title 5G Converting 4',
      status: 'completed',
      completionDate: 'Oct 28, 2021',
      score: 92,
      totalMarks: 100
    },
    {
      id: 10,
      title: 'Quiz Title 5G Converting 5',
      status: 'completed',
      completionDate: 'Oct 28, 2021',
      score: 92,
      totalMarks: 100
    }
  ]);

  useEffect(() => {
    // Fetch user data and quizzes from backend
    // const fetchData = async () => {
    //   try {
    //     const response = await fetch('/api/student/dashboard');
    //     const data = await response.json();
    //     setUserData(data.userData);
    //     setQuizzes(data.quizzes);
    //   } catch (error) {
    //     console.error('Error fetching dashboard data:', error);
    //   }
    // };
    // fetchData();
  }, []);

  return (
    <div className="dashboard-container">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="ieee-blue-text">IEEE</span> QuizHub
        </div>
        <nav className="sidebar-nav">
          <div className="nav-item active">Dashboard</div>
          <div className="nav-item">My Profile</div>
          <div className="nav-item">Certificates</div>
          <div className="nav-item">Leaderboard</div>
          <div className="nav-item">Help</div>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        {/* Welcome Banner */}
        <header className="welcome-banner">
          <h1>WELCOME BACK, {userData.name}</h1>
          <div className="stats-row">
            <span>Total Quizzes Taken: {userData.totalQuizzes}</span>
            <span className="stats-separator">|</span>
            <span>Average Score: {userData.averageScore}%</span>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="dashboard-content-inner">
          {/* Top Grid: Live + Upcoming */}
          <div className="dashboard-top-grid">
            {/* LIVE QUIZZES SECTION */}
            <section className="dashboard-card">
              <div className="section-header">
                <h2 className="section-title">Live Quizzes Now</h2>
                <span className="ieee-brand-tag">IEEE</span>
              </div>
              <div className="card-body">
                <LiveQuizzes quizzes={quizzes.filter(q => q.status === 'LIVE')} />
              </div>
            </section>

            {/* UPCOMING QUIZZES SECTION */}
            <section className="dashboard-card">
              <div className="section-header">
                <h2 className="section-title">Upcoming Quizzes</h2>
                <span className="ieee-brand-tag">IEEE</span>
              </div>
              <div className="card-body">
                <UpcomingQuizzes quizzes={quizzes.filter(q => q.status === 'upcoming')} />
              </div>
            </section>
          </div>

          {/* PREVIOUS QUIZZES SECTION */}
          <section className="dashboard-card previous-section">
            <div className="section-header">
              <h2 className="section-title">Previous Quizzes & Scores</h2>
              <span className="ieee-brand-tag">IEEE</span>
            </div>
            <div className="card-body">
              <PreviousQuizzes quizzes={quizzes.filter(q => q.status === 'completed')} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;