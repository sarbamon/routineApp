import { Routine } from "../types/routine";
import { API_URL } from "../config/api";
import { useState } from "react";

type Props = {
  routines: Routine[];
};

function RoutineTable({ routines }: Props) {

  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    time: "",
    activity: "",
    duration: "",
    notes: ""
  });

  const token = localStorage.getItem("token");

  const startEdit = (item: Routine) => {
    setEditId(item._id);
    setEditData({
      time: item.time,
      activity: item.activity,
      duration: item.duration,
      notes: item.notes
    });
  };

  const saveEdit = async () => {

    await fetch(`${API_URL}/api/routines/${editId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(editData)
    });

    window.location.reload();
  };

  const deleteRoutine = async (id: string) => {

    await fetch(`${API_URL}/api/routines/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    window.location.reload();
  };

  if (routines.length === 0) {
    return <p className="text-sm text-slate-500">No routines added yet.</p>;
  }

  return (

    <div className="overflow-x-auto">

      <table className="min-w-full text-sm">

        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase">
            <th className="p-3 text-left">Time</th>
            <th className="p-3 text-left">Activity</th>
            <th className="p-3 text-left">Duration</th>
            <th className="p-3 text-left">Notes</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>

        <tbody>

          {routines.map((item) => (

            <tr key={item._id} className="border-b">

              {editId === item._id ? (
                <>
                  <td className="p-3">
                    <input
                      value={editData.time}
                      onChange={(e)=>setEditData({...editData,time:e.target.value})}
                      className="border p-1 rounded w-full"
                    />
                  </td>

                  <td className="p-3">
                    <input
                      value={editData.activity}
                      onChange={(e)=>setEditData({...editData,activity:e.target.value})}
                      className="border p-1 rounded w-full"
                    />
                  </td>

                  <td className="p-3">
                    <input
                      value={editData.duration}
                      onChange={(e)=>setEditData({...editData,duration:e.target.value})}
                      className="border p-1 rounded w-full"
                    />
                  </td>

                  <td className="p-3">
                    <input
                      value={editData.notes}
                      onChange={(e)=>setEditData({...editData,notes:e.target.value})}
                      className="border p-1 rounded w-full"
                    />
                  </td>

                  <td className="p-3 text-right">
                    <button
                      onClick={saveEdit}
                      className="text-green-600"
                    >
                      Save
                    </button>
                  </td>
                </>
              ) : (
                <>
                  <td className="p-3">{item.time}</td>
                  <td className="p-3 font-medium">{item.activity}</td>
                  <td className="p-3">{item.duration}</td>
                  <td className="p-3">{item.notes}</td>

                  <td className="p-3 text-right space-x-3">

                    <button
                      onClick={()=>startEdit(item)}
                      className="text-blue-600"
                    >
                      Edit
                    </button>

                    <button
                      onClick={()=>deleteRoutine(item._id)}
                      className="text-red-600"
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