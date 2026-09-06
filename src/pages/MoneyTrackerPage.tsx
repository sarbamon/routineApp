import { useState, useMemo, useEffect, useCallback } from "react";
import { API_URL } from "../config/api";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const GOAL_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899"];
const EXP_CATS   = ["Food","Housing","Transport","Health","Shopping","Entertainment","Education","Other","Custom"];
const INC_CATS   = ["Salary","Freelance","Business","Investment","Gift","Other","Custom"];

const BILL_CATS = ["Credit Card", "Loan EMI", "Utility", "Subscription", "Rent", "Other", "Custom"];

const PRESET_BILLS = [
  { label: "Amazon Pay ICICI Card Bill", category: "Credit Card", amount: 2500, dueDate: "05" },
  { label: "Personal Loan EMI", category: "Loan EMI", amount: 8500, dueDate: "10" },
  { label: "Bajaj Finance EMI", category: "Loan EMI", amount: 3200, dueDate: "15" },
];

interface MoneyItem {
  _id: string;
  type: "income" | "expense" | "loan" | "goal" | "bill";
  label?: string;
  amount: number;
  date?: string;
  dueDate?: string;
  totalTenure?: number | null;
  startMonth?: string;
  status?: "active" | "completed";
  category?: string;
  person?: string;
  note?: string;
  paid?: boolean;
  paidMonths?: string[];
  target?: number;
  saved?: number;
  color?: string;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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
    left:      <svg {...p}><polyline points="15 18 9 12 15 6"/></svg>,
    right:     <svg {...p}><polyline points="9 18 15 12 9 6"/></svg>,
  };
  return <span className="inline-flex items-center">{icons[name]}</span>;
};

const inputCls = "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 placeholder-zinc-500 text-xs outline-none focus:border-zinc-500 transition-colors";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="mb-3.5">
    <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">{label}</label>
    {children}
  </div>
);

// ── Centered modal wrapper ───────────────────────────────────────────────────
function ModalWrap({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[200] flex items-center justify-center px-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[420px] max-h-[85vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
function EntryModal({ onClose, onSave, defaultType, editItem, defaultDate }: {
  onClose: () => void;
  onSave: (type: string, data: Partial<MoneyItem>, id?: string) => Promise<void>;
  defaultType: string;
  editItem?: MoneyItem | null;
  defaultDate?: string;
}) {
  const isEdit = !!editItem;
  const [type, setType] = useState(editItem?.type || defaultType || "expense");
  const [loading, setLoading] = useState(false);
  const initialCat = editItem?.category || (type === "expense" ? "Food" : type === "bill" ? "Credit Card" : "Salary");
  const isInitialCustom = !!editItem?.category && !EXP_CATS.concat(INC_CATS).concat(BILL_CATS).filter(c => c !== "Custom").includes(editItem.category);

  const [selectedCategory, setSelectedCategory] = useState(isInitialCustom ? "Custom" : initialCat);
  const [customCategory, setCustomCategory] = useState(isInitialCustom ? (editItem?.category || "") : "");
  
  const [tenureMode, setTenureMode] = useState<string>(
    editItem?.totalTenure ? (["3","6","9","12"].includes(String(editItem.totalTenure)) ? String(editItem.totalTenure) : "custom") : "0"
  );
  const [customTenure, setCustomTenure] = useState<string>(editItem?.totalTenure ? String(editItem.totalTenure) : "");

  const [form, setForm] = useState({
    label:      editItem?.label      || "",
    amount:     editItem?.amount     ? String(editItem.amount) : "",
    date:       editItem?.date       || defaultDate || new Date().toISOString().split("T")[0],
    dueDate:    editItem?.dueDate    || "05",
    startMonth: editItem?.startMonth || (defaultDate ? defaultDate.slice(0, 7) : new Date().toISOString().slice(0, 7)),
    person:     editItem?.person     || "",
    note:       editItem?.note       || "",
    goalLabel:  editItem?.label      || "",
    target:     editItem?.target     ? String(editItem.target) : "",
    color:      editItem?.color      || "#6366f1",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const applyPresetBill = (preset: { label: string; category: string; amount: number; dueDate: string }) => {
    setForm(f => ({
      ...f,
      label: preset.label,
      amount: String(preset.amount),
      dueDate: preset.dueDate,
    }));
    setSelectedCategory(preset.category);
  };

  const handleTypeChange = (t: string) => {
    setType(t);
    if (selectedCategory !== "Custom") {
      setSelectedCategory(t === "expense" ? "Food" : t === "bill" ? "Credit Card" : "Salary");
    }
  };

  const isValid = () => {
    if (type === "expense" || type === "income" || type === "bill") {
      const catValid = selectedCategory === "Custom" ? customCategory.trim().length > 0 : true;
      return form.label.trim() && Number(form.amount) > 0 && catValid;
    }
    if (type === "loan")   return form.person.trim() && Number(form.amount) > 0 && form.date;
    if (type === "goal")   return form.goalLabel.trim() && Number(form.target) > 0;
    return false;
  };

  const handleSubmit = async () => {
    if (!isValid()) return;
    setLoading(true);
    const finalCategory = selectedCategory === "Custom" ? customCategory.trim() : selectedCategory;
    const finalTenure = tenureMode === "0" ? null : (tenureMode === "custom" ? (Number(customTenure) || null) : Number(tenureMode));

    const payloads: Record<string, Partial<MoneyItem>> = {
      expense: { type: "expense", label: form.label, amount: Number(form.amount), date: form.date, category: finalCategory },
      income:  { type: "income",  label: form.label, amount: Number(form.amount), date: form.date, category: finalCategory },
      bill:    { type: "bill",    label: form.label, amount: Number(form.amount), dueDate: form.dueDate, totalTenure: finalTenure, startMonth: form.startMonth, category: finalCategory, date: form.date },
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
        <span className="text-base font-bold text-zinc-100">{isEdit ? "Edit Entry" : "Add Entry"}</span>
        <button onClick={onClose} className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors flex items-center justify-center cursor-pointer">
          <Icon name="x" size={14} />
        </button>
      </div>

      {/* Type selector */}
      {!isEdit && (
        <div className="grid grid-cols-5 gap-1 mb-5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
          {["expense","income","bill","loan","goal"].map(t => (
            <button key={t} onClick={() => handleTypeChange(t)}
              className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider cursor-pointer transition-all border-none ${
                type === t ? "bg-zinc-100 text-zinc-950 font-bold shadow-sm" : "bg-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >{t}</button>
          ))}
        </div>
      )}
      {isEdit && (
        <div className="mb-4 px-3 py-2 bg-zinc-900 rounded-xl border border-zinc-800">
          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Type: <span className="text-zinc-100 font-bold">{type}</span></p>
        </div>
      )}

      {type === "bill" && (
        <div className="mb-4 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Quick Presets:</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_BILLS.map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPresetBill(preset)}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium transition-colors border border-zinc-700 cursor-pointer"
              >
                + {preset.label.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {(type === "expense" || type === "income" || type === "bill") && <>
        <Field label={type === "bill" ? "Bill / Provider Name" : "Description"}>
          <input className={inputCls} placeholder={type === "bill" ? "e.g. Amazon Pay / Bajaj Finance EMI" : "e.g. Groceries"} value={form.label} onChange={e => set("label", e.target.value)} />
        </Field>
        <Field label="Amount (₹)"><input className={inputCls} type="number" placeholder="0" value={form.amount} onChange={e => set("amount", e.target.value)} /></Field>
        
        {type === "bill" && (<>
          <Field label="Due Day of Month (1 - 31)">
            <input className={inputCls} type="number" min="1" max="31" placeholder="e.g. 5" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
          </Field>
          <Field label="EMI Duration / Tenure">
            <div className="grid grid-cols-5 gap-1 mb-2">
              {[
                { label: "Ongoing", val: "0" },
                { label: "3 Mo",    val: "3" },
                { label: "6 Mo",    val: "6" },
                { label: "12 Mo",   val: "12" },
                { label: "Custom",  val: "custom" },
              ].map(t => (
                <button
                  key={t.val}
                  type="button"
                  onClick={() => setTenureMode(t.val)}
                  className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                    tenureMode === t.val ? "bg-zinc-100 text-zinc-950 font-bold" : "bg-zinc-900 border border-zinc-800 text-zinc-400"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {tenureMode === "custom" && (
              <input
                className={`${inputCls} mt-1.5`}
                type="number"
                placeholder="Enter total EMI months (e.g. 9 or 18)"
                value={customTenure}
                onChange={e => setCustomTenure(e.target.value)}
              />
            )}
            <p className="text-[10px] text-zinc-500 mt-1">
              {tenureMode === "0" ? "Recurring every month indefinitely." : `Auto-completes and stops after ${tenureMode === "custom" ? customTenure || "?" : tenureMode} months of payments.`}
            </p>
          </Field>
        </>)}

        <Field label="Category">
          <select className={inputCls} value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
            {(type === "expense" ? EXP_CATS : type === "bill" ? BILL_CATS : INC_CATS).map(c => (
              <option key={c} value={c} className="bg-zinc-900 text-zinc-100">
                {c === "Custom" ? "+ Custom Category..." : c}
              </option>
            ))}
          </select>
          {selectedCategory === "Custom" && (
            <input
              className={`${inputCls} mt-2`}
              placeholder="Enter custom category name (e.g. Subscriptions)"
              value={customCategory}
              onChange={e => setCustomCategory(e.target.value)}
              autoFocus
            />
          )}
        </Field>
        {type !== "bill" && <Field label="Date"><input className={inputCls} type="date" value={form.date} onChange={e => set("date", e.target.value)} /></Field>}
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
        className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all mt-2 border-none ${
          isValid() && !loading ? "bg-white text-zinc-950 hover:bg-zinc-200 cursor-pointer shadow" : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
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
        <span className="text-base font-bold text-zinc-100">Update Savings</span>
        <button onClick={onClose} className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors">
          <Icon name="x" size={14} />
        </button>
      </div>
      <div className="mb-4 px-3.5 py-3 bg-zinc-900 rounded-xl border border-zinc-800">
        <div className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider mb-1">{goal.label}</div>
        <div className="text-xs text-zinc-400 font-mono">{formatINR(goal.saved || 0)} <span className="text-zinc-500">/ {formatINR(goal.target || 0)}</span></div>
      </div>
      <Field label="Add Amount (₹)">
        <input autoFocus type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} className={inputCls} />
      </Field>
      <button onClick={handleSubmit} disabled={!valid || loading}
        className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-none ${
          valid && !loading ? "bg-white text-zinc-950 hover:bg-zinc-200 cursor-pointer shadow" : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
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
        <h3 className="text-base font-bold text-zinc-100 mb-2">Delete Entry</h3>
        <p className="text-xs text-zinc-400 mb-6">Are you sure you want to delete <span className="text-zinc-100 font-bold">"{label}"</span>? This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-wider cursor-pointer border-none hover:bg-zinc-700 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-rose-500/30 transition-colors">
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
        className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all cursor-pointer border-none bg-transparent"
      >
        <Icon name="more" size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-36 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
            <button
              onClick={e => { e.stopPropagation(); setOpen(false); onEdit(); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer border-none bg-transparent text-left"
            >
              <Icon name="edit" size={13} /> Edit
            </button>
            <div className="h-px bg-zinc-800" />
            <button
              onClick={e => { e.stopPropagation(); setOpen(false); onDelete(); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer border-none bg-transparent text-left"
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
    <div className="bg-zinc-900 rounded-2xl p-5 flex items-center justify-between gap-6 border border-zinc-800 shadow-sm">
      <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
        <svg className="w-32 h-32" style={{ transform: "rotate(-90deg)" }} viewBox="0 0 36 36">
          <circle cx="18" cy="18" fill="transparent" r={r} stroke="#27272a" strokeWidth="3.5" />
          {segments.map((seg, i) => {
            const pct = total > 0 ? (seg.value / total) * 100 : 0;
            const dash = (pct / 100) * circ;
            const el = <circle key={i} cx="18" cy="18" fill="transparent" r={r} stroke={seg.color} strokeWidth="3.5" strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset * circ / 100} />;
            offset += pct;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] text-zinc-400 font-medium">Total</span>
          <span className="text-base font-extrabold text-zinc-100">{formatINR(total)}</span>
        </div>
      </div>
      <div className="flex-1 space-y-2.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
              <span className="text-xs text-zinc-400 font-medium">{seg.label}</span>
            </div>
            <span className="text-xs font-bold text-zinc-100">{formatINR(seg.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MoneyTrackerPage() {
  const token = localStorage.getItem("token");

  const now = new Date();
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const [income,      setIncome]      = useState<MoneyItem[]>([]);
  const [expenses,    setExpenses]    = useState<MoneyItem[]>([]);
  const [loans,       setLoans]       = useState<MoneyItem[]>([]);
  const [goals,       setGoals]       = useState<MoneyItem[]>([]);
  const [bills,       setBills]       = useState<MoneyItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState("dashboard");
  const [showAdd,     setShowAdd]     = useState(false);
  const [editItem,    setEditItem]    = useState<MoneyItem | null>(null);
  const [deleteItem_,  setDeleteItem] = useState<MoneyItem | null>(null);
  const [updateGoal,  setUpdateGoal]  = useState<MoneyItem | null>(null);

  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const handleResetToCurrent = () => {
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
  };

  const fetchData = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/api/money`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setIncome(data.income     || []);
      setExpenses(data.expenses || []);
      setLoans(data.loans       || []);
      setGoals(data.goals       || []);
      setBills(data.bills       || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Add ───────────────────────────────────────────────────────────────────
  const handleSave = async (_type: string, data: Partial<MoneyItem>, id?: string) => {
    if (id) {
      await fetch(`${API_URL}/api/money/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
    } else {
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
    await fetch(`${API_URL}/api/money/${deleteItem_._id}`, { 
      method: "DELETE", 
      headers: { Authorization: `Bearer ${token}` } });
    setDeleteItem(null);
    fetchData();
  };

  const markLoanPaid = async (id: string) => {
    await fetch(`${API_URL}/api/money/${id}/paid`, { 
      method: "PATCH", 
      headers: { Authorization: `Bearer ${token}` } });
    fetchData();
  };

  const markBillPaid = async (id: string) => {
    await fetch(`${API_URL}/api/money/${id}/pay-bill`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ monthKey }),
    });
    fetchData();
  };

  const markBillUnpaid = async (id: string) => {
    await fetch(`${API_URL}/api/money/${id}/unpay-bill`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ monthKey }),
    });
    fetchData();
  };

  const seedDefaultBills = async () => {
    for (const preset of PRESET_BILLS) {
      await fetch(`${API_URL}/api/money`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: "bill",
          label: preset.label,
          amount: preset.amount,
          dueDate: preset.dueDate,
          category: preset.category,
          date: `${monthKey}-${preset.dueDate}`,
        }),
      });
    }
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

  // ── Monthly Filtered Memos ─────────────────────────────────────────────────
  const monthlyIncome = useMemo(() => {
    return income.filter(i => i.date?.startsWith(monthKey));
  }, [income, monthKey]);

  const monthlyExpenses = useMemo(() => {
    return expenses.filter(e => e.date?.startsWith(monthKey));
  }, [expenses, monthKey]);

  const stats = useMemo(() => {
    const totalIncome   = monthlyIncome.reduce((s, i) => s + i.amount, 0);
    const totalExpenses = monthlyExpenses.reduce((s, e) => s + e.amount, 0);
    const totalLoans    = loans.filter(l => !l.paid).reduce((s, l) => s + l.amount, 0);
    return { income: totalIncome, expenses: totalExpenses, loans: totalLoans, net: totalIncome - totalExpenses };
  }, [monthlyIncome, monthlyExpenses, loans]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    monthlyExpenses.forEach(e => { map[e.category || "Other"] = (map[e.category || "Other"] || 0) + e.amount; });
    const colors = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#3b82f6", "#8b5cf6"];
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
  }, [monthlyExpenses]);

  const recentActivity = useMemo(() =>
    [...monthlyExpenses.map(e => ({ ...e, atype: "exp" })), ...monthlyIncome.map(i => ({ ...i, atype: "inc" }))]
      .sort((a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime())
      .slice(0, 10),
    [monthlyIncome, monthlyExpenses]
  );

  const budgetPct = stats.income > 0 ? Math.min(Math.round((stats.expenses / stats.income) * 100), 100) : 0;
  const defaultAddType = ({ dashboard: "expense", bills: "bill", goals: "goal", analytics: "expense", loans: "loan" } as Record<string, string>)[activeTab] || "expense";
  const defaultEntryDate = isCurrentMonth
    ? new Date().toISOString().split("T")[0]
    : `${monthKey}-01`;

  const TABS = [
    { id: "dashboard", label: "Overview"  },
    { id: "bills",     label: "Bills"     },
    { id: "goals",     label: "Goals"     },
    { id: "analytics", label: "Insights"  },
    { id: "loans",     label: "Loans"     },
  ];

  const EmptyState = ({ emoji, text }: { emoji: string; text: string }) => (
    <div className="text-center py-12">
      <div className="text-4xl mb-3 opacity-30">{emoji}</div>
      <div className="text-xs font-medium text-zinc-500">{text}</div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 border-2 border-zinc-800 border-t-zinc-200 rounded-full animate-spin" />
        <p className="text-xs text-zinc-500">Loading...</p>
      </div>
    </div>
  );

  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-full font-sans pb-10">

      {/* ── Sticky tab bar ── */}
      <div className="sticky top-0 z-20 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
          <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {TABS.map(({ id, label }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide cursor-pointer whitespace-nowrap transition-all ${
                  activeTab === id
                    ? "bg-zinc-800 border border-zinc-700 text-zinc-100 shadow-sm"
                    : "bg-transparent border border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >{label}</button>
            ))}
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-zinc-950 text-xs font-bold tracking-wide hover:bg-zinc-200 cursor-pointer border-none whitespace-nowrap shrink-0 shadow">
            <Icon name="plus" size={12} /> Add
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 pt-5 pb-8 space-y-5 max-w-lg mx-auto">

        {/* ── Month Selector Bar ── */}
        <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2.5 shadow-sm">
          <button
            onClick={handlePrevMonth}
            className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 text-zinc-400 hover:text-white hover:bg-zinc-700 flex items-center justify-center cursor-pointer transition-colors"
            title="Previous Month"
          >
            <Icon name="left" size={14} />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-wide text-zinc-100">
              {MONTH_NAMES[selectedMonth]} {selectedYear}
            </span>
            {!isCurrentMonth && (
              <button
                onClick={handleResetToCurrent}
                className="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-medium cursor-pointer hover:bg-zinc-700 transition-colors"
              >
                This Month
              </button>
            )}
          </div>

          <button
            onClick={handleNextMonth}
            className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 text-zinc-400 hover:text-white hover:bg-zinc-700 flex items-center justify-center cursor-pointer transition-colors"
            title="Next Month"
          >
            <Icon name="right" size={14} />
          </button>
        </div>

        {/* ── Dashboard ── */}
        {activeTab === "dashboard" && <>

          {/* Balance card */}
          <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-sm relative overflow-hidden">
            <p className="text-xs font-medium text-zinc-400 mb-1">Net Balance ({MONTH_NAMES[selectedMonth]})</p>
            <p className="text-3xl font-extrabold tracking-tight text-white mb-4">{formatINR(stats.net)}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">Income</p>
                <p className="text-base font-bold text-zinc-100">{formatINR(stats.income)}</p>
                <p className="text-[10px] text-zinc-500">{monthlyIncome.length} entries</p>
              </div>
              <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider mb-1">Expenses</p>
                <p className="text-base font-bold text-zinc-100">{formatINR(stats.expenses)}</p>
                <p className="text-[10px] text-zinc-500">{monthlyExpenses.length} entries</p>
              </div>
            </div>
          </div>

          {/* Budget progress */}
          <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 shadow-sm">
            <div className="flex justify-between items-center mb-2.5">
              <h2 className="text-sm font-bold text-zinc-200">Monthly Budget ({MONTH_NAMES[selectedMonth]})</h2>
              <span className="text-zinc-400 text-xs font-medium">{budgetPct}% used</span>
            </div>
            <div className="bg-zinc-800 h-2 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-zinc-100 rounded-full transition-all duration-700" style={{ width: `${budgetPct}%` }} />
            </div>
            <div className="flex justify-between text-[11px] font-medium text-zinc-400">
              <span>Spent: {formatINR(stats.expenses)}</span>
              <span>Income: {formatINR(stats.income)}</span>
            </div>
          </div>

          {/* Donut */}
          {categoryBreakdown.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-bold text-zinc-200">Spending Analysis</h2>
                <button onClick={() => setActiveTab("analytics")} className="text-zinc-400 hover:text-zinc-200 text-[10px] font-semibold uppercase tracking-wider border-none bg-transparent cursor-pointer">Details →</button>
              </div>
              <DonutChart segments={categoryBreakdown} total={stats.expenses} />
            </div>
          )}

          {/* Top categories */}
          {categoryBreakdown.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-zinc-200 mb-3">Top Categories</h2>
              <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {categoryBreakdown.map((cat, i) => (
                  <div key={i} className="flex-shrink-0 bg-zinc-900 px-3.5 py-3 rounded-xl flex flex-col items-start gap-1.5 min-w-[110px] border border-zinc-800">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-800 text-zinc-300">
                      <Icon name="wallet" size={13} />
                    </div>
                    <div>
                      <p className="text-[11px] text-zinc-400">{cat.label}</p>
                      <p className="text-xs font-bold text-zinc-100">{formatINR(cat.value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent activity */}
          <div>
            <h2 className="text-sm font-bold text-zinc-200 mb-3">Recent Activity ({MONTH_NAMES[selectedMonth]})</h2>
            {recentActivity.length === 0
              ? <EmptyState emoji="📭" text={`No transactions in ${MONTH_NAMES[selectedMonth]} ${selectedYear}. Tap Add to get started.`} />
              : recentActivity.map(item => (
                <div key={item._id} className="flex items-center justify-between p-3.5 bg-zinc-900 rounded-xl mb-2 border border-zinc-800">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.atype === "inc" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                      <Icon name={item.atype === "inc" ? "up" : "down"} size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-zinc-100 truncate">{item.label}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{item.category} • {item.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-bold text-xs ${item.atype === "inc" ? "text-emerald-400" : "text-zinc-100"}`}>
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
            <div className="bg-zinc-900 rounded-2xl p-4 flex justify-between items-center border border-zinc-800 cursor-pointer" onClick={() => setActiveTab("loans")}>
              <div>
                <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1">Outstanding Loans</p>
                <p className="text-xl font-bold text-zinc-100">{formatINR(stats.loans)}</p>
              </div>
              <div className="text-4xl opacity-30">🤝</div>
            </div>
          )}
        </>}

        {/* ── Bills ── */}
        {activeTab === "bills" && (() => {
          const visibleBills = bills.filter(bill => {
            const isPaidThisMonth = bill.paidMonths?.includes(monthKey);
            if (isPaidThisMonth) return true;
            if (bill.status === "completed") return false;
            if (bill.startMonth && monthKey < bill.startMonth) return false;
            return true;
          });

          return (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-base font-bold text-zinc-100">Monthly Bills & EMIs</h2>
                <button onClick={() => setShowAdd(true)} className="text-zinc-300 hover:text-white text-[11px] font-bold uppercase tracking-wider border-none bg-transparent cursor-pointer">+ Add Bill</button>
              </div>
              <p className="text-xs text-zinc-400 mb-3">Recurring bills & EMIs due ({MONTH_NAMES[selectedMonth]} {selectedYear})</p>

              {/* Bills Summary Banner */}
              {visibleBills.length > 0 && (() => {
                const totalBillAmt = visibleBills.reduce((s, b) => s + b.amount, 0);
                const paidBills = visibleBills.filter(b => b.paidMonths?.includes(monthKey));
                const paidBillAmt = paidBills.reduce((s, b) => s + b.amount, 0);
                const dueBillAmt = totalBillAmt - paidBillAmt;
                return (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4 grid grid-cols-3 gap-2 text-center shadow-sm">
                    <div>
                      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Total Monthly</p>
                      <p className="text-sm font-bold text-zinc-100 mt-1">{formatINR(totalBillAmt)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Paid</p>
                      <p className="text-sm font-bold text-emerald-400 mt-1">{formatINR(paidBillAmt)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Pending</p>
                      <p className="text-sm font-bold text-amber-400 mt-1">{formatINR(dueBillAmt)}</p>
                    </div>
                  </div>
                );
              })()}

              {visibleBills.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center shadow-sm">
                  <div className="text-4xl mb-3">💳</div>
                  <h3 className="text-sm font-bold text-zinc-100 mb-1">No Active Bills for {MONTH_NAMES[selectedMonth]}</h3>
                  <p className="text-xs text-zinc-400 mb-5">Track Amazon Pay, Personal Loan EMIs, Bajaj Finance, and 3/6-month EMIs.</p>
                  <div className="flex flex-col gap-2 max-w-xs mx-auto">
                    <button
                      onClick={seedDefaultBills}
                      className="py-2.5 px-4 rounded-xl bg-white text-zinc-950 text-xs font-bold tracking-wider cursor-pointer border-none shadow hover:bg-zinc-200 transition-colors"
                    >
                      ⚡ Add Common Bills (Amazon Pay, EMIs)
                    </button>
                    <button
                      onClick={() => setShowAdd(true)}
                      className="py-2.5 px-4 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer hover:bg-zinc-700 transition-colors"
                    >
                      + Add Custom Bill
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleBills.map(bill => {
                    const isPaid = bill.paidMonths?.includes(monthKey);
                    const paidCount = bill.paidMonths?.length || 0;
                    const isCompleted = bill.status === "completed" || (bill.totalTenure ? paidCount >= bill.totalTenure : false);
                    const emiPct = bill.totalTenure ? Math.min((paidCount / bill.totalTenure) * 100, 100) : 0;

                    return (
                      <div key={bill._id} className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 transition-all ${isPaid ? "opacity-75 border-zinc-800" : ""}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isPaid ? "bg-emerald-500/10 text-emerald-400" : "bg-indigo-500/10 text-indigo-400"}`}>
                              <Icon name="payments" size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-zinc-100 truncate">{bill.label}</p>
                              <p className="text-[10px] text-zinc-400 mt-0.5">
                                {bill.category || "Bill"} • Due on {bill.dueDate ? `${bill.dueDate}th` : "Monthly"}
                                {bill.totalTenure && ` • ${isCompleted ? "Completed" : `EMI ${Math.min(paidCount + (isPaid ? 0 : 1), bill.totalTenure)} of ${bill.totalTenure}`}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold text-xs text-zinc-100">{formatINR(bill.amount)}</span>
                            <ItemMenu onEdit={() => setEditItem(bill)} onDelete={() => setDeleteItem(bill)} />
                          </div>
                        </div>

                        {/* Mini EMI Tenure Progress Bar */}
                        {bill.totalTenure && (
                          <div className="mt-2 mb-3">
                            <div className="flex justify-between text-[10px] font-medium mb-1">
                              <span className="text-indigo-400">EMI Tenure ({paidCount}/{bill.totalTenure} Paid)</span>
                              <span className="text-zinc-400">{Math.round(emiPct)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${emiPct}%` }} />
                            </div>
                          </div>
                        )}

                        {isPaid ? (
                          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                            <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1.5 tracking-wide">
                              <Icon name="check" size={12} /> {isCompleted ? `Completed (${paidCount}/${bill.totalTenure} Paid)` : `Paid for ${MONTH_NAMES[selectedMonth]}`}
                            </span>
                            <button
                              onClick={() => markBillUnpaid(bill._id)}
                              className="text-[10px] text-zinc-400 hover:text-zinc-200 tracking-wide border-none bg-transparent cursor-pointer font-medium"
                            >
                              Undo
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => markBillPaid(bill._id)}
                            className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 rounded-lg text-[10px] font-bold text-zinc-200 tracking-wide flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Icon name="check" size={12} /> Mark as Paid for {MONTH_NAMES[selectedMonth]}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Analytics ── */}
        {activeTab === "analytics" && <>
          <h2 className="text-base font-bold text-zinc-100">Spending Insights</h2>
          {categoryBreakdown.length === 0
            ? <EmptyState emoji="📊" text="Add expenses to see insights" />
            : <>
              <DonutChart segments={categoryBreakdown} total={stats.expenses} />
              <div className="space-y-2 mt-2">
                {categoryBreakdown.map((cat, i) => (
                  <div key={i} className="bg-zinc-900 rounded-xl p-3.5 flex items-center justify-between border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.color }} />
                      <span className="text-xs font-semibold text-zinc-200">{cat.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-zinc-100">{formatINR(cat.value)}</p>
                      <p className="text-[10px] text-zinc-500">{stats.expenses > 0 ? Math.round((cat.value / stats.expenses) * 100) : 0}% of spend</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          }
        </>}

        {/* ── Goals ── */}
        {activeTab === "goals" && <>
          <h2 className="text-base font-bold text-zinc-100">Savings Goals</h2>
          {goals.length === 0
            ? <EmptyState emoji="🎯" text="No goals yet. Tap Add to set one." />
            : goals.map(goal => (
              <div key={goal._id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-3">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span style={{ color: goal.color }}><Icon name="target" size={16} /></span>
                    <span className="text-xs font-bold text-zinc-100 truncate">{goal.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-bold" style={{ color: goal.color }}>{Math.round(((goal.saved || 0) / (goal.target || 1)) * 100)}%</span>
                    <ItemMenu onEdit={() => setEditItem(goal)} onDelete={() => setDeleteItem(goal)} />
                  </div>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(((goal.saved || 0) / (goal.target || 1)) * 100, 100)}%`, background: goal.color }} />
                </div>
                <div className="flex justify-between mb-3">
                  <span className="text-[11px] text-zinc-300 font-mono">{formatINR(goal.saved || 0)}</span>
                  <span className="text-[11px] text-zinc-500">Goal: {formatINR(goal.target || 0)}</span>
                </div>
                {(goal.saved || 0) < (goal.target || 0)
                  ? <button onClick={() => setUpdateGoal(goal)} className="w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer border-none transition-colors" style={{ background: goal.color + "15", color: goal.color }}>+ Add to Savings</button>
                  : <div className="text-center text-[10px] font-bold text-emerald-400 uppercase tracking-wider">🎉 Goal Reached!</div>
                }
              </div>
            ))
          }
        </>}

        {/* ── Loans ── */}
        {activeTab === "loans" && <>
          <h2 className="text-base font-bold text-zinc-100">Loans & Debts</h2>
          {loans.length === 0
            ? <EmptyState emoji="🤝" text="No loans tracked yet. Tap Add to track one." />
            : loans.map(loan => (
              <div key={loan._id} className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-3 ${loan.paid ? "opacity-50" : ""}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-3 items-center flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                      <Icon name="users" size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-100 truncate">{loan.person}</p>
                      {loan.note && <p className="text-[10px] text-zinc-400">{loan.note}</p>}
                      <p className="text-[10px] text-zinc-500">{loan.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-amber-400 font-bold text-xs">{formatINR(loan.amount)}</span>
                      {loan.paid && <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase">COLLECTED</span>}
                    </div>
                    <ItemMenu onEdit={() => setEditItem(loan)} onDelete={() => setDeleteItem(loan)} />
                  </div>
                </div>
                {!loan.paid && (
                  <button onClick={() => markLoanPaid(loan._id)} className="w-full py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer hover:bg-amber-500/20 transition-colors">
                    <Icon name="check" size={12} /> Mark as Collected
                  </button>
                )}
              </div>
            ))
          }
        </>}

      </div>

      {/* ── Modals ── */}
      {showAdd && (
        <EntryModal
          onClose={() => setShowAdd(false)}
          onSave={handleSave}
          defaultType={defaultAddType}
          defaultDate={defaultEntryDate}
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