import React, { useState } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import StatsCard from "../components/admin/StatsCard";
import QuizTable from "../components/admin/QuizTable";
import LiveSessions from "../components/admin/LiveSessions";
import RecentActivity from "../components/admin/RecentActivity";
import AddQuizModal from "../components/admin/AddQuizModal";

const AdminDashboard = () => {

  // ✅ STATE (MUST BE HERE)
  const [showModal, setShowModal] = useState(false);
  const [newQuiz, setNewQuiz] = useState(null);

  return (
    <AdminLayout>

      {/* ✅ TITLE + ADD BUTTON */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1>Admin Portal Overview</h1>

        <button
          onClick={() => setShowModal(true)}
          style={{
            background: "#1e63b5",
            color: "white",
            border: "none",
            padding: "10px 15px",
            borderRadius: "6px",
            cursor: "pointer"
          }}
        >
          + Add Quiz
        </button>
      </div>

      {/* ✅ STATS */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
        <StatsCard title="Total Active Users" value="100" />
        <StatsCard title="Total Quizzes" value="25" />
        <StatsCard title="Upcoming Sessions" value="1" />
        <StatsCard title="Platform Engagement" value="2.5k" />
      </div>

      {/* ✅ MAIN SECTION */}
      <div style={{ display: "flex", gap: "20px" }}>

        {/* LEFT → Quiz Table */}
        <QuizTable newQuiz={newQuiz} />

        {/* RIGHT */}
        <div style={{ width: "30%" }}>
          <LiveSessions />
          <RecentActivity />
        </div>

      </div>

      {/* ✅ MODAL */}
      {showModal && (
        <AddQuizModal
          onClose={() => setShowModal(false)}
          onAdd={(quiz) => setNewQuiz(quiz)}
        />
      )}

    </AdminLayout>
  );
};

export default AdminDashboard;