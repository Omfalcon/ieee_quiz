import React from 'react';
 
const StudentHeader = ({ userName = "[USER NAME]", totalQuizzes = 25, averageScore = 85 }) => {
  return (
    <div className="student-header">
      <div className="header-content">
        <h1 className="welcome-title">WELCOME BACK, {userName.toUpperCase()}</h1>
        <div className="stats-summary">
          <span className="stat-item">Total Quizzes Taken: {totalQuizzes}</span>
          <span className="stat-divider">|</span>
          <span className="stat-item">Average Score: {averageScore}%</span>
        </div>
      </div>
    </div>
  );
};
 
export default StudentHeader;
 