import React from 'react';

const QuizCard = ({ 
  title, 
  type = "quiz", 
  duration, 
  timeRemaining, 
  status = "LIVE", 
  onAction, 
  actionLabel = "JOIN NOW"
}) => {
  return (
    <div className="quiz-card">
      {/* Light gray header area */}
      <div className="quiz-card-header">
        <h3 className="quiz-title">{title}</h3>
        {status === "LIVE" && <span className="status-badge-live">LIVE</span>}
      </div>
      
      <div className="quiz-card-body">
        <div className="quiz-info-row">
          <span className="info-icon">📝</span> 
          <span className="info-label">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
        </div>

        <div className="quiz-info-row">
          <span className="info-icon">⏱️</span>
          <span className="info-label">{duration}</span>
        </div>

        <div className="time-remaining-text">
          Time remaining: {timeRemaining}
        </div>
      </div>

      <div className="quiz-card-footer">
        <button 
          className="join-now-btn" 
          onClick={onAction}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
};

export default QuizCard;