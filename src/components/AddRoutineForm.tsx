import { useState } from "react";
import { Routine } from "../data/routineData";

type Props = {
  addRoutine: (routine: Omit<Routine, "id">) => void;
};

function AddRoutineForm({ addRoutine }: Props) {
  const [formData, setFormData] = useState({
    type: "",
    time: "",
    activity: "",
    duration: "",
    notes: ""
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addRoutine(formData);

    setFormData({
      type: "",
      time: "",
      activity: "",
      duration: "",
      notes: ""
    });
  };

  return (
    <form onSubmit={handleSubmit} className="form-container">
      <input
        name="type"
        placeholder="Home / Hostel"
        value={formData.type}
        onChange={handleChange}
      />

      <input
        name="time"
        placeholder="Time"
        value={formData.time}
        onChange={handleChange}
      />

      <input
        name="activity"
        placeholder="Activity"
        value={formData.activity}
        onChange={handleChange}
      />

      <input
        name="duration"
        placeholder="Duration"
        value={formData.duration}
        onChange={handleChange}
      />

      <input
        name="notes"
        placeholder="Notes"
        value={formData.notes}
        onChange={handleChange}
      />

      <button type="submit" className="add-btn">
        ➕ Add Routine
      </button>
    </form>
  );
}

export default AddRoutineForm;