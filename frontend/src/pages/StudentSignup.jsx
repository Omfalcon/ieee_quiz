import React, { useState, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../context/AuthContext';

const StudentSignup = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    // OTP State
    const [step, setStep] = useState(1); // 1 = Registration, 2 = OTP Verification
    const [otp, setOtp] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useContext(AuthContext);

    // Preserve redirect param so after login the user lands on the right page
    const queryParams = new URLSearchParams(location.search);
    const redirect = queryParams.get('redirect'); // e.g. /student/quiz/abc

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        try {
            const res = await api.post('/auth/student/signup', { name, email, password });
            setSuccessMsg(res.data.message);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.detail || 'Signup failed');
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        
        if (loading) return; // Prevent double submit
        setLoading(true);
        setError('');
        
        try {
            const res = await api.post('/auth/student/verify-otp', {
                email: email.trim().toLowerCase(),
                otp: otp.trim()
            });
            console.log("SUCCESS RESPONSE:", res.data);

            if (!res.data.access_token) {
                throw new Error("No token received from backend");
            }

            // Auto login after verification
            login(res.data.access_token);
            
            if (redirect) {
                window.location.replace(redirect);
            } else {
                window.location.replace('/student/dashboard');
            }
        } catch (err) {
            console.log("FULL ERROR:", err);
            console.log("ERROR RESPONSE:", err.response);
            console.log("ERROR MESSAGE:", err.message);
            
            const errorMsg = err.response?.data?.detail || err.message || 'Verification failed';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="header-logo">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/IEEE_logo.svg/1200px-IEEE_logo.svg.png"
                    alt="IEEE Logo" width="150" style={{ filter: 'brightness(0) invert(1)' }} />
                <h1>IEEE UPES QuizHub</h1>
            </div>

            <div className="auth-card">
                <h2 className="auth-title">Sign up</h2>

                {step === 1 ? (
                    <>
                        <button
                            type="button"
                            className="btn"
                            onClick={() => {
                                const redirectParam = redirect ? `?redirect=${encodeURIComponent(redirect)}` : '';
                                window.location.href = `http://localhost:8000/auth/google${redirectParam}`;
                            }}
                            style={{ backgroundColor: 'white', color: '#757575', border: '1px solid #ddd', marginBottom: '1rem' }}
                        >
                            <img src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg" alt="G" style={{ width: '20px', height: '20px' }} />
                            Sign up with Google
                        </button>

                        <div className="divider">or continue with email</div>

                        <form onSubmit={handleSignup}>
                            <div className="form-group">
                                <label>Full Name</label>
                                <div className="input-wrapper">
                                    <span className="input-icon">👤</span>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Your Name"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

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
                                    <span className="input-icon">🔒</span>
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

                            <div className="form-group">
                                <label>Confirm Password</label>
                                <div className="input-wrapper">
                                    <span className="input-icon">🔒</span>
                                    <input
                                        type="password"
                                        className="form-control"
                                        placeholder="Confirm Password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

                            <button type="submit" className="btn btn-primary">Sign up</button>

                            <div className="auth-footer">
                                By signing up, you agree to our Privacy Policy
                                <div className="divider"></div>
                                Already have an account? <Link to="/login">Sign In</Link>
                            </div>
                        </form>
                    </>
                ) : (
                    <form onSubmit={handleVerify}>
                        {successMsg && <div style={{ color: 'var(--success)', marginBottom: '1rem' }}>{successMsg}</div>}
                        <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
                            Please enter the 6-digit verification code sent to <strong>{email}</strong>.
                        </p>
                        <div className="form-group">
                            <label>Verification Code</label>
                            <div className="input-wrapper">
                                <span className="input-icon">🔢</span>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="000000"
                                    value={otp}
                                    onChange={e => setOtp(e.target.value.replace(/\s/g, ''))}
                                    required
                                    maxLength={6}
                                />
                            </div>
                        </div>
                        {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

                        <button 
                            type="submit" 
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? "Verifying..." : "Verify Email"}
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline"
                            style={{ marginTop: '1rem' }}
                            onClick={() => setStep(1)}
                        >
                            Back to Registration
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default StudentSignup;
