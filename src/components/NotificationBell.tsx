import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { useFriends } from "../context/FriendsContext";
import { API_URL } from "../config/api";
import { playMessageSound, playRequestSound } from "../utils/sound";
import { sendOSNotification, requestPermission, updateBadge } from "../utils/pushNotification";

interface NotifItem {
  _id:       string;
  type:      "friend_request" | "friend_accepted" | "message" | "todo_reminder" | "announcement";
  title:     string;
  body:      string;
  read:      boolean;
  data:      Record<string, any>;
  createdAt: string;
}

interface PendingRequest {
  _id:  string;
  from: { _id: string; username: string };
}

const TYPE_ICON: Record<string, string> = {
  friend_request:  "👋",
  friend_accepted: "🤝",
  message:         "💬",
  todo_reminder:   "📋",
  announcement:    "📢",
};

const TYPE_COLOR: Record<string, string> = {
  friend_request:  "bg-violet-500/10 text-violet-400 border-violet-500/20",
  friend_accepted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  message:         "bg-blue-500/10 text-blue-400 border-blue-500/20",
  todo_reminder:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
  announcement:    "bg-red-500/10 text-red-400 border-red-500/20",
};

const timeAgo = (date: string) => {
  const diff  = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "Just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const isMobile = () => window.innerWidth < 768;

// ── Shared notification list content ─────────────────────────────────────────
function NotifContent({ notifications, pendingRequests, activeTab, setActiveTab, onDelete, onAccept, onReject, onNotifClick }: any) {
  const unreadCount = notifications.filter((n: NotifItem) => !n.read).length;

  return (
    <>
      {/* Tabs */}
      <div className="flex border-b border-white/5 shrink-0">
        <button onClick={() => setActiveTab("all")} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wide transition-colors cursor-pointer ${activeTab === "all" ? "text-white border-b-2 border-emerald-500" : "text-slate-600 hover:text-slate-400"}`}>
          All {unreadCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[8px] rounded-full">{unreadCount}</span>}
        </button>
        <button onClick={() => setActiveTab("requests")} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wide transition-colors cursor-pointer ${activeTab === "requests" ? "text-white border-b-2 border-violet-500" : "text-slate-600 hover:text-slate-400"}`}>
          Requests {pendingRequests.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-violet-500 text-white text-[8px] rounded-full">{pendingRequests.length}</span>}
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "all" && (
          notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 py-10 opacity-30">
              <div className="text-3xl">🔔</div>
              <p className="text-xs text-slate-500">No notifications yet</p>
            </div>
          ) : notifications.map((notif: NotifItem) => (
            <div key={notif._id} onClick={() => onNotifClick(notif)}
              className={`flex items-start gap-3 px-4 py-3 border-b border-white/[0.03] cursor-pointer transition-colors last:border-0 ${notif.read ? "hover:bg-white/[0.02]" : "bg-white/[0.03] hover:bg-white/[0.05]"}`}>
              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center text-sm shrink-0 ${TYPE_COLOR[notif.type]}`}>
                {TYPE_ICON[notif.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold truncate ${notif.read ? "text-slate-400" : "text-white"}`}>{notif.title}</p>
                {notif.body && <p className="text-[10px] text-slate-500 mt-0.5 truncate">{notif.body}</p>}
                <p className="text-[9px] text-slate-600 mt-1 uppercase tracking-wide">{timeAgo(notif.createdAt)}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {!notif.read && <div className="w-2 h-2 bg-emerald-500 rounded-full" />}
                <button onClick={e => { e.stopPropagation(); onDelete(notif._id); }} className="text-slate-700 hover:text-red-400 transition-colors cursor-pointer">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
        {activeTab === "requests" && (
          pendingRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 py-10 opacity-30">
              <div className="text-3xl">👥</div>
              <p className="text-xs text-slate-500">No pending requests</p>
            </div>
          ) : pendingRequests.map((req: PendingRequest) => (
            <div key={req._id} className="px-4 py-3 border-b border-white/[0.04] last:border-0">
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xs font-black text-violet-400 uppercase">
                  {req.from.username.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{req.from.username}</p>
                  <p className="text-[9px] text-slate-600">wants to connect with you</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onAccept(req._id, req.from._id)} className="flex-1 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-lg hover:bg-emerald-500/20 transition-colors cursor-pointer">✅ Accept</button>
                <button onClick={() => onReject(req._id)} className="flex-1 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black rounded-lg hover:bg-red-500/20 transition-colors cursor-pointer">❌ Reject</button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

// ── Desktop dropdown ──────────────────────────────────────────────────────────
function NotifDropdown({ notifications, pendingRequests, onClose, onExpand, onMarkAllRead, onDelete, onClearAll, onAccept, onReject, onNotifClick }: any) {
  const [activeTab, setActiveTab] = useState<"all" | "requests">("all");
  const unreadCount = notifications.filter((n: NotifItem) => !n.read).length;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-11 z-50 w-80 bg-[#0d0d1a] border border-white/[0.08] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[480px]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between shrink-0">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Notifications</p>
          <div className="flex items-center gap-2">
            <button onClick={onExpand} className="text-[9px] font-black text-blue-400 hover:text-blue-300 px-2 py-1 rounded-lg bg-blue-500/10 cursor-pointer uppercase tracking-wide">
              ⤢ Full view
            </button>
            {unreadCount > 0 && (
              <button onClick={onMarkAllRead} className="text-[9px] font-black text-emerald-400 hover:text-emerald-300 cursor-pointer uppercase tracking-wide">✓ All read</button>
            )}
            {notifications.length > 0 && (
              <button onClick={onClearAll} className="text-[9px] font-black text-slate-600 hover:text-red-400 cursor-pointer uppercase tracking-wide">Clear</button>
            )}
          </div>
        </div>
        <NotifContent
          notifications={notifications} pendingRequests={pendingRequests}
          activeTab={activeTab} setActiveTab={setActiveTab}
          onDelete={onDelete} onAccept={onAccept} onReject={onReject} onNotifClick={onNotifClick}
        />
      </div>
    </>
  );
}

// ── Mobile bottom sheet drawer ────────────────────────────────────────────────
function NotifDrawer({ notifications, pendingRequests, onClose, onExpand, onMarkAllRead, onDelete, onClearAll, onAccept, onReject, onNotifClick }: any) {
  const [activeTab, setActiveTab] = useState<"all" | "requests">("all");
  const unreadCount = notifications.filter((n: NotifItem) => !n.read).length;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d0d1a] border-t border-white/[0.08] rounded-t-3xl shadow-[0_-20px_60px_rgba(0,0,0,0.8)] flex flex-col" style={{ height: "60vh" }}>
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-white/10 rounded-full" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-2 border-b border-white/5 shrink-0">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Notifications</p>
          <div className="flex items-center gap-2">
            <button onClick={onExpand} className="text-[9px] font-black text-blue-400 hover:text-blue-300 px-2 py-1 rounded-lg bg-blue-500/10 cursor-pointer uppercase tracking-wide">
              ⤢ Full view
            </button>
            {unreadCount > 0 && (
              <button onClick={onMarkAllRead} className="text-[9px] font-black text-emerald-400 hover:text-emerald-300 cursor-pointer uppercase tracking-wide">✓ All read</button>
            )}
            {notifications.length > 0 && (
              <button onClick={onClearAll} className="text-[9px] font-black text-slate-600 hover:text-red-400 cursor-pointer uppercase tracking-wide">Clear</button>
            )}
          </div>
        </div>
        <NotifContent
          notifications={notifications} pendingRequests={pendingRequests}
          activeTab={activeTab} setActiveTab={setActiveTab}
          onDelete={onDelete} onAccept={onAccept} onReject={onReject} onNotifClick={onNotifClick}
        />
      </div>
    </>
  );
}

// ── Full-page notification view ───────────────────────────────────────────────
function NotifFullPage({ notifications, pendingRequests, onClose, onMarkAllRead, onDelete, onClearAll, onAccept, onReject, onNotifClick }: any) {
  const [activeTab, setActiveTab] = useState<"all" | "requests">("all");
  const unreadCount = notifications.filter((n: NotifItem) => !n.read).length;

  return (
    <div className="fixed inset-0 z-[100] bg-[#04040a] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#0d0d1a] shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer">
            ←
          </button>
          <div>
            <h1 className="text-sm font-black text-white">Notifications</h1>
            {unreadCount > 0 && <p className="text-[9px] text-slate-500 uppercase tracking-widest">{unreadCount} unread</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={onMarkAllRead} className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-lg bg-emerald-500/10 cursor-pointer">✓ All read</button>
          )}
          {notifications.length > 0 && (
            <button onClick={onClearAll} className="text-[10px] font-black text-slate-500 hover:text-red-400 px-2 py-1 rounded-lg bg-white/5 cursor-pointer">Clear all</button>
          )}
        </div>
      </div>
      <NotifContent
        notifications={notifications} pendingRequests={pendingRequests}
        activeTab={activeTab} setActiveTab={setActiveTab}
        onDelete={onDelete} onAccept={onAccept} onReject={onReject} onNotifClick={onNotifClick}
      />
    </div>
  );
}

// ── Main NotificationBell ─────────────────────────────────────────────────────
export default function NotificationBell() {
  const token    = localStorage.getItem("token");
  const navigate = useNavigate();

  const { socket }                                          = useSocket();
  const { pendingRequests, refetchFriends, refetchPending } = useFriends();

  const [mode,          setMode]          = useState<"closed" | "drawer" | "dropdown" | "full">("closed");
  const [notifications, setNotifications] = useState<NotifItem[]>([]);

  const lastTapRef = useRef<number>(0);

  const unreadCount = notifications.filter(n => !n.read).length;
  const totalBadge  = unreadCount + pendingRequests.length;

  useEffect(() => { requestPermission(); }, []);
  useEffect(() => { updateBadge(totalBadge); }, [totalBadge]);

  const fetchNotifs = useCallback(async () => {
    if (!token) return;
    try {
      const res  = await fetch(`${API_URL}/api/notifications`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {}
  }, [token]);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  useEffect(() => {
    if (!socket) return;
    socket.on("new_notification", (notif: NotifItem) => {
      setNotifications(prev => [notif, ...prev]);
      if (notif.type === "message") playMessageSound();
      if (["friend_request","friend_accepted","announcement","todo_reminder"].includes(notif.type)) playRequestSound();
      sendOSNotification(notif.title, notif.body);
    });
    return () => { socket.off("new_notification"); };
  }, [socket]);

  const handleBellTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_MS = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      // Double tap → always full page
      setMode("full");
    } else {
      // Single tap
      if (mode === "closed") {
        setMode(isMobile() ? "drawer" : "dropdown");
      } else if (mode === "drawer" || mode === "dropdown") {
        setMode("full");
      } else {
        setMode("closed");
      }
    }
    lastTapRef.current = now;
  };

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    await fetch(`${API_URL}/api/notifications/${id}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await fetch(`${API_URL}/api/notifications/read-all`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
  };

  const deleteNotif = async (id: string) => {
    setNotifications(prev => prev.filter(n => n._id !== id));
    await fetch(`${API_URL}/api/notifications/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  };

  const clearAll = async () => {
    setNotifications([]);
    await fetch(`${API_URL}/api/notifications`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  };

  const accept = async (requestId: string, fromUserId: string) => {
    await fetch(`${API_URL}/api/friends/accept/${requestId}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
    socket?.emit("friend_request_accepted", { to: fromUserId, byUsername: localStorage.getItem("username") });
    await refetchFriends();
    await refetchPending();
    await fetchNotifs();
  };

  const reject = async (requestId: string) => {
    await fetch(`${API_URL}/api/friends/reject/${requestId}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
    await refetchPending();
  };

  const handleNotifClick = async (notif: NotifItem) => {
    await markRead(notif._id);
    setMode("closed");
    if (notif.type === "message")         navigate("/chat");
    if (notif.type === "friend_request")  navigate("/chat");
    if (notif.type === "friend_accepted") navigate("/chat");
    if (notif.type === "todo_reminder")   navigate("/today");
  };

  const sharedProps = {
    notifications,
    pendingRequests,
    onClose:       () => setMode("closed"),
    onMarkAllRead: markAllRead,
    onDelete:      deleteNotif,
    onClearAll:    clearAll,
    onAccept:      accept,
    onReject:      reject,
    onNotifClick:  handleNotifClick,
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={handleBellTap}
        className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {totalBadge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
            {totalBadge > 9 ? "9+" : totalBadge}
          </span>
        )}
      </button>

      {/* Desktop dropdown (single tap on md+) */}
      {mode === "dropdown" && (
        <NotifDropdown {...sharedProps} onExpand={() => setMode("full")} />
      )}

      {/* Mobile drawer (single tap on mobile) */}
      {mode === "drawer" && (
        <NotifDrawer {...sharedProps} onExpand={() => setMode("full")} />
      )}

      {/* Full page (double tap or ⤢ button) */}
      {mode === "full" && (
        <NotifFullPage {...sharedProps} />
      )}
    </div>
  );
}