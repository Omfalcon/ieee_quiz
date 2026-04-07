import React, { useState } from "react";

const AddQuizModal = ({ onClose, onAdd }) => {

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const handleSubmit = async () => {
    if (!title || !category || !startTime || !endTime) {
      alert("Please fill all fields");
      return;
    }

    const newQuiz = {
      title,
      category,
      start_time: startTime,
      end_time: endTime
    };

    await onAdd(newQuiz);
    onClose();
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2>Add New Quiz</h2>

        <input
          placeholder="Quiz Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={inputStyle}
        />

        {/* ✅ START TIME */}
        <input
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          style={inputStyle}
        />

        {/* ✅ END TIME */}
        <input
          type="datetime-local"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          style={inputStyle}
        />

        <button onClick={handleSubmit} style={addBtn}>
          Add Quiz
        </button>

        <button onClick={onClose} style={cancelBtn}>
          Cancel
        </button>
      </div>
    </div>
  );
};

/* STYLES */
const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center"
};

const modalStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "10px",
  width: "350px",
  display: "flex",
  flexDirection: "column",
  gap: "10px"
};

const inputStyle = {
  padding: "10px",
  borderRadius: "5px",
  border: "1px solid #ccc"
};

const addBtn = {
  background: "#1e63b5",
  color: "white",
  padding: "10px",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer"
};

const cancelBtn = {
  background: "#ccc",
  padding: "10px",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer"
};

export default AddQuizModal;
