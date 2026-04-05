import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

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

    const navigate = useNavigate();

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
        setError('');
        try {
            await api.post('/auth/student/verify-otp', { email, otp });
            // Redirect to login on success
            navigate('/student/login?success=verified');
        } catch (err) {
            setError(err.response?.data?.detail || 'Verification failed');
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
                            onClick={() => window.location.href = 'http://localhost:8000/auth/google'}
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
                                    onChange={e => setOtp(e.target.value)}
                                    required
                                    maxLength={6}
                                />
                            </div>
                        </div>
                        {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

                        <button type="submit" className="btn btn-primary">Verify Email</button>
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
