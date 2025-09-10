# Candidate Dashboard

## Description
A full-stack candidate management dashboard built with **React** (frontend) and **Express** (backend).  
This application helps recruiters manage candidate submissions, explore and filter applicants, and shortlist top candidates efficiently.

## Features
- Add candidates with multiple experiences
- View, search, filter, and sort all candidates
- Automatically compute **Top 5 candidates**
- Shortlist candidates with reasons and quick notes
- Export shortlist to **JSON** or **email-ready text**

## Folder Structure
candidate-dashboard/
├─ backend/ # Express server + candidate data
│ ├─ server.js
│ ├─ form-submissions.json
│ └─ package.json
├─ frontend/ # React dashboard
│ ├─ package.json
│ └─ src/
│ └─ App.js
├─ README.md
└─ .gitignore

## Installation & Running Locally

### 1️⃣ Backend
``bash
cd backend
npm install
node server.js
Backend server runs on http://localhost:5000

Endpoints:

GET /api/submissions → Get all candidates

POST /api/submissions → Add new candidate

2️⃣ Frontend
bash
Copy code
cd frontend
npm install
npm start
Frontend runs on http://localhost:3000

How to Use
Open the dashboard in the browser.

Add new candidates with name, email, and multiple experiences.

Search, filter, and sort candidates based on criteria.

Automatically view the top 5 candidates.

Shortlist candidates with reasons.

Export shortlisted candidates as JSON or copy email-ready text.

Notes
Could you make sure the backend server is running before using the frontend?

Sample candidate data is stored in the backend/ backend/form-submissions.json file.

Author
Charumathi K
GitHub: https://github.com/Charumathik
