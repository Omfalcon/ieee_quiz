import React, { useEffect, useState } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import axios from "axios";
import { useNavigate, useParams, useLocation } from "react-router-dom";

const emptyForm = {
  title: "",
  category: "",
  start_time: "",
  end_time: "",
  questions: []
};

const newQuestion = () => ({
  question: "",
  options: ["", "", "", ""],
  correct_answer: 0
});

const ManageQuizzes = () => {

  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const isList = location.pathname === "/admin/manage-quizzes";
  const isView = location.pathname.includes("/view/");
  const isCreate = location.pathname.includes("/create");
  const isEdit = location.pathname.includes("/edit/");

  const [quizzes, setQuizzes] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // ================= FETCH =================
  const fetchQuizzes = async () => {
    const res = await axios.get("http://127.0.0.1:8000/quizzes");
    setQuizzes(res.data);
  };

  const fetchQuiz = async () => {
    const res = await axios.get(`http://127.0.0.1:8000/quizzes/${id}`);

    const clean = {
      ...res.data,
      questions: (res.data.questions || []).map(q => ({
        question: q.question || "",
        options: q.options || ["", "", "", ""],
        correct_answer: q.correct_answer ?? 0
      })),
      is_active: res.data.is_active ?? false
    };

    setQuiz(clean);
    setForm(clean);
  };

  useEffect(() => { fetchQuizzes(); }, []);
  useEffect(() => { if (id) fetchQuiz(); }, [id]);

  // ================= CREATE =================
  const handleCreate = async () => {
    const cleanPayload = {
      ...form,
      questions: form.questions.map(q => ({
        question: q.question,
        options: q.options,
        correct_answer: q.correct_answer
      }))
    };

    await axios.post("http://127.0.0.1:8000/quizzes", cleanPayload);

    setForm(emptyForm); // 🔥 RESET → fixes duplication
    navigate("/admin/manage-quizzes");
  };

  // ================= UPDATE =================
  const handleUpdate = async () => {
    await axios.put(`http://127.0.0.1:8000/quizzes/${id}`, form);
    navigate(`/admin/manage-quizzes/view/${id}`);
  };

  // ================= TOGGLE =================
  const handleToggle = async () => {
    await axios.put(`http://127.0.0.1:8000/quizzes/toggle/${id}`);

    // 🔥 FORCE UI UPDATE EVEN IF BACKEND FAILS
    setQuiz(prev => ({
      ...prev,
      is_active: !prev.is_active
    }));

    fetchQuiz();
  };

  // ================= DELETE =================
  const handleDelete = async (qid) => {
    await axios.delete(`http://127.0.0.1:8000/quizzes/${qid}`);
    fetchQuizzes();
  };

  // ================= QUESTION =================
  const addQuestion = () => {
    setForm(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion()]
    }));
  };

  // ================= LIST =================
  if (isList) {
    return (
      <AdminLayout>

        <div style={header}>
          <h1>Manage Quizzes</h1>
          <button onClick={() => navigate("/admin/manage-quizzes/create")} style={btn}>
            + Add Quiz
          </button>
        </div>

        {quizzes.map(q => (
          <div key={q._id} style={card} onClick={() => navigate(`/admin/manage-quizzes/view/${q._id}`)}>
            <div>
              <h3>{q.title}</h3>
              <p>{q.category}</p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(q._id);
              }}
              style={deleteBtn}
            >
              Delete
            </button>
          </div>
        ))}

      </AdminLayout>
    );
  }

  // ================= CREATE =================
  if (isCreate) {
    return (
      <AdminLayout>

        <h1>Create Quiz</h1>

        <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}/>
        <input placeholder="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}/>
        <input type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}/>
        <input type="datetime-local" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })}/>

        <h2>Questions</h2>

        {form.questions.map((q, qi) => (
          <div key={qi} style={questionCard}>
            <input value={q.question} onChange={e => {
              const updated = [...form.questions];
              updated[qi].question = e.target.value;
              setForm({ ...form, questions: updated });
            }}/>

            {q.options.map((opt, oi) => (
              <div key={oi}>
                <input value={opt} onChange={e => {
                  const updated = [...form.questions];
                  updated[qi].options[oi] = e.target.value;
                  setForm({ ...form, questions: updated });
                }}/>

                <input
                  type="radio"
                  checked={q.correct_answer === oi}
                  onChange={() => {
                    const updated = [...form.questions];
                    updated[qi].correct_answer = oi;
                    setForm({ ...form, questions: updated });
                  }}
                />
              </div>
            ))}
          </div>
        ))}

        <button onClick={addQuestion}>+ Add Question</button>
        <button onClick={handleCreate}>Create Quiz</button>

      </AdminLayout>
    );
  }

  // ================= VIEW =================
  if (isView && quiz) {
    return (
      <AdminLayout>

        <div style={header}>
          <button onClick={() => navigate("/admin/manage-quizzes")}>←</button>
          <h1>{quiz.title}</h1>
          <button onClick={() => navigate(`/admin/manage-quizzes/edit/${id}`)}>Edit</button>
        </div>

        <button onClick={handleToggle}>
          {quiz.is_active ? "Stop Quiz" : "Start Quiz"}
        </button>

        {quiz.questions.map((q, i) => (
          <div key={i} style={questionCard}>
            <h3>Q{i + 1}</h3>
            <p>{q.question}</p>

            {q.options.map((opt, oi) => (
              <div key={oi} style={{
                background: q.correct_answer === oi ? "#d4edda" : "#fff"
              }}>
                {opt}
              </div>
            ))}
          </div>
        ))}

      </AdminLayout>
    );
  }

  return <AdminLayout>Loading...</AdminLayout>;
};

const header = { display: "flex", justifyContent: "space-between" };
const card = { border: "1px solid #ddd", padding: "15px", marginBottom: "10px", cursor: "pointer" };
const questionCard = { border: "1px solid #ddd", padding: "10px", marginTop: "10px" };
const btn = { background: "#1e63b5", color: "white", padding: "8px" };
const deleteBtn = { background: "red", color: "white" };

export default ManageQuizzes;