import { useState } from "react";

interface PendingRequest {
  _id:  string;
  from: { _id: string; username: string };
}

export default function FriendRequestDropdown({
  pendingRequests,
  onAccept,
  onReject,
}: {
  pendingRequests: PendingRequest[];
  onAccept: (id: string, fromUserId: string) => void;
  onReject: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (pendingRequests.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(s => !s)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-violet-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
          {pendingRequests.length}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-72 bg-[#0d0d1a] border border-white/[0.08] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden">

            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Friend Requests
              </p>
              <span className="text-[9px] font-black text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-md">
                {pendingRequests.length} pending
              </span>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {pendingRequests.map(req => (
                <div key={req._id} className="px-4 py-3 border-b border-white/[0.04] last:border-0">
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xs font-black text-violet-400 uppercase shrink-0">
                      {req.from.username.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{req.from.username}</p>
                      <p className="text-[9px] text-slate-600">wants to connect with you</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { onAccept(req._id, req.from._id); setOpen(false); }}
                      className="flex-1 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-lg hover:bg-emerald-500/20 transition-colors cursor-pointer"
                    >
                      ✅ Accept
                    </button>
                    <button
                      onClick={() => onReject(req._id)}
                      className="flex-1 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black rounded-lg hover:bg-red-500/20 transition-colors cursor-pointer"
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}