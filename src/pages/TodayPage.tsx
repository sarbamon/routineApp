import { useState, useEffect } from "react";
import {
  Editor,
  EditorProvider,
  Toolbar,
  BtnBold,
  BtnItalic,
  BtnUnderline,
  BtnNumberedList,
  BtnBulletList,
} from "react-simple-wysiwyg";
import { API_URL } from "../config/api";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  date: string;
}

const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>
);

export default function TodayPage() {
  const [todos,     setTodos]     = useState<Todo[]>([]);
  const [todoInput, setTodoInput] = useState("");
  const [note,      setNote]      = useState("");
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const token = localStorage.getItem("token");

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchToday = async () => {
    try {
      const res  = await fetch(`${API_URL}/api/today`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      // Migrate old string todos → new object format
      const raw: (string | Todo)[] = data.todos || [];
      const migrated: Todo[] = raw.map((t, i) =>
        typeof t === "string"
          ? { id: Date.now() + i, text: t, completed: false, date: today }
          : t
      );

      setTodos(migrated);
      setNote(data.notes || "");
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchToday(); }, []);

  // ── Save ──────────────────────────────────────────────────────────────────
  const saveToday = async (newTodos: Todo[], newNote: string) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/today`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ todos: newTodos, notes: newNote }),
      });
      if (!res.ok) {
        const err = await res.json();
        console.error("Save failed:", err);
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const addTodo = () => {
    if (!todoInput.trim()) return;
    const newTodo: Todo = {
      id: Date.now(),
      text: todoInput.trim(),
      completed: false,
      date: today,
    };
    const updated = [...todos, newTodo];
    setTodos(updated);
    setTodoInput("");
    saveToday(updated, note);
  };

  const toggleTodo = (id: number) => {
    const updated = todos.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    setTodos(updated);
    saveToday(updated, note);
  };

  const deleteTodo = (id: number) => {
    const updated = todos.filter(t => t.id !== id);
    setTodos(updated);
    saveToday(updated, note);
  };

  const updateNote = (value: string) => {
    setNote(value);
    saveToday(todos, value);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const completed = todos.filter(t => t.completed).length;
  const total     = todos.length;
  const pct       = total ? Math.round((completed / total) * 100) : 0;

  const pendingTodos   = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  if (loading) return (
    <div className="min-h-screen bg-[#04040a] flex items-center justify-center">
      <p className="text-slate-500 text-sm">Loading...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-6 min-h-screen bg-[#04040a] text-slate-200">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Today</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long", day: "numeric",
              month: "long",  year: "numeric",
            })}
          </p>
        </div>
        {saving && (
          <span className="text-[10px] text-slate-600 uppercase tracking-widest font-bold animate-pulse">
            Saving...
          </span>
        )}
      </div>

      {/* ── Progress bar ── */}
      {total > 0 && (
        <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Task Progress
            </span>
            <span className={`text-[11px] font-bold ${pct === 100 ? "text-emerald-400" : "text-slate-400"}`}>
              {completed}/{total} done {pct === 100 && "🔥"}
            </span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: pct === 100 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#6366f1",
              }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* ── Todo List ── */}
        <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Tasks
            </h2>
            {total > 0 && (
              <span className="text-[9px] font-bold text-slate-600">
                {total} task{total !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Task list */}
          <div className="space-y-2 mb-4 max-h-96 overflow-y-auto pr-0.5">

            {todos.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-2xl mb-2 opacity-30">📋</div>
                <p className="text-xs text-slate-600">No tasks yet. Add one below!</p>
              </div>
            ) : (
              <>
                {/* ── Pending ── */}
                {pendingTodos.map(todo => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleTodo(todo.id)}
                      className="w-5 h-5 rounded-lg border-2 border-white/20 bg-transparent flex items-center justify-center shrink-0 cursor-pointer hover:border-emerald-500/50 transition-colors"
                    />

                    <span className="flex-1 text-sm text-slate-200 break-words">
                      {todo.text}
                    </span>

                    {/* Delete — always visible */}
                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer shrink-0"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))}

                {/* ── Completed ── */}
                {completedTodos.length > 0 && (
                  <>
                    <div className="pt-2 pb-1">
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                        Completed ({completedTodos.length})
                      </p>
                    </div>
                    {completedTodos.map(todo => (
                      <div
                        key={todo.id}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.01] border border-white/[0.02] opacity-50"
                      >
                        {/* Checked */}
                        <button
                          onClick={() => toggleTodo(todo.id)}
                          className="w-5 h-5 rounded-lg bg-emerald-500 border-2 border-emerald-500 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </button>

                        <span className="flex-1 text-sm text-slate-500 line-through break-words">
                          {todo.text}
                        </span>

                        {/* Delete — always visible */}
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer shrink-0"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>

          {/* ── Add input ── */}
          <div className="flex gap-2">
            <input
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-slate-200 text-sm outline-none focus:border-emerald-500/40 transition-colors placeholder:text-slate-600"
              placeholder="Add a new task..."
              value={todoInput}
              onChange={e => setTodoInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTodo()}
            />
            <button
              onClick={addTodo}
              disabled={!todoInput.trim()}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer shrink-0"
            >
              Add
            </button>
          </div>
        </div>

        {/* ── Notes / Reminder ── */}
        <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-4">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
            Reminder / Notes
          </h2>

          <div
            className="rounded-xl overflow-hidden border border-white/[0.06]"
            style={{
              "--rsw-btn-color": "#94a3b8",
              "--rsw-toolbar-background": "#161628",
              "--rsw-toolbar-border-bottom": "1px solid rgba(255,255,255,0.06)",
              "--rsw-editor-background": "#0d0d1a",
              "--rsw-color": "#e2e8f0",
            } as React.CSSProperties}
          >
            <EditorProvider>
              <Toolbar>
                <BtnBold />
                <BtnItalic />
                <BtnUnderline />
                <BtnNumberedList />
                <BtnBulletList />
              </Toolbar>
              <Editor
                value={note}
                onChange={e => updateNote(e.target.value)}
                containerProps={{
                  style: {
                    minHeight: "300px",
                    background: "#0d0d1a",
                    color: "#e2e8f0",
                    padding: "12px",
                    fontSize: "14px",
                  },
                }}
              />
            </EditorProvider>
          </div>
        </div>

      </div>
    </div>
  );
}