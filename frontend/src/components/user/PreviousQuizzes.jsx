import React from 'react';

const PreviousQuizzes = ({ quizzes = [] }) => {
  const previousQuizzes = quizzes.filter(quiz => quiz.status === 'completed');

  const handleViewReview = (quizId, quizTitle) => {
    console.log(`Viewing review for: ${quizId} - ${quizTitle}`);
    // Navigate to review page
    // window.location.href = `/quiz/${quizId}/review`;
  };

  const handleDownloadCertificate = (quizId, quizTitle) => {
    console.log(`Downloading certificate for: ${quizId} - ${quizTitle}`);
    // Trigger certificate download
    // window.location.href = `/api/certificate/${quizId}/download`;
  };

  return (
    <div className="previous-quizzes-container">
      {previousQuizzes && previousQuizzes.length > 0 ? (
        <div className="table-responsive">
          <table className="ieee-table">
            <thead>
              <tr>
                <th>QUIZ TITLE</th>
                <th>COMPLETION DATE</th>
                <th>SCORE</th>
                <th className="text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {previousQuizzes.map((quiz) => (
                <tr key={quiz.id}>
                  <td className="quiz-title-cell">{quiz.title}</td>
                  <td className="quiz-info-cell">{quiz.completionDate}</td>
                  <td className="score-cell">
                    <div className="score-flex-wrapper">
                      <span className="score-text">{quiz.score}/{quiz.totalMarks}</span>
                      <div className="score-progress-bg">
                        <div 
                          className="score-progress-fill" 
                          style={{ 
                            width: `${(quiz.score / quiz.totalMarks) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="quiz-actions-cell">
                    <div className="quiz-actions">
                      <button 
                        className="action-link"
                        onClick={() => handleViewReview(quiz.id, quiz.title)}
                      >
                        View Review
                      </button>
                      <button 
                        className="action-link download-cert"
                        onClick={() => handleDownloadCertificate(quiz.id, quiz.title)}
                      >
                        Download Certificate
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="no-quizzes">
          <p>You haven't completed any quizzes yet.</p>
        </div>
      )}
    </div>
  );
};

export default PreviousQuizzes;