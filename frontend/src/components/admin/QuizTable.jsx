import { ChevronDown, Calendar, Search, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const QuizTable = ({ refresh, onUpdate }) => {

  const [quizzes, setQuizzes] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterDate, setFilterDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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

  const getStatus = (quiz) => {
    const s = quiz?.status || "scheduled";
    return s.charAt(0).toUpperCase() + s.slice(1); // "live" → "Live"
  };

  const handleDelete = async (id) => {
    try {
      if (!window.confirm("Delete this quiz?")) return;
      await axios.delete(`http://127.0.0.1:8000/quizzes/${id}`);
      fetchQuizzes();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const categories = ["All", ...new Set(quizzes.map(q => q.category).filter(Boolean))];
  const statuses = ["All", "Live", "Scheduled", "Finished"];

  const filteredQuizzes = quizzes.filter(quiz => {
    const status = getStatus(quiz);
    if (filterStatus !== "All" && status !== filterStatus) return false;
    if (filterCategory !== "All" && quiz.category !== filterCategory) return false;
    if (searchQuery && !quiz.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterDate) {
      try {
        const qDate = new Date(quiz.start_time).toISOString().split('T')[0];
        if (qDate !== filterDate) return false;
      } catch (e) {
        return false;
      }
    }
    return true;
  });

  return (
    <div style={{ background: "white", padding: "20px", borderRadius: "10px", flex: 2 }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
        <h2>Quiz Management</h2>

        <button
          onClick={() => navigate("/admin/manage-quizzes")}
          style={addBtn}
        >
          Create New Quiz
        </button>
      </div>

      {/* FILTERS */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
        
        <div style={filterBox}>
          <select 
            style={{...inputStyle, appearance: "none", cursor: "pointer"}} 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)}
          >
            {statuses.map(s => <option key={s} value={s}>{s === "All" ? "Status (All)" : s}</option>)}
          </select>
          <ChevronDown size={16} style={{...iconStyle, pointerEvents: "none"}} />
        </div>

        <div style={filterBox}>
          <select 
            style={{...inputStyle, appearance: "none", cursor: "pointer"}} 
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)}
          >
            {categories.map(c => <option key={c} value={c}>{c === "All" ? "Category (All)" : c}</option>)}
          </select>
          <ChevronDown size={16} style={{...iconStyle, pointerEvents: "none"}} />
        </div>

        <div style={filterBox}>
          <input 
            type="date"
            style={inputStyle} 
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
          />
        </div>

        <div style={filterBox}>
          <input 
            type="text"
            placeholder="Search quizzes..." 
            style={{...inputStyle, paddingRight: "30px"}} 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <Search size={16} style={{...iconStyle, pointerEvents: "none"}} />
        </div>

      </div>

      {/* TABLE */}
      <table style={{ width: "100%", borderSpacing: "0 10px", tableLayout: "fixed" }}>
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
          {filteredQuizzes.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: "center", padding: "20px", color: "#6c757d" }}>
                No quizzes found matching your filters.
              </td>
            </tr>
          ) : (
          filteredQuizzes.map((quiz) => {
            const status = getStatus(quiz);

            return (
              <tr key={quiz._id} style={rowStyle}>
                <td style={tdStyle}>{quiz.title}</td>
                <td style={tdStyle}>{quiz.category}</td>
                <td style={tdStyle}><span style={BADGE_MAP[status] || scheduledBadge}>{status}</span></td>
                <td style={tdStyle}>{formatDateTime(quiz.start_time)}</td>
                <td style={tdStyle}>{formatDateTime(quiz.end_time)}</td>
                <td style={tdStyle}>{quiz.participants || 0}</td>

                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>

                    {/* VIEW */}
                    <button
                      style={viewBtn}
                      onClick={() => navigate(`/admin/manage-quizzes/view/${quiz._id}`)}
                    >
                      View
                    </button>

                    {/* DELETE */}
                    <span onClick={() => handleDelete(quiz._id)} style={deleteIcon}>
                      <Trash2 size={16} color="#ef4444" />
                    </span>

                  </div>
                </td>
              </tr>
            );
          }))}
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

const thStyle = {
  textAlign: "left",
  padding: "10px",
  fontSize: "14px",
  color: "#555",
  whiteSpace: "nowrap"
};

const tdStyle = {
  padding: "12px",
  borderTop: "1px solid #eee",
  wordBreak: "break-word"
};

const rowStyle = {
  background: "#fff",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
};

const liveBadge = { background: "#28a745", color: "white", padding: "4px 10px", borderRadius: "20px", fontSize: "12px" };
const finishedBadge = { background: "#6c757d", color: "white", padding: "4px 10px", borderRadius: "20px", fontSize: "12px" };
const scheduledBadge = { background: "#ffc107", color: "black", padding: "4px 10px", borderRadius: "20px", fontSize: "12px" };

const BADGE_MAP = { Live: liveBadge, Finished: finishedBadge, Scheduled: scheduledBadge };

const viewBtn = {
  background: "#e0e0e0",
  border: "none",
  padding: "5px 10px",
  borderRadius: "5px",
  cursor: "pointer"
};

const deleteIcon = {
  cursor: "pointer",
  fontSize: "16px"
};

export default QuizTable;