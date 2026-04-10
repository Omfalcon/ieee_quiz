import React from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { useTheme } from "../../context/ThemeContext";

const AdminLayout = ({ children }) => {
  const { tokens } = useTheme();

  return (
    <div style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}>
      <Navbar />
      <div style={{ display: "flex" }}>
        <Sidebar />
        <div style={{
          flex: 1,
          background: tokens.bg,
          minHeight: "calc(100vh - 60px)",
          padding: "28px 32px",
          transition: "background 0.3s",
          overflowX: "hidden",
        }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;