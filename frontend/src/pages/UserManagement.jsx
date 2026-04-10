import React, { useState, useEffect } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import { Trash2 } from "lucide-react";
import axios from "axios";

const API = "http://127.0.0.1:8000";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/auth/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
      setErrorMsg(null);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || err.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (email, name) => {
    if (!window.confirm(`Are you sure you want to delete user ${name || email} and ALL their quiz attempts/responses? This cannot be undone.`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/auth/admin/users/${email}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh local state without refetching if desired, or just refetch
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Delete failed');
    }
  };

  if (loading) return <AdminLayout><h2 style={{color: "#fff"}}>Loading...</h2></AdminLayout>;

  return (
    <AdminLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ margin: 0 }}>User Management</h1>
      </div>

      <div style={{
        background: "#ffffff",
        borderRadius: "8px",
        border: "1px solid #e5e7eb",
        overflow: "hidden"
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: "12px 16px", color: "#64748b", fontWeight: 600 }}>Name</th>
              <th style={{ padding: "12px 16px", color: "#64748b", fontWeight: 600 }}>Email</th>
              <th style={{ padding: "12px 16px", color: "#64748b", fontWeight: 600 }}>Role</th>
              <th style={{ padding: "12px 16px", color: "#64748b", fontWeight: 600 }}>Status</th>
              <th style={{ padding: "12px 16px", color: "#64748b", fontWeight: 600, width: "80px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {errorMsg ? (
              <tr>
                <td colSpan="5" style={{ padding: "20px", textAlign: "center", color: "#dc2626", fontWeight: "bold" }}>
                  Error: {errorMsg}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>
                  No users found.
                </td>
              </tr>
            ) : (
              users.map(u => (
                <tr key={u._id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 500 }}>
                    {u.name || <span style={{ color: "#94a3b8" }}>—</span>}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#475569" }}>{u.email}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      background: u.role === 'admin' ? "#fef08a" : "#e0f2fe",
                      color: u.role === 'admin' ? "#854d0e" : "#0369a1",
                      padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: 600,
                      textTransform: "capitalize"
                    }}>
                      {u.role || "Student"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {u.is_verified ? (
                      <span style={{ color: "#16a34a", fontWeight: "bold" }}>Verified</span>
                    ) : (
                      <span style={{ color: "#dc2626" }}>Pending</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    <button
                      onClick={() => handleDelete(u.email, u.name)}
                      style={{
                        background: "none", border: "none", cursor: "pointer", color: "#ef4444"
                      }}
                      title="Delete User"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default UserManagement;
