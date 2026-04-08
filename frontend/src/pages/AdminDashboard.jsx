import React, { useState, useEffect } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import StatsCard from "../components/admin/StatsCard";
import QuizTable from "../components/admin/QuizTable";
import LiveSessions from "../components/admin/LiveSessions";
import RecentActivity from "../components/admin/RecentActivity";
import AddQuizModal from "../components/admin/AddQuizModal";

const AdminDashboard = () => {

  // ✅ STATE MUST BE HERE (TOP LEVEL)
  const [showModal, setShowModal] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    live: 0,
    finished: 0,
    scheduled: 0
  });

  // ✅ FETCH STATS
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

  // ✅ RUN ON LOAD + REFRESH
  useEffect(() => {
    fetchStats();
  }, [refresh]);

  // ✅ ADD QUIZ
  const handleAddQuiz = async (quizData) => {
    try {
      await fetch("http://127.0.0.1:8000/quizzes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(quizData)
      });

      setRefresh(prev => !prev); // 🔥 refresh UI

    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AdminLayout>

      {/* TITLE */}
      <h1 style={{ marginBottom: "20px" }}>Admin Portal Overview</h1>

      {/* ADD QUIZ BUTTON */}
      <button
        onClick={() => setShowModal(true)}
        style={{
          marginBottom: "20px",
          padding: "10px 15px",
          background: "#1e63b5",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer"
        }}
      >
        + Add Quiz
      </button>

      {/* STATS */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
        <StatsCard title="Total Quizzes" value={stats.totalQuizzes} />
        <StatsCard title="Live Quizzes" value={stats.live} />
        <StatsCard title="Finished Quizzes" value={stats.finished} />
        <StatsCard title="Scheduled Quizzes" value={stats.scheduled} />
      </div>

      {/* MAIN SECTION */}
      <div style={{ display: "flex", gap: "20px" }}>

        {/* LEFT */}
        <QuizTable refresh={refresh} />

        {/* RIGHT */}
        <div style={{ flex: 1 }}>
          <LiveSessions />
          <RecentActivity />
        </div>

      </div>

      {/* MODAL */}
      {showModal && (
        <AddQuizModal
          onClose={() => setShowModal(false)}
          onAdd={handleAddQuiz}
        />
      )}

    </AdminLayout>
  );
};

export default AdminDashboard;