import { useEffect, useState } from "react";
import AddRoutineForm from "../components/AddRoutineForm";
import RoutineTable from "../components/RoutineTable";
import { API_URL } from "../config/api";
import { Routine } from "../types/Routine";

function RoutinePage() {

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [selectedSection, setSelectedSection] = useState("Home");

  const fetchRoutines = async () => {

    const token = localStorage.getItem("token");

    if (!token) {
      console.log("No token found");
      return;
    }

    try {

      const res = await fetch(`${API_URL}/api/routines`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (Array.isArray(data)) {
        setRoutines(data);
      } else {
        console.error("Unexpected response:", data);
        setRoutines([]);
      }

    } catch (error) {
      console.error("Fetch routines error:", error);
    }
  };

  useEffect(() => {
    fetchRoutines();
  }, []);

  const filteredRoutines = routines.filter(
  (r) => r.section === selectedSection
);

  return (

    <div className="p-6">

      <h1 className="text-2xl font-semibold mb-6">
        Daily Routine
      </h1>

      <div className="flex gap-3 mb-6">

  <button
    onClick={() => setSelectedSection("Home")}
    className={`px-4 py-2 rounded-lg text-sm ${
      selectedSection === "Home"
        ? "bg-slate-800 text-white"
        : "bg-slate-200"
    }`}
  >
    Home
  </button>

  <button
    onClick={() => setSelectedSection("Hostel - No Class")}
    className={`px-4 py-2 rounded-lg text-sm ${
      selectedSection === "Hostel - No Class"
        ? "bg-slate-800 text-white"
        : "bg-slate-200"
    }`}
  >
    Hostel - No Class
  </button>

  <button
    onClick={() => setSelectedSection("Hostel - With Class")}
    className={`px-4 py-2 rounded-lg text-sm ${
      selectedSection === "Hostel - With Class"
        ? "bg-slate-800 text-white"
        : "bg-slate-200"
    }`}
  >
    Hostel - With Class
  </button>

</div>

      <AddRoutineForm />

      <RoutineTable routines={filteredRoutines} />

    </div>

  );
}

export default RoutinePage;