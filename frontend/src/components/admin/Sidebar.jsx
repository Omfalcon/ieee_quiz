import React, { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, Users, Video,
  BarChart2, Database, Award, Settings
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const NAV_ITEMS = [
  { label: "Dashboard",        icon: LayoutDashboard, path: "/admin/dashboard" },
  { label: "Manage Quizzes",   icon: FileText,        path: "/admin/manage-quizzes" },
  { label: "Users",            icon: Users,           path: "/admin/users" },
  { label: "Live Sessions",    icon: Video,           path: "/admin/live-sessions" },
  { label: "Analytics",        icon: BarChart2,       path: "/admin/analytics" },
  { label: "Question Bank",    icon: Database,        path: "/admin/question-bank" },
  { label: "Certificates",     icon: Award,           path: null },
  { label: "Settings",         icon: Settings,        path: null },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tokens } = useTheme();

  return (
    <div style={{
      width: 220,
      background: tokens.sidebarBg,
      height: "calc(100vh - 60px)",
      borderRight: `1px solid ${tokens.sidebarBorder}`,
      padding: "20px 12px",
      position: "sticky",
      top: 60,
      display: "flex",
      flexDirection: "column",
      gap: 4,
      transition: "background 0.3s, border-color 0.3s",
    }}>
      {/* Section label */}
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.8px",
        color: tokens.textMuted, textTransform: "uppercase",
        padding: "0 10px", marginBottom: 8,
      }}>
        Menu
      </div>

      {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
        const isActive = path && location.pathname.startsWith(path);
        return (
          <div
            key={label}
            onClick={() => path && navigate(path)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 8,
              cursor: path ? "pointer" : "default",
              fontSize: 14, fontWeight: isActive ? 600 : 500,
              background: isActive ? tokens.activeItem : "transparent",
              color: isActive ? tokens.activeText : path ? tokens.inactiveText : tokens.border,
              transition: "all 0.15s",
              opacity: path ? 1 : 0.45,
              userSelect: "none",
            }}
            onMouseEnter={e => {
              if (!isActive && path) e.currentTarget.style.background = tokens.surfaceHover;
            }}
            onMouseLeave={e => {
              if (!isActive) e.currentTarget.style.background = "transparent";
            }}
          >
            {isActive && (
              <div style={{
                position: "absolute", left: 0, width: 3, height: 28,
                background: tokens.primary, borderRadius: "0 3px 3px 0",
              }} />
            )}
            <Icon size={17} />
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default Sidebar;