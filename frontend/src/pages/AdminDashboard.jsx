import React, { useState, useEffect } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import StatsCard from "../components/admin/StatsCard";
import QuizTable from "../components/admin/QuizTable";
import LiveSessions from "../components/admin/LiveSessions";
import RecentActivity from "../components/admin/RecentActivity";
import { useAdminWS } from "../context/WebSocketContext";

const AdminDashboard = () => {
  const { lastEvent } = useAdminWS();

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
        const status = q.status || "scheduled";
        if (status === "live") live++;
        else if (status === "finished") finished++;
        else scheduled++;
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

  useEffect(() => {
    if (!lastEvent) return;
    const { action } = lastEvent;
    if (["QUIZ_UPDATED", "QUIZ_CREATED", "QUIZ_DELETED", "PARTICIPANT_JOINED", "NEW_SUBMISSION"].includes(action)) {
      fetchStats();
      setRefresh(r => !r);
    }
  }, [lastEvent]);

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

        <QuizTable refresh={refresh} onUpdate={() => setRefresh(!refresh)} />

        <div style={{ flex: 1 }}>
          <LiveSessions />
          <RecentActivity />
        </div>

      </div>

    </AdminLayout>
  );
};

export default AdminDashboard;