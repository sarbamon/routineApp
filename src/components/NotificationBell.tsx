import { useState, useEffect, useCallback } from "react";
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

export default function NotificationBell() {
  const token    = localStorage.getItem("token");
  const navigate = useNavigate();

  const { socket }                                                         = useSocket();
  const { pendingRequests, refetchFriends, refetchPending }                = useFriends();

  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [activeTab,     setActiveTab]     = useState<"all" | "requests">("all");

  const unreadCount  = notifications.filter(n => !n.read).length;
  const totalBadge   = unreadCount + pendingRequests.length;

  // ── Request OS permission ───────────────────────────────────────────────
  useEffect(() => { requestPermission(); }, []);

  // ── Update PWA badge ────────────────────────────────────────────────────
  useEffect(() => { updateBadge(totalBadge); }, [totalBadge]);

  // ── Fetch notifications ─────────────────────────────────────────────────
  const fetchNotifs = useCallback(async () => {
    if (!token) return;
    try {
      const res  = await fetch(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {}
  }, [token]);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  // ── Real-time socket notifications ──────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on("new_notification", (notif: NotifItem) => {
      setNotifications(prev => [notif, ...prev]);

      if (notif.type === "message")                          playMessageSound();
      if (notif.type === "friend_request")                   playRequestSound();
      if (notif.type === "friend_accepted")                  playRequestSound();
      if (notif.type === "announcement" || notif.type === "todo_reminder") playRequestSound();

      sendOSNotification(notif.title, notif.body);
    });

    return () => { socket.off("new_notification"); };
  }, [socket]);

  // ── Mark one as read ────────────────────────────────────────────────────
  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    await fetch(`${API_URL}/api/notifications/${id}/read`, {
      method: "PATCH", headers: { Authorization: `Bearer ${token}` },
    });
  };

  // ── Mark all as read ────────────────────────────────────────────────────
  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await fetch(`${API_URL}/api/notifications/read-all`, {
      method: "PATCH", headers: { Authorization: `Bearer ${token}` },
    });
  };

  // ── Delete one ──────────────────────────────────────────────────────────
  const deleteNotif = async (id: string) => {
    setNotifications(prev => prev.filter(n => n._id !== id));
    await fetch(`${API_URL}/api/notifications/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
  };

  // ── Clear all ───────────────────────────────────────────────────────────
  const clearAll = async () => {
    setNotifications([]);
    await fetch(`${API_URL}/api/notifications`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
  };

  // ── Accept friend request ───────────────────────────────────────────────
  const accept = async (requestId: string, fromUserId: string) => {
    await fetch(`${API_URL}/api/friends/accept/${requestId}`, {
      method: "PATCH", headers: { Authorization: `Bearer ${token}` },
    });
    socket?.emit("friend_request_accepted", {
      to:         fromUserId,
      byUsername: localStorage.getItem("username"),
    });
    await refetchFriends();
    await refetchPending();
    await fetchNotifs();
  };

  // ── Reject friend request ───────────────────────────────────────────────
  const reject = async (requestId: string) => {
    await fetch(`${API_URL}/api/friends/reject/${requestId}`, {
      method: "PATCH", headers: { Authorization: `Bearer ${token}` },
    });
    await refetchPending();
  };

  // ── Handle notification click ───────────────────────────────────────────
  const handleNotifClick = async (notif: NotifItem) => {
    await markRead(notif._id);
    setOpen(false);
    if (notif.type === "message")                            navigate("/chat");
    if (notif.type === "friend_request")                     navigate("/chat");
    if (notif.type === "friend_accepted")                    navigate("/chat");
    if (notif.type === "todo_reminder")                      navigate("/today");
  };

  return (
    <div className="relative">

      {/* ── Bell button ── */}
      <button
        onClick={() => setOpen(s => !s)}
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

      {/* ── Dropdown ── */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-11 z-50 w-80 bg-[#0d0d1a] border border-white/[0.08] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden">

            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Notifications
              </p>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[9px] font-black text-emerald-400 hover:text-emerald-300 cursor-pointer uppercase tracking-wide"
                  >
                    ✓ All read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-[9px] font-black text-slate-600 hover:text-red-400 cursor-pointer uppercase tracking-wide"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5">
              <button
                onClick={() => setActiveTab("all")}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wide transition-colors cursor-pointer ${
                  activeTab === "all"
                    ? "text-white border-b-2 border-emerald-500"
                    : "text-slate-600 hover:text-slate-400"
                }`}
              >
                All {unreadCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[8px] rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("requests")}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wide transition-colors cursor-pointer ${
                  activeTab === "requests"
                    ? "text-white border-b-2 border-violet-500"
                    : "text-slate-600 hover:text-slate-400"
                }`}
              >
                Requests {pendingRequests.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-violet-500 text-white text-[8px] rounded-full">
                    {pendingRequests.length}
                  </span>
                )}
              </button>
            </div>

            {/* Content */}
            <div className="max-h-96 overflow-y-auto">

              {/* ── All notifications tab ── */}
              {activeTab === "all" && (
                <>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <div className="text-2xl mb-2 opacity-30">🔔</div>
                      <p className="text-xs text-slate-600">No notifications yet</p>
                    </div>
                  ) : notifications.map(notif => (
                    <div
                      key={notif._id}
                      onClick={() => handleNotifClick(notif)}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-white/[0.03] cursor-pointer transition-colors last:border-0 ${
                        notif.read
                          ? "hover:bg-white/[0.02]"
                          : "bg-white/[0.03] hover:bg-white/[0.05]"
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-xl border flex items-center justify-center text-sm shrink-0 ${TYPE_COLOR[notif.type]}`}>
                        {TYPE_ICON[notif.type]}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate ${notif.read ? "text-slate-400" : "text-white"}`}>
                          {notif.title}
                        </p>
                        {notif.body && (
                          <p className="text-[10px] text-slate-500 mt-0.5 truncate">{notif.body}</p>
                        )}
                        <p className="text-[9px] text-slate-600 mt-1 uppercase tracking-wide">
                          {timeAgo(notif.createdAt)}
                        </p>
                      </div>

                      {/* Unread dot + delete */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {!notif.read && (
                          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); deleteNotif(notif._id); }}
                          className="text-slate-700 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* ── Friend requests tab ── */}
              {activeTab === "requests" && (
                <>
                  {pendingRequests.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <div className="text-2xl mb-2 opacity-30">👥</div>
                      <p className="text-xs text-slate-600">No pending requests</p>
                    </div>
                  ) : pendingRequests.map((req: PendingRequest) => (
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
                          onClick={() => accept(req._id, req.from._id)}
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
                </>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  );
}