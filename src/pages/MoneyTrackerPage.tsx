import { useState, useMemo, useEffect, useCallback } from "react";
import { API_URL } from "../config/api";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const GOAL_COLORS = ["#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899"];
const EXP_CATS   = ["Food","Housing","Transport","Health","Shopping","Entertainment","Education","Other"];
const INC_CATS   = ["Salary","Freelance","Business","Investment","Gift","Other"];

interface MoneyItem {
  _id: string;
  type: "income" | "expense" | "loan" | "goal";
  label?: string;
  amount: number;
  date?: string;
  category?: string;
  person?: string;
  note?: string;
  paid?: boolean;
  target?: number;
  saved?: number;
  color?: string;
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16 }: { name: string; size?: number }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const icons: Record<string, JSX.Element> = {
    wallet: <svg {...p}><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>,
    target: <svg {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
    users:  <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    plus:   <svg {...p} strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    trash:  <svg {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
    check:  <svg {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    up:     <svg {...p} strokeWidth="2.5"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>,
    down:   <svg {...p} strokeWidth="2.5"><line x1="17" y1="7" x2="7" y2="17"/><polyline points="17 17 7 17 7 7"/></svg>,
    x:      <svg {...p} strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  };
  return <span className="inline-flex items-center">{icons[name]}</span>;
};

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-[#0d0d1a] border border-white/5 rounded-2xl p-4 mb-2.5 ${className}`}>{children}</div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="mb-3.5">
    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{label}</label>
    {children}
  </div>
);

const inputCls = "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-slate-200 text-[13px] outline-none focus:border-emerald-500/40 transition-colors";

// ── Add Modal ─────────────────────────────────────────────────────────────────
function AddModal({ onClose, onAdd, defaultType }: {
  onClose: () => void;
  onAdd: (type: string, data: Partial<MoneyItem>) => Promise<void>;
  defaultType: string;
}) {
  const [type, setType] = useState(defaultType || "expense");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    label: "", amount: "", date: new Date().toISOString().split("T")[0],
    category: "Food", person: "", note: "",
    goalLabel: "", target: "", color: "#8b5cf6",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const isValid = () => {
    if (type === "expense" || type === "income") return form.label.trim() && Number(form.amount) > 0 && form.date;
    if (type === "loan") return form.person.trim() && Number(form.amount) > 0 && form.date;
    if (type === "goal") return form.goalLabel.trim() && Number(form.target) > 0;
    return false;
  };

  const handleSubmit = async () => {
    if (!isValid()) return;
    setLoading(true);
    const payloads: Record<string, Partial<MoneyItem>> = {
      expense: { type: "expense", label: form.label, amount: Number(form.amount), date: form.date, category: form.category },
      income:  { type: "income",  label: form.label, amount: Number(form.amount), date: form.date, category: form.category },
      loan:    { type: "loan",    person: form.person, amount: Number(form.amount), date: form.date, note: form.note, paid: false },
      goal:    { type: "goal",    label: form.goalLabel, target: Number(form.target), saved: 0, color: form.color },
    };
    await onAdd(type, payloads[type]);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-end justify-center px-3 pb-3" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#0d0d1a] border border-white/[0.08] rounded-3xl w-full max-w-[420px] p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <span className="text-base font-black text-white">Add Entry</span>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/[0.06] border-none text-slate-400 cursor-pointer flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors">
            <Icon name="x" size={14} />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1.5 mb-5">
          {["expense","income","loan","goal"].map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`py-2 px-1.5 rounded-xl text-[9px] font-black uppercase tracking-wide cursor-pointer transition-all border ${
                type === t ? "border-white/20 bg-white/[0.08] text-white" : "border-white/[0.06] bg-white/[0.03] text-slate-500"
              }`}
            >{t}</button>
          ))}
        </div>

        {(type === "expense" || type === "income") && <>
          <Field label="Description"><input className={inputCls} placeholder="e.g. Groceries" value={form.label} onChange={e => set("label", e.target.value)} /></Field>
          <Field label="Amount (₹)"><input className={inputCls} type="number" placeholder="0" value={form.amount} onChange={e => set("amount", e.target.value)} /></Field>
          <Field label="Category">
            <select className={inputCls} value={form.category} onChange={e => set("category", e.target.value)}>
              {(type === "expense" ? EXP_CATS : INC_CATS).map(c => <option key={c} className="bg-[#0d0d1a]">{c}</option>)}
            </select>
          </Field>
          <Field label="Date"><input className={inputCls} type="date" value={form.date} onChange={e => set("date", e.target.value)} /></Field>
        </>}

        {type === "loan" && <>
          <Field label="Person's Name"><input className={inputCls} placeholder="e.g. Rahul" value={form.person} onChange={e => set("person", e.target.value)} /></Field>
          <Field label="Amount (₹)"><input className={inputCls} type="number" placeholder="0" value={form.amount} onChange={e => set("amount", e.target.value)} /></Field>
          <Field label="Note (optional)"><input className={inputCls} placeholder="e.g. Medical" value={form.note} onChange={e => set("note", e.target.value)} /></Field>
          <Field label="Date"><input className={inputCls} type="date" value={form.date} onChange={e => set("date", e.target.value)} /></Field>
        </>}

        {type === "goal" && <>
          <Field label="Goal Name"><input className={inputCls} placeholder="e.g. Vacation Fund" value={form.goalLabel} onChange={e => set("goalLabel", e.target.value)} /></Field>
          <Field label="Target Amount (₹)"><input className={inputCls} type="number" placeholder="0" value={form.target} onChange={e => set("target", e.target.value)} /></Field>
          <Field label="Color">
            <div className="flex gap-2 flex-wrap mt-1">
              {GOAL_COLORS.map(c => (
                <div key={c} onClick={() => set("color", c)} className="w-7 h-7 rounded-lg cursor-pointer transition-all"
                  style={{ background: c, border: form.color === c ? "2px solid #fff" : "2px solid transparent" }} />
              ))}
            </div>
          </Field>
        </>}

        <button onClick={handleSubmit} disabled={!isValid() || loading}
          className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all mt-1 ${
            isValid() && !loading ? "bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer" : "bg-slate-800 text-slate-600 cursor-not-allowed"
          }`}
        >
          {loading ? "Saving..." : `+ Add ${type}`}
        </button>
      </div>
    </div>
  );
}

// ── Update Savings Modal ──────────────────────────────────────────────────────
function UpdateSavingsModal({ goal, onClose, onUpdate }: {
  goal: MoneyItem;
  onClose: () => void;
  onUpdate: (id: string, add: number) => Promise<void>;
}) {
  const [amount, setAmount]   = useState("");
  const [loading, setLoading] = useState(false);
  const valid = Number(amount) > 0;

  const handleSubmit = async () => {
    if (!valid) return;
    setLoading(true);
    await onUpdate(goal._id, Number(amount));
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-end justify-center px-3 pb-3" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#0d0d1a] border border-white/[0.08] rounded-3xl w-full max-w-[420px] p-6">
        <div className="flex justify-between items-center mb-5">
          <span className="text-base font-black text-white">Update Savings</span>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/[0.06] border-none text-slate-400 cursor-pointer flex items-center justify-center hover:bg-white/10 transition-colors">
            <Icon name="x" size={14} />
          </button>
        </div>
        <div className="mb-4 px-3.5 py-3 bg-violet-500/[0.06] rounded-xl border border-violet-500/[0.15]">
          <div className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-1">{goal.label}</div>
          <div className="text-[13px] text-slate-400 font-mono">
            {formatINR(goal.saved || 0)} <span className="text-slate-600">/ {formatINR(goal.target || 0)}</span>
          </div>
        </div>
        <Field label="Add Amount (₹)">
          <input autoFocus type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} className={inputCls} />
        </Field>
        <button onClick={handleSubmit} disabled={!valid || loading}
          className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            valid && !loading ? "bg-violet-500 text-white hover:bg-violet-600 cursor-pointer" : "bg-slate-800 text-slate-600 cursor-not-allowed"
          }`}
        >
          {loading ? "Saving..." : "Add to Savings"}
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MoneyTrackerPage() {
  const token = localStorage.getItem("token");

  const [income,   setIncome]   = useState<MoneyItem[]>([]);
  const [expenses, setExpenses] = useState<MoneyItem[]>([]);
  const [loans,    setLoans]    = useState<MoneyItem[]>([]);
  const [goals,    setGoals]    = useState<MoneyItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [activeTab, setActiveTab]   = useState("dashboard");
  const [showAdd,   setShowAdd]     = useState(false);
  const [updateGoal, setUpdateGoal] = useState<MoneyItem | null>(null);

  // ── Fetch all data ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/api/money`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setIncome(data.income   || []);
      setExpenses(data.expenses || []);
      setLoans(data.loans     || []);
      setGoals(data.goals     || []);
    } catch (err) {
      console.error("Failed to fetch money data", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Add item ───────────────────────────────────────────────────────────────
  const handleAdd = async (_type: string, data: Partial<MoneyItem>) => {
    await fetch(`${API_URL}/api/money`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    fetchData();
  };

  // ── Delete item ────────────────────────────────────────────────────────────
  const deleteItem = async (id: string) => {
    await fetch(`${API_URL}/api/money/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData();
  };

  // ── Mark loan paid ─────────────────────────────────────────────────────────
  const markLoanPaid = async (id: string) => {
    await fetch(`${API_URL}/api/money/${id}/paid`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData();
  };

  // ── Update goal savings ────────────────────────────────────────────────────
  const updateGoalSavings = async (id: string, add: number) => {
    await fetch(`${API_URL}/api/money/${id}/savings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ add }),
    });
    fetchData();
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalIncome   = income.reduce((s, i)  => s + i.amount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const totalLoans    = loans.filter(l => !l.paid).reduce((s, l) => s + l.amount, 0);
    return { income: totalIncome, expenses: totalExpenses, loans: totalLoans, net: totalIncome - totalExpenses };
  }, [income, expenses, loans]);

  const recentActivity = useMemo(() =>
    [...expenses.map(e => ({ ...e, atype: "exp" })), ...income.map(i => ({ ...i, atype: "inc" }))]
      .sort((a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime())
      .slice(0, 6),
    [income, expenses]
  );

  const defaultAddType = ({ dashboard: "expense", expenses: "expense", income: "income", loans: "loan", goals: "goal" } as Record<string, string>)[activeTab] || "expense";
  const TABS = ["dashboard", "expenses", "income", "loans", "goals"];

  const DelBtn = ({ id }: { id: string }) => (
    <button onClick={() => deleteItem(id)} className="p-1.5 rounded-lg text-slate-600 hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer ml-2">
      <Icon name="trash" size={13} />
    </button>
  );

  const EmptyState = ({ emoji, text }: { emoji: string; text: string }) => (
    <div className="text-center py-10">
      <div className="text-3xl mb-3 opacity-30">{emoji}</div>
      <div className="text-xs font-semibold text-slate-500">{text}</div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-[#04040a] flex items-center justify-center">
      <div className="text-slate-500 text-sm">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#04040a] text-slate-200 font-sans w-full relative">
      <div className="px-4 pt-5 pb-32">

        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-[22px] font-black text-white tracking-tight">
              Akieme <span className="text-emerald-400">One</span>
            </h1>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[3px] mt-0.5">
              {new Date().toLocaleString("en-IN", { month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Net Balance</p>
            <p className="text-xl font-bold text-emerald-400 font-mono">{formatINR(stats.net)}</p>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <div className="bg-emerald-500/[0.05] border border-emerald-500/[0.12] rounded-2xl p-3.5">
            <div className="flex justify-between items-center mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center"><Icon name="up" size={13} /></div>
              <span className="text-[8px] font-black text-emerald-500/50 uppercase tracking-widest">Income</span>
            </div>
            <p className="text-[15px] font-bold font-mono">{formatINR(stats.income)}</p>
          </div>
          <div className="bg-red-500/[0.05] border border-red-500/[0.12] rounded-2xl p-3.5">
            <div className="flex justify-between items-center mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center"><Icon name="down" size={13} /></div>
              <span className="text-[8px] font-black text-red-500/50 uppercase tracking-widest">Spend</span>
            </div>
            <p className="text-[15px] font-bold font-mono">{formatINR(stats.expenses)}</p>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex gap-1.5 overflow-x-auto mb-5 pb-1 [&::-webkit-scrollbar]:hidden">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wide cursor-pointer whitespace-nowrap transition-all border ${
                activeTab === tab ? "bg-white text-black border-white" : "bg-white/5 text-slate-500 border-transparent hover:text-slate-300"
              }`}
            >{tab}</button>
          ))}
        </nav>

        {/* Dashboard */}
        {activeTab === "dashboard" && <>
          <Card>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[3px] mb-3.5">Recent Activity</p>
            {recentActivity.length === 0
              ? <EmptyState emoji="📭" text="No transactions yet" />
              : recentActivity.map(item => (
                <div key={item._id} className="flex justify-between items-center py-2 border-b border-white/[0.04] last:border-0">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${item.atype === "inc" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                      <Icon name={item.atype === "inc" ? "up" : "down"} size={13} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{item.label}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">{item.category} • {item.date}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold font-mono ${item.atype === "inc" ? "text-emerald-400" : "text-red-400"}`}>
                    {item.atype === "inc" ? "+" : "-"}{formatINR(item.amount)}
                  </span>
                </div>
              ))
            }
          </Card>
          <div className="bg-amber-500/[0.05] border border-amber-500/10 rounded-2xl p-4 flex justify-between items-center">
            <div>
              <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">Outstanding Loans</p>
              <p className="text-lg font-bold font-mono">{formatINR(stats.loans)}</p>
            </div>
            <div className="text-amber-500/30"><Icon name="users" size={32} /></div>
          </div>
        </>}

        {/* Expenses */}
        {activeTab === "expenses" && (
          expenses.length === 0 ? <EmptyState emoji="🧾" text="No expenses yet. Tap + to add one." /> :
          expenses.map(ex => (
            <Card key={ex._id} className="flex justify-between items-center">
              <div className="flex gap-3 items-center">
                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <div>
                  <p className="text-[13px] font-semibold">{ex.label}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5 uppercase">{ex.category} • {ex.date}</p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-[13px] font-bold text-red-400 font-mono">-{formatINR(ex.amount)}</span>
                <DelBtn id={ex._id} />
              </div>
            </Card>
          ))
        )}

        {/* Income */}
        {activeTab === "income" && (
          income.length === 0 ? <EmptyState emoji="💸" text="No income added yet. Tap + to add one." /> :
          income.map(inc => (
            <Card key={inc._id} className="flex justify-between items-center">
              <div className="flex gap-3 items-center">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <div>
                  <p className="text-[13px] font-semibold">{inc.label}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5 uppercase">{inc.category}</p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-[13px] font-bold text-emerald-400 font-mono">+{formatINR(inc.amount)}</span>
                <DelBtn id={inc._id} />
              </div>
            </Card>
          ))
        )}

        {/* Loans */}
        {activeTab === "loans" && (
          loans.length === 0 ? <EmptyState emoji="🤝" text="No loans tracked yet. Tap + to add one." /> :
          loans.map(loan => (
            <Card key={loan._id} className={loan.paid ? "opacity-40" : ""}>
              <div className="flex justify-between items-start">
                <div className="flex gap-2.5 items-start">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                    <Icon name="users" size={14} />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold">{loan.person}</p>
                    {loan.note && <p className="text-[9px] text-slate-500 mt-0.5">{loan.note}</p>}
                    <p className="text-[9px] text-slate-600 mt-0.5">{loan.date}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-amber-500 font-bold font-mono text-sm">{formatINR(loan.amount)}</span>
                  {loan.paid && <span className="text-[8px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">COLLECTED</span>}
                  <DelBtn id={loan._id} />
                </div>
              </div>
              {!loan.paid && (
                <button onClick={() => markLoanPaid(loan._id)}
                  className="w-full mt-3 py-2.5 bg-amber-500/[0.08] border border-amber-500/20 rounded-xl text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer hover:bg-amber-500/[0.14] transition-colors"
                >
                  <Icon name="check" size={11} /> Mark as Collected
                </button>
              )}
            </Card>
          ))
        )}

        {/* Goals */}
        {activeTab === "goals" && (
          goals.length === 0 ? <EmptyState emoji="🎯" text="No goals yet. Tap + to set one." /> :
          goals.map(goal => (
            <Card key={goal._id}>
              <div className="flex justify-between items-center mb-2.5">
                <div className="flex items-center gap-2">
                  <span style={{ color: goal.color }}><Icon name="target" size={14} /></span>
                  <span className="text-[13px] font-bold">{goal.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-white/25">
                    {Math.round(((goal.saved || 0) / (goal.target || 1)) * 100)}%
                  </span>
                  <DelBtn id={goal._id} />
                </div>
              </div>
              <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(((goal.saved || 0) / (goal.target || 1)) * 100, 100)}%`, background: goal.color }} />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[10px] text-slate-400 font-mono">{formatINR(goal.saved || 0)}</span>
                <span className="text-[10px] text-slate-500 font-mono">Goal: {formatINR(goal.target || 0)}</span>
              </div>
              {(goal.saved || 0) < (goal.target || 0) ? (
                <button onClick={() => setUpdateGoal(goal)}
                  className="w-full mt-2.5 py-2 bg-violet-500/[0.08] border border-violet-500/20 rounded-xl text-[9px] font-black text-violet-400 uppercase tracking-widest cursor-pointer hover:bg-violet-500/[0.14] transition-colors"
                >
                  + Add to Savings
                </button>
              ) : (
                <div className="mt-2.5 text-center text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                  🎉 Goal Reached!
                </div>
              )}
            </Card>
          ))
        )}

      </div>

      {/* Bottom Dock */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[388px] bg-black/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl px-2 py-2 flex justify-around items-center z-40 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        {[{ tab: "dashboard", icon: "wallet" }, { tab: "goals", icon: "target" }, { tab: "loans", icon: "users" }].map(({ tab, icon }) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`p-2.5 rounded-2xl border-none cursor-pointer flex items-center justify-center transition-all ${activeTab === tab ? "bg-white text-black" : "bg-transparent text-slate-500 hover:text-slate-300"}`}
          >
            <Icon name={icon} size={18} />
          </button>
        ))}
        <div className="w-px h-6 bg-white/[0.08]" />
        <button onClick={() => setShowAdd(true)}
          className="px-4 py-2.5 rounded-2xl bg-emerald-500 border-none text-white cursor-pointer flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-600 active:scale-95 transition-all"
        >
          <Icon name="plus" size={16} /> Add
        </button>
      </nav>

      {showAdd    && <AddModal onClose={() => setShowAdd(false)} onAdd={handleAdd} defaultType={defaultAddType} />}
      {updateGoal && <UpdateSavingsModal goal={updateGoal} onClose={() => setUpdateGoal(null)} onUpdate={updateGoalSavings} />}
    </div>
  );
}