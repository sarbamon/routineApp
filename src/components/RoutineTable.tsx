import { Routine } from "../data/routineData";

type Props = {
  routines: Routine[];
  editId: number | null;
  editData: Omit<Routine, "id">;
  setEditData: (d: Omit<Routine, "id">) => void;
  startEdit: (item: Routine) => void;
  saveEdit: () => void;
  deleteRoutine: (id: number) => void;
};

function RoutineTable({
  routines,
  editId,
  editData,
  setEditData,
  startEdit,
  saveEdit,
  deleteRoutine,
}: Props) {
  if (routines.length === 0) {
    return (
      <div className="text-sm text-slate-500">
        No routines added yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">

        {/* Header */}
        <thead>
          <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
            <th className="text-left py-3 px-4">Time</th>
            <th className="text-left py-3 px-4">Activity</th>
            <th className="text-left py-3 px-4">Duration</th>
            <th className="text-left py-3 px-4">Notes</th>
            <th className="text-right py-3 px-4">Actions</th>
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {routines.map((item) => (
            <tr
              key={item.id}
              className="border-b border-slate-100 hover:bg-slate-50 transition"
            >
              {editId === item.id ? (
                <>
                  <td className="py-3 px-4">
                    <input
                      className="w-full border border-slate-300 rounded-md px-2 py-1 text-sm"
                      value={editData.time}
                      onChange={(e) =>
                        setEditData({ ...editData, time: e.target.value })
                      }
                    />
                  </td>

                  <td className="py-3 px-4">
                    <input
                      className="w-full border border-slate-300 rounded-md px-2 py-1 text-sm"
                      value={editData.activity}
                      onChange={(e) =>
                        setEditData({ ...editData, activity: e.target.value })
                      }
                    />
                  </td>

                  <td className="py-3 px-4">
                    <input
                      className="w-full border border-slate-300 rounded-md px-2 py-1 text-sm"
                      value={editData.duration}
                      onChange={(e) =>
                        setEditData({ ...editData, duration: e.target.value })
                      }
                    />
                  </td>

                  <td className="py-3 px-4">
                    <input
                      className="w-full border border-slate-300 rounded-md px-2 py-1 text-sm"
                      value={editData.notes}
                      onChange={(e) =>
                        setEditData({ ...editData, notes: e.target.value })
                      }
                    />
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={saveEdit}
                      className="text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      Save
                    </button>
                  </td>
                </>
              ) : (
                <>
                  <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                    {item.time}
                  </td>

                  <td className="py-3 px-4 text-slate-800 font-medium">
                    {item.activity}
                  </td>

                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    {item.duration}
                  </td>

                  <td className="py-3 px-4 text-slate-500">
                    {item.notes}
                  </td>

                  <td className="py-3 px-4 text-right space-x-4">
                    <button
                      onClick={() => startEdit(item)}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => deleteRoutine(item.id)}
                      className="text-red-600 hover:text-red-700 font-medium"
                    >
                      Delete
                    </button>
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