import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePagesContext } from "../context/PagesContext";
import { API_URL } from "../config/api";

interface Todo {
  _id?: string;
  id?: number | string;
  text: string;
  completed: boolean;
  createdAt?: string;
}

interface MoneyData {
  spent: number;
  budget: number;
}

interface AttendanceDay {
  date: string;
  present: boolean;
}

const intentions = [
  "Cultivate deep clarity through intentional stillness and focused action.",
  "Show up fully — one moment, one task, one breath at a time.",
  "Progress over perfection. Every step forward counts.",
  "Be the energy you want to attract today.",
  "Small consistent actions build extraordinary results.",
  "Today is a fresh start. Make it count.",
  "Your only competition is who you were yesterday.",
];

const getDailyIntention = () => intentions[new Date().getDay() % intentions.length];

export default function HomePage() {
  const navigate         = useNavigate();
  const { enabledPages } = usePagesContext();
  const username         = localStorage.getItem("username") || "there";
  const token            = localStorage.getItem("token");
  const headers          = { Authorization: `Bearer ${token}` };

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const hasToday      = enabledPages.includes("today");
  const hasRoutine    = enabledPages.includes("routine");
  const hasMoney      = enabledPages.includes("money");
  const hasAttendance = enabledPages.includes("attendance");
  const hasMonthly    = enabledPages.includes("monthly");
  const nothingEnabled = !hasToday && !hasRoutine && !hasMoney && !hasAttendance && !hasMonthly;

  const [loading,        setLoading]        = useState(true);
  const [todayTodos,     setTodayTodos]     = useState<Todo[]>([]);
  const [money,          setMoney]          = useState<MoneyData | null>(null);
  const [attendance,     setAttendance]     = useState<AttendanceDay[]>([]);
  const [streak,         setStreak]         = useState(0);
  const [weeklyData,     setWeeklyData]     = useState<{ day: string; value: number; isToday: boolean }[]>([]);
  const [routine,        setRoutine]        = useState<{ name: string; duration: string } | null>(null);

  useEffect(() => {
    const safe = async (url: string) => {
      try {
        const r = await fetch(`${API_URL}${url}`, { headers });
        if (!r.ok) return null;
        return await r.json();
      } catch { return null; }
    };

    const load = async () => {
      const calls: Promise<any>[] = [];
      const keys:  string[]       = [];

      if (hasToday)      { calls.push(safe("/api/today"));      keys.push("today");      }
      if (hasMoney)      { calls.push(safe("/api/money"));      keys.push("money");      }
      if (hasAttendance) { calls.push(safe("/api/attendance")); keys.push("attendance"); }
      if (hasRoutine)    { calls.push(safe("/api/routines"));   keys.push("routine");    }

      const results = await Promise.all(calls);
      const data: Record<string, any> = {};
      keys.forEach((k, i) => { data[k] = results[i]; });

      // Today todos
      if (data.today?.todos) {
        const todos = data.today.todos as Todo[];
        setTodayTodos(todos);

        const doneCnt = todos.filter(t => t.completed).length;
        setStreak(doneCnt > 0 ? doneCnt : 0);

        const days     = ["MON","TUE","WED","THU","FRI","SAT","SUN"];
        const todayIdx = new Date().getDay();
        const mapped   = todayIdx === 0 ? 6 : todayIdx - 1;
        setWeeklyData(days.map((day, i) => ({
          day,
          value:   i === mapped ? doneCnt : 0,
          isToday: i === mapped,
        })));
      } else if (hasToday || hasMonthly) {
        const days     = ["MON","TUE","WED","THU","FRI","SAT","SUN"];
        const todayIdx = new Date().getDay();
        const mapped   = todayIdx === 0 ? 6 : todayIdx - 1;
        setWeeklyData(days.map((day, i) => ({ day, value: 0, isToday: i === mapped })));
      }

      // Money
      if (data.money) {
        const totalIncome   = (data.money.income   || []).reduce((s: number, i: any) => s + i.amount, 0);
        const totalExpenses = (data.money.expenses || []).reduce((s: number, e: any) => s + e.amount, 0);
        setMoney({ spent: totalExpenses, budget: totalIncome });
      }

      // Attendance
      if (Array.isArray(data.attendance)) {
        setAttendance(
          data.attendance.map((r: any) => ({
            date:    r.date,
            present: r.status === "present",
          }))
        );
      }

      // Routine
      if (Array.isArray(data.routine) && data.routine.length > 0) {
        const first = data.routine[0];
        setRoutine({
          name:     first.name || first.title || "My Routine",
          duration: first.duration || first.time || "",
        });
      }

      setLoading(false);
    };

    load();
  }, [hasToday, hasMoney, hasAttendance, hasRoutine, hasMonthly]);

  const getItemId = (t: Todo) => t._id || (t as any).id;

  const toggleTodo = async (id: string | number, completed: boolean) => {
    const updated = todayTodos.map(t => getItemId(t) === id ? { ...t, completed } : t);
    setTodayTodos(updated);
    await fetch(`${API_URL}/api/today`, {
      method:  "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body:    JSON.stringify({ todos: updated }),
    });
  };

  const deleteSingleTodo = async (id: string | number) => {
    const updated = todayTodos.filter(t => getItemId(t) !== id);
    setTodayTodos(updated);
    await fetch(`${API_URL}/api/today`, {
      method:  "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body:    JSON.stringify({ todos: updated }),
    });
  };

  const clearAllTodos = async () => {
    if (!window.confirm("Are you sure you want to delete all tasks for today?")) return;
    setTodayTodos([]);
    await fetch(`${API_URL}/api/today`, {
      method:  "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body:    JSON.stringify({ todos: [] }),
    });
  };

  const todayDone  = todayTodos.filter(t => t.completed).length;
  const todayTotal = todayTodos.length;
  const todoPct    = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;
  const moneyPct   = money ? Math.min(Math.round((money.spent / (money.budget || 1)) * 100), 100) : 0;
  const attPresent = attendance.filter(d => d.present).length;
  const maxWeekly  = Math.max(...weeklyData.map(d => d.value), 1);

  const getPraise = () => {
    if (todayDone === todayTotal && todayTotal > 0) return `🏆 All ${todayTotal} tasks done! Incredible day!`;
    if (todayDone > 0) return `🔥 ${todayDone} of ${todayTotal} done — keep pushing!`;
    if (streak >= 7)   return `🏆 ${streak}-day streak! You're unstoppable.`;
    return `💡 A fresh slate awaits. Let's make today count!`;
  };

  if (loading) return (
    <div className="min-h-screen bg-[#04040a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Loading your dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#04040a] text-slate-200 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Dashboard Hero Banner ── */}
        <div className="bg-[#0d0d1a] border border-white/[0.08] rounded-3xl p-6 md:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Live Dashboard</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">
              {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 capitalize">{username}</span>
            </h1>
            <p className="text-xs md:text-sm mt-3 text-slate-300 leading-relaxed font-medium">
              <span className="text-slate-500">Today's intention: </span>
              <span className="text-emerald-300 italic">"{getDailyIntention()}"</span>
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-3">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </p>
          </div>

          {/* Hero Quick Stats */}
          <div className="flex items-center gap-3 relative z-10 shrink-0">
            <div className="px-4 py-3 bg-white/[0.03] border border-white/5 rounded-2xl text-center min-w-[90px]">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Today</p>
              <p className="text-xl font-black font-mono text-emerald-400">{todayDone}/{todayTotal}</p>
            </div>
            <div className="px-4 py-3 bg-white/[0.03] border border-white/5 rounded-2xl text-center min-w-[90px]">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Attendance</p>
              <p className="text-xl font-black font-mono text-cyan-400">
                {attendance.length > 0 ? `${Math.round((attPresent / attendance.length) * 100)}%` : "N/A"}
              </p>
            </div>
          </div>
        </div>

        {nothingEnabled && (
          <div className="bg-[#0d0d1a] border border-white/[0.08] rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="text-5xl opacity-30">🧩</div>
            <p className="text-sm font-bold text-white">No active dashboard modules</p>
            <p className="text-xs text-slate-500 max-w-sm">Enable your preferred modules (Routine, Tasks, Money, Attendance, Monthly Report) in Settings.</p>
            <button
              onClick={() => navigate("/settings")}
              className="mt-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-[0_0_16px_rgba(16,185,129,0.3)]"
            >
              ⚙️ Open Settings
            </button>
          </div>
        )}

        {/* ── Main Responsive Grid Layout ── */}
        {!nothingEnabled && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ══ Left / Main Column (2/3 width on desktop) ══ */}
            <div className="lg:col-span-2 space-y-6">

              {/* ── Today's Tasks Module ── */}
              {hasToday && (
                <div className="bg-[#0d0d1a] border border-white/[0.08] rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div>
                      <h2 className="text-sm font-black text-white">Today's Schedule</h2>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">Tasks & Action Items</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {todayTotal > 0 && (
                        <button
                          onClick={clearAllTodos}
                          className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                          title="Delete all tasks"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14H6L5 6"/>
                            <path d="M10 11v6"/>
                            <path d="M14 11v6"/>
                            <path d="M9 6V4h6v2"/>
                          </svg>
                          <span>Clear All</span>
                        </button>
                      )}
                      <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black rounded-xl">
                        {todayDone} / {todayTotal} Completed
                      </span>
                    </div>
                  </div>

                  {todayTotal > 0 && (
                    <div className="mb-4">
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-700"
                          style={{ width: `${todoPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 mb-4 max-h-64 overflow-y-auto pr-1">
                    {todayTodos.length === 0 ? (
                      <div className="py-8 text-center opacity-30">
                        <div className="text-3xl mb-1">📋</div>
                        <p className="text-xs text-slate-500">No tasks added for today yet.</p>
                      </div>
                    ) : (
                      todayTodos.map(todo => {
                        const todoId = getItemId(todo);
                        return (
                          <div key={todoId} className="p-3 bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-between gap-3 hover:bg-white/[0.05] transition-all group">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <button
                                onClick={() => toggleTodo(todoId, !todo.completed)}
                                className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                  todo.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-white/20 hover:border-emerald-500/50"
                                }`}
                              >
                                {todo.completed && (
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
                                    <polyline points="20 6 9 17 4 12"/>
                                  </svg>
                                )}
                              </button>
                              <span className={`text-xs font-medium truncate ${todo.completed ? "line-through text-slate-500" : "text-slate-200"}`}>
                                {todo.text}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                todo.completed ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                              }`}>
                                {todo.completed ? "Done" : "Pending"}
                              </span>
                              <button
                                onClick={() => deleteSingleTodo(todoId)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                                title="Delete task"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6l-1 14H6L5 6"/>
                                  <path d="M10 11v6"/>
                                  <path d="M14 11v6"/>
                                  <path d="M9 6V4h6v2"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <button
                    onClick={() => navigate("/today")}
                    className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-[0_0_16px_rgba(139,92,246,0.3)]"
                  >
                    Open Today Workspace →
                  </button>
                </div>
              )}

              {/* ── Money Overview Module ── */}
              {hasMoney && (
                <div
                  onClick={() => navigate("/money")}
                  className="bg-[#0d0d1a] border border-white/[0.08] rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] cursor-pointer hover:border-violet-500/40 transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-black text-white">Financial Summary</h2>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">Budget & Expenses</p>
                    </div>
                    {money && money.budget > 0 && (
                      <span className={`text-xs font-mono font-black ${moneyPct >= 90 ? "text-red-400" : "text-violet-400"}`}>
                        {moneyPct}% Spent
                      </span>
                    )}
                  </div>

                  {money && money.budget > 0 ? (
                    <>
                      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden mb-3 border border-white/5">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${moneyPct >= 90 ? "bg-red-500" : "bg-violet-500"}`}
                          style={{ width: `${moneyPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Spent: <strong className="text-white font-mono">₹{money.spent.toLocaleString()}</strong></span>
                        <span className="text-slate-400">Income: <strong className="text-emerald-400 font-mono">₹{money.budget.toLocaleString()}</strong></span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                      <span className="text-2xl">💰</span>
                      <div>
                        <p className="text-xs font-bold text-white">Track Finances</p>
                        <p className="text-[10px] text-slate-500">Tap to record income & expenses for this month</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Monthly Analytics Module ── */}
              {(hasMonthly || hasToday) && (
                <div className="bg-[#0d0d1a] border border-white/[0.08] rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-black text-white">Monthly Analytics</h2>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">Weekly Completion Frequency</p>
                    </div>
                    <button
                      onClick={() => navigate("/monthly")}
                      className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 px-3 py-1 rounded-xl bg-emerald-500/10 cursor-pointer uppercase tracking-wider"
                    >
                      Full Report →
                    </button>
                  </div>

                  <div className="flex items-end justify-between gap-2 pt-2" style={{ height: 110 }}>
                    {weeklyData.map((d) => (
                      <div key={`weekly-${d.day}`} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full flex items-end justify-center" style={{ height: 80 }}>
                          <div
                            className={`w-full rounded-t-lg transition-all duration-700 ${
                              d.isToday ? "bg-gradient-to-t from-emerald-500 to-cyan-400" : "bg-white/10 hover:bg-white/20"
                            }`}
                            style={{ height: `${Math.max((d.value / maxWeekly) * 80, 8)}px` }}
                          />
                        </div>
                        <span className={`text-[8px] font-black uppercase ${d.isToday ? "text-cyan-400 font-bold" : "text-slate-600"}`}>
                          {d.day}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* ══ Right Sidebar Column (1/3 width on desktop) ══ */}
            <div className="space-y-6">

              {/* ── Productivity Status Card ── */}
              {hasToday && (
                <div className="bg-[#0d0d1a] border border-white/[0.08] rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden">
                  <div className="absolute right-4 top-4 text-5xl opacity-10">🔥</div>
                  <p className="text-xs font-black text-white mb-2">Productivity Pulse</p>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-5xl font-black text-white font-mono">{todayDone}</span>
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">/ {todayTotal} Done</span>
                  </div>
                  <p className="text-xs text-slate-400 italic font-medium mt-2">{getPraise()}</p>
                </div>
              )}

              {/* ── Routine Widget ── */}
              {hasRoutine && (
                <div
                  onClick={() => navigate("/")}
                  className="bg-[#0d0d1a] border border-white/[0.08] rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] cursor-pointer hover:border-emerald-500/40 transition-all flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl shrink-0">
                      🧘
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white">Daily Routine</p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {routine ? `${routine.name}${routine.duration ? ` • ${routine.duration}` : ""}` : "Tap to open schedule"}
                      </p>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-emerald-400 ml-0.5">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  </div>
                </div>
              )}

              {/* ── Attendance Widget ── */}
              {hasAttendance && (
                <div
                  onClick={() => navigate("/attendance")}
                  className="bg-[#0d0d1a] border border-white/[0.08] rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] cursor-pointer hover:border-cyan-500/40 transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-black text-white">Attendance</p>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                      attendance.length > 0 && Math.round((attPresent / attendance.length) * 100) >= 75
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}>
                      {attendance.length > 0 ? `${Math.round((attPresent / attendance.length) * 100)}%` : "0%"}
                    </span>
                  </div>

                  <div className="flex gap-1.5 flex-wrap mb-4">
                    {attendance.slice(-21).map((d, i) => (
                      <div key={`att-${d.date}-${i}`} className={`w-3.5 h-3.5 rounded-md ${d.present ? "bg-emerald-400" : "bg-white/10"}`} />
                    ))}
                  </div>

                  <p className="text-xs text-slate-400 font-medium">
                    {attPresent} / {attendance.length} days present this month
                  </p>
                </div>
              )}

            </div>

          </div>
        )}

      </div>
    </div>
  );
}