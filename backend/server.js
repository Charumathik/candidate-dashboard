// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 5000;
const DATA_FILE = path.join(__dirname, "form-submissions.json");

app.use(cors());
app.use(express.json());

// Ensure data file exists
function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf8");
    console.log("📁 Created data file:", DATA_FILE);
  }
}

app.get("/", (req, res) => {
  res.send("✅ Backend is running 🚀");
});

// Get all submissions
app.get("/api/submissions", (req, res) => {
  try {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const submissions = JSON.parse(raw || "[]");
    res.json(submissions);
  } catch (err) {
    console.error("GET /api/submissions error:", err);
    res.status(500).json({ error: "Failed to read submissions file" });
  }
});

// Add new candidate
app.post("/api/submissions", (req, res) => {
  try {
    ensureDataFile();
    const newCandidate = req.body;

    if (!newCandidate || !newCandidate.name) {
      return res
        .status(400)
        .json({ error: "Candidate object with `name` is required" });
    }

    const raw = fs.readFileSync(DATA_FILE, "utf8");
    let submissions = [];
    try {
      submissions = JSON.parse(raw || "[]");
      if (!Array.isArray(submissions)) submissions = [];
    } catch {
      submissions = [];
    }

    // Add id + timestamp
    newCandidate.id = Date.now().toString();
    newCandidate.created_at = new Date().toISOString();
    newCandidate.reason = ""; // store reason also

    submissions.push(newCandidate);
    fs.writeFileSync(DATA_FILE, JSON.stringify(submissions, null, 2), "utf8");

    console.log("➕ Added candidate:", newCandidate.name, "id:", newCandidate.id);
    res.json({ message: "Candidate added successfully", candidate: newCandidate });
  } catch (err) {
    console.error("POST /api/submissions error:", err);
    res.status(500).json({ error: "Failed to save candidate" });
  }
});

// Update shortlist reason
app.put("/api/submissions/:id", (req, res) => {
  try {
    ensureDataFile();
    const { id } = req.params;
    const { reason } = req.body;

    const raw = fs.readFileSync(DATA_FILE, "utf8");
    let submissions = JSON.parse(raw || "[]");

    const idx = submissions.findIndex((c) => c.id === id);
    if (idx === -1) return res.status(404).json({ error: "Candidate not found" });

    submissions[idx].reason = reason;
    fs.writeFileSync(DATA_FILE, JSON.stringify(submissions, null, 2), "utf8");

    res.json({ message: "Reason updated", candidate: submissions[idx] });
  } catch (err) {
    console.error("PUT /api/submissions/:id error:", err);
    res.status(500).json({ error: "Failed to update reason" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
