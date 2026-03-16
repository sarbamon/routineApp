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

  if (routines.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="text-3xl mb-3 opacity-30">📋</div>
        <p className="text-xs text-slate-600">No routines yet. Add one above.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">

        {/* ── Head ── */}
        <thead>
          <tr className="border-b border-white/[0.05]">
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
          {routines.map(item => (
            <tr
              key={item._id}
              className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
            >
              {editId === item._id ? (
                // ── Edit row ──────────────────────────────────────────────
                <>
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
                  <td className="py-3 px-3 hidden sm:table-cell">
                    <span className="text-xs font-mono text-emerald-400/80">
                      {item.time}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div>
                      <span className="text-sm font-semibold text-slate-200">
                        {item.activity}
                      </span>
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
                    {/* Always visible — no hover hide on mobile */}
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
          ))}
        </tbody>

      </table>
    </div>
  );
}

export default RoutineTable;