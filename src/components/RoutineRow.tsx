import { Routine } from "../data/routineData";

type Props = {
  routine: Routine;
  deleteRoutine: (id: number) => void;
  startEdit?: (item: Routine) => void;
};

function RoutineRow({ routine, deleteRoutine, startEdit }: Props) {
  return (
    <tr key={routine.id} className={routine.activity.includes("CODING") ? "coding-row" : ""}>
      <td>{routine.time}</td>
      <td>{routine.activity}</td>
      <td>{routine.duration}</td>
      <td>{routine.notes}</td>
      <td>
        {startEdit && (
          <button className="edit-btn" onClick={() => startEdit(routine)}>
            ✏ Edit
          </button>
        )}
        <button className="delete-btn" onClick={() => deleteRoutine(routine.id)}>
          ❌ Delete
        </button>
      </td>
    </tr>
  );
}

export default RoutineRow;