import React from "react";
import AdminLayout from "../components/admin/AdminLayout";
import StatsCard from "../components/admin/StatsCard";
import QuizTable from "../components/admin/QuizTable";
import LiveSessions from "../components/admin/LiveSessions";
import RecentActivity from "../components/admin/RecentActivity";

const AdminDashboard = () => {
  return (
    <AdminLayout>

      {/* TITLE */}
      <h1 style={{ marginBottom: "20px" }}>Admin Portal Overview</h1>

      {/* ✅ FULL WIDTH STATS (FIXED) */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
        <StatsCard title="Total Active Users" value="100" />
        <StatsCard title="Total Quizzes" value="25" />
        <StatsCard title="Upcoming Sessions" value="1" />
        <StatsCard title="Platform Engagement" value="2.5k" />
      </div>

      {/* ✅ BOTTOM SECTION (LEFT + RIGHT) */}
      <div style={{ display: "flex", gap: "20px" }}>

        {/* LEFT → Quiz Table */}
        <QuizTable />

        {/* RIGHT → EMPTY FOR NOW */}
        <div style={{ width: "30%" }}>
          <LiveSessions />
          <RecentActivity />
        </div>

      </div>

    </AdminLayout>
  );
};

export default AdminDashboard;