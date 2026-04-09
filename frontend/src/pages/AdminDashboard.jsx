import React, { useState, useEffect } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import StatsCard from "../components/admin/StatsCard";
import QuizTable from "../components/admin/QuizTable";
import LiveSessions from "../components/admin/LiveSessions";
import RecentActivity from "../components/admin/RecentActivity";

const AdminDashboard = () => {

  const [refresh, setRefresh] = useState(false);
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    live: 0,
    finished: 0,
    scheduled: 0
  });

  const fetchStats = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/quizzes");
      const data = await res.json();

      const now = new Date();

      let live = 0, finished = 0, scheduled = 0;

      data.forEach(q => {
        const start = new Date(q.start_time);
        const end = new Date(q.end_time);

        if (now < start) scheduled++;
        else if (now >= start && now <= end) live++;
        else finished++;
      });

      setStats({
        totalQuizzes: data.length,
        live,
        finished,
        scheduled
      });

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [refresh]);

  return (
    <AdminLayout>

      <h1 style={{ marginBottom: "20px" }}>Admin Portal Overview</h1>

      {/* STATS */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
        <StatsCard title="Total Quizzes" value={stats.totalQuizzes} />
        <StatsCard title="Live Quizzes" value={stats.live} />
        <StatsCard title="Finished Quizzes" value={stats.finished} />
        <StatsCard title="Scheduled Quizzes" value={stats.scheduled} />
      </div>

      {/* MAIN */}
      <div style={{ display: "flex", gap: "20px" }}>

        <QuizTable refresh={refresh} />

        <div style={{ flex: 1 }}>
          <LiveSessions />
          <RecentActivity />
        </div>

      </div>

    </AdminLayout>
  );
};

export default AdminDashboard;