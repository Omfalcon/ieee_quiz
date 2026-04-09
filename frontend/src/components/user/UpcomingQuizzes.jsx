import React from 'react';

const UpcomingQuizzes = ({ quizzes = [] }) => {
  const upcomingQuizzes = quizzes.filter(quiz => quiz.status === 'upcoming');

  const handleRegister = (quizId, quizTitle) => {
    console.log(`Registering for quiz: ${quizId} - ${quizTitle}`);
    // Call API to register for quiz
    // window.location.href = `/quiz/${quizId}/register`;
  };

  return (
    <div className="upcoming-quizzes-container">
      {upcomingQuizzes && upcomingQuizzes.length > 0 ? (
        <div className="table-responsive">
          <table className="ieee-table">
            <thead>
              <tr>
                <th>QUIZ TITLE</th>
                <th>DATE/TIME</th>
                <th>DURATION</th>
                <th className="text-center">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {upcomingQuizzes.map((quiz) => (
                <tr key={quiz.id}>
                  <td className="quiz-title-cell">{quiz.title}</td>
                  <td className="quiz-info-cell">
                    {quiz.scheduledDate}, {quiz.scheduledTime}
                  </td>
                  <td className="quiz-info-cell">{quiz.duration}</td>
                  <td className="text-center">
                    <button 
                      className="register-btn-small"
                      onClick={() => handleRegister(quiz.id, quiz.title)}
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