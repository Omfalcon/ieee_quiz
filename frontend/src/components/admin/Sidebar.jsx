import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Users,
  Video,
  BarChart2,
  Database,
  Award,
  Settings
} from "lucide-react";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getItemStyle = (path) => {
    const isActive = location.pathname.startsWith(path);
    return {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "10px 12px",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px",
      transition: "all 0.2s",
      background: isActive ? "#EFF6FF" : "transparent",
      color: isActive ? "#2563EB" : "#4B5563",
      fontWeight: isActive ? "600" : "500",
    };
  };

  return (
    <div
      style={{
        width: "220px",
        background: "#ffffff",
        height: "100vh",
        borderRight: "1px solid #e5e7eb",
        padding: "20px"
      }}
    >
      {/* MENU */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>

        <div style={getItemStyle('/admin/dashboard')} onClick={() => navigate('/admin/dashboard')}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </div>

        <div style={getItemStyle('/admin/manage-quizzes')} onClick={() => navigate('/admin/manage-quizzes')}>
          <FileText size={18} />
          <span>Manage Quizzes</span>
        </div>

        <div style={getItemStyle('/admin/users')} onClick={() => navigate('/admin/users')}>
          <Users size={18} />
          <span>User Management</span>
        </div>

        <div style={getItemStyle('/admin/live-sessions')} onClick={() => navigate('/admin/live-sessions')}>
          <Video size={18} />
          <span>Live Sessions</span>
        </div>

        <div style={getItemStyle('/admin/analytics')}>
          <BarChart2 size={18} />
          <span>Analytics</span>
        </div>

        <div style={getItemStyle('/admin/qbank')}>
          <Database size={18} />
          <span>Question Bank</span>
        </div>

        <div style={getItemStyle('/admin/certificates')}>
          <Award size={18} />
          <span>Certificates</span>
        </div>

        <div style={getItemStyle('/admin/settings')}>
          <Settings size={18} />
          <span>Settings</span>
        </div>

      </div>
    </div>
  );
};

export default Sidebar;