import { useEffect, useState } from "react";
import AddRoutineForm from "../components/AddRoutineForm";
import RoutineTable from "../components/RoutineTable";
import { API_URL } from "../config/api";
import { Routine } from "../types/Routine";

const SECTIONS = ["Home", "Hostel - No Class", "Hostel - With Class"];

function RoutinePage() {
  const [routines,        setRoutines]        = useState<Routine[]>([]);
  const [selectedSection, setSelectedSection] = useState("Home");
  const [loading,         setLoading]         = useState(true);
  const [showModal,       setShowModal]       = useState(false);

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
            <button
              onClick={() => setShowModal(true)}
              className="mt-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl hover:bg-emerald-500/20 transition-colors cursor-pointer"
            >
              + Add your first routine
            </button>
          </div>
        ) : (
          <RoutineTable routines={filteredRoutines} onRefresh={fetchRoutines} />
        )}
      </div>

      {/* ── Floating + button ── */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-[0_8px_32px_rgba(16,185,129,0.4)] transition-all cursor-pointer active:scale-95 z-40"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {/* ── Modal ── */}
      {showModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          {/* Modal box */}
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
            <div className="w-full max-w-2xl bg-[#0d0d1a] border border-white/[0.08] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] pointer-events-auto">

              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <div>
                  <p className="text-sm font-black text-white">Add Routine</p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">
                    Fill in the details below
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              {/* Modal body */}
              <div className="px-5 py-5">
                <AddRoutineForm
                  onAdd={() => {
                    fetchRoutines();
                    setShowModal(false);
                  }}
                />
              </div>

            </div>
          </div>
        </>
      )}

    </div>
  );
}

export default RoutinePage;