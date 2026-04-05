import React, { useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { jwtDecode } from 'jwt-decode';

const GoogleCallback = () => {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const token = queryParams.get('token');

        if (token) {
            // Store the token first
            localStorage.setItem('token', token);
            try {
                const decoded = jwtDecode(token);
                // Use window.location.replace for a full page reload so
                // AuthContext re-initializes from localStorage cleanly
                if (decoded.role === 'admin') {
                    window.location.replace('/admin/dashboard');
                } else {
                    window.location.replace('/student/dashboard');
                }
            } catch (err) {
                window.location.replace('/login?error=auth_failed');
            }
        } else {
            window.location.replace('/login?error=auth_failed');
        }
    }, []);

    return (
        <div className="auth-container">
            <h2 style={{ color: 'white' }}>Processing Authentication...</h2>
        </div>
    );
};

export default GoogleCallback;
