import { useState, useMemo, useEffect, useCallback } from "react";
import { API_URL } from "../config/api";

const inputCls = "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-slate-200 text-[13px] outline-none focus:border-emerald-500/40 transition-colors";

interface AttendanceRecord {
  _id: string;
  date: string;
  status: "present" | "absent" | "leave";
  subject: string;
  hours: number;
  leaveReason?: string;
  semester?: string;
}

interface SubjectItem {
  _id: string;
  name: string;
  semester?: string;
}

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

  const [attendance,        setAttendance]        = useState<AttendanceRecord[]>([]);
  const [subjects,          setSubjects]          = useState<SubjectItem[]>([]);
  const [semesters,         setSemesters]         = useState<string[]>(["Semester 1"]);
  const [selectedSemester,  setSelectedSemester]  = useState<string>(
    localStorage.getItem("active_semester") || "Semester 1"
  );
  const [showAddSemModal,   setShowAddSemModal]   = useState(false);
  const [newSemName,        setNewSemName]        = useState("");
  const [loading,           setLoading]           = useState(true);
  const [newSubject,        setNewSubject]        = useState("");
  const [addingSubj,        setAddingSubj]        = useState(false);
  const [showManage,        setShowManage]        = useState(false);
  const [msg,               setMsg]               = useState({ text: "", type: "" });

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    date:        today,
    status:      "present" as "present" | "absent" | "leave",
    subject:     "",
    hours:       "1",
    leaveReason: "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const showMsg = (text: string, type: "success" | "error") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  // ── Fetch semesters ───────────────────────────────────────────────────────
  const fetchSemesters = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/attendance/semesters`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const localSemStr = localStorage.getItem("custom_semesters");
      const localSems: string[] = localSemStr ? JSON.parse(localSemStr) : [];
      const activeSem = localStorage.getItem("active_semester");

      if (res.ok) {
        const data = await res.json();
        const serverSems = Array.isArray(data) ? data : [];
        const merged = Array.from(
          new Set(["Semester 1", ...serverSems, ...localSems, ...(activeSem ? [activeSem] : [])])
        ).filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        setSemesters(merged);
      }
    } catch (err) {
      console.error("Fetch semesters error:", err);
    }
  }, [token]);

  // ── Fetch subjects for active semester ────────────────────────────────────
  const fetchSubjects = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/api/attendance/subjects?semester=${encodeURIComponent(selectedSemester)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setSubjects(list);
      // Auto-select first subject if form subject not in current subjects
      if (list.length > 0) {
        setForm(f => ({ ...f, subject: list[0].name }));
      } else {
        setForm(f => ({ ...f, subject: "" }));
      }
    } catch (err) {
      console.error("Fetch subjects error:", err);
      setSubjects([]);
    }
  }, [token, selectedSemester]);

  // ── Fetch attendance for active semester ──────────────────────────────────
  const fetchAttendance = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/api/attendance?semester=${encodeURIComponent(selectedSemester)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAttendance(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch attendance error:", err);
      setAttendance([]);
    }
  }, [token, selectedSemester]);

  // ── Load all on mount or semester change ──────────────────────────────────
  useEffect(() => {
    fetchSemesters();
  }, [fetchSemesters]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSubjects(), fetchAttendance()])
      .finally(() => setLoading(false));
  }, [fetchSubjects, fetchAttendance]);

  const handleSemesterChange = (sem: string) => {
    setSelectedSemester(sem);
    localStorage.setItem("active_semester", sem);
  };

  const handleAddNextSemester = async () => {
    let nextSem = newSemName.trim();
    if (!nextSem) {
      const match = selectedSemester.match(/\d+/);
      const num = match ? parseInt(match[0]) + 1 : semesters.length + 1;
      nextSem = `Semester ${num}`;
    }

    // Save semester to backend DB
    try {
      await fetch(`${API_URL}/api/attendance/semesters`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: nextSem }),
      });
    } catch (err) {
      console.error("Save semester error:", err);
    }

    // Save semester to localStorage
    const localSemStr = localStorage.getItem("custom_semesters");
    const localSems: string[] = localSemStr ? JSON.parse(localSemStr) : [];
    if (!localSems.includes(nextSem)) {
      localSems.push(nextSem);
      localStorage.setItem("custom_semesters", JSON.stringify(localSems));
    }

    if (!semesters.includes(nextSem)) {
      setSemesters(s => [...s, nextSem]);
    }
    handleSemesterChange(nextSem);
    setNewSemName("");
    setShowAddSemModal(false);
    setShowManage(true);
    showMsg(`🎓 Switched to ${nextSem}. Add your subjects below!`, "success");
  };

  // ── Add subject ───────────────────────────────────────────────────────────
  const addSubject = async () => {
    const trimmed = newSubject.trim();
    if (!trimmed) return;
    setAddingSubj(true);
    try {
      const res  = await fetch(`${API_URL}/api/attendance/subjects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: trimmed, semester: selectedSemester }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewSubject("");
        await fetchSubjects();
        await fetchSemesters();
        setForm(f => ({ ...f, subject: trimmed }));
        showMsg(`✅ "${trimmed}" added to ${selectedSemester}`, "success");
      } else {
        showMsg(data.message || "Failed to add subject", "error");
      }
    } catch {
      showMsg("Server error", "error");
    } finally {
      setAddingSubj(false);
    }
  };

  // ── Delete subject ────────────────────────────────────────────────────────
  const deleteSubject = async (id: string, name: string) => {
    try {
      await fetch(`${API_URL}/api/attendance/subjects/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchSubjects();
      if (form.subject === name) {
        setForm(f => ({ ...f, subject: subjects[0]?.name || "" }));
      }
      showMsg(`🗑️ "${name}" removed`, "success");
    } catch {
      showMsg("Server error", "error");
    }
  };

  // ── Add attendance record ─────────────────────────────────────────────────
  const addRecord = async () => {
    if (!form.subject) {
      showMsg("Please select a subject", "error");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/attendance`, {
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
          semester:    selectedSemester,
        }),
      });
      if (res.ok) {
        setForm(f => ({ ...f, leaveReason: "", hours: "1" }));
        await fetchAttendance();
        await fetchSemesters();
        showMsg(`✅ Record added to ${selectedSemester}`, "success");
      }
    } catch {
      showMsg("Server error", "error");
    }
  };

  // ── Delete record ─────────────────────────────────────────────────────────
  const deleteRecord = async (id: string) => {
    try {
      await fetch(`${API_URL}/api/attendance/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchAttendance();
    } catch {
      showMsg("Server error", "error");
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

  return (
    <div className="p-4 md:p-6 min-h-screen bg-[#04040a] text-slate-200">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-black text-white">Attendance</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
            Track daily attendance by Semester
          </p>
        </div>
        <button
          onClick={() => setShowManage(s => !s)}
          className={`px-3 py-2 border rounded-xl text-[10px] font-black uppercase tracking-wide cursor-pointer transition-colors ${
            showManage
              ? "bg-violet-500/10 border-violet-500/20 text-violet-400"
              : "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-slate-400"
          }`}
        >
          ⚙️ Manage Subjects
        </button>
      </div>

      {/* ── Semester Selector Bar ── */}
      <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-2 mb-4 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {semesters.map(sem => (
            <button
              key={sem}
              onClick={() => handleSemesterChange(sem)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all border ${
                selectedSemester === sem
                  ? "bg-violet-500/20 border-violet-500/40 text-violet-300 shadow-sm"
                  : "bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-slate-200"
              }`}
            >
              🎓 {sem}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowAddSemModal(true)}
          className="px-3 py-1.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-xs font-bold tracking-wide cursor-pointer transition-colors border-none whitespace-nowrap shrink-0 shadow"
        >
          + Add Next Sem
        </button>
      </div>

      {/* ── Message banner ── */}
      {msg.text && (
        <div className={`mb-4 px-4 py-3 rounded-xl border text-xs font-bold ${
          msg.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          {msg.text}
        </div>
      )}

      {/* ── Manage subjects ── */}
      {(showManage || subjects.length === 0) && (
        <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
              Manage Subjects for <span className="text-violet-400 font-bold">{selectedSemester}</span>
            </p>
          </div>

          {/* Add new subject */}
          <div className="flex gap-2 mb-4">
            <input
              className={inputCls}
              placeholder={`Add subject for ${selectedSemester}... (e.g. Physics, DBMS)`}
              value={newSubject}
              onChange={e => setNewSubject(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addSubject()}
            />
            <button
              onClick={addSubject}
              disabled={!newSubject.trim() || addingSubj}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-black rounded-xl cursor-pointer transition-colors shrink-0"
            >
              {addingSubj ? "..." : "Add"}
            </button>
          </div>

          {/* Subject chips */}
          {subjects.length === 0 ? (
            <p className="text-xs text-amber-400/80 font-medium">
              ⚠️ No subjects in {selectedSemester} yet. Add subjects above to start taking attendance.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {subjects.map(s => (
                <div
                  key={s._id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-xl"
                >
                  <span className="text-xs font-semibold text-slate-300">{s.name}</span>
                  <button
                    onClick={() => deleteSubject(s._id, s.name)}
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
          )}
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-6">
        {[
          { label: `${selectedSemester} Attendance`, value: `${stats.pct}%`,  color: stats.pct >= 75 ? "text-emerald-400" : "text-red-400" },
          { label: "Present",     value: stats.present,     color: "text-emerald-400" },
          { label: "Absent",      value: stats.absent,      color: "text-red-400"     },
          { label: "Total Hours", value: `${stats.hours}h`, color: "text-violet-400"  },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-3.5">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 truncate">{label}</p>
            <p className={`text-xl font-black font-mono ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

        {/* ── Add Record ── */}
        <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-4">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
            Add Record ({selectedSemester})
          </h2>

          <div className="mb-3">
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Date</label>
            <input type="date" className={inputCls} value={form.date} onChange={e => set("date", e.target.value)} />
          </div>

          <div className="mb-3">
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
              Subject
            </label>
            {subjects.length === 0 ? (
              <div className="px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400 font-semibold">
                Add subjects for {selectedSemester} above to mark attendance
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {subjects.map(s => (
                  <button
                    key={s._id}
                    onClick={() => set("subject", s.name)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer border transition-all ${
                      form.subject === s.name
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-white/[0.03] border-white/[0.06] text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
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
              type="number" min="0" max="12"
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
            + Add Record ({selectedSemester})
          </button>
        </div>

        {/* ── Subject Stats ── */}
        <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-4">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
            Subject-wise ({selectedSemester})
          </h2>
          {subjectStats.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-2xl mb-2 opacity-30">📚</div>
              <p className="text-xs text-slate-600">No records for {selectedSemester} yet</p>
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
                  <p className="text-[9px] text-slate-600 mt-0.5">
                    {s.present}/{s.total} classes
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Records List ── */}
      <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-4">
        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
          Records ({selectedSemester})
        </h2>
        {attendance.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-2 opacity-30">📅</div>
            <p className="text-xs text-slate-600">No attendance records in {selectedSemester} yet</p>
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

      {/* ── Add Semester Modal ── */}
      {showAddSemModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[200] flex items-center justify-center px-4" onClick={e => e.target === e.currentTarget && setShowAddSemModal(false)}>
          <div className="w-full max-w-sm bg-[#0d0d1a] border border-white/10 rounded-2xl p-5 shadow-2xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-white">Add Next Semester</h3>
              <button onClick={() => setShowAddSemModal(false)} className="text-slate-400 hover:text-white border-none bg-transparent cursor-pointer">✕</button>
            </div>
            <p className="text-xs text-slate-400 mb-4">Create a new semester so new subjects and attendance won't mix with previous semesters.</p>
            <input
              className={inputCls}
              placeholder={`e.g. Semester ${semesters.length + 1} or Fall 2026`}
              value={newSemName}
              onChange={e => setNewSemName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddNextSemester()}
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAddSemModal(false)} className="flex-1 py-2.5 rounded-xl bg-white/[0.05] text-slate-400 text-xs font-bold border-none cursor-pointer">Cancel</button>
              <button onClick={handleAddNextSemester} className="flex-1 py-2.5 rounded-xl bg-violet-500 text-white text-xs font-bold border-none cursor-pointer hover:bg-violet-600">Create & Switch</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}