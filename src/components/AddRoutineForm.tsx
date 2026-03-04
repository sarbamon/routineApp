import { useState } from "react";
import { API_URL } from "../config/api";

interface RoutineInput {
  section: string;
  time: string;
  activity: string;
  duration: string;
  notes: string;
}

function AddRoutineForm() {

  const [formData, setFormData] = useState<RoutineInput>({
    section: "Home",
    time: "",
    activity: "",
    duration: "",
    notes: ""
  });

  const timeOptions: string[] = [];

  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {

      const h = hour % 12 === 0 ? 12 : hour % 12;
      const ampm = hour < 12 ? "AM" : "PM";
      const m = minute.toString().padStart(2, "0");

      timeOptions.push(`${h}:${m} ${ampm}`);
    }
  }

  const handleAdd = async () => {

    if (!formData.time || !formData.activity) return;

    const token = localStorage.getItem("token");

    await fetch(`${API_URL}/api/routines`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });

    window.location.reload();

  };

  return (

    <div className="bg-slate-50 p-4 sm:p-6 rounded-lg mb-8">

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

        <select
          className="w-full border rounded-lg px-3 py-2 text-sm"
          value={formData.section}
          onChange={(e)=>setFormData({...formData,section:e.target.value})}
        >
          <option>Home</option>
          <option>Hostel - No Class</option>
          <option>Hostel - With Class</option>
        </select>

        <select
          className="w-full border rounded-lg px-3 py-2 text-sm"
          value={formData.time}
          onChange={(e)=>setFormData({...formData,time:e.target.value})}
        >
          <option value="">Select Time</option>

          {timeOptions.map((time)=>(
            <option key={time}>{time}</option>
          ))}

        </select>

        <input
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="Activity"
          value={formData.activity}
          onChange={(e)=>setFormData({...formData,activity:e.target.value})}
        />

        <select
          className="w-full border rounded-lg px-3 py-2 text-sm"
          value={formData.duration}
          onChange={(e)=>setFormData({...formData,duration:e.target.value})}
        >
          <option value="">Duration</option>
          <option>1 Hour</option>
          <option>2 Hours</option>
          <option>3 Hours</option>
          <option>4 Hours</option>
        </select>

        <input
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="Notes"
          value={formData.notes}
          onChange={(e)=>setFormData({...formData,notes:e.target.value})}
        />

      </div>

      <button
        onClick={handleAdd}
        className="mt-5 w-full sm:w-auto bg-slate-800 text-white text-sm px-6 py-2 rounded-lg"
      >
        Add Routine
      </button>

    </div>

  );
}

export default AddRoutineForm;