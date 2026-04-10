import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Login from './pages/Login';
import StudentSignup from './pages/StudentSignup';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import GoogleCallback from './components/GoogleCallback';

import ManageQuizzes from './pages/ManageQuizzes';
import UserManagement from './pages/UserManagement';
import LiveSessions from './pages/LiveSessions';
import StudentQuizIntro from './pages/StudentQuizIntro';
import StudentQuizPlay from './pages/StudentQuizPlay';
import StudentLeaderboard from './pages/StudentLeaderboard';
import EventLeaderboard from './pages/EventLeaderboard';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

            <Route path="/admin/manage-quizzes" element={<ProtectedRoute roleRequired="admin"><ManageQuizzes /></ProtectedRoute>} />
            <Route path="/admin/manage-quizzes/edit/:id" element={<ProtectedRoute roleRequired="admin"><ManageQuizzes /></ProtectedRoute>} />
            <Route path="/admin/manage-quizzes/view/:id" element={<ProtectedRoute roleRequired="admin"><ManageQuizzes /></ProtectedRoute>} />

            <Route path="/admin/manage-quizzes/create" element={<ProtectedRoute roleRequired="admin"><ManageQuizzes /></ProtectedRoute>} />
            
            <Route path="/admin/users" element={<ProtectedRoute roleRequired="admin"><UserManagement /></ProtectedRoute>} />
            <Route path="/admin/live-sessions" element={<ProtectedRoute roleRequired="admin"><LiveSessions /></ProtectedRoute>} />
            <Route path="/admin/leaderboard/:id" element={<ProtectedRoute roleRequired="admin"><EventLeaderboard /></ProtectedRoute>} />

          <Route path="/" element={<Navigate to="/login" replace />} />
          
          <Route path="/student/quiz/:id" element={<StudentQuizIntro />} />
          <Route path="/student/quiz/:id/play" element={<ProtectedRoute><StudentQuizPlay /></ProtectedRoute>} />
          <Route path="/student/quiz/:id/leaderboard" element={<StudentLeaderboard />} />
          
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<StudentSignup />} />
          <Route path="/auth/callback" element={<GoogleCallback />} />
          
          <Route 
            path="/student/dashboard" 
            element={
                <ProtectedRoute roleRequired="student"><StudentDashboard /></ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/dashboard"
            element={<ProtectedRoute roleRequired="admin"><AdminDashboard /></ProtectedRoute>}
          />
          
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
