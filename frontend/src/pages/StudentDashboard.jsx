import React, { useState, useEffect } from 'react';
import StudentHeader from '../components/user/StudentHeader';
import LiveQuizzes from '../components/user/LiveQuizzes';
import UpcomingQuizzes from '../components/user/UpcomingQuizzes';
import PreviousQuizzes from '../components/user/PreviousQuizzes';

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




// import React, { useContext } from 'react';
// import { AuthContext } from '../context/AuthContext';

// const StudentDashboard = () => {
//     const { user, logout } = useContext(AuthContext);

//     return (
//         <div style={{ backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
//             <div className="dashboard-container">
//                 <header className="dashboard-header">
//                     <div className="user-profile">
//                         {user?.picture ? (
//                             <img src={user.picture} alt="Profile" className="avatar" />
//                         ) : (
//                             <div className="avatar">{user?.name ? user.name.charAt(0).toUpperCase() : 'S'}</div>
//                         )}
//                         <div>
//                             <h2 style={{ fontSize: '1.25rem', marginBottom: '0.2rem' }}>Welcome, {user?.name || 'Student'}!</h2>
//                             <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{user?.sub}</p>
//                         </div>
//                     </div>
//                     <button className="btn btn-outline" style={{width: 'auto', padding: '0.5rem 1.5rem'}} onClick={logout}>
//                         Logout
//                     </button>
//                 </header>

//                 <div style={{ padding: '0 1rem' }}>
//                     <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>Student Dashboard</h2>
//                     <h3 style={{ marginBottom: '1.5rem', color: '#555' }}>Available Quizzes</h3>
                    
//                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        
//                         {/* Quiz Card 1 */}
//                         <div className="auth-card" style={{ padding: '1.5rem', margin: 0, maxWidth: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
//                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
//                                 <span style={{ backgroundColor: '#eef2ff', color: '#145FB6', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600' }}>Programming</span>
//                                 <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '500' }}>⏱️ 10 mins</span>
//                             </div>
//                             <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#222' }}>Python Fundamentals</h4>
//                             <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem', flexGrow: 1, lineHeight: '1.5' }}>
//                                 Test your basic knowledge of Python syntax, data types, and control flow mechanics.
//                             </p>
//                             <button className="btn btn-primary" style={{ padding: '0.6rem' }}>Start Quiz</button>
//                         </div>

//                         {/* Quiz Card 2 */}
//                         <div className="auth-card" style={{ padding: '1.5rem', margin: 0, maxWidth: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
//                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
//                                 <span style={{ backgroundColor: '#fff0f0', color: '#d32f2f', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600' }}>Algorithms</span>
//                                 <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '500' }}>⏱️ 30 mins</span>
//                             </div>
//                             <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#222' }}>Data Structures</h4>
//                             <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem', flexGrow: 1, lineHeight: '1.5' }}>
//                                 Advanced challenges focused on arrays, linked lists, Big O notation, and tree traversals.
//                             </p>
//                             <button className="btn btn-primary" style={{ padding: '0.6rem' }}>Start Quiz</button>
//                         </div>

//                         {/* Quiz Card 3 */}
//                         <div className="auth-card" style={{ padding: '1.5rem', margin: 0, maxWidth: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
//                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
//                                 <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600' }}>Web Dev</span>
//                                 <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '500' }}>⏱️ 15 mins</span>
//                             </div>
//                             <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#222' }}>React Architecture</h4>
//                             <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem', flexGrow: 1, lineHeight: '1.5' }}>
//                                 Challenge yourself on React hooks, contextual state management, and side-effects.
//                             </p>
//                             <button className="btn btn-primary" style={{ padding: '0.6rem' }}>Start Quiz</button>
//                         </div>

//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default StudentDashboard;
