import React, { useState, useEffect } from "react";
import { Activity, PlusCircle, Edit3, Trash2, ToggleRight, Users } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAdminWS } from "../../context/WebSocketContext";

const API = "http://127.0.0.1:8000";

const TYPE_META = {
    quiz_created:  { icon: PlusCircle,   color: "#0369a1",  bg: "#e0f2fe" },
    quiz_edited:   { icon: Edit3,         color: "#c2410c",  bg: "#fff7ed" },
    quiz_deleted:  { icon: Trash2,        color: "#dc2626",  bg: "#fee2e2" },
    quiz_toggled:  { icon: ToggleRight,   color: "#7c3aed",  bg: "#ede9fe" },
    participant:   { icon: Users,         color: "#16a34a",  bg: "#f0fdf4" },
};

function timeSince(isoString) {
    if (!isoString) return "";
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

const RecentActivity = () => {
    const { tokens } = useTheme();
    const { lastEvent } = useAdminWS();
    const [logs, setLogs] = useState([]);

    const fetchLogs = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API}/auth/admin/activity?limit=15`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setLogs(await res.json());
        } catch {
            // silent
        }
    };

    useEffect(() => { fetchLogs(); }, []);

    useEffect(() => {
        if (lastEvent?.action === "ACTIVITY_LOGGED") {
            fetchLogs();
        }
    }, [lastEvent]);

    return (
        <div style={{
            background: tokens.surface,
            border: `1px solid ${tokens.border}`,
            padding: "20px",
            borderRadius: "12px",
            boxShadow: tokens.cardShadow
        }}>
            <h3 style={{
                marginBottom: "20px", fontSize: "15px", fontWeight: 700,
                display: "flex", alignItems: "center", gap: "8px", color: tokens.text
            }}>
                <Activity size={16} color={tokens.primary} /> Recent Activity
            </h3>

            {logs.length === 0 ? (
                <div style={{ color: tokens.textMuted, fontSize: "13px", textAlign: "center", padding: "12px 0" }}>
                    No activity yet.
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {logs.map((log, i) => {
                        const meta = TYPE_META[log.type] || TYPE_META["quiz_edited"];
                        const Icon = meta.icon;
                        return (
                            <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                                <div style={{
                                    background: meta.bg, padding: "8px", borderRadius: "50%",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    flexShrink: 0
                                }}>
                                    <Icon size={15} color={meta.color} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: "13px", margin: 0, color: tokens.text, lineHeight: "1.4" }}>
                                        {log.description}
                                    </p>
                                    <span style={{ fontSize: "11px", color: tokens.textMuted }}>
                                        {timeSince(log.timestamp)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default RecentActivity;
