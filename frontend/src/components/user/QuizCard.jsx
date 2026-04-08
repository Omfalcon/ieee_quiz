import React from 'react';

const QuizCard = ({ 
  title, 
  type = "quiz", 
  duration, 
  timeRemaining, 
  status = "LIVE", 
  onAction, 
  actionLabel = "JOIN NOW",
  score,
  totalMarks
}) => {
  const getStatusClass = () => {
    switch(status) {
      case "LIVE": return "status-live";
      case "upcoming": return "status-upcoming";
      case "completed": return "status-completed";
      default: return "";
    }
  };

  const getTypeIcon = () => {
    switch(type) {
      case "quiz": return "📝";
      case "test": return "✓";
      default: return "📋";
    }
  };

  return (
    <div className="quiz-card">
      <div className="quiz-card-header">
        <h3 className="quiz-title">{title}</h3>
        {status === "LIVE" && <span className={`status-badge ${getStatusClass()}`}>🔴 {status}</span>}
      </div>
      
      <div className="quiz-card-body">
        <div className="quiz-meta">
          <span className="quiz-type">
            <span className="type-icon">{getTypeIcon()}</span>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </span>
        </div>

        {status === "completed" && score !== undefined ? (
          <div className="quiz-score">
            <span className="score-display">{score}/{totalMarks}</span>
          </div>
        ) : (
          <div className="quiz-info">
            {duration && <span className="quiz-duration">⏱️ {duration}</span>}
            {timeRemaining && <span className="time-remaining">Time remaining: {timeRemaining}</span>}
          </div>
        )}
      </div>

      <div className="quiz-card-footer">
        <button 
          className="action-btn" 
          onClick={onAction}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
};

export default QuizCard;