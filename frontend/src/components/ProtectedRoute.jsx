import React from 'react';
import { Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, roleRequired }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) {
        return <div style={{ color: 'white', padding: '2rem' }}>Loading...</div>;
    }

    if (!user) {
        // Not logged in, redirect to main landing page which has options 
        return <Navigate to="/login" replace />;
    }

    if (roleRequired && user.role !== roleRequired) {
        // Logged in but wrong role
        if (user.role === 'admin') {
            return <Navigate to="/admin/dashboard" replace />;
        } else {
            return <Navigate to="/student/dashboard" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
