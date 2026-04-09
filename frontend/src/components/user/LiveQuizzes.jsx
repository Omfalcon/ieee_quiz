import React from 'react';
import QuizCard from './QuizCard';

const LiveQuizzes = ({ quizzes = [] }) => {
  const liveQuizzes = quizzes.filter(quiz => quiz.status === 'LIVE');

  return (
    <div className="live-quizzes-container">
      {liveQuizzes && liveQuizzes.length > 0 ? (
        <div className="quizzes-grid">
          {liveQuizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              title={quiz.title}
              type={quiz.type || "quiz"}
              duration={quiz.duration}
              timeRemaining={quiz.timeRemaining}
              status="LIVE"
              actionLabel="JOIN NOW"
              onAction={() => {
                console.log(`Joining quiz: ${quiz.id} - ${quiz.title}`);
                // Navigate to quiz or open quiz interface
                // window.location.href = `/quiz/${quiz.id}`;
              }}
            />
          ))}
        </div>
      ) : (
        <div className="no-quizzes">
          <p>No live quizzes at the moment. Check back soon!</p>
        </div>
      )}
    </div>
  );
};

export default LiveQuizzes;