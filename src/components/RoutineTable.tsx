import { useState } from "react";
import { API_URL } from "../config/api";
import { Routine } from "../types/Routine";

type Props = {
  routines:   Routine[];
  onRefresh?: () => void;
};

const inputCls = "w-full bg-white/[0.06] border border-white/[0.10] rounded-lg px-2 py-1.5 text-slate-200 text-xs outline-none focus:border-emerald-500/40 transition-colors";

function RoutineTable({ routines, onRefresh }: Props) {
  const [editId,   setEditId]   = useState<string | null>(null);
  const [editData, setEditData] = useState({ time: "", activity: "", duration: "", notes: "" });
  const [saving,   setSaving]   = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const token = localStorage.getItem("token");

  const startEdit = (item: Routine) => {
    setEditId(item._id);
    setEditData({
      time:     item.time,
      activity: item.activity,
      duration: item.duration,
      notes:    item.notes,
    });
  };

  const cancelEdit = () => setEditId(null);

  const saveEdit = async () => {
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/routines/${editId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editData),
      });
      setEditId(null);
      onRefresh?.();
    } finally {
      setSaving(false);
    }
  };

  const deleteRoutine = async (id: string) => {
    await fetch(`${API_URL}/api/routines/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    onRefresh?.();
  };

  const toggleCheck = async (id: string) => {
    setTogglingId(id);
    try {
      await fetch(`${API_URL}/api/routines/${id}/toggle-check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ date: selectedDate }),
      });
      onRefresh?.();
    } catch (err) {
      console.error("Failed to toggle check:", err);
    } finally {
      setTogglingId(null);
    }
  };

  if (routines.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="text-3xl mb-3 opacity-30">📋</div>
        <p className="text-xs text-slate-600">No routines yet. Add one above.</p>
      </div>
    );
  }

  const completedCount = routines.filter(r => 
    r.completedDates?.some(cd => cd.date === selectedDate)
  ).length;

  return (
    <div>
      {/* ── Date selector & Daily Progress Header ── */}
      <div className="mb-4 p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Viewing Date:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white/[0.05] border border-white/10 text-white text-xs font-mono rounded-xl px-2.5 py-1.5 outline-none focus:border-emerald-500/50"
          />
          {selectedDate === todayStr && (
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
              Today
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Daily Progress:</span>
            <span className="text-xs font-black font-mono text-emerald-400">
              {completedCount} / {routines.length} Done
            </span>
          </div>
          <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${routines.length > 0 ? (completedCount / routines.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">

          {/* ── Head ── */}
          <thead>
            <tr className="border-b border-white/[0.05]">
              <th className="py-2.5 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-left w-10">
                Done
              </th>
              <th className="py-2.5 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-left hidden sm:table-cell">
                Time
              </th>
              <th className="py-2.5 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-left">
                Activity
              </th>
              <th className="py-2.5 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-left">
                Duration
              </th>
              <th className="py-2.5 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-left hidden sm:table-cell">
                Notes
              </th>
              <th className="py-2.5 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">
                Actions
              </th>
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody>
            {routines.map(item => {
              const checkInfo = item.completedDates?.find(cd => cd.date === selectedDate);
              const isChecked = !!checkInfo;

              return (
                <tr
                  key={item._id}
                  className={`border-b border-white/[0.03] transition-colors ${
                    isChecked ? "bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06]" : "hover:bg-white/[0.02]"
                  }`}
                >
                  {editId === item._id ? (
                    // ── Edit row ──────────────────────────────────────────────
                    <>
                      <td className="py-2 px-3"></td>
                      <td className="py-2 px-3 hidden sm:table-cell">
                        <input
                          className={inputCls}
                          value={editData.time}
                          onChange={e => setEditData({ ...editData, time: e.target.value })}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          className={inputCls}
                          value={editData.activity}
                          onChange={e => setEditData({ ...editData, activity: e.target.value })}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          className={inputCls}
                          value={editData.duration}
                          onChange={e => setEditData({ ...editData, duration: e.target.value })}
                        />
                      </td>
                      <td className="py-2 px-3 hidden sm:table-cell">
                        <input
                          className={inputCls}
                          value={editData.notes}
                          onChange={e => setEditData({ ...editData, notes: e.target.value })}
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={saveEdit}
                            disabled={saving}
                            className={`px-3 py-1.5 text-[10px] font-black rounded-lg border transition-all cursor-pointer ${
                              saving
                                ? "bg-slate-800 text-slate-600 border-white/5 cursor-not-allowed"
                                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                            }`}
                          >
                            {saving ? "..." : "Save"}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] text-slate-400 text-[10px] font-black rounded-lg hover:bg-white/[0.08] transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    // ── View row ──────────────────────────────────────────────
                    <>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => toggleCheck(item._id)}
                          disabled={togglingId === item._id}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${
                            isChecked
                              ? "bg-emerald-500 border-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                              : "border-white/20 hover:border-emerald-500/50 hover:bg-emerald-500/10"
                          }`}
                          title={isChecked ? `Completed by @${checkInfo?.completedByUsername || "someone"} at ${checkInfo?.completedAt || ""}` : "Mark activity completed"}
                        >
                          {isChecked ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-3 hidden sm:table-cell">
                        <span className="text-xs font-mono text-emerald-400/80">
                          {item.time}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${isChecked ? "line-through text-slate-400" : "text-slate-200"}`}>
                              {item.activity}
                            </span>
                          </div>

                          {/* Show check-off badge with collaborator name */}
                          {isChecked && checkInfo && (
                            <div className="mt-1 flex items-center gap-1.5 text-[9.5px] font-medium text-emerald-400">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                                ✓ Done by @{checkInfo.completedByUsername || "partner"} {checkInfo.completedAt && `at ${checkInfo.completedAt}`}
                              </span>
                            </div>
                          )}

                          {/* Show owner tag if item is created by a shared friend */}
                          {item.isShared && item.ownerUsername && (
                            <p className="text-[9px] text-slate-500 mt-0.5">
                              Created by @{item.ownerUsername}
                            </p>
                          )}

                          {/* Show time below activity on mobile */}
                          <p className="text-[10px] font-mono text-emerald-400/60 mt-0.5 sm:hidden">
                            {item.time}
                          </p>
                          {/* Show notes below activity on mobile */}
                          {item.notes && (
                            <p className="text-[10px] text-slate-500 mt-0.5 sm:hidden">
                              {item.notes}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs text-slate-400">
                          {item.duration || "—"}
                        </span>
                      </td>
                      <td className="py-3 px-3 hidden sm:table-cell">
                        <span className="text-xs text-slate-500">
                          {item.notes || "—"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(item)}
                            className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] text-slate-400 text-[10px] font-black rounded-lg hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteRoutine(item._id)}
                            className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black rounded-lg hover:bg-red-500/20 transition-all cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>

        </table>
      </div>
    </div>
  );
}

export default RoutineTable;