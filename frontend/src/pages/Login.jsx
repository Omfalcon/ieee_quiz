import React, { useState, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useContext(AuthContext);
    const location = useLocation();

    const queryParams = new URLSearchParams(location.search);
    const authError = queryParams.get('error');
    const redirect = queryParams.get('redirect');      // e.g. /student/quiz/abc
    const justVerified = queryParams.get('success') === 'verified';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await api.post('/auth/login', { email, password });
            login(res.data.access_token);
            if (res.data.role === 'admin') {
                navigate('/admin/dashboard');
            } else if (redirect) {
                navigate(redirect);
            } else {
                navigate('/student/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid login credentials');
        }
    };

    const handleGoogleLogin = () => {
        const redirectParam = redirect ? `?redirect=${encodeURIComponent(redirect)}` : '';
        window.location.href = `http://localhost:8000/auth/google${redirectParam}`;
    };

    return (
        <div className="auth-container">
            <div className="header-logo">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/IEEE_logo.svg/1200px-IEEE_logo.svg.png"
                    alt="IEEE Logo" width="150" style={{ filter: 'brightness(0) invert(1)' }} />
                <h1>IEEE UPES QuizHub</h1>
            </div>

            <div className="auth-card">
                <h2 className="auth-title">Sign in</h2>

                {justVerified && (
                    <div style={{
                        background: '#F0FDF4', border: '1px solid #86EFAC',
                        color: '#166534', borderRadius: '8px',
                        padding: '10px 14px', marginBottom: '1rem',
                        fontSize: '14px'
                    }}>
                        ✅ Email verified! Please log in to continue.
                    </div>
                )}

                {authError === 'oauth_failed' && (
                    <div className="error-message" style={{ marginBottom: '1rem', textAlign: 'center' }}>
                        Google login failed. Please try again or use email.
                    </div>
                )}

                <button
                    type="button"
                    className="btn"
                    onClick={handleGoogleLogin}
                    style={{ backgroundColor: 'white', color: '#757575', border: '1px solid #ddd', marginBottom: '1rem' }}
                >
                    <img src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg" alt="G" style={{ width: '20px', height: '20px' }} />
                    Sign in with Google
                </button>

                <div className="divider">or</div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email</label>
                        <div className="input-wrapper">
                            <span className="input-icon">✉️</span>
                            <input
                                type="email"
                                className="form-control"
                                placeholder="Email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <div className="input-wrapper">
                            <span className="input-icon">🔑</span>
                            <input
                                type="password"
                                className="form-control"
                                placeholder="Password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

                    <button type="submit" className="btn btn-primary">Sign in</button>

                    <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
                        Don't have an account? <Link to={redirect ? `/signup?redirect=${redirect}` : '/signup'}>Sign Up</Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
