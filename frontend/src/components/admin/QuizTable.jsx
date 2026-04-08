import { ChevronDown, Calendar, Search } from "lucide-react";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const QuizTable = ({ refresh }) => {

  const [quizzes, setQuizzes] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuizzes();
  }, [refresh]);

  const fetchQuizzes = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/quizzes");
      setQuizzes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  };

  const getStatus = (start, end) => {
    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (now < startDate) return "Scheduled";
    if (now >= startDate && now <= endDate) return "Live";
    return "Finished";
  };

  const getBadge = (status) => {
    if (status === "Live") return liveBadge;
    if (status === "Finished") return finishedBadge;
    return scheduledBadge;
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://127.0.0.1:8000/quizzes/${id}`);
      fetchQuizzes();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ background: "white", padding: "20px", borderRadius: "10px", flex: 2 }}>

      {/* 🔥 HEADER WITH BUTTON */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
        <h2>Quiz Management</h2>

        <button
          onClick={() => navigate("/manage-quizzes")}
          style={addBtn}
        >
          + Add Quiz
        </button>
      </div>

      {/* FILTERS */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
        <div style={filterBox}><input placeholder="Status" style={inputStyle} /><ChevronDown size={16} style={iconStyle} /></div>
        <div style={filterBox}><input placeholder="Category" style={inputStyle} /><ChevronDown size={16} style={iconStyle} /></div>
        <div style={filterBox}><input placeholder="Date" style={inputStyle} /><Calendar size={16} style={iconStyle} /></div>
        <div style={filterBox}><input placeholder="Search..." style={inputStyle} /><Search size={16} style={iconStyle} /></div>
      </div>

      {/* TABLE */}
      <table style={{ width: "100%", borderSpacing: "0 10px" }}>
        <thead>
          <tr>
            <th style={thStyle}>Quiz Title</th>
            <th style={thStyle}>Category</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Start Time</th>
            <th style={thStyle}>End Time</th>
            <th style={thStyle}>Participants</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {quizzes.map((quiz) => {
            const status = getStatus(quiz.start_time, quiz.end_time);

            return (
              <tr key={quiz._id} style={rowStyle}>
                <td style={tdStyle}>{quiz.title}</td>
                <td style={tdStyle}>{quiz.category}</td>
                <td style={tdStyle}><span style={getBadge(status)}>{status}</span></td>
                <td style={tdStyle}>{formatDateTime(quiz.start_time)}</td>
                <td style={tdStyle}>{formatDateTime(quiz.end_time)}</td>
                <td style={tdStyle}>{quiz.participants || 0}</td>

                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: "6px" }}>

                    <button
                      style={editBtn}
                      onClick={() => navigate(`/manage-quizzes/edit/${quiz._id}`)}
                    >
                      Edit
                    </button>

                    <button
                      style={viewBtn}
                      onClick={() => navigate(`/manage-quizzes/view/${quiz._id}`)}
                    >
                      View
                    </button>

                    <span onClick={() => handleDelete(quiz._id)} style={deleteIcon}>
                      🗑️
                    </span>

                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

/* STYLES */

const addBtn = {
  background: "#1e63b5",
  color: "white",
  padding: "8px 12px",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer"
};

const filterBox = { position: "relative", flex: 1 };
const inputStyle = { width: "100%", padding: "8px 30px 8px 10px", borderRadius: "6px", border: "1px solid #ddd" };
const iconStyle = { position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", color: "gray" };

const thStyle = { textAlign: "left", padding: "10px", fontSize: "14px", color: "#555" };
const tdStyle = { padding: "12px", borderTop: "1px solid #eee" };
const rowStyle = { background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" };

const liveBadge = { background: "#28a745", color: "white", padding: "4px 10px", borderRadius: "20px", fontSize: "12px" };
const finishedBadge = { background: "#6c757d", color: "white", padding: "4px 10px", borderRadius: "20px", fontSize: "12px" };
const scheduledBadge = { background: "#ffc107", color: "black", padding: "4px 10px", borderRadius: "20px", fontSize: "12px" };

const editBtn = { background: "#1e63b5", color: "white", border: "none", padding: "5px 10px", borderRadius: "5px", cursor: "pointer" };
const viewBtn = { background: "#e0e0e0", border: "none", padding: "5px 10px", borderRadius: "5px", cursor: "pointer" };

const deleteIcon = { cursor: "pointer", fontSize: "16px" };

export default QuizTable;