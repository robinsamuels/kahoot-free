"use client";

import { useEffect, useMemo, useState } from "react";

type Quiz = { id: string; title: string };

async function api<T>(path: string, method: "GET" | "POST", adminPass: string, body?: any): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-admin-pass": adminPass,
    },
    body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export default function AdminPage() {
  const [adminPass, setAdminPass] = useState("");
  const [authed, setAuthed] = useState(false);

  // Create quiz
  const [newQuizTitle, setNewQuizTitle] = useState("");
  const [creating, setCreating] = useState(false);

  // Questions
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const [qType, setQType] = useState<"text" | "image_text" | "image_reveal">("text");
  const [prompt, setPrompt] = useState("");
  const [imgUrl, setImgUrl] = useState("");
  const [optA, setOptA] = useState("");
  const [optB, setOptB] = useState("");
  const [optC, setOptC] = useState("");
  const [optD, setOptD] = useState("");
  const [correctIndex, setCorrectIndex] = useState(0);
  const [timeLimit, setTimeLimit] = useState(20);
  const [marks, setMarks] = useState(100);
  const [savingQ, setSavingQ] = useState(false);

  const options = useMemo(() => [optA, optB, optC, optD], [optA, optB, optC, optD]);

  // Simple auth gate (kept client-side since API routes actually enforce ADMIN_PASS)
  async function unlock() {
    try {
      await api("/api/admin/list-quizzes", "GET", adminPass);
      setAuthed(true);
      // load quizzes
      const out = await api<{ quizzes: Quiz[] }>("/api/admin/list-quizzes", "GET", adminPass);
      setQuizzes(out.quizzes);
      if (out.quizzes.length && !selectedQuizId) setSelectedQuizId(out.quizzes[0].id);
    } catch (e: any) {
      alert("Wrong admin PIN");
      setAuthed(false);
    }
  }

  async function createQuiz() {
    if (!newQuizTitle.trim()) return alert("Enter a title");
    setCreating(true);
    try {
      const out = await api<{ quiz: Quiz }>("/api/admin/create-quiz", "POST", adminPass, { title: newQuizTitle });
      setQuizzes((q) => [out.quiz, ...q]);
      setSelectedQuizId(out.quiz.id);
      setNewQuizTitle("");
      alert("Quiz created!");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function addQuestion() {
    if (!selectedQuizId) return alert("Pick a quiz");
    if (!prompt.trim()) return alert("Enter a question");
    if (options.some((o) => !o.trim())) return alert("All 4 options are required");

    setSavingQ(true);
    try {
      await api("/api/admin/add-question", "POST", adminPass, {
        quiz_id: selectedQuizId,
        type: qType,
        prompt,
        image_url: imgUrl.trim() || null,
        options,
        correct_index: correctIndex,
        time_limit_sec: timeLimit,
        marks,
      });
      // Clear fields for next question
      setPrompt("");
      setImgUrl("");
      setOptA(""); setOptB(""); setOptC(""); setOptD("");
      setCorrectIndex(0);
      setTimeLimit(20);
      setMarks(100);
      alert("Question added!");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSavingQ(false);
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4 border rounded-2xl p-6 shadow">
          <h1 className="text-xl font-semibold">Admin Login</h1>
          <input
            type="password"
            placeholder="Enter Admin Password for Rahoot"
            className="w-full border rounded p-2"
            value={adminPass}
            onChange={(e) => setAdminPass(e.target.value)}
          />
          <button onClick={unlock} className="w-full rounded-xl p-2 border hover:bg-gray-50">
            Enter
          </button>
          <p className="text-xs text-gray-500">Use the Password you set in <code>ADMIN_PASS</code>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Quiz Admin</h1>

      {/* Create Quiz */}
      <section className="border rounded-2xl p-4 space-y-3">
        <h2 className="font-semibold">Create a new quiz</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded p-2"
            placeholder="Quiz title"
            value={newQuizTitle}
            onChange={(e) => setNewQuizTitle(e.target.value)}
          />
          <button disabled={creating} onClick={createQuiz} className="rounded-xl p-2 border hover:bg-gray-50">
            {creating ? "Creating…" : "Create"}
          </button>
        </div>
      </section>

      {/* Add Question */}
      <section className="border rounded-2xl p-4 space-y-4">
        <h2 className="font-semibold">Add a question</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Quiz</span>
            <select className="border rounded p-2" value={selectedQuizId} onChange={(e) => setSelectedQuizId(e.target.value)}>
              {quizzes.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Question type</span>
            <select className="border rounded p-2" value={qType} onChange={(e) => setQType(e.target.value as any)}>
              <option value="text">Text</option>
              <option value="image_text">Image + Text</option>
              <option value="image_reveal">Image (progressive reveal)</option>
            </select>
          </label>

          <label className="md:col-span-2 flex flex-col gap-1">
            <span className="text-sm text-gray-600">Question</span>
            <textarea className="border rounded p-2" rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </label>

          <label className="md:col-span-2 flex flex-col gap-1">
            <span className="text-sm text-gray-600">Image URL (optional)</span>
            <input className="border rounded p-2" placeholder="https://…" value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Option A</span>
            <input className="border rounded p-2" value={optA} onChange={(e) => setOptA(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Option B</span>
            <input className="border rounded p-2" value={optB} onChange={(e) => setOptB(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Option C</span>
            <input className="border rounded p-2" value={optC} onChange={(e) => setOptC(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Option D</span>
            <input className="border rounded p-2" value={optD} onChange={(e) => setOptD(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Correct option</span>
            <select className="border rounded p-2" value={correctIndex} onChange={(e) => setCorrectIndex(parseInt(e.target.value, 10))}>
              <option value={0}>A</option>
              <option value={1}>B</option>
              <option value={2}>C</option>
              <option value={3}>D</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Time limit (sec)</span>
            <input type="number" className="border rounded p-2" value={timeLimit} onChange={(e) => setTimeLimit(parseInt(e.target.value, 10) || 0)} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Marks</span>
            <input type="number" className="border rounded p-2" value={marks} onChange={(e) => setMarks(parseInt(e.target.value, 10) || 0)} />
          </label>
        </div>

        <button disabled={savingQ} onClick={addQuestion} className="rounded-xl p-2 border hover:bg-gray-50">
          {savingQ ? "Saving…" : "Add question"}
        </button>
      </section>
    </div>
  );
}
