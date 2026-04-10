import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Bell } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { useTheme, ThemeToggle } from "../../context/ThemeContext";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { tokens } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "A";

  return (
    <div style={{
      height: 60,
      background: tokens.navBg,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0 24px",
      color: tokens.navText,
      borderBottom: `1px solid rgba(255,255,255,0.08)`,
      position: "sticky",
      top: 0,
      zIndex: 1000,
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      transition: "background 0.3s",
      gap: 16,
    }}>
      {/* LEFT — Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/IEEE_logo.svg/1200px-IEEE_logo.svg.png"
          alt="IEEE"
          style={{ height: 22, filter: "brightness(0) invert(1)" }}
        />
        <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "0.3px" }}>
          QuizHub
        </span>
        <span style={{
          background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)",
          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
          letterSpacing: "0.5px",
        }}>
          ADMIN
        </span>
      </div>

      {/* RIGHT — Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* Theme toggle */}
        {/*<ThemeToggle />*/}

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.2)" }} />

        {/* User */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "default" }}>
          <span style={{ fontSize: 14, fontWeight: 500, opacity: 0.9 }}>
            {user?.name || "Admin"}
          </span>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            border: "2px solid rgba(255,255,255,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700,
          }}>
            {initials}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Logout"
          style={{ ...iconBtn, opacity: 0.75 }}
          onMouseEnter={e => e.currentTarget.style.opacity = "1"}
          onMouseLeave={e => e.currentTarget.style.opacity = "0.75"}
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
};

const iconBtn = {
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "white", borderRadius: 8,
  width: 34, height: 34,
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
  transition: "background 0.2s",
};

export default Navbar;