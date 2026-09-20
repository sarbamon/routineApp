import { useState, useEffect, useCallback } from "react";
import { API_URL } from "../config/api";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const CATEGORY_COLORS: Record<string, string> = {
  Education: "#6366f1",
  Housing:   "#3b82f6",
  Rent:      "#06b6d4",
  Utility:   "#14b8a6",
  Health:    "#ec4899",
  Transport: "#f59e0b",
  Food:      "#10b981",
  Funeral:   "#8b5cf6",
  Shopping:  "#f43f5e",
  Other:     "#64748b",
};

interface TodoItem {
  _id: string;
  text: string;
  completed: boolean;
  date: string;
}

interface MoneyReport {
  totalIncome: number;
  totalExpense: number;
  net: number;
  prevIncome: number;
  prevExpense: number;
  expByCategory: Record<string, number>;
  incomeList: { _id: string; label: string; amount: number }[];
  expenseList: { _id: string; label: string; amount: number; category: string }[];
}

interface AttendanceReport {
  total: number;
  present: number;
  absent: number;
  leave: number;
  hours: number;
  pct: number;
  bySubject: Record<string, { present: number; total: number; hours: number }>;
}

interface PieSlice {
  label: string;
  value: number;
  color: string;
  formattedValue?: string;
}

// ── SVG Donut / Pie Chart Component ──────────────────────────────────────────
function PieChart({ data, size = 160, innerRadius = 52 }: { data: PieSlice[]; size?: number; innerRadius?: number }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-36 opacity-30 text-xs text-slate-500">
        No chart data available
      </div>
    );
  }

  let cumulativeAngle = 0;
  const center = size / 2;
  const radius = size / 2 - 8;

  const slices = data.map((slice) => {
    const angle = (slice.value / total) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle += angle;

    const x1 = center + radius * Math.cos((Math.PI * (startAngle - 90)) / 180);
    const y1 = center + radius * Math.sin((Math.PI * (startAngle - 90)) / 180);
    const x2 = center + radius * Math.cos((Math.PI * (endAngle - 90)) / 180);
    const y2 = center + radius * Math.sin((Math.PI * (endAngle - 90)) / 180);

    const x3 = center + innerRadius * Math.cos((Math.PI * (endAngle - 90)) / 180);
    const y3 = center + innerRadius * Math.sin((Math.PI * (endAngle - 90)) / 180);
    const x4 = center + innerRadius * Math.cos((Math.PI * (startAngle - 90)) / 180);
    const y4 = center + innerRadius * Math.sin((Math.PI * (startAngle - 90)) / 180);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData =
      angle >= 359.9
        ? `M ${center - radius} ${center} A ${radius} ${radius} 0 1 0 ${center + radius} ${center} A ${radius} ${radius} 0 1 0 ${center - radius} ${center} M ${center - innerRadius} ${center} A ${innerRadius} ${innerRadius} 0 1 0 ${center + innerRadius} ${center} A ${innerRadius} ${innerRadius} 0 1 0 ${center - innerRadius} ${center}`
        : `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;

    return {
      ...slice,
      pathData,
      pct: Math.round((slice.value / total) * 100),
    };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {slices.map((slice, i) => (
            <path
              key={i}
              d={slice.pathData}
              fill={slice.color}
              className="transition-all duration-300 hover:opacity-80 cursor-pointer"
            >
              <title>{`${slice.label}: ${slice.formattedValue || slice.value} (${slice.pct}%)`}</title>
            </path>
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-sm font-black text-white">{slices.length}</span>
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Categories</span>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2 flex-1 w-full min-w-0">
        {slices.map((slice, i) => (
          <div key={i} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: slice.color }} />
              <span className="text-slate-300 font-medium truncate">{slice.label}</span>
            </div>
            <div className="flex items-center gap-2 font-mono shrink-0">
              <span className="text-slate-200 font-bold">{slice.formattedValue || slice.value}</span>
              <span className="text-[10px] text-slate-500">({slice.pct}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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

      const todosData = todosRes.ok ? await todosRes.json() : { todos: [] };
      const moneyData = moneyRes.ok ? await moneyRes.json() : null;
      const attData   = attRes.ok   ? await attRes.json()   : null;

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

  // ── Card component ────────────────────────────────────────────────────────
  const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-[#0d0d1a] border border-white/[0.08] rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] ${className}`}>
      {children}
    </div>
  );

  const SectionTitle = ({ icon, children }: { icon: string; children: React.ReactNode }) => (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-base">{icon}</span>
      <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">{children}</h2>
    </div>
  );

  const ChangeChip = ({ val }: { val: number | null }) => {
    if (val === null) return <span className="text-[9px] text-slate-600 uppercase tracking-wider">No prev data</span>;
    const up = val > 0;
    return (
      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg ${up ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
        {up ? "▲" : "▼"} {Math.abs(val)}% vs last month
      </span>
    );
  };

  // ── Metrics Calculation ───────────────────────────────────────────────────
  const todoCompleted = todos.filter(t => t.completed).length;
  const todoPending   = todos.filter(t => !t.completed).length;
  const todoPct       = todos.length ? Math.round((todoCompleted / todos.length) * 100) : 0;

  const incomeChange  = money?.prevIncome
    ? Math.round(((money.totalIncome  - money.prevIncome)  / money.prevIncome)  * 100) : null;
  const expenseChange = money?.prevExpense
    ? Math.round(((money.totalExpense - money.prevExpense) / money.prevExpense) * 100) : null;

  const savingsRate = money?.totalIncome && money.totalIncome > 0
    ? Math.round(((money.net || 0) / money.totalIncome) * 100)
    : 0;

  // Expense Pie Data
  const expPieData: PieSlice[] = Object.entries(money?.expByCategory || {}).map(([cat, amt]) => ({
    label: cat,
    value: amt,
    formattedValue: formatINR(amt),
    color: CATEGORY_COLORS[cat] || "#8b5cf6",
  }));

  // Task Pie Data
  const taskPieData: PieSlice[] = [
    { label: "Completed", value: todoCompleted, color: "#10b981" },
    { label: "Pending",   value: todoPending,   color: "#ef4444" },
  ].filter(d => d.value > 0);

  // Attendance Pie Data
  const attPieData: PieSlice[] = attendance ? [
    { label: "Present", value: attendance.present, color: "#10b981" },
    { label: "Absent",  value: attendance.absent,  color: "#ef4444" },
    { label: "Leave",   value: attendance.leave,   color: "#f59e0b" },
  ].filter(d => d.value > 0) : [];

  // Top spending category
  const topExpense = Object.entries(money?.expByCategory || {}).sort((a, b) => b[1] - a[1])[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#04040a] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">Generating Monthly Analytics...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 min-h-screen bg-[#04040a] text-slate-200">

      {/* ── Header & Date Filter ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-white/5 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-white">Monthly Report</h1>
            <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase rounded-lg">
              {MONTHS[selMonth]} {selYear}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">
            Real-time analytics for tasks, expenses, and attendance
          </p>
        </div>

        <div className="flex gap-2.5">
          <select
            value={selMonth}
            onChange={e => setSelMonth(Number(e.target.value))}
            className="bg-[#0d0d1a] border border-white/[0.1] rounded-xl px-3.5 py-2 text-slate-200 text-xs font-bold outline-none cursor-pointer hover:border-white/20 transition-all"
          >
            {MONTHS.map((m, i) => <option key={m} value={i} className="bg-[#0d0d1a]">{m}</option>)}
          </select>
          <select
            value={selYear}
            onChange={e => setSelYear(Number(e.target.value))}
            className="bg-[#0d0d1a] border border-white/[0.1] rounded-xl px-3.5 py-2 text-slate-200 text-xs font-bold outline-none cursor-pointer hover:border-white/20 transition-all"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y} className="bg-[#0d0d1a]">{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ══ Executive Summary Cards ════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
          <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Tasks Done</p>
          <p className="text-2xl font-black text-white font-mono">{todoCompleted} <span className="text-xs text-slate-500">/ {todos.length}</span></p>
          <p className="text-[10px] text-emerald-400/80 font-bold mt-1">{todoPct}% Completion Rate</p>
        </Card>

        <Card className="bg-gradient-to-br from-violet-500/10 to-transparent border-violet-500/20">
          <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-1">Net Savings</p>
          <p className={`text-2xl font-black font-mono ${(money?.net || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatINR(money?.net || 0)}
          </p>
          <p className="text-[10px] text-slate-500 font-bold mt-1">{savingsRate}% Savings Rate</p>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
          <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Attendance Rate</p>
          <p className={`text-2xl font-black font-mono ${(attendance?.pct || 0) >= 75 ? "text-emerald-400" : "text-red-400"}`}>
            {attendance?.pct || 0}%
          </p>
          <p className="text-[10px] text-slate-500 font-bold mt-1">{attendance?.hours || 0} Hours Attended</p>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
          <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1">Total Expenses</p>
          <p className="text-2xl font-black text-amber-400 font-mono">{formatINR(money?.totalExpense || 0)}</p>
          <p className="text-[10px] text-slate-500 font-bold mt-1">{Object.keys(money?.expByCategory || {}).length} Categories</p>
        </Card>
      </div>

      {/* ══ TASKS ANALYTICS & PIE CHART ════════════════════════════════════ */}
      <div className="mb-8">
        <SectionTitle icon="📋">Task Productivity & Completion Breakdown</SectionTitle>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pie Chart Card */}
          <Card className="lg:col-span-1">
            <p className="text-xs font-bold text-white mb-4">Task Completion Ratio</p>
            {todos.length === 0 ? (
              <div className="text-center py-10 opacity-30">
                <div className="text-3xl mb-2">📋</div>
                <p className="text-xs text-slate-500">No tasks recorded for this month</p>
              </div>
            ) : (
              <PieChart data={taskPieData} size={150} innerRadius={50} />
            )}
          </Card>

          {/* Analytics Overview */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-white">Monthly Productivity Analysis</p>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                todoPct >= 75 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}>
                {todoPct >= 75 ? "🔥 High Focus" : todoPct >= 50 ? "⚡ Moderate Progress" : "⚠️ Needs Attention"}
              </span>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-slate-400 font-medium">Overall Progress Rate</span>
                <span className="text-xs font-mono font-bold text-emerald-400">{todoPct}%</span>
              </div>
              <div className="h-2.5 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${todoPct}%`,
                    background: todoPct >= 70 ? "#10b981" : todoPct >= 40 ? "#f59e0b" : "#ef4444",
                  }}
                />
              </div>
            </div>

            {/* Task Log */}
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Recent Monthly Tasks</p>
            {todos.length === 0 ? (
              <p className="text-xs text-slate-600 py-4">No tasks found for {MONTHS[selMonth]} {selYear}.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {todos.map((t, idx) => (
                  <div key={t._id || idx} className="p-2.5 bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${t.completed ? "bg-emerald-400" : "bg-red-400"}`} />
                      <span className={`text-xs truncate ${t.completed ? "line-through text-slate-500" : "text-slate-200"}`}>{t.text}</span>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md shrink-0 uppercase tracking-wider ${
                      t.completed ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                    }`}>
                      {t.completed ? "Done" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ══ FINANCIAL & EXPENSE ANALYTICS PIE CHART ════════════════════════ */}
      <div className="mb-8">
        <SectionTitle icon="💰">Financial Health & Expense Breakdown</SectionTitle>

        {!money ? (
          <Card>
            <div className="text-center py-8 opacity-30">
              <div className="text-3xl mb-2">💰</div>
              <p className="text-xs text-slate-500">No financial records for {MONTHS[selMonth]} {selYear}</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Financial Summary Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="bg-emerald-500/[0.03] border-emerald-500/10">
                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Total Income</p>
                <p className="text-2xl font-black font-mono text-emerald-400 mb-1">{formatINR(money.totalIncome || 0)}</p>
                <ChangeChip val={incomeChange} />
              </Card>

              <Card className="bg-red-500/[0.03] border-red-500/10">
                <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Total Expenses</p>
                <p className="text-2xl font-black font-mono text-red-400 mb-1">{formatINR(money.totalExpense || 0)}</p>
                <ChangeChip val={expenseChange !== null ? -(expenseChange ?? 0) : null} />
              </Card>

              <Card className={(money.net || 0) >= 0 ? "bg-emerald-500/[0.03] border-emerald-500/10" : "bg-red-500/[0.03] border-red-500/10"}>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Savings</p>
                <p className={`text-2xl font-black font-mono mb-1 ${(money.net || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatINR(money.net || 0)}
                </p>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {(money.net || 0) >= 0 ? `Saved ${savingsRate}% of income` : "Overspent this month"}
                </span>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Category Expense Pie Chart */}
              <Card className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-bold text-white">Expense Distribution by Category</p>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Category Pie Breakdown</p>
                  </div>
                  {topExpense && (
                    <span className="text-[10px] font-bold px-2.5 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-300 rounded-lg">
                      🔥 Top Expense: {topExpense[0]} ({formatINR(topExpense[1])})
                    </span>
                  )}
                </div>

                <PieChart data={expPieData} size={170} innerRadius={55} />
              </Card>

              {/* Financial Analytics & Health Card */}
              <Card className="lg:col-span-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-white mb-3">Financial Health Insights</p>
                  
                  <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl mb-3">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Savings Rate</p>
                    <p className={`text-lg font-black font-mono ${savingsRate >= 20 ? "text-emerald-400" : savingsRate >= 0 ? "text-amber-400" : "text-red-400"}`}>
                      {savingsRate}%
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {savingsRate >= 20 ? "Great job! Saving over 20% of your total income." : savingsRate >= 0 ? "Positive cashflow, consider increasing your savings target." : "Warning: Spending exceeded income this month."}
                    </p>
                  </div>

                  {money.prevExpense > 0 && (
                    <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Month-over-Month Shift</p>
                      <p className="text-xs text-slate-300">
                        Expenses changed by <span className={expenseChange && expenseChange > 0 ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>{expenseChange || 0}%</span> compared to last month.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-white/5">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Status</p>
                  <p className={`text-xs font-bold mt-0.5 ${(money.net || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {(money.net || 0) >= 0 ? "✅ Balanced & Solvent" : "⚠️ Budget Deficit"}
                  </p>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* ══ ATTENDANCE ANALYTICS & PIE CHART ══════════════════════════════ */}
      <div className="mb-6">
        <SectionTitle icon="📚">Attendance & Academic Performance</SectionTitle>

        {!attendance || attendance.total === 0 ? (
          <Card>
            <div className="text-center py-8 opacity-30">
              <div className="text-3xl mb-2">📚</div>
              <p className="text-xs text-slate-500">No attendance records for {MONTHS[selMonth]} {selYear}</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {attendance.pct < 75 && (
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="text-xs font-bold text-red-400">Attendance Risk Warning ({attendance.pct}%)</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Your attendance is below the mandatory 75% threshold for this month.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Attendance Pie Chart */}
              <Card className="lg:col-span-1">
                <p className="text-xs font-bold text-white mb-4">Attendance Share</p>
                <PieChart data={attPieData} size={150} innerRadius={50} />
              </Card>

              {/* Subject Breakdown & Analysis */}
              <Card className="lg:col-span-2">
                <p className="text-xs font-bold text-white mb-3">Subject-wise Attendance & Hours</p>
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {Object.entries(attendance.bySubject || {}).map(([subject, d]) => {
                    const pct = d.total ? Math.round((d.present / d.total) * 100) : 0;
                    return (
                      <div key={subject} className="p-3 bg-white/[0.03] border border-white/5 rounded-xl">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold text-white">{subject}</span>
                          <div className="flex items-center gap-3 font-mono text-[10px]">
                            <span className="text-slate-400">{d.hours} Hours</span>
                            <span className="text-slate-500">{d.present}/{d.total} Attended</span>
                            <span className={`font-black ${pct >= 75 ? "text-emerald-400" : "text-red-400"}`}>{pct}%</span>
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
            </div>
          </div>
        )}
      </div>

    </div>
  );
}