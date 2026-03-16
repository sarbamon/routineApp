import { useEffect, useState } from "react";
import AddRoutineForm from "../components/AddRoutineForm";
import RoutineTable from "../components/RoutineTable";
import { API_URL } from "../config/api";
import { Routine } from "../types/Routine";

const SECTIONS = ["Home", "Hostel - No Class", "Hostel - With Class"];

function RoutinePage() {
  const [routines, setRoutines]             = useState<Routine[]>([]);
  const [selectedSection, setSelectedSection] = useState("Home");
  const [loading, setLoading]               = useState(true);

  const fetchRoutines = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res  = await fetch(`${API_URL}/api/routines`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRoutines(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch routines error:", error);
      setRoutines([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoutines(); }, []);

  const filteredRoutines = routines.filter(r => r.section === selectedSection);

  return (
    <div className="p-4 md:p-6 min-h-screen bg-[#04040a] text-slate-200">

      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Daily Routine</h1>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
          Manage your daily schedule
        </p>
      </div>

      {/* ── Section tabs ── */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {SECTIONS.map(section => (
          <button
            key={section}
            onClick={() => setSelectedSection(section)}
            className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wide cursor-pointer whitespace-nowrap transition-all border ${
              selectedSection === section
                ? "bg-white text-black border-white"
                : "bg-white/5 text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/[0.08]"
            }`}
          >
            {section}
          </button>
        ))}
      </div>

      {/* ── Add form ── */}
      <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-4 mb-4">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">
          Add Routine
        </p>
        <AddRoutineForm onAdd={fetchRoutines} />
      </div>

      {/* ── Routine table ── */}
      <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
            {selectedSection}
          </p>
          <span className="text-[9px] font-bold text-slate-600">
            {filteredRoutines.length} routine{filteredRoutines.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="text-center py-10">
            <p className="text-xs text-slate-600">Loading routines...</p>
          </div>
        ) : filteredRoutines.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-3xl mb-3 opacity-30">📋</div>
            <p className="text-xs text-slate-600">
              No routines for "{selectedSection}" yet.
            </p>
          </div>
        ) : (
            <RoutineTable routines={filteredRoutines} onRefresh={fetchRoutines} />
        )}
      </div>

    </div>
  );
}

export default RoutinePage;