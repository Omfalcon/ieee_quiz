import React from "react";

const Navbar = () => {
  return (
    <div
      style={{
        height: "60px",
        background: "#1e63b5",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        color: "white",
      }}
    >
      {/* Left side (Search) */}
      <input
        type="text"
        placeholder="Search..."
        style={{
          padding: "8px 12px",
          borderRadius: "6px",
          border: "none",
          outline: "none",
          width: "250px",
        }}
      />

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
        <span>Admin</span>
        <div
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            background: "white",
            color: "#1e63b5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
          }}
        >
          A
        </div>
      </div>
    </div>
  );
};

export default Navbar;