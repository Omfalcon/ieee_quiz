import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/**
 * StudentLeaderboard is now a redirecting component.
 * Everyone uses the unified EventLeaderboard at /leaderboard/:id
 */
const StudentLeaderboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        // Redirect to the shared public leaderboard
        navigate(`/leaderboard/${id}`, { replace: true });
    }, [id, navigate]);

    return (
        <div style={{ 
            display: 'flex', justifyContent: 'center', alignItems: 'center', 
            height: '100vh', background: '#f8fafc', fontFamily: 'system-ui' 
        }}>
            <p>Redirecting to leaderboard...</p>
        </div>
    );
};

export default StudentLeaderboard;
