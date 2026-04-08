import React, { useState, useEffect } from 'react';

const PreviousQuizzes = ({ quizzes = [] }) => {
  const [previousQuizzes, setPreviousQuizzes] = useState([]);

  useEffect(() => {
    // Filter only completed quizzes
    const filtered = quizzes.filter(quiz => quiz.status === 'completed');
    setPreviousQuizzes(filtered);
  }, [quizzes]);

  const getScoreColor = (score, totalMarks) => {
    const percentage = (score / totalMarks) * 100;
    if (percentage >= 80) return 'score-excellent';
    if (percentage >= 60) return 'score-good';
    if (percentage >= 40) return 'score-average';
    return 'score-poor';
  };

  const handleViewReview = (quizId) => {
    console.log(`Viewing review for quiz: ${quizId}`);
    // Navigate to review page
  };

  const handleDownloadCertificate = (quizId) => {
    console.log(`Downloading certificate for quiz: ${quizId}`);
    // Download certificate
  };

  return (
    <div className="previous-quizzes-section">
      <div className="section-header">
        <h2 className="section-title">
          <span className="ieee-icon">◆</span> PREVIOUS QUIZZES & SCORES
        </h2>
      </div>

      {previousQuizzes && previousQuizzes.length > 0 ? (
        <div className="previous-quizzes-table">
          <table className="quizzes-table">
            <thead>
              <tr>
                <th>Quiz Title</th>
                <th>Completion Date</th>
                <th>Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {previousQuizzes.map((quiz) => (
                <tr key={quiz.id}>
                  <td className="quiz-name">{quiz.title}</td>
                  <td className="completion-date">{quiz.completionDate}</td>
                  <td className={`quiz-score ${getScoreColor(quiz.score, quiz.totalMarks)}`}>
                    <div className="score-bar-container">
                      <div className="score-value">{quiz.score}/{quiz.totalMarks}</div>
                      <div className="score-bar">
                        <div 
                          className="score-bar-fill"
                          style={{ width: `${(quiz.score / quiz.totalMarks) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="quiz-actions">
                    <button 
                      className="action-link view-review"
                      onClick={() => handleViewReview(quiz.id)}
                    >
                      VIEW REVIEW
                    </button>
                    <button 
                      className="action-link download-cert"
                      onClick={() => handleDownloadCertificate(quiz.id)}
                    >
                      DOWNLOAD CERTIFICATE
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="no-quizzes">
          <p>You haven't completed any quizzes yet. Join a live quiz to get started!</p>
        </div>
      )}
    </div>
  );
};

export default PreviousQuizzes;