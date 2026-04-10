import React, { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

const Navbar = () => {
  const { user } = useContext(AuthContext);

  return (
    <div
      style={{
        height: "60px",
        background: "#1e63b5",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 30px",
        color: "white"
      }}
    >
      {/* LEFT → BRANDING */}
      <div style={{ fontSize: "20px", fontWeight: "800", letterSpacing: "0.5px" }}>
        IEEE Quiz Hub
      </div>

      {/* RIGHT → PROFILE */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginRight: "10px"
        }}
      >
        <span style={{ fontWeight: "500" }}>{user?.name || 'Admin'}</span>

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
          {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
        </div>
      </div>
    </div>
  );
};

export default Navbar;