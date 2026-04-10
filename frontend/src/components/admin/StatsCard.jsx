import { Users, FileText, Calendar, Activity, PlayCircle, CheckCircle, ClipboardList } from "lucide-react";

const StatsCard = ({ title, value }) => {
  return (
    <div
      style={{
        background: "white",
        padding: "20px",
        borderRadius: "10px",
        flex: 1,
        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}
    >
      <div>
        {/* TITLE */}
        <p
          style={{
            marginBottom: "8px",
            fontSize: "14px",
            fontWeight: "700",
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: "0.5px"
          }}
        >
          {title}
        </p>

        {/* VALUE */}
        <h2
          style={{
            margin: 0,
            fontSize: "28px",
            fontWeight: "800",
            color: "#111827"
          }}
        >
          {value}
        </h2>
      </div>

      {/* ICON */}
      <div style={{ color: "#1e63b5" }}>
        {title === "Total Active Users" && <Users size={24} />}
        {title === "Total Quizzes" && <ClipboardList size={24} />}
        {title === "Upcoming Sessions" && <Calendar size={24} />}
        {title === "Platform Engagement" && <Activity size={24} />}
        {title === "Live Quizzes" && <PlayCircle size={24} />}
        {title === "Finished Quizzes" && <CheckCircle size={24} />}
        {title === "Scheduled Quizzes" && <Calendar size={24} />}
      </div>
    </div>
  );
};

export default StatsCard;