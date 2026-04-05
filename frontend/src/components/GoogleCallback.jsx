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
            login(token);
            try {
                const decoded = jwtDecode(token);
                if (decoded.role === 'admin') {
                    navigate('/admin/dashboard', { replace: true });
                } else {
                    navigate('/student/dashboard', { replace: true });
                }
            } catch (err) {
                navigate('/login?error=auth_failed', { replace: true });
            }
        } else {
            navigate('/login?error=auth_failed', { replace: true });
        }
    }, [location, login, navigate]);

    return (
        <div className="auth-container">
            <h2 style={{ color: 'white' }}>Processing Authentication...</h2>
        </div>
    );
};

export default GoogleCallback;
