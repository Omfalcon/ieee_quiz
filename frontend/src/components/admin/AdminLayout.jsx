import React from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

const AdminLayout = ({ children }) => {
  return (
    <div>

      {/* 🔵 FULL WIDTH TOP NAVBAR */}
      <Navbar />

      {/* BELOW NAVBAR */}
      <div style={{ display: "flex" }}>

        {/* SIDEBAR */}
        <Sidebar />

        {/* MAIN CONTENT */}
        <div
          style={{
            flex: 1,
            padding: "20px",
            background: "#f5f6fa",
            minHeight: "calc(100vh - 60px)",
          }}
        >
          {children}
        </div>

      </div>
    </div>
  );
};

export default AdminLayout;