import React from "react";

const Sidebar = () => {
  return (
    <div
      style={{
        width: "220px",
        background: "#ffffff",
        height: "100vh",
        borderRight: "1px solid #e5e7eb",
        padding: "20px",
      }}
    >
      <h3 style={{ marginBottom: "20px" }}>IEEE QuizHub</h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <span>Dashboard</span>
        <span>Manage Quizzes</span>
        <span>User Management</span>
        <span>Live Sessions</span>
        <span>Analytics</span>
        <span>Question Bank</span>
        <span>Certificates</span>
        <span>Settings</span>
      </div>
    </div>
  );
};

export default Sidebar;