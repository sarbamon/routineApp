import { useState, useMemo, useEffect, useCallback } from "react";
import { API_URL } from "../config/api";

const inputCls = "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-slate-200 text-[13px] outline-none focus:border-emerald-500/40 transition-colors";
const SUBJECTS_KEY = "akieme_subjects";

interface AttendanceRecord {
  _id: string;
  date: string;
  status: "present" | "absent" | "leave";
  subject: string;
  hours: number;
  leaveReason?: string;
}

const loadSubjects = (): string[] => {
  try { return JSON.parse(localStorage.getItem(SUBJECTS_KEY) || "[]"); }
  catch { return []; }
};

const saveSubjects = (s: string[]) =>
  localStorage.setItem(SUBJECTS_KEY, JSON.stringify(s));

const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>
);

export default function AttendanceTrackerPage() {
  const token = localStorage.getItem("token");

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [subjects,   setSubjects]   = useState<string[]>(loadSubjects);
  const [newSubject, setNewSubject] = useState("");
  const [showManage, setShowManage] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    date:        today,
    status:      "present" as "present" | "absent" | "leave",
    subject:     loadSubjects()[0] || "",
    hours:       "1",
    leaveReason: "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchAttendance = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/api/attendance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAttendance(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch attendance", err);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  // ── Subjects ──────────────────────────────────────────────────────────────
  const addSubject = () => {
    const trimmed = newSubject.trim();
    if (!trimmed || subjects.includes(trimmed)) return;
    const updated = [...subjects, trimmed];
    setSubjects(updated);
    saveSubjects(updated);
    setNewSubject("");
    setForm(f => ({ ...f, subject: trimmed }));
  };

  const deleteSubject = (name: string) => {
    const updated = subjects.filter(s => s !== name);
    setSubjects(updated);
    saveSubjects(updated);
    if (form.subject === name) setForm(f => ({ ...f, subject: updated[0] || "" }));
  };

  // ── Add record ────────────────────────────────────────────────────────────
  const addRecord = async () => {
    if (!form.subject) return;
    try {
      await fetch(`${API_URL}/api/attendance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date:        form.date,
          status:      form.status,
          subject:     form.subject,
          hours:       Number(form.hours),
          leaveReason: form.leaveReason,
        }),
      });
      setForm(f => ({ ...f, leaveReason: "", hours: "1" }));
      fetchAttendance();
    } catch (err) {
      console.error("Failed to add record", err);
    }
  };

  // ── Delete record ─────────────────────────────────────────────────────────
  const deleteRecord = async (id: string) => {
    try {
      await fetch(`${API_URL}/api/attendance/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAttendance();
    } catch (err) {
      console.error("Failed to delete record", err);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total   = attendance.length;
    const present = attendance.filter(r => r.status === "present").length;
    const absent  = attendance.filter(r => r.status === "absent").length;
    const hours   = attendance.reduce((s, r) => s + r.hours, 0);
    const pct     = total ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, hours, pct };
  }, [attendance]);

  const subjectStats = useMemo(() => {
    const map: Record<string, { present: number; total: number; hours: number }> = {};
    attendance.forEach(r => {
      if (!map[r.subject]) map[r.subject] = { present: 0, total: 0, hours: 0 };
      map[r.subject].total++;
      map[r.subject].hours += r.hours;
      if (r.status === "present") map[r.subject].present++;
    });
    return Object.entries(map).map(([subject, d]) => ({
      subject, ...d,
      pct: d.total ? Math.round((d.present / d.total) * 100) : 0,
    }));
  }, [attendance]);

  const statusColor = (s: string) =>
    s === "present" ? "text-emerald-400"
    : s === "absent" ? "text-red-400"
    : "text-amber-400";

  const statusBg = (s: string) =>
    s === "present" ? "bg-emerald-500/10 border-emerald-500/20"
    : s === "absent" ? "bg-red-500/10 border-red-500/20"
    : "bg-amber-500/10 border-amber-500/20";

  if (loading) return (
    <div className="min-h-screen bg-[#04040a] flex items-center justify-center">
      <p className="text-slate-500 text-sm">Loading attendance...</p>
    </div>
  );

  // ── First time setup ──────────────────────────────────────────────────────
  if (subjects.length === 0 && !showManage) return (
    <div className="p-4 md:p-6 min-h-screen bg-[#04040a] text-slate-200 flex flex-col items-center justify-center">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-4 opacity-40">📚</div>
        <h2 className="text-xl font-black text-white mb-2">No subjects yet</h2>
        <p className="text-sm text-slate-500 mb-6">
          Add your subjects first before tracking attendance.
        </p>
        <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">
            Add your first subject
          </p>
          <div className="flex gap-2">
            <input
              className={inputCls}
              placeholder="e.g. Mathematics"
              value={newSubject}
              onChange={e => setNewSubject(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addSubject()}
              autoFocus
            />
            <button
              onClick={addSubject}
              disabled={!newSubject.trim()}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-black rounded-xl cursor-pointer transition-colors shrink-0"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 min-h-screen bg-[#04040a] text-slate-200">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Attendance</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
            Track your daily attendance
          </p>
        </div>
        <button
          onClick={() => setShowManage(s => !s)}
          className="px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-wide cursor-pointer transition-colors"
        >
          ⚙️ Subjects
        </button>
      </div>

      {/* ── Manage subjects ── */}
      {showManage && (
        <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-4 mb-4">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">
            Manage Subjects
          </p>
          <div className="flex gap-2 mb-4">
            <input
              className={inputCls}
              placeholder="e.g. Physics, History..."
              value={newSubject}
              onChange={e => setNewSubject(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addSubject()}
            />
            <button
              onClick={addSubject}
              disabled={!newSubject.trim() || subjects.includes(newSubject.trim())}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-black rounded-xl cursor-pointer transition-colors shrink-0"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {subjects.map(s => (
              <div
                key={s}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-xl"
              >
                <span className="text-xs font-semibold text-slate-300">{s}</span>
                <button
                  onClick={() => deleteSubject(s)}
                  className="text-slate-600 hover:text-red-400 transition-colors cursor-pointer"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-6">
        {[
          { label: "Attendance",  value: `${stats.pct}%`,  color: "text-emerald-400" },
          { label: "Present",     value: stats.present,     color: "text-emerald-400" },
          { label: "Absent",      value: stats.absent,      color: "text-red-400"     },
          { label: "Total Hours", value: `${stats.hours}h`, color: "text-violet-400"  },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-3.5">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-xl font-black font-mono ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

        {/* ── Add Record ── */}
        <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-4">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
            Add Record
          </h2>

          <div className="mb-3">
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Date</label>
            <input
              type="date"
              className={inputCls}
              value={form.date}
              onChange={e => set("date", e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Subject</label>
            <div className="flex flex-wrap gap-2">
              {subjects.map(s => (
                <button
                  key={s}
                  onClick={() => set("subject", s)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer border transition-all ${
                    form.subject === s
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-white/[0.03] border-white/[0.06] text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {(["present", "absent", "leave"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => set("status", s)}
                  className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wide cursor-pointer border transition-all ${
                    form.status === s
                      ? `${statusBg(s)} ${statusColor(s)}`
                      : "border-white/[0.06] bg-white/[0.03] text-slate-500"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Hours</label>
            <input
              type="number"
              min="0"
              max="12"
              className={inputCls}
              value={form.hours}
              onChange={e => set("hours", e.target.value)}
            />
          </div>

          {form.status === "leave" && (
            <div className="mb-3">
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Leave Reason
              </label>
              <input
                className={inputCls}
                placeholder="e.g. Sick, Family"
                value={form.leaveReason}
                onChange={e => set("leaveReason", e.target.value)}
              />
            </div>
          )}

          <button
            onClick={addRecord}
            disabled={!form.subject}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-black uppercase tracking-widest rounded-xl cursor-pointer transition-colors mt-1"
          >
            + Add Record
          </button>
        </div>

        {/* ── Subject Stats ── */}
        <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-4">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Subject-wise</h2>
          {subjectStats.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-2xl mb-2 opacity-30">📚</div>
              <p className="text-xs text-slate-600">No records yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subjectStats.map(s => (
                <div key={s.subject}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-slate-300">{s.subject}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-500 font-mono">{s.hours}h</span>
                      <span className={`text-[10px] font-bold ${s.pct >= 75 ? "text-emerald-400" : "text-red-400"}`}>
                        {s.pct}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${s.pct >= 75 ? "bg-emerald-500" : "bg-red-500"}`}
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-slate-600 mt-0.5">{s.present}/{s.total} classes</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Records List ── */}
      <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-4">
        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">All Records</h2>
        {attendance.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-2 opacity-30">📅</div>
            <p className="text-xs text-slate-600">No attendance records yet</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {[...attendance].reverse().map(r => (
              <div
                key={r._id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-[9px] font-black uppercase tracking-wide px-2 py-1 rounded-lg border ${statusBg(r.status)} ${statusColor(r.status)}`}>
                    {r.status}
                  </span>
                  <div>
                    <p className="text-xs font-semibold">{r.subject}</p>
                    <p className="text-[9px] text-slate-500">
                      {r.date} • {r.hours}h {r.leaveReason ? `• ${r.leaveReason}` : ""}
                    </p>
                  </div>
                </div>
                {/* ✅ Always visible — no hover hide on mobile */}
                <button
                  onClick={() => deleteRecord(r._id)}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer shrink-0"
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}