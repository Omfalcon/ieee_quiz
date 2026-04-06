import React from "react";
import { Users, FileText, Calendar, Activity } from "lucide-react";

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
            fontSize: "16px",
            fontWeight: "600",
            color: "#000"
          }}
        >
          {title}
        </p>

        {/* VALUE */}
        <h2
          style={{
            margin: 0,
            fontSize: "30px",
            fontWeight: "700"
          }}
        >
          {value}
        </h2>
      </div>

      {/* ICON */}
      {title === "Total Active Users" && <Users size={24} />}
      {title === "Total Quizzes" && <FileText size={24} />}
      {title === "Upcoming Sessions" && <Calendar size={24} />}
      {title === "Platform Engagement" && <Activity size={24} />}
    </div>
  );
};

export default StatsCard;