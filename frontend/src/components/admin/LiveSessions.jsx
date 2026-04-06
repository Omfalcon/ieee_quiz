import React from "react";

const LiveSessions = () => {
  return (
    <div
      style={{
        background: "white",
        padding: "15px",
        borderRadius: "10px",
        marginBottom: "15px"
      }}
    >
      {/* TITLE */}
      <h3 style={{ marginBottom: "15px" }}>Live Sessions</h3>

      {/* SESSION 1 */}
      <div
        style={{
          border: "1px solid #eee",
          borderRadius: "8px",
          padding: "10px",
          marginBottom: "10px"
        }}
      >
        <p style={{ fontWeight: "600", marginBottom: "5px" }}>
          Signal Processing Quiz
        </p>
        <p style={{ fontSize: "13px", color: "gray" }}>
          Starts at 5:00 PM
        </p>
      </div>

      {/* SESSION 2 */}
      <div
        style={{
          border: "1px solid #eee",
          borderRadius: "8px",
          padding: "10px"
        }}
      >
        <p style={{ fontWeight: "600", marginBottom: "5px" }}>
          Networking Quiz
        </p>
        <p style={{ fontSize: "13px", color: "gray" }}>
          Starts at 7:00 PM
        </p>
      </div>

    </div>
  );
};

export default LiveSessions;