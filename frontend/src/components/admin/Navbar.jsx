import React from "react";
import { Search, Bell } from "lucide-react";

const Navbar = () => {
  return (
    <div
      style={{
        height: "60px",
        background: "#1e63b5",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 30px", // ⬅️ slightly increased for better spacing
        color: "white"
      }}
    >
      {/* LEFT → LOGO */}
      <img
        src="/images/ieee-logo.png"
        alt="IEEE Logo"
        style={{
          height: "55px",
          objectFit: "contain"
        }}
      />

      {/* CENTER → SEARCH */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "white",
          padding: "6px 10px",
          borderRadius: "6px",
          width: "250px"
        }}
      >
        <Search size={16} color="gray" />
        <input
          type="text"
          placeholder="Search..."
          style={{
            border: "none",
            outline: "none",
            marginLeft: "8px",
            width: "100%"
          }}
        />
      </div>

      {/* RIGHT → ICON + ADMIN + PROFILE */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px", // ⬅️ tighter spacing
          marginRight: "10px" // ⬅️ shifts slightly left
        }}
      >
        <Bell size={20} />

        <span style={{ fontWeight: "500" }}>Admin</span>

        {/* PROFILE CIRCLE */}
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "white",
            color: "#1e63b5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "600"
          }}
        >
          A
        </div>
      </div>
    </div>
  );
};

export default Navbar;