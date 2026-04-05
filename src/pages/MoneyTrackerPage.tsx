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

const Icon = ({ name, size = 16 }: { name: string; size?: number }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const icons: Record<string, React.ReactNode> = {
    wallet:    <svg {...p}><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>,
    target:    <svg {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
    users:     <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    plus:      <svg {...p} strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    trash:     <svg {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
    edit:      <svg {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    check:     <svg {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    up:        <svg {...p} strokeWidth="2.5"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>,
    down:      <svg {...p} strokeWidth="2.5"><line x1="17" y1="7" x2="7" y2="17"/><polyline points="17 17 7 17 7 7"/></svg>,
    x:         <svg {...p} strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    more:      <svg {...p}><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>,
    analytics: <svg {...p}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    payments:  <svg {...p}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    dashboard: <svg {...p} fill="currentColor" stroke="none"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  };
  return <span className="inline-flex items-center">{icons[name]}</span>;
};

const inputCls = "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-slate-200 text-[13px] outline-none focus:border-[#b6a0ff]/40 transition-colors";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="mb-3.5">
    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{label}</label>
    {children}
  </div>
);

// ── Centered modal wrapper (not from bottom, so it clears the bottom nav) ─────
function ModalWrap({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center px-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[420px] max-h-[80vh] overflow-y-auto bg-[#13131b] border border-white/[0.08] rounded-3xl p-6">
        {children}
      </div>
    </div>
  );
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
function EntryModal({ onClose, onSave, defaultType, editItem }: {
  onClose: () => void;
  onSave: (type: string, data: Partial<MoneyItem>, id?: string) => Promise<void>;
  defaultType: string;
  editItem?: MoneyItem | null;
}) {
  const isEdit = !!editItem;
  const [type, setType] = useState(editItem?.type || defaultType || "expense");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    label:     editItem?.label     || "",
    amount:    editItem?.amount    ? String(editItem.amount) : "",
    date:      editItem?.date      || new Date().toISOString().split("T")[0],
    category:  editItem?.category  || "Food",
    person:    editItem?.person    || "",
    note:      editItem?.note      || "",
    goalLabel: editItem?.label     || "",
    target:    editItem?.target    ? String(editItem.target) : "",
    color:     editItem?.color     || "#8b5cf6",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const isValid = () => {
    if (type === "expense" || type === "income") return form.label.trim() && Number(form.amount) > 0 && form.date;
    if (type === "loan")   return form.person.trim() && Number(form.amount) > 0 && form.date;
    if (type === "goal")   return form.goalLabel.trim() && Number(form.target) > 0;
    return false;
  };

  const handleSubmit = async () => {
    if (!isValid()) return;
    setLoading(true);
    const payloads: Record<string, Partial<MoneyItem>> = {
      expense: { type: "expense", label: form.label, amount: Number(form.amount), date: form.date, category: form.category },
      income:  { type: "income",  label: form.label, amount: Number(form.amount), date: form.date, category: form.category },
      loan:    { type: "loan",    person: form.person, amount: Number(form.amount), date: form.date, note: form.note, paid: editItem?.paid || false },
      goal:    { type: "goal",    label: form.goalLabel, target: Number(form.target), saved: editItem?.saved || 0, color: form.color },
    };
    await onSave(type, payloads[type], editItem?._id);
    setLoading(false);
    onClose();
  };

  return (
    <ModalWrap onClose={onClose}>
      <div className="flex justify-between items-center mb-5">
        <span className="text-base font-black text-white">{isEdit ? "Edit Entry" : "Add Entry"}</span>
        <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/[0.06] text-slate-400 cursor-pointer flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors border-none">
          <Icon name="x" size={14} />
        </button>
      </div>

      {/* Type selector — locked when editing */}
      {!isEdit && (
        <div className="grid grid-cols-4 gap-1.5 mb-5">
          {["expense","income","loan","goal"].map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`py-2 px-1.5 rounded-xl text-[9px] font-black uppercase tracking-wide cursor-pointer transition-all border ${
                type === t ? "border-[#b6a0ff]/30 bg-[#b6a0ff]/10 text-[#b6a0ff]" : "border-white/[0.06] bg-white/[0.03] text-slate-500"
              }`}
            >{t}</button>
          ))}
        </div>
      )}
      {isEdit && (
        <div className="mb-4 px-3 py-2 bg-white/[0.04] rounded-xl border border-white/[0.06]">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Type: <span className="text-[#b6a0ff]">{type}</span></p>
        </div>
      )}

      {(type === "expense" || type === "income") && <>
        <Field label="Description"><input className={inputCls} placeholder="e.g. Groceries" value={form.label} onChange={e => set("label", e.target.value)} /></Field>
        <Field label="Amount (₹)"><input className={inputCls} type="number" placeholder="0" value={form.amount} onChange={e => set("amount", e.target.value)} /></Field>
        <Field label="Category">
          <select className={inputCls} value={form.category} onChange={e => set("category", e.target.value)}>
            {(type === "expense" ? EXP_CATS : INC_CATS).map(c => <option key={c} className="bg-[#13131b]">{c}</option>)}
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
        className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all mt-1 border-none ${
          isValid() && !loading ? "bg-gradient-to-r from-[#7e51ff] to-[#b6a0ff] text-white cursor-pointer" : "bg-slate-800 text-slate-600 cursor-not-allowed"
        }`}
      >
        {loading ? "Saving..." : isEdit ? "Save Changes" : `+ Add ${type}`}
      </button>
    </ModalWrap>
  );
}

// ── Update Savings Modal ──────────────────────────────────────────────────────
function UpdateSavingsModal({ goal, onClose, onUpdate }: { goal: MoneyItem; onClose: () => void; onUpdate: (id: string, add: number) => Promise<void> }) {
  const [amount, setAmount] = useState("");
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
    <ModalWrap onClose={onClose}>
      <div className="flex justify-between items-center mb-5">
        <span className="text-base font-black text-white">Update Savings</span>
        <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/[0.06] border-none text-slate-400 cursor-pointer flex items-center justify-center hover:bg-white/10 transition-colors">
          <Icon name="x" size={14} />
        </button>
      </div>
      <div className="mb-4 px-3.5 py-3 bg-[#b6a0ff]/[0.06] rounded-xl border border-[#b6a0ff]/[0.15]">
        <div className="text-[10px] font-black text-[#b6a0ff] uppercase tracking-widest mb-1">{goal.label}</div>
        <div className="text-[13px] text-slate-400 font-mono">{formatINR(goal.saved || 0)} <span className="text-slate-600">/ {formatINR(goal.target || 0)}</span></div>
      </div>
      <Field label="Add Amount (₹)">
        <input autoFocus type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} className={inputCls} />
      </Field>
      <button onClick={handleSubmit} disabled={!valid || loading}
        className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-none ${
          valid && !loading ? "bg-gradient-to-r from-[#7e51ff] to-[#b6a0ff] text-white cursor-pointer" : "bg-slate-800 text-slate-600 cursor-not-allowed"
        }`}
      >
        {loading ? "Saving..." : "Add to Savings"}
      </button>
    </ModalWrap>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteConfirmModal({ onClose, onConfirm, label }: { onClose: () => void; onConfirm: () => void; label: string }) {
  return (
    <ModalWrap onClose={onClose}>
      <div className="text-center py-2">
        <div className="text-4xl mb-4">🗑️</div>
        <h3 className="text-base font-black text-white mb-2">Delete Entry</h3>
        <p className="text-xs text-slate-500 mb-6">Are you sure you want to delete <span className="text-white font-bold">"{label}"</span>? This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/[0.06] text-slate-300 text-xs font-black uppercase tracking-wide cursor-pointer border-none hover:bg-white/10 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-black uppercase tracking-wide cursor-pointer hover:bg-red-500/30 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </ModalWrap>
  );
}

// ── Item action menu (⋮) ──────────────────────────────────────────────────────
function ItemMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all cursor-pointer border-none bg-transparent"
      >
        <Icon name="more" size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-36 bg-[#1f1f29] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
            <button
              onClick={e => { e.stopPropagation(); setOpen(false); onEdit(); }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-bold text-slate-300 hover:bg-white/[0.06] transition-colors cursor-pointer border-none bg-transparent text-left"
            >
              <Icon name="edit" size={13} /> Edit
            </button>
            <div className="h-px bg-white/[0.05]" />
            <button
              onClick={e => { e.stopPropagation(); setOpen(false); onDelete(); }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer border-none bg-transparent text-left"
            >
              <Icon name="trash" size={13} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Donut Chart ───────────────────────────────────────────────────────────────
function DonutChart({ segments, total }: { segments: { label: string; value: number; color: string }[]; total: number }) {
  let offset = 0;
  const r = 15.915;
  const circ = 2 * Math.PI * r;
  return (
    <div className="bg-[#13131b] rounded-2xl p-5 flex items-center justify-between gap-6 border border-white/[0.05]">
      <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
        <svg className="w-32 h-32" style={{ transform: "rotate(-90deg)" }} viewBox="0 0 36 36">
          <circle cx="18" cy="18" fill="transparent" r={r} stroke="#252530" strokeWidth="3.5" />
          {segments.map((seg, i) => {
            const pct = total > 0 ? (seg.value / total) * 100 : 0;
            const dash = (pct / 100) * circ;
            const el = <circle key={i} cx="18" cy="18" fill="transparent" r={r} stroke={seg.color} strokeWidth="3.5" strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset * circ / 100} />;
            offset += pct;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] text-slate-500">Total</span>
          <span className="text-base font-black text-white">{formatINR(total)}</span>
        </div>
      </div>
      <div className="flex-1 space-y-3">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
              <span className="text-xs text-slate-400">{seg.label}</span>
            </div>
            <span className="text-xs font-black text-white">{formatINR(seg.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MoneyTrackerPage() {
  const token = localStorage.getItem("token");

  const [income,      setIncome]      = useState<MoneyItem[]>([]);
  const [expenses,    setExpenses]    = useState<MoneyItem[]>([]);
  const [loans,       setLoans]       = useState<MoneyItem[]>([]);
  const [goals,       setGoals]       = useState<MoneyItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState("dashboard");
  const [showAdd,     setShowAdd]     = useState(false);
  const [editItem,    setEditItem]    = useState<MoneyItem | null>(null);
  const [deleteItem_,  setDeleteItem] = useState<MoneyItem | null>(null);
  const [updateGoal,  setUpdateGoal]  = useState<MoneyItem | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/api/money`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setIncome(data.income     || []);
      setExpenses(data.expenses || []);
      setLoans(data.loans       || []);
      setGoals(data.goals       || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Add ───────────────────────────────────────────────────────────────────
  const handleSave = async (_type: string, data: Partial<MoneyItem>, id?: string) => {
    if (id) {
      // Edit existing
      await fetch(`${API_URL}/api/money/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
    } else {
      // Add new
      await fetch(`${API_URL}/api/money`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
    }
    fetchData();
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteItem_) return;
    await fetch(`${API_URL}/api/money/${deleteItem_._id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setDeleteItem(null);
    fetchData();
  };

  const markLoanPaid = async (id: string) => {
    await fetch(`${API_URL}/api/money/${id}/paid`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
    fetchData();
  };

  const updateGoalSavings = async (id: string, add: number) => {
    await fetch(`${API_URL}/api/money/${id}/savings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ add }),
    });
    fetchData();
  };

  const stats = useMemo(() => {
    const totalIncome   = income.reduce((s, i) => s + i.amount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const totalLoans    = loans.filter(l => !l.paid).reduce((s, l) => s + l.amount, 0);
    return { income: totalIncome, expenses: totalExpenses, loans: totalLoans, net: totalIncome - totalExpenses };
  }, [income, expenses, loans]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { map[e.category || "Other"] = (map[e.category || "Other"] || 0) + e.amount; });
    const colors = ["#b6a0ff", "#68fadd", "#ff96bb", "#f59e0b", "#3b82f6", "#ef4444"];
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
  }, [expenses]);

  const recentActivity = useMemo(() =>
    [...expenses.map(e => ({ ...e, atype: "exp" })), ...income.map(i => ({ ...i, atype: "inc" }))]
      .sort((a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime())
      .slice(0, 8),
    [income, expenses]
  );

  const budgetPct = stats.income > 0 ? Math.min(Math.round((stats.expenses / stats.income) * 100), 100) : 0;
  const defaultAddType = ({ dashboard: "expense", goals: "goal", analytics: "expense", loans: "loan" } as Record<string, string>)[activeTab] || "expense";

  const TABS = [
    { id: "dashboard", label: "Overview"  },
    { id: "goals",     label: "Goals"     },
    { id: "analytics", label: "Insights"  },
    { id: "loans",     label: "Loans"     },
  ];

  const EmptyState = ({ emoji, text }: { emoji: string; text: string }) => (
    <div className="text-center py-12">
      <div className="text-4xl mb-3 opacity-20">{emoji}</div>
      <div className="text-xs font-semibold text-slate-600">{text}</div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-[#0d0d15] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#b6a0ff]/30 border-t-[#b6a0ff] rounded-full animate-spin" />
        <p className="text-xs text-slate-600">Loading...</p>
      </div>
    </div>
  );

  return (
    <div className="bg-[#0d0d15] text-[#efecf8] min-h-full">

      {/* ── Sticky tab bar ── */}
      <div className="sticky top-0 z-20 bg-[#0d0d15]/95 backdrop-blur-sm border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
          <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {TABS.map(({ id, label }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide cursor-pointer whitespace-nowrap transition-all border ${
                  activeTab === id
                    ? "bg-[#b6a0ff]/15 border-[#b6a0ff]/30 text-[#b6a0ff]"
                    : "bg-white/[0.03] border-white/[0.06] text-slate-500 hover:text-slate-300"
                }`}
              >{label}</button>
            ))}
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#7e51ff] to-[#b6a0ff] text-white text-[10px] font-black uppercase tracking-wide cursor-pointer border-none whitespace-nowrap shrink-0">
            <Icon name="plus" size={12} /> Add
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 pt-5 pb-8 space-y-5 max-w-lg mx-auto">

        {/* ── Dashboard ── */}
        {activeTab === "dashboard" && <>

          {/* Balance card */}
          <div className="bg-[#1f1f29]/80 backdrop-blur-xl rounded-2xl p-6 relative overflow-hidden border border-white/[0.06]">
            <div className="absolute -top-16 -right-16 w-40 h-40 bg-[#b6a0ff]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <p className="text-xs text-[#acaab5] mb-1">Net Balance</p>
              <p className="text-4xl font-black tracking-tight text-[#efecf8] mb-5">{formatINR(stats.net)}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#68fadd]/5 border border-[#68fadd]/10 rounded-xl p-3">
                  <p className="text-[9px] font-black text-[#68fadd] uppercase tracking-widest mb-1">Income</p>
                  <p className="text-base font-black">{formatINR(stats.income)}</p>
                  <p className="text-[10px] text-[#68fadd]/60">{income.length} entries</p>
                </div>
                <div className="bg-[#ff96bb]/5 border border-[#ff96bb]/10 rounded-xl p-3">
                  <p className="text-[9px] font-black text-[#ff96bb] uppercase tracking-widest mb-1">Expenses</p>
                  <p className="text-base font-black">{formatINR(stats.expenses)}</p>
                  <p className="text-[10px] text-[#ff96bb]/60">{expenses.length} entries</p>
                </div>
              </div>
            </div>
          </div>

          {/* Budget progress */}
          <div className="bg-[#13131b] rounded-2xl p-4 border border-white/[0.04]">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-black">Monthly Budget</h2>
              <span className="text-[#acaab5] text-xs font-medium">{budgetPct}% used</span>
            </div>
            <div className="bg-[#252530] h-2.5 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-gradient-to-r from-[#7e51ff] to-[#b6a0ff] rounded-full transition-all duration-700" style={{ width: `${budgetPct}%` }} />
            </div>
            <div className="flex justify-between text-[10px] font-medium text-[#acaab5]">
              <span>Spent: {formatINR(stats.expenses)}</span>
              <span>Income: {formatINR(stats.income)}</span>
            </div>
          </div>

          {/* Donut */}
          {categoryBreakdown.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-black">Spending Analysis</h2>
                <button onClick={() => setActiveTab("analytics")} className="text-[#b6a0ff] text-[10px] font-black uppercase tracking-widest border-none bg-transparent cursor-pointer">Details →</button>
              </div>
              <DonutChart segments={categoryBreakdown} total={stats.expenses} />
            </div>
          )}

          {/* Top categories */}
          {categoryBreakdown.length > 0 && (
            <div>
              <h2 className="text-sm font-black mb-3">Top Categories</h2>
              <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {categoryBreakdown.map((cat, i) => (
                  <div key={i} className="flex-shrink-0 bg-[#1f1f29] px-4 py-4 rounded-2xl flex flex-col items-start gap-2 min-w-[110px] border border-white/[0.04]">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: cat.color + "20", color: cat.color }}>
                      <Icon name="wallet" size={14} />
                    </div>
                    <div>
                      <p className="text-xs text-[#acaab5]">{cat.label}</p>
                      <p className="text-sm font-black">{formatINR(cat.value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent activity with edit/delete */}
          <div>
            <h2 className="text-sm font-black mb-3">Recent Activity</h2>
            {recentActivity.length === 0
              ? <EmptyState emoji="📭" text="No transactions yet. Tap Add to get started." />
              : recentActivity.map(item => (
                <div key={item._id} className="flex items-center justify-between p-4 bg-[#191922]/60 rounded-2xl mb-2 border border-white/[0.03]">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.atype === "inc" ? "bg-[#68fadd]/10 text-[#68fadd]" : "bg-[#ff96bb]/10 text-[#ff96bb]"}`}>
                      <Icon name={item.atype === "inc" ? "up" : "down"} size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-sm truncate">{item.label}</p>
                      <p className="text-[10px] text-[#acaab5] mt-0.5">{item.category} • {item.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-black text-sm ${item.atype === "inc" ? "text-[#68fadd]" : "text-[#efecf8]"}`}>
                      {item.atype === "inc" ? "+" : "-"}{formatINR(item.amount)}
                    </span>
                    <ItemMenu
                      onEdit={() => setEditItem(item)}
                      onDelete={() => setDeleteItem(item)}
                    />
                  </div>
                </div>
              ))
            }
          </div>

          {/* Outstanding loans */}
          {stats.loans > 0 && (
            <div className="bg-[#13131b] rounded-2xl p-4 flex justify-between items-center border border-[#f59e0b]/10 cursor-pointer" onClick={() => setActiveTab("loans")}>
              <div>
                <p className="text-[9px] font-black text-[#f59e0b] uppercase tracking-widest mb-1">Outstanding Loans</p>
                <p className="text-xl font-black">{formatINR(stats.loans)}</p>
              </div>
              <div className="text-5xl opacity-20">🤝</div>
            </div>
          )}
        </>}

        {/* ── Analytics ── */}
        {activeTab === "analytics" && <>
          <h2 className="text-base font-black">Spending Insights</h2>
          {categoryBreakdown.length === 0
            ? <EmptyState emoji="📊" text="Add expenses to see insights" />
            : <>
              <DonutChart segments={categoryBreakdown} total={stats.expenses} />
              <div className="space-y-2 mt-2">
                {categoryBreakdown.map((cat, i) => (
                  <div key={i} className="bg-[#13131b] rounded-2xl p-4 flex items-center justify-between border border-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.color }} />
                      <span className="text-sm font-bold">{cat.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black">{formatINR(cat.value)}</p>
                      <p className="text-[9px] text-slate-500">{stats.expenses > 0 ? Math.round((cat.value / stats.expenses) * 100) : 0}% of spend</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          }
        </>}

        {/* ── Goals ── */}
        {activeTab === "goals" && <>
          <h2 className="text-base font-black">Savings Goals</h2>
          {goals.length === 0
            ? <EmptyState emoji="🎯" text="No goals yet. Tap Add to set one." />
            : goals.map(goal => (
              <div key={goal._id} className="bg-[#13131b] border border-white/[0.04] rounded-2xl p-4 mb-3">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span style={{ color: goal.color }}><Icon name="target" size={16} /></span>
                    <span className="text-sm font-black truncate">{goal.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-black" style={{ color: goal.color }}>{Math.round(((goal.saved || 0) / (goal.target || 1)) * 100)}%</span>
                    <ItemMenu onEdit={() => setEditItem(goal)} onDelete={() => setDeleteItem(goal)} />
                  </div>
                </div>
                <div className="h-2 bg-[#252530] rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(((goal.saved || 0) / (goal.target || 1)) * 100, 100)}%`, background: goal.color }} />
                </div>
                <div className="flex justify-between mb-3">
                  <span className="text-[11px] text-[#acaab5]">{formatINR(goal.saved || 0)}</span>
                  <span className="text-[11px] text-slate-500">Goal: {formatINR(goal.target || 0)}</span>
                </div>
                {(goal.saved || 0) < (goal.target || 0)
                  ? <button onClick={() => setUpdateGoal(goal)} className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer border-none transition-colors" style={{ background: goal.color + "15", color: goal.color }}>+ Add to Savings</button>
                  : <div className="text-center text-[10px] font-black text-[#68fadd] uppercase tracking-widest">🎉 Goal Reached!</div>
                }
              </div>
            ))
          }
        </>}

        {/* ── Loans ── */}
        {activeTab === "loans" && <>
          <h2 className="text-base font-black">Loans & Debts</h2>
          {loans.length === 0
            ? <EmptyState emoji="🤝" text="No loans tracked yet. Tap Add to track one." />
            : loans.map(loan => (
              <div key={loan._id} className={`bg-[#13131b] border border-white/[0.04] rounded-2xl p-4 mb-3 ${loan.paid ? "opacity-40" : ""}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-3 items-center flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#f59e0b]/10 text-[#f59e0b] flex items-center justify-center shrink-0">
                      <Icon name="users" size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black truncate">{loan.person}</p>
                      {loan.note && <p className="text-[10px] text-slate-500">{loan.note}</p>}
                      <p className="text-[10px] text-slate-600">{loan.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[#f59e0b] font-black text-sm">{formatINR(loan.amount)}</span>
                      {loan.paid && <span className="text-[8px] bg-[#68fadd]/10 text-[#68fadd] border border-[#68fadd]/20 px-2 py-0.5 rounded-full font-black">COLLECTED</span>}
                    </div>
                    <ItemMenu onEdit={() => setEditItem(loan)} onDelete={() => setDeleteItem(loan)} />
                  </div>
                </div>
                {!loan.paid && (
                  <button onClick={() => markLoanPaid(loan._id)} className="w-full py-2.5 bg-[#f59e0b]/[0.08] border border-[#f59e0b]/20 rounded-xl text-[10px] font-black text-[#f59e0b] uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#f59e0b]/[0.14] transition-colors">
                    <Icon name="check" size={12} /> Mark as Collected
                  </button>
                )}
              </div>
            ))
          }
        </>}

      </div>

      {/* ── Modals (all centered, above bottom nav) ── */}
      {showAdd && (
        <EntryModal
          onClose={() => setShowAdd(false)}
          onSave={handleSave}
          defaultType={defaultAddType}
        />
      )}
      {editItem && (
        <EntryModal
          onClose={() => setEditItem(null)}
          onSave={handleSave}
          defaultType={editItem.type}
          editItem={editItem}
        />
      )}
      {deleteItem_ && (
        <DeleteConfirmModal
          onClose={() => setDeleteItem(null)}
          onConfirm={confirmDelete}
          label={deleteItem_.label || deleteItem_.person || "this item"}
        />
      )}
      {updateGoal && (
        <UpdateSavingsModal
          goal={updateGoal}
          onClose={() => setUpdateGoal(null)}
          onUpdate={updateGoalSavings}
        />
      )}
    </div>
  );
}