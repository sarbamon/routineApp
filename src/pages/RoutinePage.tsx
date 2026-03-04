import { useEffect, useState } from "react";
import AddRoutineForm from "../components/AddRoutineForm";
import RoutineTable from "../components/RoutineTable";
import { API_URL } from "../config/api";
import { Routine } from "../types/Routine";

function RoutinePage() {

  const [routines, setRoutines] = useState<Routine[]>([]);

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

  return (

    <div className="p-6">

      <h1 className="text-2xl font-semibold mb-6">
        Daily Routine
      </h1>

      <AddRoutineForm />

      <RoutineTable routines={routines} />

    </div>

  );
}

export default RoutinePage;