import React, { useState, useEffect } from 'react';
import QuizCard from './QuizCard';

const LiveQuizzes = ({ quizzes = [] }) => {
  const [liveQuizzes, setLiveQuizzes] = useState([]);

  useEffect(() => {
    // Filter only live quizzes
    const filtered = quizzes.filter(quiz => quiz.status === 'LIVE');
    setLiveQuizzes(filtered);
  }, [quizzes]);

  const handleJoinQuiz = (quizId, quizTitle) => {
    console.log(`Joining quiz: ${quizId} - ${quizTitle}`);
    // Navigate to quiz page or open quiz interface
    // window.location.href = `/quiz/${quizId}`;
  };

  return (
    <div className="live-quizzes-section">
      <div className="section-header">
        <h2 className="section-title">
          <span className="ieee-icon">◆</span> LIVE QUIZZES NOW
        </h2>
      </div>
      
      <div className="quizzes-grid">
        {liveQuizzes && liveQuizzes.length > 0 ? (
          liveQuizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              title={quiz.title}
              type={quiz.type || "quiz"}
              duration={quiz.duration}
              timeRemaining={quiz.timeRemaining}
              status="LIVE"
              actionLabel="JOIN NOW"
              onAction={() => handleJoinQuiz(quiz.id, quiz.title)}
            />
          ))
        ) : (
          <div className="no-quizzes">
            <p>No live quizzes at the moment. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveQuizzes;