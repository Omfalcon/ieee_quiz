import React, { useState, useEffect } from 'react';
import StudentHeader from './StudentHeader';
import LiveQuizzes from './LiveQuizzes';
import UpcomingQuizzes from './UpcomingQuizzes';
import PreviousQuizzes from './PreviousQuizzes';
import '../styles/StudentDashboard.css';
 
const StudentDashboard = () => {
  const [userData, setUserData] = useState({
    name: '[USER NAME]',
    totalQuizzes: 25,
    averageScore: 85
  });
 
  const [quizzes, setQuizzes] = useState([
    // Example live quizzes
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
    // Example upcoming quizzes
    {
      id: 3,
      title: 'Quiz Title Scheduling 1',
      status: 'upcoming',
      scheduledDate: 'Oct 28, 10',
      scheduledTime: 'AM GMT',
      duration: '30 min'
    },
    {
      id: 4,
      title: 'Quiz Title Scheduling 2',
      status: 'upcoming',
      scheduledDate: 'Oct 28, 10',
      scheduledTime: 'AM GMT',
      duration: '30 min'
    },
    {
      id: 5,
      title: 'Quiz Title Scheduling 3',
      status: 'upcoming',
      scheduledDate: 'Oct 28, 10',
      scheduledTime: 'AM GMT',
      duration: '30 min'
    },
    // Example completed quizzes
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
    <div className="student-dashboard">
      <StudentHeader 
        userName={userData.name}
        totalQuizzes={userData.totalQuizzes}
        averageScore={userData.averageScore}
      />
      
      <div className="dashboard-content">
        <div className="content-section">
          <LiveQuizzes quizzes={quizzes} />
        </div>
 
        <div className="content-section">
          <UpcomingQuizzes quizzes={quizzes} />
        </div>
 
        <div className="content-section">
          <PreviousQuizzes quizzes={quizzes} />
        </div>
      </div>
    </div>
  );
};
 
export default StudentDashboard;