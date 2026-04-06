import React from "react";
import { ChevronDown, Calendar, Search } from "lucide-react";

const QuizTable = () => {

  // ✅ INPUT STYLE
  const inputStyle = {
    width: "100%", // ✅ FULL WIDTH FIX
    padding: "8px 30px 8px 10px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "13px"
  };

  // ✅ ICON STYLE
  const iconStyle = {
    position: "absolute",
    right: "8px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "gray"
  };

  // ✅ FILTER BOX (EACH INPUT CONTAINER)
  const filterBox = {
    position: "relative",
    flex: 1 // ✅ EACH TAKES EQUAL WIDTH
  };

  // ✅ TABLE HEADER STYLE
  const thStyle = {
    textAlign: "left",
    padding: "12px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#555"
  };

  // ✅ TABLE CELL STYLE
  const tdStyle = {
    padding: "12px",
    fontSize: "14px",
    borderTop: "1px solid #eee"
  };

  // ✅ ROW STYLE
  const rowStyle = {
    background: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
  };

  // ✅ STATUS BADGES
  const liveBadge = {
    background: "#28a745",
    color: "white",
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "500"
  };

  const finishedBadge = {
    background: "#6c757d",
    color: "white",
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "500"
  };

  // ✅ BUTTONS
  const editBtn = {
    background: "#1e63b5",
    color: "white",
    border: "none",
    padding: "5px 10px",
    borderRadius: "5px",
    marginRight: "5px",
    cursor: "pointer",
    fontSize: "12px"
  };

  const viewBtn = {
    background: "#e0e0e0",
    color: "black",
    border: "none",
    padding: "5px 10px",
    borderRadius: "5px",
    marginRight: "5px",
    cursor: "pointer",
    fontSize: "12px"
  };

  const deleteIconStyle = {
    marginLeft: "10px",
    cursor: "pointer"
  };

  return (
    <div
      style={{
        background: "white",
        padding: "20px",
        borderRadius: "10px",
        width: "70%"
      }}
    >
      {/* TITLE */}
      <h2 style={{ marginBottom: "15px" }}>Quiz Management</h2>

      {/* ✅ FIXED FILTERS */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "15px",
          width: "100%"
        }}
      >
        {/* STATUS */}
        <div style={filterBox}>
          <input placeholder="Status" style={inputStyle} />
          <ChevronDown size={16} style={iconStyle} />
        </div>

        {/* CATEGORY */}
        <div style={filterBox}>
          <input placeholder="Category" style={inputStyle} />
          <ChevronDown size={16} style={iconStyle} />
        </div>

        {/* DATE */}
        <div style={filterBox}>
          <input placeholder="Date" style={inputStyle} />
          <Calendar size={16} style={iconStyle} />
        </div>

        {/* SEARCH */}
        <div style={filterBox}>
          <input placeholder="Search..." style={inputStyle} />
          <Search size={16} style={iconStyle} />
        </div>
      </div>

      {/* TABLE */}
      <table
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: "0 8px"
        }}
      >
        <thead style={{ background: "#f5f5f5" }}>
          <tr>
            <th style={thStyle}>Quiz Title</th>
            <th style={thStyle}>Category</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Created Date</th>
            <th style={thStyle}>Participants</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr style={rowStyle}>
            <td style={tdStyle}>Signal Processing</td>
            <td style={tdStyle}>Category</td>
            <td style={tdStyle}>
              <span style={liveBadge}>Live</span>
            </td>
            <td style={tdStyle}>Mar 21, 2026</td>
            <td style={tdStyle}>200</td>
            <td style={tdStyle}>
              <button style={editBtn}>Edit</button>
              <button style={viewBtn}>View</button>
              <span style={deleteIconStyle}>🗑️</span>
            </td>
          </tr>

          <tr style={rowStyle}>
            <td style={tdStyle}>Networking Basics</td>
            <td style={tdStyle}>Category</td>
            <td style={tdStyle}>
              <span style={finishedBadge}>Finished</span>
            </td>
            <td style={tdStyle}>Mar 20, 2026</td>
            <td style={tdStyle}>150</td>
            <td style={tdStyle}>
              <button style={editBtn}>Edit</button>
              <button style={viewBtn}>View</button>
              <span style={deleteIconStyle}>🗑️</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default QuizTable;