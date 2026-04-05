import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const AdminDashboard = () => {
    const { user, logout } = useContext(AuthContext);

    return (
        <div style={{ backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
            <div className="dashboard-container">
                <header className="dashboard-header" style={{ borderLeft: '4px solid var(--error)' }}>
                    <div className="user-profile">
                        <div className="avatar" style={{ backgroundColor: 'var(--error)' }}>A</div>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.2rem' }}>Admin Portal</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{user?.sub}</p>
                        </div>
                    </div>
                    <button className="btn btn-outline" style={{width: 'auto', padding: '0.5rem 1.5rem'}} onClick={logout}>
                        Logout
                    </button>
                </header>

                <div className="auth-card" style={{ maxWidth: '100%', padding: '3rem 2rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Admin Controls</h3>
                    <p style={{ color: 'var(--text-muted)' }}>This is the admin dashboard where you can manage students and create quizzes. (Work in progress)</p>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
