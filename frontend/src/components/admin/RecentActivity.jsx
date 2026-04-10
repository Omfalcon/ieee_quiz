import { PlusCircle, CheckCircle, Edit3, Activity } from "lucide-react";

const RecentActivity = () => {
  return (
    <div
      style={{
        background: "white",
        padding: "20px",
        borderRadius: "10px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}
    >
      {/* TITLE */}
      <h3 style={{ marginBottom: "20px", fontSize: "16px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
        <Activity size={18} color="#1e63b5" /> Recent Activity
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* ACTIVITY ITEM 1 */}
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ background: "#e0f2fe", padding: "8px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", height: "fit-content" }}>
            <PlusCircle size={16} color="#0369a1" />
          </div>
          <div>
            <p style={{ fontSize: "14px", margin: 0, color: "#111827" }}>
              New quiz created: <b>Signal Processing</b>
            </p>
            <span style={{ fontSize: "12px", color: "#6b7280" }}>
              2 hours ago
            </span>
          </div>
        </div>

        {/* ACTIVITY ITEM 2 */}
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ background: "#f0fdf4", padding: "8px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", height: "fit-content" }}>
            <CheckCircle size={16} color="#16a34a" />
          </div>
          <div>
            <p style={{ fontSize: "14px", margin: 0, color: "#111827" }}>
              User <b>Rahul</b> completed Networking Quiz
            </p>
            <span style={{ fontSize: "12px", color: "#6b7280" }}>
              5 hours ago
            </span>
          </div>
        </div>

        {/* ACTIVITY ITEM 3 */}
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ background: "#fff7ed", padding: "8px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", height: "fit-content" }}>
            <Edit3 size={16} color="#c2410c" />
          </div>
          <div>
            <p style={{ fontSize: "14px", margin: 0, color: "#111827" }}>
              Quiz <b>AI Basics</b> updated
            </p>
            <span style={{ fontSize: "12px", color: "#6b7280" }}>
              Yesterday
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default RecentActivity;