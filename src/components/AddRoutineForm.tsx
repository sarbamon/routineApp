import { useState } from "react";
import { API_URL } from "../config/api";

type Props = {
  onAdd?: () => void;
};

const inputCls = "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-slate-200 text-[13px] outline-none focus:border-emerald-500/40 transition-colors";

const SECTIONS  = ["Home", "Hostel - No Class", "Hostel - With Class"];
const DURATIONS = ["15 min", "30 min", "45 min", "1 Hour", "1.5 Hours", "2 Hours", "3 Hours", "4 Hours"];

function AddRoutineForm({ onAdd }: Props) {
  const [formData, setFormData] = useState({
    section:  "Home",
    time:     "",
    activity: "",
    duration: "",
    notes:    "",
  });
  const [message, setMessage] = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  // Generate time options every 15 min
  const timeOptions: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const h    = hour % 12 === 0 ? 12 : hour % 12;
      const ampm = hour < 12 ? "AM" : "PM";
      const m    = minute.toString().padStart(2, "0");
      timeOptions.push(`${h}:${m} ${ampm}`);
    }
  }

  const set = (k: string, v: string) => setFormData(f => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    setMessage("");
    setError("");

    if (!formData.time || !formData.activity.trim()) {
      setError("Time and Activity are required");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API_URL}/api/routines`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Routine added ✅");
        setFormData({ section: "Home", time: "", activity: "", duration: "", notes: "" });
        onAdd?.();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setError(data.message || "Failed to create routine");
      }
    } catch {
      setError("Server not responding");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Success */}
      {message && (
        <div className="mb-4 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
          <span className="text-emerald-400 text-xs font-bold">{message}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
          <span className="text-red-400 text-xs font-bold">⚠️ {error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">

        {/* Section */}
        <div>
          <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
            Section
          </label>
          <select className={inputCls} value={formData.section} onChange={e => set("section", e.target.value)}>
            {SECTIONS.map(s => <option key={s} className="bg-[#0d0d1a]">{s}</option>)}
          </select>
        </div>

        {/* Time */}
        <div>
          <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
            Time
          </label>
          <select className={inputCls} value={formData.time} onChange={e => set("time", e.target.value)}>
            <option value="" className="bg-[#0d0d1a]">Select Time</option>
            {timeOptions.map(t => <option key={t} value={t} className="bg-[#0d0d1a]">{t}</option>)}
          </select>
        </div>

        {/* Activity */}
        <div>
          <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
            Activity
          </label>
          <input
            className={inputCls}
            placeholder="e.g. Morning Walk"
            value={formData.activity}
            onChange={e => set("activity", e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
            Duration
          </label>
          <select className={inputCls} value={formData.duration} onChange={e => set("duration", e.target.value)}>
            <option value="" className="bg-[#0d0d1a]">Select</option>
            {DURATIONS.map(d => <option key={d} value={d} className="bg-[#0d0d1a]">{d}</option>)}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
            Notes
          </label>
          <input
            className={inputCls}
            placeholder="Optional notes"
            value={formData.notes}
            onChange={e => set("notes", e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
          />
        </div>

      </div>

      <button
        onClick={handleAdd}
        disabled={loading}
        className={`mt-4 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
          loading
            ? "bg-slate-800 text-slate-600 cursor-not-allowed"
            : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_16px_rgba(16,185,129,0.2)]"
        }`}
      >
        {loading ? "Adding..." : "+ Add Routine"}
      </button>
    </div>
  );
}

export default AddRoutineForm;