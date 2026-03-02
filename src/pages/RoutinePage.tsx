import { useState, useEffect } from "react";
import { routineData, Routine } from "../data/routineData";
import RoutineTable from "../components/RoutineTable";

function RoutinePage() {
  const [routines, setRoutines] = useState<Routine[]>(() => {
    const saved = localStorage.getItem("routines");
    return saved ? JSON.parse(saved) : routineData;
  });

  useEffect(() => { 
    localStorage.setItem("routines", JSON.stringify(routines));
  }, [routines]);

  const [editId, setEditId] = useState<number | null>(null);

  const [formData, setFormData] = useState<Omit<Routine, "id">>({
    section: "Home",
    time: "",
    activity: "",
    duration: "",
    notes: ""
  });

  const [editData, setEditData] = useState<Omit<Routine, "id">>({
    section: "",
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

  const addRoutine = () => {
    if (!formData.time || !formData.activity) return;

    setRoutines([
      ...routines,
      { ...formData, id: Date.now() }
    ]);

    setFormData({
      section: "Home",
      time: "",
      activity: "",
      duration: "",
      notes: ""
    });
  };

  const deleteRoutine = (id: number) => {
    setRoutines(routines.filter((item) => item.id !== id));
  };

  const startEdit = (item: Routine) => {
    setEditId(item.id);
    setEditData({ ...item });
  };

  const saveEdit = () => {
    setRoutines(
      routines.map((item) =>
        item.id === editId ? { ...item, ...editData } : item
      )
    );
    setEditId(null);
  };

  const renderTable = (sectionName: string) => {
    const filtered = routines.filter((item) => item.section === sectionName);
    return (
      <div className="section-container">
        <h2 className="section-header">{sectionName}</h2>

        <RoutineTable
          routines={filtered}
          editId={editId}
          editData={editData}
          setEditData={setEditData}
          startEdit={startEdit}
          saveEdit={saveEdit}
          deleteRoutine={deleteRoutine}
        />
      </div>
    );
  };

return (
  <div className="space-y-8">

    {/* HEADER */}
    <div>
      <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-slate-800">
        Daily Routine Guide
      </h1>
      <p className="text-slate-500 text-sm mt-1">
        Plan, track and improve your daily productivity.
      </p>
    </div>

    {/* MAIN CARD */}
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">

      {/* ADD FORM */}
      <div className="bg-slate-50 p-4 sm:p-6 rounded-lg mb-8">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

          <select
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
            value={formData.section}
            onChange={(e) =>
              setFormData({ ...formData, section: e.target.value })
            }
          >
            <option>Home</option>
            <option>Hostel - No Class</option>
            <option>Hostel - With Class</option>
          </select>

          <select
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
            value={formData.time}
            onChange={(e) =>
              setFormData({ ...formData, time: e.target.value })
            }
          >
            <option value="">Select Time</option>
            {timeOptions.map((time) => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>

          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
            placeholder="Activity"
            value={formData.activity}
            onChange={(e) =>
              setFormData({ ...formData, activity: e.target.value })
            }
          />

          <select
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
            value={formData.duration}
            onChange={(e) =>
              setFormData({ ...formData, duration: e.target.value })
            }
          >
            <option value="">Duration</option>
            <option value="1 Hour">1 Hour</option>
            <option value="2 Hours">2 Hours</option>
            <option value="3 Hours">3 Hours</option>
            <option value="4 Hours">4 Hours</option>
          </select>

          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
            placeholder="Notes"
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
          />
        </div>

        <button
          onClick={addRoutine}
          className="mt-5 w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white text-sm px-6 py-2 rounded-lg transition"
        >
          Add Routine
        </button>
      </div>

      {/* TABLE SECTIONS */}
      <div className="space-y-10">
        {renderTable("Home")}
        {renderTable("Hostel - No Class")}
        {renderTable("Hostel - With Class")}
      </div>

    </div>
  </div>
)};

export default RoutinePage;