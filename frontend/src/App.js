import React, { useEffect, useState } from "react";

/*
  App.js - Candidate Dashboard
  - Connects to backend at http://localhost:5000/api/submissions
  - Features: fetch, add candidate (dynamic experiences inputs),
    filter/search/sort, shortlist up to 5, edit reasons, export,
    and show Top 5 Candidates list.
*/

function App() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters / UI state
  const [query, setQuery] = useState("");
  const [filterAvailability, setFilterAvailability] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Add candidate form state
  const [newName, setNewName] = useState("");
  const [newAvailability, setNewAvailability] = useState([]);
  const [newExperiences, setNewExperiences] = useState([{ role: "", company: "" }]);
  const [submitting, setSubmitting] = useState(false);

  // Shortlist state (persisted in localStorage)
  const [shortlist, setShortlist] = useState(() => {
    try {
      const raw = localStorage.getItem("shortlist");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    fetchCandidates();
  }, []);

  // Persist shortlist
  useEffect(() => {
    localStorage.setItem("shortlist", JSON.stringify(shortlist));
  }, [shortlist]);

  async function fetchCandidates() {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/submissions");
      const data = await res.json();
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch submissions:", err);
      setErrorMessage("Failed to load candidates. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  // Add / remove availability values
  function toggleAvailability(value) {
    setNewAvailability((prev) => {
      const s = new Set(prev || []);
      if (s.has(value)) s.delete(value);
      else s.add(value);
      return Array.from(s);
    });
  }

  // Add a new experience input row
  function addExperienceRow() {
    setNewExperiences((prev) => [...prev, { role: "", company: "" }]);
  }
  function removeExperienceRow(index) {
    setNewExperiences((prev) => prev.filter((_, i) => i !== index));
  }
  function updateExperience(index, field, value) {
    setNewExperiences((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  // POST to backend
  async function handleAddCandidate(e) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    const work_experiences = newExperiences
      .map((x) => ({ role: (x.role || "").trim(), company: (x.company || "").trim() }))
      .filter((x) => x.role || x.company);

    const payload = {
      name: (newName || "").trim(),
      work_availability: newAvailability,
      work_experiences,
    };

    if (!payload.name) {
      setErrorMessage("Name is required");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Server returned ${res.status}`);
      }

      const data = await res.json();
      // Append server-saved candidate
      setSubmissions((prev) => [...prev, data.candidate || payload]);
      setSuccessMessage("Candidate added successfully");
      setNewName("");
      setNewAvailability([]);
      setNewExperiences([{ role: "", company: "" }]);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Add candidate failed:", err);
      setErrorMessage("Failed to add candidate — check backend logs or network tab.");
    } finally {
      setSubmitting(false);
    }
  }

  // Search / filter / sort computed list
  const filtered = submissions
    .filter((c) => {
      if (!c) return false;
      if (filterAvailability && !(c.work_availability || []).includes(filterAvailability)) return false;
      if (query) {
        const q = query.toLowerCase();
        if ((c.name || "").toLowerCase().includes(q)) return true;
        // search in experiences
        if ((c.work_experiences || []).some((e) => `${e.role} ${e.company}`.toLowerCase().includes(q))) return true;
        return false;
      }
      return true;
    });

  const sorted = sortKey === "experience"
    ? [...filtered].sort((a, b) => (b.work_experiences?.length || 0) - (a.work_experiences?.length || 0))
    : filtered;

  // Shortlist management
  function toggleShortlist(candidate) {
    setShortlist((prev) => {
      const exists = prev.find((x) => x.id === candidate.id);
      if (exists) return prev.filter((x) => x.id !== candidate.id);
      if (prev.length >= 5) {
        alert("Shortlist limit: 5 candidates");
        return prev;
      }
      // add with default reason (auto)
      return [...prev, { ...candidate, reason: autoReason(candidate) }];
    });
  }

  function updateReason(candidateId, text) {
    setShortlist((prev) => prev.map((c) => (c.id === candidateId ? { ...c, reason: text } : c)));
  }

  function removeFromShortlist(candidateId) {
    setShortlist((prev) => prev.filter((c) => c.id !== candidateId));
  }

  // Auto-suggest reason based on experiences/availability/keywords
  function autoReason(candidate) {
    const exp = candidate.work_experiences?.length || 0;
    const hasSeniorKeyword = (candidate.work_experiences || []).some((e) =>
      /senior|lead|principal|manager|architect/i.test(`${e.role}`)
    );
    if (hasSeniorKeyword) return "Senior experience and leadership potential";
    if (exp >= 5) return "Highly experienced across multiple roles";
    if (exp >= 3) return "Experienced candidate with relevant roles";
    if ((candidate.work_availability || []).includes("full-time")) return "Available full-time and promising";
    return "Promising candidate";
  }

  // Export shortlist as JSON or prepare email text
  function exportShortlistJSON() {
    const data = JSON.stringify(shortlist, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shortlist.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportEmailText() {
    const lines = ["Subject: Hiring Shortlist — 5 Candidates", "", "Hi team,", "", "I recommend we hire the following 5 candidates:", ""];
    shortlist.forEach((c, i) => {
      lines.push(`${i + 1}. ${c.name} — ${c.work_availability?.join(", ") || "N/A"}`);
      lines.push(`   Reason: ${c.reason || ""}`);
      lines.push("");
    });
    lines.push("— End of shortlist");
    const text = lines.join("\n");
    navigator.clipboard?.writeText(text);
    alert("Email text copied to clipboard");
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif", backgroundColor: "#f5f7f9", minHeight: "100vh" }}>
      <header style={{ background: "#007bff", color: "#fff", padding: 20, borderRadius: 8, marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>📋 Candidate Dashboard</h1>
        <div style={{ marginTop: 6, opacity: 0.9, fontSize: 14 }}>Ingest, explore, shortlist, and justify hires (demo-ready)</div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
        {/* Left column: Add candidate + Explorer */}
        <div>
          {/* Add Candidate */}
          <section style={{ background: "#fff", padding: 16, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Add New Candidate</h3>

            {successMessage && <div style={{ color: "green" }}>{successMessage}</div>}
            {errorMessage && <div style={{ color: "crimson" }}>{errorMessage}</div>}

            <form onSubmit={handleAddCandidate}>
              <div style={{ marginBottom: 8 }}>
                <input
                  placeholder="Full name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }}
                  required
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ marginRight: 12 }}>
                  <input type="checkbox" checked={newAvailability.includes("full-time")} value="full-time" onChange={() => toggleAvailability("full-time")} /> Full-time
                </label>
                <label>
                  <input type="checkbox" checked={newAvailability.includes("part-time")} value="part-time" onChange={() => toggleAvailability("part-time")} /> Part-time
                </label>
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Work Experiences</div>
                {newExperiences.map((row, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <input
                      placeholder="Role (e.g. Software Engineer)"
                      value={row.role}
                      onChange={(e) => updateExperience(i, "role", e.target.value)}
                      style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #ddd" }}
                    />
                    <input
                      placeholder="Company (e.g. Google)"
                      value={row.company}
                      onChange={(e) => updateExperience(i, "company", e.target.value)}
                      style={{ width: 180, padding: 8, borderRadius: 6, border: "1px solid #ddd" }}
                    />
                    <button type="button" onClick={() => removeExperienceRow(i)} style={{ background: "#eee", border: "1px solid #ddd", borderRadius: 6, padding: "6px 8px" }}>
                      ✕
                    </button>
                  </div>
                ))}

                <div>
                  <button type="button" onClick={addExperienceRow} style={{ background: "#007bff", color: "#fff", padding: "8px 12px", borderRadius: 6, border: "none" }}>
                    + Add experience
                  </button>
                </div>
              </div>

              <div>
                <button type="submit" disabled={submitting} style={{ background: "#28a745", color: "#fff", border: "none", padding: "10px 16px", borderRadius: 6 }}>
                  {submitting ? "Adding..." : "Add Candidate"}
                </button>
              </div>
            </form>
          </section>

          {/* Explorer: search / filter / sort */}
          <section style={{ background: "#fff", padding: 16, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <input placeholder="Search name or experience..." value={query} onChange={(e) => setQuery(e.target.value)}
                     style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
              <select value={filterAvailability} onChange={(e) => setFilterAvailability(e.target.value)} style={{ padding: 8, borderRadius: 6 }}>
                <option value="">All availability</option>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
              </select>
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} style={{ padding: 8, borderRadius: 6 }}>
                <option value="">Sort: None</option>
                <option value="experience">Sort: Experience (desc)</option>
              </select>
              <button onClick={fetchCandidates} style={{ padding: "8px 10px", borderRadius: 6 }}>Refresh</button>
            </div>

            <div style={{ marginBottom: 8, fontSize: 14, color: "#333" }}>
              {loading ? "Loading candidates..." : `${sorted.length} candidates`}
            </div>

            {/* Top 5 Candidates */}
            {sorted.length > 0 && (
              <section style={{ marginBottom: 16 }}>
                <h4 style={{ margin: "8px 0" }}>🏆 Top 5 Candidates</h4>
                <ol style={{ paddingLeft: 20, margin: "6px 0" }}>
                  {sorted.slice(0, 5).map((c) => (
                    <li key={c.id || c.name} style={{ marginBottom: 6 }}>
                      <strong>{c.name}</strong> — {c.work_experiences?.length || 0} experiences
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Candidate grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 12 }}>
              {sorted.map((c) => (
                <div key={c.id || c.name} style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #e6e6e6" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div><strong>{c.name}</strong></div>
                    <div style={{ fontSize: 12, color: "#666" }}>{new Date(c.created_at || Date.now()).toLocaleDateString()}</div>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    {(c.work_availability || []).map((w, i) => (
                      <span key={i} style={{ display: "inline-block", padding: "3px 8px", marginRight: 6, borderRadius: 12, fontSize: 12, color: "#fff", background: w === "full-time" ? "#28a745" : "#ffc107" }}>
                        {w}
                      </span>
                    ))}
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <strong>Work:</strong>
                    <ul style={{ margin: "6px 0 0 14px", padding: 0 }}>
                      {(c.work_experiences || []).slice(0, 5).map((w, i) => <li key={i} style={{ fontSize: 14 }}>{(w.role || "") + (w.company ? ` @ ${w.company}` : "")}</li>)}
                    </ul>
                  </div>

                  <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                    <button onClick={() => toggleShortlist(c)} style={{ padding: "6px 8px", borderRadius: 6, border: "none", background: shortlist.find(x => x.id === c.id) ? "#ffc107" : "#007bff", color: "#fff" }}>
                      {shortlist.find(x => x.id === c.id) ? "Remove" : "Shortlist"}
                    </button>
                    <button onClick={() => {
                      const r = prompt("Add a quick note/reason for this candidate (optional):", autoReason(c));
                      if (r !== null) {
                        setShortlist((prev) => {
                          const exists = prev.find(x => x.id === c.id);
                          if (exists) return prev.map(x => x.id === c.id ? { ...x, reason: r } : x);
                          if (prev.length >= 5) { alert("Limit 5"); return prev; }
                          return [...prev, { ...c, reason: r }];
                        });
                      }
                    }} style={{ padding: "6px 8px", borderRadius: 6 }}>Quick Note</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right column: Shortlist panel */}
        <aside style={{ background: "#fff", padding: 16, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <h3 style={{ marginTop: 0 }}>Shortlist ({shortlist.length}/5)</h3>

          {shortlist.length === 0 && <div style={{ color: "#666" }}>No shortlisted candidates yet. Click "Shortlist" on a candidate.</div>}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {shortlist.map((c) => (
              <div key={c.id} style={{ border: "1px solid #eee", padding: 8, borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div><strong>{c.name}</strong></div>
                  <div style={{ color: "#666", fontSize: 12 }}>{(c.work_availability || []).join(", ")}</div>
                </div>
                <div style={{ marginTop: 6 }}>
                  <textarea
                    placeholder="Reason..."
                    value={c.reason || ""}
                    onChange={(e) => updateReason(c.id, e.target.value)}
                    style={{ width: "100%", minHeight: 40, borderRadius: 6, border: "1px solid #ddd", padding: 6 }}
                  />
                </div>
                <div style={{ marginTop: 6 }}>
                  <button onClick={() => removeFromShortlist(c.id)} style={{ background: "#dc3545", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 6 }}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {shortlist.length > 0 && (
            <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
              <button onClick={exportShortlistJSON} style={{ flex: 1, background: "#17a2b8", color: "#fff", border: "none", padding: "8px", borderRadius: 6 }}>Export JSON</button>
              <button onClick={exportEmailText} style={{ flex: 1, background: "#6c757d", color: "#fff", border: "none", padding: "8px", borderRadius: 6 }}>Copy Email</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default App;
