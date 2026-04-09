import React from "react";
import { useNavigate } from "react-router-dom";
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

  const itemStyle = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px"
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
      {/* TITLE */}
      <h3 style={{ marginBottom: "25px" }}>IEEE QuizHub</h3>

      {/* MENU */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

        <div style={itemStyle} onClick={() => navigate('/admin/dashboard')}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </div>

        <div style={itemStyle} onClick={() => navigate('/admin/manage-quizzes')}>
          <FileText size={18} />
          <span>Manage Quizzes</span>
        </div>

        <div style={itemStyle}>
          <Users size={18} />
          <span>User Management</span>
        </div>

        <div style={itemStyle}>
          <Video size={18} />
          <span>Live Sessions</span>
        </div>

        <div style={itemStyle}>
          <BarChart2 size={18} />
          <span>Analytics</span>
        </div>

        <div style={itemStyle}>
          <Database size={18} />
          <span>Question Bank</span>
        </div>

        <div style={itemStyle}>
          <Award size={18} />
          <span>Certificates</span>
        </div>

        <div style={itemStyle}>
          <Settings size={18} />
          <span>Settings</span>
        </div>

      </div>
    </div>
  );
};

export default Sidebar;