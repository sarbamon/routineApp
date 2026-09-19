import { useEffect, useState } from "react";
import AddRoutineForm from "../components/AddRoutineForm";
import RoutineTable from "../components/RoutineTable";
import { API_URL } from "../config/api";
import { Routine } from "../types/Routine";
import { useFriends } from "../context/FriendsContext";

const DEFAULT_SECTIONS = ["Home", "Hostel - No Class", "Hostel - With Class"];

function RoutinePage() {
  const [routines,        setRoutines]        = useState<Routine[]>([]);
  const [selectedSection, setSelectedSection] = useState("Home");
  const [loading,         setLoading]         = useState(true);
  const [showModal,       setShowModal]       = useState(false);

  // Share modal state
  const [showShareModal,  setShowShareModal]  = useState(false);
  const [selectedFriend,  setSelectedFriend]  = useState<string>("");
  const [shareLoading,    setShareLoading]    = useState(false);
  const [shareMsg,        setShareMsg]        = useState("");
  const [shareErr,        setShareErr]        = useState("");

  const { friends } = useFriends();

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

  // Compute all unique sections (defaults + custom sections from routines)
  const existingSections = Array.from(new Set(routines.map(r => r.section).filter(Boolean)));
  const allSections      = Array.from(new Set([...DEFAULT_SECTIONS, ...existingSections]));

  const filteredRoutines = routines.filter(r => r.section === selectedSection);

  const handleShareRoutine = async () => {
    if (!selectedFriend) {
      setShareErr("Please select a friend to share with");
      return;
    }

    setShareLoading(true);
    setShareMsg("");
    setShareErr("");

    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API_URL}/api/routines/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientUserId: selectedFriend,
          section:         selectedSection,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShareMsg(`Successfully shared "${selectedSection}" routine! 🎉`);
        setTimeout(() => {
          setShowShareModal(false);
          setShareMsg("");
          setSelectedFriend("");
        }, 2000);
      } else {
        setShareErr(data.message || "Failed to share routine");
      }
    } catch {
      setShareErr("Failed to share routine. Please try again.");
    } finally {
      setShareLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 min-h-screen bg-[#04040a] text-slate-200">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Daily Routine</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
            Manage & share your daily schedule
          </p>
        </div>
      </div>

      {/* ── Section tabs (Dynamic including custom sections) ── */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden items-center">
        {allSections.map(section => (
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

        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wide cursor-pointer whitespace-nowrap transition-all border border-dashed border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
        >
          + Custom Section
        </button>
      </div>

      {/* ── Routine table container ── */}
      <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
              {selectedSection}
            </p>
            <span className="text-[9px] font-bold text-slate-600">
              {filteredRoutines.length} routine{filteredRoutines.length !== 1 ? "s" : ""}
            </span>
          </div>

          {filteredRoutines.length > 0 && (
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold rounded-xl hover:bg-violet-500/20 transition-all cursor-pointer"
            >
              <span>🔗</span> Share Section
            </button>
          )}
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
        className="fixed bottom-24 right-6 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-[0_8px_32px_rgba(16,185,129,0.4)] transition-all cursor-pointer active:scale-95 z-40"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {/* ── Add Routine Modal ── */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
            <div className="w-full max-w-2xl bg-[#0d0d1a] border border-white/[0.08] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] pointer-events-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <div>
                  <p className="text-sm font-black text-white">Add Routine</p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">
                    Select an existing section or type a new custom section
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

              <div className="px-5 py-5">
                <AddRoutineForm
                  existingSections={existingSections}
                  initialSection={selectedSection}
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

      {/* ── Share Modal ── */}
      {showShareModal && (
        <>
          <div
            className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm"
            onClick={() => setShowShareModal(false)}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
            <div className="w-full max-w-md bg-[#0d0d1a] border border-white/[0.08] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] pointer-events-auto p-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                <div>
                  <h3 className="text-sm font-black text-white">Share "{selectedSection}" Routine</h3>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">
                    Send {filteredRoutines.length} items to a friend
                  </p>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {shareMsg && (
                <div className="mb-4 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold">
                  {shareMsg}
                </div>
              )}

              {shareErr && (
                <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold">
                  ⚠️ {shareErr}
                </div>
              )}

              <p className="text-xs text-slate-400 mb-2 font-medium">Select Friend:</p>

              {friends.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-white/10 rounded-xl mb-4">
                  <p className="text-xs text-slate-500">No friends found yet.</p>
                  <p className="text-[10px] text-slate-600 mt-1">Add friends in the Chat / Connections tab first!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto mb-4 pr-1">
                  {friends.map(friend => (
                    <div
                      key={friend._id}
                      onClick={() => setSelectedFriend(friend._id)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedFriend === friend._id
                          ? "bg-violet-500/20 border-violet-500/40 text-white"
                          : "bg-white/[0.03] border-white/5 text-slate-300 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xs font-black text-violet-400 uppercase">
                          {friend.username.charAt(0)}
                        </div>
                        <span className="text-xs font-bold">{friend.username}</span>
                      </div>
                      {selectedFriend === friend._id && (
                        <span className="text-xs font-bold text-violet-400">✓ Selected</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleShareRoutine}
                disabled={shareLoading || !selectedFriend}
                className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                  shareLoading || !selectedFriend
                    ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                    : "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_16px_rgba(139,92,246,0.3)]"
                }`}
              >
                {shareLoading ? "Sharing..." : "🔗 Send Routine"}
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}

export default RoutinePage;