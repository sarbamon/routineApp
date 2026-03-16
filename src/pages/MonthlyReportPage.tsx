import { useState, useEffect, useCallback } from "react";
import { API_URL } from "../config/api";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface TodoItem { _id: string; text: string; completed: boolean; date: string; }

interface MoneyReport {
  totalIncome: number; totalExpense: number; net: number;
  prevIncome: number; prevExpense: number;
  expByCategory: Record<string, number>;
  incomeList: { _id: string; label: string; amount: number }[];
  expenseList: { _id: string; label: string; amount: number; category: string }[];
}

interface AttendanceReport {
  total: number; present: number; absent: number;
  leave: number; hours: number; pct: number;
  bySubject: Record<string, { present: number; total: number; hours: number }>;
}

export default function MonthlyReportPage() {
  const token = localStorage.getItem("token");
  const now   = new Date();

  const [selYear,    setSelYear]    = useState(now.getFullYear());
  const [selMonth,   setSelMonth]   = useState(now.getMonth());
  const [todos,      setTodos]      = useState<TodoItem[]>([]);
  const [money,      setMoney]      = useState<MoneyReport | null>(null);
  const [attendance, setAttendance] = useState<AttendanceReport | null>(null);
  const [loading,    setLoading]    = useState(true);

  const monthKey = `${selYear}-${String(selMonth + 1).padStart(2, "0")}`;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [todosRes, moneyRes, attRes] = await Promise.all([
        fetch(`${API_URL}/api/today`, { headers }),
        fetch(`${API_URL}/api/money/summary/${selYear}/${selMonth + 1}`, { headers }),
        fetch(`${API_URL}/api/attendance/summary/${selYear}/${selMonth + 1}`, { headers }),
      ]);

      // ── Safe parse — never crash if route returns 404/HTML ──
      const todosData = todosRes.ok  ? await todosRes.json()  : { todos: [] };
      const moneyData = moneyRes.ok  ? await moneyRes.json()  : null;
      const attData   = attRes.ok    ? await attRes.json()    : null;

      const allTodos: TodoItem[] = todosData.todos || [];
      setTodos(allTodos.filter((t: TodoItem) => t.date?.startsWith(monthKey)));
      setMoney(moneyData);
      setAttendance(attData);

    } catch (err) {
      console.error("Failed to fetch report data", err);
    } finally {
      setLoading(false);
    }
  }, [token, selYear, selMonth, monthKey]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Shared components ─────────────────────────────────────────────────────
  const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-[#0d0d1a] border border-white/5 rounded-2xl p-4 ${className}`}>{children}</div>
  );

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">{children}</h2>
  );

  const ChangeChip = ({ val }: { val: number | null }) => {
    if (val === null) return <span className="text-[9px] text-slate-600">No prev data</span>;
    const up = val > 0;
    return (
      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${up ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
        {up ? "▲" : "▼"} {Math.abs(val)}% vs last month
      </span>
    );
  };

  const todoCompleted = todos.filter(t => t.completed).length;
  const todoPending   = todos.filter(t => !t.completed).length;
  const todoPct       = todos.length ? Math.round((todoCompleted / todos.length) * 100) : 0;

  const incomeChange  = money?.prevIncome
    ? Math.round(((money.totalIncome  - money.prevIncome)  / money.prevIncome)  * 100) : null;
  const expenseChange = money?.prevExpense
    ? Math.round(((money.totalExpense - money.prevExpense) / money.prevExpense) * 100) : null;

  if (loading) return (
    <div className="min-h-screen bg-[#04040a] flex items-center justify-center">
      <p className="text-slate-500 text-sm">Loading report...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-6 min-h-screen bg-[#04040a] text-slate-200">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Monthly Report</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
            {MONTHS[selMonth]} {selYear}
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={selMonth}
            onChange={e => setSelMonth(Number(e.target.value))}
            className="bg-[#0d0d1a] border border-white/[0.08] rounded-xl px-3 py-2 text-slate-200 text-xs font-bold outline-none cursor-pointer"
          >
            {MONTHS.map((m, i) => <option key={m} value={i} className="bg-[#0d0d1a]">{m}</option>)}
          </select>
          <select
            value={selYear}
            onChange={e => setSelYear(Number(e.target.value))}
            className="bg-[#0d0d1a] border border-white/[0.08] rounded-xl px-3 py-2 text-slate-200 text-xs font-bold outline-none cursor-pointer"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y} className="bg-[#0d0d1a]">{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ══ TASKS ══════════════════════════════════════════════════════════ */}
      <div className="mb-6">
        <SectionTitle>📋 Task Report</SectionTitle>
        {todos.length === 0 ? (
          <Card>
            <div className="text-center py-6">
              <div className="text-2xl mb-2 opacity-30">📋</div>
              <p className="text-xs text-slate-600">No tasks for {MONTHS[selMonth]} {selYear}</p>
            </div>
          </Card>
        ) : <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-3">
            {[
              { label: "Total",     value: todos.length,  color: "text-slate-200"   },
              { label: "Completed", value: todoCompleted, color: "text-emerald-400" },
              { label: "Pending",   value: todoPending,   color: "text-red-400"     },
              { label: "Rate",      value: `${todoPct}%`, color: todoPct >= 70 ? "text-emerald-400" : "text-amber-400" },
            ].map(({ label, value, color }) => (
              <Card key={label}>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                <p className={`text-xl font-black font-mono ${color}`}>{value}</p>
              </Card>
            ))}
          </div>

          <Card className="mb-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-300">Overall Progress</span>
              <span className="text-[11px] font-bold text-emerald-400">{todoPct}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${todoPct}%`,
                  background: todoPct >= 70 ? "#10b981" : todoPct >= 40 ? "#f59e0b" : "#ef4444",
                }}
              />
            </div>
          </Card>

          <Card>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">All Tasks</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {todos.map((todo, i) => (
                <div key={todo._id || i} className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.02]">
                  <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 ${
                    todo.completed ? "bg-emerald-500 border-emerald-500" : "border-white/20"
                  }`}>
                    {todo.completed && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                  <span className={`text-xs flex-1 ${todo.completed ? "line-through text-slate-600" : "text-slate-300"}`}>
                    {todo.text}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                    todo.completed ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    {todo.completed ? "Done" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </>}
      </div>

      {/* ══ MONEY ══════════════════════════════════════════════════════════ */}
      <div className="mb-6">
        <SectionTitle>💰 Money Report</SectionTitle>

        {!money ? (
          <Card>
            <div className="text-center py-6">
              <div className="text-2xl mb-2 opacity-30">💰</div>
              <p className="text-xs text-slate-600">No money data for {MONTHS[selMonth]} {selYear}</p>
            </div>
          </Card>
        ) : <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-3">
            <Card className="bg-emerald-500/[0.04] border-emerald-500/10">
              <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest mb-1">Income</p>
              <p className="text-xl font-black font-mono text-emerald-400 mb-1">{formatINR(money.totalIncome || 0)}</p>
              <ChangeChip val={incomeChange} />
            </Card>
            <Card className="bg-red-500/[0.04] border-red-500/10">
              <p className="text-[9px] font-black text-red-500/60 uppercase tracking-widest mb-1">Expenses</p>
              <p className="text-xl font-black font-mono text-red-400 mb-1">{formatINR(money.totalExpense || 0)}</p>
              <ChangeChip val={expenseChange !== null ? -(expenseChange ?? 0) : null} />
            </Card>
            <Card className={(money.net || 0) >= 0 ? "bg-emerald-500/[0.04] border-emerald-500/10" : "bg-red-500/[0.04] border-red-500/10"}>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Net Savings</p>
              <p className={`text-xl font-black font-mono mb-1 ${(money.net || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {formatINR(money.net || 0)}
              </p>
              <span className="text-[9px] text-slate-600">
                {(money.net || 0) >= 0 ? "Saved this month" : "Overspent"}
              </span>
            </Card>
          </div>

          {/* vs last month */}
          {((money.prevIncome || 0) > 0 || (money.prevExpense || 0) > 0) && (
            <Card className="mb-3">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">vs Last Month</p>
              <div className="space-y-3">
                {[
                  { label: "Income",   cur: money.totalIncome  || 0, prev: money.prevIncome  || 0, color: "#10b981" },
                  { label: "Expenses", cur: money.totalExpense || 0, prev: money.prevExpense || 0, color: "#ef4444" },
                ].map(({ label, cur, prev, color }) => {
                  const max = Math.max(cur, prev, 1);
                  return (
                    <div key={label}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-400">{label}</span>
                        <div className="flex gap-3 text-[9px] text-slate-500 font-mono">
                          <span>Prev: {formatINR(prev)}</span>
                          <span>Now: {formatINR(cur)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-1">
                        <div className="h-full rounded-full opacity-40"
                          style={{ width: `${(prev / max) * 100}%`, background: color }} />
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{ width: `${(cur / max) * 100}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Category breakdown */}
          {Object.keys(money.expByCategory || {}).length > 0 && (
            <Card>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">
                Expense by Category
              </p>
              <div className="space-y-2">
                {Object.entries(money.expByCategory || {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, amt]) => {
                    const pct = money.totalExpense
                      ? Math.round((amt / money.totalExpense) * 100) : 0;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-slate-300">{cat}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-500 font-mono">{formatINR(amt)}</span>
                            <span className="text-[9px] font-bold text-slate-400">{pct}%</span>
                          </div>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-red-500/70"
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>
          )}
        </>}
      </div>

      {/* ══ ATTENDANCE ═════════════════════════════════════════════════════ */}
      <div className="mb-6">
        <SectionTitle>📚 Attendance Report</SectionTitle>

        {!attendance || attendance.total === 0 ? (
          <Card>
            <div className="text-center py-6">
              <div className="text-2xl mb-2 opacity-30">📚</div>
              <p className="text-xs text-slate-600">
                No attendance for {MONTHS[selMonth]} {selYear}
              </p>
            </div>
          </Card>
        ) : <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-3">
            {[
              { label: "Attendance %", value: `${attendance.pct}%`,   color: attendance.pct >= 75 ? "text-emerald-400" : "text-red-400" },
              { label: "Present",      value: attendance.present,      color: "text-emerald-400" },
              { label: "Absent",       value: attendance.absent,       color: "text-red-400"     },
              { label: "Total Hours",  value: `${attendance.hours}h`,  color: "text-violet-400"  },
            ].map(({ label, value, color }) => (
              <Card key={label}>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                <p className={`text-xl font-black font-mono ${color}`}>{value}</p>
              </Card>
            ))}
          </div>

          {attendance.pct < 75 && (
            <div className="mb-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="text-xs font-bold text-red-400">Low Attendance</p>
                <p className="text-[10px] text-slate-500">
                  Below 75%. You need to attend more classes.
                </p>
              </div>
            </div>
          )}

          <Card>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">
              Subject-wise Breakdown
            </p>
            <div className="space-y-3">
              {Object.entries(attendance.bySubject || {}).map(([subject, d]) => {
                const pct = d.total ? Math.round((d.present / d.total) * 100) : 0;
                return (
                  <div key={subject}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-slate-300">{subject}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-500 font-mono">
                          {d.hours}h • {d.present}/{d.total}
                        </span>
                        <span className={`text-[10px] font-black ${pct >= 75 ? "text-emerald-400" : "text-red-400"}`}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${pct >= 75 ? "bg-emerald-500" : "bg-red-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>}
      </div>

    </div>
  );
}