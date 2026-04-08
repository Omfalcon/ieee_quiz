import React, { useState, useEffect } from 'react';
import QuizCard from './QuizCard';

const UpcomingQuizzes = ({ quizzes = [] }) => {
  const [upcomingQuizzes, setUpcomingQuizzes] = useState([]);

  useEffect(() => {
    // Filter only upcoming quizzes
    const filtered = quizzes.filter(quiz => quiz.status === 'upcoming');
    setUpcomingQuizzes(filtered);
  }, [quizzes]);

  const handleRegisterQuiz = (quizId, quizTitle) => {
    console.log(`Registered for quiz: ${quizId} - ${quizTitle}`);
    // Handle registration logic
  };

  return (
    <div className="upcoming-quizzes-section">
      <div className="section-header">
        <h2 className="section-title">
          <span className="ieee-icon">◆</span> UPCOMING QUIZZES
        </h2>
      </div>
      
      {upcomingQuizzes && upcomingQuizzes.length > 0 ? (
        <div className="upcoming-quizzes-table">
          <table className="quizzes-table">
            <thead>
              <tr>
                <th>Quiz Title</th>
                <th>Date/Time</th>
                <th>Duration</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {upcomingQuizzes.map((quiz) => (
                <tr key={quiz.id}>
                  <td className="quiz-name">{quiz.title}</td>
                  <td className="quiz-datetime">{quiz.scheduledDate} {quiz.scheduledTime}</td>
                  <td className="quiz-duration">{quiz.duration}</td>
                  <td className="quiz-action">
                    <button 
                      className="register-btn"
                      onClick={() => handleRegisterQuiz(quiz.id, quiz.title)}
                    >
                      REGISTER
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="no-quizzes">
          <p>No upcoming quizzes scheduled.</p>
        </div>
      )}
    </div>
  );
};

export default UpcomingQuizzes;