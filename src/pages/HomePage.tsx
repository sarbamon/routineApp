import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePagesContext } from "../context/PagesContext";
import { API_URL } from "../config/api";

interface Todo {
  _id: string;
  text: string;
  completed: boolean;
  createdAt: string;
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

      // ── Today todos ───────────────────────────────────────────────────────
      if (data.today?.todos) {
        const todos = data.today.todos as Todo[];
        setTodayTodos(todos);

        const doneCnt = todos.filter(t => t.completed).length;
        setStreak(doneCnt > 0 ? doneCnt : 0);

        // Build weekly chart with today's completed count
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

      // ── Money ─────────────────────────────────────────────────────────────
      if (data.money) {
        const totalIncome   = (data.money.income   || []).reduce((s: number, i: any) => s + i.amount, 0);
        const totalExpenses = (data.money.expenses || []).reduce((s: number, e: any) => s + e.amount, 0);
        setMoney({ spent: totalExpenses, budget: totalIncome });
      }

      // ── Attendance ────────────────────────────────────────────────────────
      if (Array.isArray(data.attendance)) {
        setAttendance(
          data.attendance.map((r: any) => ({
            date:    r.date,
            present: r.status === "present",
          }))
        );
      }

      // ── Routine ───────────────────────────────────────────────────────────
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

  // ── Toggle todo ───────────────────────────────────────────────────────────
  const toggleTodo = async (id: string, completed: boolean) => {
    const updated = todayTodos.map(t => t._id === id ? { ...t, completed } : t);
    setTodayTodos(updated);
    await fetch(`${API_URL}/api/today`, {
      method:  "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body:    JSON.stringify({ todos: updated }),
    });
  };

  const todayDone  = todayTodos.filter(t => t.completed).length;
  const todayTotal = todayTodos.length;
  const todoPct    = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;
  const moneyPct   = money ? Math.min(Math.round((money.spent / money.budget) * 100), 100) : 0;
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
        <p className="text-xs text-slate-600">Loading your day...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#04040a] text-slate-200">
      <div className="max-w-lg mx-auto px-4 py-6 pb-16 space-y-4">

        {/* ── Greeting ── */}
        <div className="mb-2">
          <h1 className="text-3xl font-black text-white leading-tight">
            {greeting},<br />
            <span className="text-emerald-400 capitalize">{username}</span>
          </h1>
          <p className="text-xs mt-2 leading-relaxed">
            <span className="text-slate-500">Today's intention: </span>
            <span className="text-emerald-400 italic">{getDailyIntention()}</span>
          </p>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-2">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        </div>

        {/* ── Nothing enabled ── */}
        {nothingEnabled && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="text-5xl opacity-20">🧩</div>
            <p className="text-sm font-bold text-slate-500">No pages enabled yet.</p>
            <p className="text-xs text-slate-600">Go to Settings to enable pages and see them here.</p>
            <button
              onClick={() => navigate("/settings")}
              className="mt-2 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black rounded-xl cursor-pointer hover:bg-emerald-500/20 transition-all"
            >
              ⚙️ Open Settings
            </button>
          </div>
        )}

        {/* ── Today's Tasks ── */}
        {hasToday && (
          <div className="bg-[#0d0d1a] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <p className="text-sm font-black text-white">Today</p>
              <span className="text-xs font-black text-emerald-400">{todayTotal} Tasks</span>
            </div>

            {/* Progress bar */}
            {todayTotal > 0 && (
              <div className="mx-4 mb-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-700"
                  style={{ width: `${todoPct}%` }}
                />
              </div>
            )}

            <div className="px-4 pb-2 space-y-0.5 min-h-[60px]">
              {todayTodos.length === 0 ? (
                <p className="text-xs text-slate-600 py-3 text-center">No tasks yet</p>
              ) : todayTodos.map(todo => (
                <div key={todo._id} className="flex items-center gap-3 py-2">
                  <button
                    onClick={() => toggleTodo(todo._id, !todo.completed)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                      todo.completed
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-white/20 hover:border-emerald-500/50"
                    }`}
                  >
                    {todo.completed && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                  <span className={`text-sm flex-1 ${todo.completed ? "line-through text-slate-600" : "text-slate-200"}`}>
                    {todo.text}
                  </span>
                </div>
              ))}
            </div>

            <div className="px-4 pb-4 pt-2">
              <button
                onClick={() => navigate("/today")}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white text-sm font-black rounded-xl transition-all cursor-pointer"
              >
                View Schedule
              </button>
            </div>
          </div>
        )}

        {/* ── Today praise + streak ── */}
        {hasToday && (
          <div className="bg-[#0d0d1a] border border-white/[0.06] rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute right-4 top-4 text-5xl opacity-10">🔥</div>
            <p className="text-sm font-black text-white mb-1">Status</p>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-5xl font-black text-white">{todayDone}</span>
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                / {todayTotal} Tasks Done
              </span>
            </div>
            <p className="text-xs text-slate-500 italic">{getPraise()}</p>
          </div>
        )}

        {/* ── Routine ── */}
        {hasRoutine && (
          <div
            onClick={() => navigate("/")}
            className="bg-[#0d0d1a] border border-white/[0.06] rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-white/10 transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl shrink-0">
              🧘
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white">Routine</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {routine ? `${routine.name}${routine.duration ? ` • ${routine.duration}` : ""}` : "Tap to start your routine"}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-emerald-400 ml-0.5">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </div>
          </div>
        )}

        {/* ── Money ── */}
        {hasMoney && money && money.budget > 0 && (
          <div
            onClick={() => navigate("/money")}
            className="bg-[#0d0d1a] border border-white/[0.06] rounded-2xl p-4 cursor-pointer hover:border-white/10 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-black text-white">Money</p>
              <span className={`text-sm font-black ${moneyPct >= 90 ? "text-red-400" : "text-violet-400"}`}>
                {moneyPct}% spent
              </span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-700 ${moneyPct >= 90 ? "bg-red-500" : "bg-violet-500"}`}
                style={{ width: `${moneyPct}%` }}
              />
            </div>
            <p className="text-xs text-slate-500">
              Spent ₹{money.spent.toLocaleString()} of ₹{money.budget.toLocaleString()} income
            </p>
          </div>
        )}

        {/* ── Money enabled but no data ── */}
        {hasMoney && (!money || money.budget === 0) && (
          <div
            onClick={() => navigate("/money")}
            className="bg-[#0d0d1a] border border-white/[0.06] rounded-2xl p-4 cursor-pointer hover:border-white/10 transition-all flex items-center gap-4"
          >
            <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xl shrink-0">
              💰
            </div>
            <div>
              <p className="text-sm font-black text-white">Money Tracker</p>
              <p className="text-xs text-slate-500 mt-0.5">Tap to track your finances</p>
            </div>
          </div>
        )}

        {/* ── Monthly / Weekly chart ── */}
        {(hasMonthly || hasToday) && weeklyData.length > 0 && (
          <div className="bg-[#0d0d1a] border border-white/[0.06] rounded-2xl p-4">
            <p className="text-sm font-black text-white mb-4">Monthly Report</p>
            <div className="flex items-end justify-between gap-1.5" style={{ height: 100 }}>
              {weeklyData.map((d) => (
  <div key={`weekly-${d.day}`} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end justify-center" style={{ height: 72 }}>
                    <div
                      className={`w-full rounded-t-lg transition-all duration-700 ${
                        d.isToday ? "bg-cyan-400" : "bg-white/10"
                      }`}
                      style={{ height: `${Math.max((d.value / maxWeekly) * 72, 6)}px` }}
                    />
                  </div>
                  <span className={`text-[8px] font-black uppercase ${d.isToday ? "text-cyan-400" : "text-slate-600"}`}>
                    {d.day}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Attendance ── */}
        {hasAttendance && attendance.length > 0 && (
          <div
            onClick={() => navigate("/attendance")}
            className="bg-[#0d0d1a] border border-white/[0.06] rounded-2xl p-4 cursor-pointer hover:border-white/10 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-black text-white">Attendance</p>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-slate-600">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </div>
            <div className="flex gap-1 flex-wrap mb-3">
              {attendance.slice(-28).map((d, i) => (
  <div key={`att-${d.date}-${i}`} className={`w-3 h-3 rounded-sm ${d.present ? "bg-emerald-500" : "bg-white/[0.06]"}`} />
))}
            </div>
            <div className="border-t border-white/[0.04] pt-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">This Month</p>
                <p className="text-sm font-bold text-white mt-0.5">{attPresent} / {attendance.length} days present</p>
              </div>
              <div className={`px-3 py-1.5 rounded-xl text-xs font-black ${
                attendance.length > 0 && Math.round((attPresent / attendance.length) * 100) >= 75
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-red-500/10 text-red-400"
              }`}>
                {attendance.length > 0 ? Math.round((attPresent / attendance.length) * 100) : 0}%
              </div>
            </div>
          </div>
        )}

        {/* ── Attendance enabled but empty ── */}
        {hasAttendance && attendance.length === 0 && (
          <div
            onClick={() => navigate("/attendance")}
            className="bg-[#0d0d1a] border border-white/[0.06] rounded-2xl p-4 cursor-pointer hover:border-white/10 transition-all flex items-center gap-4"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl shrink-0">
              📅
            </div>
            <div>
              <p className="text-sm font-black text-white">Attendance</p>
              <p className="text-xs text-slate-500 mt-0.5">Tap to mark today's attendance</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}