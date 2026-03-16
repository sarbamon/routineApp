import { Routine } from "../types/Routine";

type Props = {
  routine:       Routine;
  onEdit?:       (item: Routine) => void;
  onDelete?:     (id: string) => void;
};

function RoutineRow({ routine, onEdit, onDelete }: Props) {
  return (
    <tr className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group">
      <td className="py-3 px-3">
        <span className="text-xs font-mono text-emerald-400/80">{routine.time}</span>
      </td>
      <td className="py-3 px-3">
        <span className="text-sm font-semibold text-slate-200">{routine.activity}</span>
      </td>
      <td className="py-3 px-3">
        <span className="text-xs text-slate-400">{routine.duration || "—"}</span>
      </td>
      <td className="py-3 px-3">
        <span className="text-xs text-slate-500">{routine.notes || "—"}</span>
      </td>
      <td className="py-3 px-3 text-right">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={() => onEdit(routine)}
              className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] text-slate-400 text-[10px] font-black rounded-lg hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(routine._id)}
              className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black rounded-lg hover:bg-red-500/20 transition-all cursor-pointer"
            >
              Delete
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default RoutineRow;