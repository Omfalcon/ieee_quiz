import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from './AuthContext';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const [lastEvent, setLastEvent] = useState(null);
    const isAdminRef = useRef(false);

    const connect = () => {
        const token = localStorage.getItem('token');
        if (!token || !isAdminRef.current) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//127.0.0.1:8000/ws/admin/live?token=${token}`);

        ws.onopen = () => {
            // Connected successfully — clear any pending reconnect
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setLastEvent({ ...data, _ts: Date.now() });
            } catch {
                // ignore malformed messages
            }
        };

        ws.onclose = (e) => {
            // Only reconnect on unexpected close (not intentional unmount)
            if (e.code !== 1000 && isAdminRef.current) {
                reconnectTimeoutRef.current = setTimeout(connect, 3000);
            }
        };

        ws.onerror = () => {
            ws.close();
        };

        wsRef.current = ws;
    };

    useEffect(() => {
        isAdminRef.current = user?.role === 'admin';

        if (user?.role === 'admin') {
            connect();
        }

        return () => {
            isAdminRef.current = false;
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            if (wsRef.current) {
                wsRef.current.close(1000, 'Unmounting');
                wsRef.current = null;
            }
        };
    }, [user]);

    return (
        <WebSocketContext.Provider value={{ lastEvent }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useAdminWS = () => {
    const ctx = useContext(WebSocketContext);
    if (!ctx) throw new Error('useAdminWS must be used inside WebSocketProvider');
    return ctx;
};
