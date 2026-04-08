import React, { useEffect, useState } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import axios from "axios";
import { useNavigate, useParams, useLocation } from "react-router-dom";

const ManageQuizzes = () => {

  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const isList = location.pathname === "/admin/manage-quizzes";
  const isView = location.pathname.includes("view");

  const [quizzes, setQuizzes] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);

  // ================= FETCH ALL =================
  const fetchQuizzes = async () => {
    const res = await axios.get("http://127.0.0.1:8000/quizzes");
    setQuizzes(res.data);
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  // ================= FETCH SINGLE =================
  const fetchQuiz = async () => {
    const res = await axios.get(`http://127.0.0.1:8000/quizzes/${id}`);
    setQuiz({
      ...res.data,
      questions: res.data.questions || [],
      is_active: res.data.is_active || false
    });
    setCurrentQ(0);
  };

  useEffect(() => {
    if (id) fetchQuiz();
  }, [id]);

  // ================= TOGGLE =================
  const handleToggle = async () => {
    await axios.put(`http://127.0.0.1:8000/quizzes/toggle/${id}`);
    fetchQuiz();
  };

  // ================= DELETE =================
  const handleDelete = async (qid) => {
    await axios.delete(`http://127.0.0.1:8000/quizzes/${qid}`);
    fetchQuizzes();
  };

  // ================= LIST VIEW =================
  if (isList) {
    return (
      <AdminLayout>
        <h1>Manage Quizzes</h1>

        {quizzes.map((q) => (
          <div
            key={q._id}
            style={card}
            onClick={() => navigate(`/admin/manage-quizzes/view/${q._id}`)}
          >
            <div>
              <h3>{q.title}</h3>
              <p>{q.category}</p>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // 🔥 prevent card click
                  handleDelete(q._id);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </AdminLayout>
    );
  }

  // ================= VIEW =================
  if (isView) {

    if (!quiz) {
      return (
        <AdminLayout>
          <p>Loading...</p>
        </AdminLayout>
      );
    }

    const question = (quiz.questions || [])[currentQ];

    return (
      <AdminLayout>

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button onClick={() => navigate("/admin/manage-quizzes")} style={backBtn}>
              ←
            </button>

            <h1>{quiz.title}</h1>
          </div>

          <button
            onClick={() => navigate(`/admin/manage-quizzes/edit/${id}`)}
            style={editBtn}
          >
            Edit Quiz
          </button>
        </div>

        {/* TOGGLE */}
        <button
          onClick={handleToggle}
          style={{
            background: quiz.is_active ? "#28a745" : "#6c757d",
            color: "white",
            padding: "10px 15px",
            border: "none",
            borderRadius: "6px",
            marginBottom: "20px",
            cursor: "pointer"
          }}
        >
          {quiz.is_active ? "Turn OFF" : "Turn ON"}
        </button>

        <div style={{ display: "flex", gap: "20px" }}>

          {/* SIDEBAR */}
          <div style={sidebar}>
            {(quiz.questions || []).map((q, i) => (
              <div
                key={i}
                onClick={() => setCurrentQ(i)}
                style={{
                  ...sidebarItem,
                  background: i === currentQ ? "#1e63b5" : "transparent",
                  color: i === currentQ ? "white" : "black"
                }}
              >
                Q{i + 1}
              </div>
            ))}
          </div>

          {/* QUESTION CARD */}
          <div style={{ flex: 1 }}>

            {question ? (
              <div style={questionCard}>

                <h2>{question.question}</h2>

                <div style={{ marginTop: "15px" }}>
                  {question.options.map((opt, i) => (
                    <div
                      key={i}
                      style={{
                        ...optionStyle,
                        background:
                          question.correct_answer === i ? "#d4edda" : "#f8f9fa"
                      }}
                    >
                      {opt}
                    </div>
                  ))}
                </div>

                {/* NAV BUTTONS */}
                <div style={navBtns}>
                  <button
                    disabled={currentQ === 0}
                    onClick={() => setCurrentQ((prev) => prev - 1)}
                  >
                    ← Prev
                  </button>

                  <button
                    disabled={currentQ === quiz.questions.length - 1}
                    onClick={() => setCurrentQ((prev) => prev + 1)}
                  >
                    Next →
                  </button>
                </div>

              </div>
            ) : (
              <p>No questions available</p>
            )}

          </div>

        </div>

      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <p>Loading...</p>
    </AdminLayout>
  );
};


// ================= STYLES =================

const card = {
  border: "1px solid #ddd",
  padding: "12px",
  marginBottom: "10px",
  borderRadius: "8px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  cursor: "pointer"
};

const sidebar = {
  width: "120px",
  borderRight: "1px solid #ddd",
  display: "flex",
  flexDirection: "column",
  gap: "5px"
};

const sidebarItem = {
  padding: "10px",
  cursor: "pointer",
  borderRadius: "6px",
  textAlign: "center"
};

const questionCard = {
  border: "1px solid #ddd",
  padding: "20px",
  borderRadius: "10px",
  background: "white"
};

const optionStyle = {
  padding: "10px",
  borderRadius: "6px",
  marginBottom: "8px"
};

const navBtns = {
  marginTop: "20px",
  display: "flex",
  justifyContent: "space-between"
};

const backBtn = {
  background: "#e0e0e0",
  border: "none",
  padding: "8px 12px",
  borderRadius: "6px",
  cursor: "pointer"
};

const editBtn = {
  background: "#1e63b5",
  color: "white",
  padding: "8px 15px",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer"
};

export default ManageQuizzes;