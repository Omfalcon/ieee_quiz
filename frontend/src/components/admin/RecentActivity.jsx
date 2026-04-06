import React from "react";

const RecentActivity = () => {
  return (
    <div
      style={{
        background: "white",
        padding: "15px",
        borderRadius: "10px"
      }}
    >
      {/* TITLE */}
      <h3 style={{ marginBottom: "15px" }}>Recent Activity</h3>

      {/* ACTIVITY ITEM 1 */}
      <div style={{ marginBottom: "10px" }}>
        <p style={{ fontSize: "14px", margin: 0 }}>
          New quiz created: <b>Signal Processing</b>
        </p>
        <span style={{ fontSize: "12px", color: "gray" }}>
          2 hours ago
        </span>
      </div>

      {/* ACTIVITY ITEM 2 */}
      <div style={{ marginBottom: "10px" }}>
        <p style={{ fontSize: "14px", margin: 0 }}>
          User <b>Rahul</b> completed Networking Quiz
        </p>
        <span style={{ fontSize: "12px", color: "gray" }}>
          5 hours ago
        </span>
      </div>

      {/* ACTIVITY ITEM 3 */}
      <div>
        <p style={{ fontSize: "14px", margin: 0 }}>
          Quiz <b>AI Basics</b> updated
        </p>
        <span style={{ fontSize: "12px", color: "gray" }}>
          Yesterday
        </span>
      </div>

    </div>
  );
};

export default RecentActivity;