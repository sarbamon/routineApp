import { useState } from "react";
import { useFriends } from "../context/FriendsContext";
import { API_URL } from "../config/api";

export default function NotificationBell() {
  const token = localStorage.getItem("token");
  const { pendingCount, pendingRequests, refetchFriends, refetchPending } = useFriends();
  const [open, setOpen] = useState(false);

  const accept = async (requestId: string) => {
    await fetch(`${API_URL}/api/friends/accept/${requestId}`, {
      method:  "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    await refetchFriends();
    await refetchPending();
  };

  const reject = async (requestId: string) => {
    await fetch(`${API_URL}/api/friends/reject/${requestId}`, {
      method:  "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    await refetchPending();
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(s => !s)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {pendingCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
            {pendingCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-10 z-50 w-72 bg-[#0d0d1a] border border-white/[0.08] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Friend Requests
              </p>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <div className="text-2xl mb-2 opacity-30">🔔</div>
                <p className="text-xs text-slate-600">No pending requests</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {pendingRequests.map(req => (
                  <div key={req._id} className="px-4 py-3 border-b border-white/[0.04] last:border-0">
                    <div className="flex items-center gap-3 mb-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs font-black text-emerald-400 uppercase shrink-0">
                        {req.from.username.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{req.from.username}</p>
                        <p className="text-[9px] text-slate-600">wants to connect</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => accept(req._id)}
                        className="flex-1 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-lg hover:bg-emerald-500/20 transition-colors cursor-pointer"
                      >
                        ✅ Accept
                      </button>
                      <button
                        onClick={() => reject(req._id)}
                        className="flex-1 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black rounded-lg hover:bg-red-500/20 transition-colors cursor-pointer"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}