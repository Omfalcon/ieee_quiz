import React from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

const AdminLayout = ({ children }) => {
  return (
    <div style={{ display: "flex", height: "100vh" }}>

      {/* Sidebar */}
      <Sidebar />

      {/* Main Section */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Navbar */}
        <Navbar />

        {/* Content */}
        <div style={{ padding: "20px", background: "#f5f6fa", flex: 1 }}>
          {children}
        </div>

      </div>

    </div>
  );
};

export default AdminLayout;