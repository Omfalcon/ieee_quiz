import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Login from './pages/Login';
import StudentSignup from './pages/StudentSignup';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import GoogleCallback from './components/GoogleCallback';

import ManageQuizzes from './pages/ManageQuizzes';
import StudentQuizIntro from './pages/StudentQuizIntro';
import StudentQuizPlay from './pages/StudentQuizPlay';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

            <Route path="/admin/manage-quizzes" element={<ManageQuizzes />} />
            <Route path="/admin/manage-quizzes/edit/:id" element={<ManageQuizzes />} />
            <Route path="/admin/manage-quizzes/view/:id" element={<ManageQuizzes />} />

            <Route path="/admin/manage-quizzes/create" element={<ManageQuizzes />} />

          <Route path="/" element={<Navigate to="/login" replace />} />
          
          <Route path="/student/quiz/:id" element={<StudentQuizIntro />} />
          <Route path="/student/quiz/:id/play" element={<StudentQuizPlay />} />
          
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<StudentSignup />} />
          <Route path="/auth/callback" element={<GoogleCallback />} />
          
          <Route 
            path="/student/dashboard" 
            element={
                <StudentDashboard />
            }
          />
          
          <Route
            path="/admin/dashboard"
            element={<AdminDashboard />}
          />
          
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
