import { useState, useEffect, useCallback } from "react";
import { API_URL } from "../config/api";
import { Navigate } from "react-router-dom";

const ADMIN = "sarbamon";

interface UserItem {
  _id: string;
  username: string;
  createdAt: string;
}

interface NotificationStats {
  totalNotifications: number;
  totalUnread: number;
  recentBroadcasts: Array<{
    _id: string;
    title: string;
    message: string;
    type: string;
    createdAt: string;
    recipientCount: number;
  }>;
  userStats: Array<{
    username: string;
    unreadCount: number;
    totalCount: number;
  }>;
}

const inputCls = "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-slate-200 text-[13px] outline-none focus:border-emerald-500/40 transition-colors placeholder:text-slate-600";

export default function AdminPage() {
  const token    = localStorage.getItem("token");
  const username = localStorage.getItem("username") || "";

  // Block non-admin immediately
  if (username !== ADMIN) {
    return <Navigate to="/" replace />;
  }

  const [users,      setUsers]      = useState<UserItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [newUser,    setNewUser]    = useState({ username: "", password: "" });
  const [newPassMap, setNewPassMap] = useState<Record<string, string>>({});
  const [msg,        setMsg]        = useState({ text: "", type: "" });
  const [creating,   setCreating]   = useState(false);
  
  // Notification stats
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const showMsg = (text: string, type: "success" | "error") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  // ── Fetch notification stats ────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/notifications/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Fetch stats error:", err);
    } finally {
      setStatsLoading(false);
    }
  }, [token]);

  // ── Fetch users ─────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/api/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch users error:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { 
    fetchUsers(); 
    fetchStats();
  }, [fetchUsers, fetchStats]);

  // ── Create account ───────────────────────────────────────────────────────────
  const createAccount = async () => {
    if (!newUser.username.trim() || !newUser.password.trim()) {
      showMsg("Username and password are required", "error");
      return;
    }
    setCreating(true);
    try {
      const res  = await fetch(`${API_URL}/api/auth/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(`✅ Account created for @${newUser.username}`, "success");
        setNewUser({ username: "", password: "" });
        fetchUsers();
      } else {
        showMsg(data.message || "Failed to create account", "error");
      }
    } catch {
      showMsg("Server error", "error");
    } finally {
      setCreating(false);
    }
  };

  // ── Delete user ──────────────────────────────────────────────────────────────
  const deleteUser = async (id: string, uname: string) => {
    if (!confirm(`Delete @${uname}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_URL}/api/auth/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(`🗑️ @${uname} deleted`, "success");
        fetchUsers();
      } else {
        showMsg(data.message, "error");
      }
    } catch {
      showMsg("Server error", "error");
    }
  };

  // ── Change password ──────────────────────────────────────────────────────────
  const changePassword = async (id: string, uname: string) => {
    const newPass = newPassMap[id];
    if (!newPass?.trim()) {
      showMsg("Enter a new password first", "error");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/auth/users/${id}/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: newPass }),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(`🔑 Password updated for @${uname}`, "success");
        setNewPassMap(p => ({ ...p, [id]: "" }));
      } else {
        showMsg(data.message, "error");
      }
    } catch {
      showMsg("Server error", "error");
    }
  };

  // ── Broadcast Notification ──────────────────────────────────────────────────
  const [broadcast, setBroadcast] = useState({ title: "", message: "", type: "update" });
  const [sending, setSending] = useState(false);

  const sendBroadcast = async () => {
    if (!broadcast.title.trim() || !broadcast.message.trim()) {
      showMsg("Title and message are required", "error");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/notifications/broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(broadcast),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(`📢 ${data.message}`, "success");
        setBroadcast({ title: "", message: "", type: "update" });
        fetchStats(); // Refresh stats after broadcast
      } else {
        showMsg(data.message || "Failed to send", "error");
      }
    } catch {
      showMsg("Server error", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 md:p-6 min-h-screen bg-[#04040a] text-slate-200">

      {/* ── Header ── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-sm">
            👑
          </div>
          <h1 className="text-2xl font-black text-white">Admin Panel</h1>
        </div>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest">
          Manage user accounts — only you can see this
        </p>
      </div>

      {/* ── Message banner ── */}
      {msg.text && (
        <div className={`mb-4 px-4 py-3 rounded-xl border text-xs font-bold ${
          msg.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          {msg.text}
        </div>
      )}

      {/* ── Notification Stats Dashboard ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Total Notifications */}
        <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-lg">
              📊
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                Total Notifications
              </p>
              <p className="text-2xl font-black text-white">
                {statsLoading ? "..." : stats?.totalNotifications || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Unread Count */}
        <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-lg">
              🔔
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                Total Unread
              </p>
              <p className="text-2xl font-black text-white">
                {statsLoading ? "..." : stats?.totalUnread || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg">
              👥
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                Total Users
              </p>
              <p className="text-2xl font-black text-white">
                {users.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Broadcasts ── */}
      {stats && stats.recentBroadcasts.length > 0 && (
        <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5 mb-4">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">
            📜 Recent Broadcasts
          </p>
          <div className="space-y-3">
            {stats.recentBroadcasts.slice(0, 5).map((b) => (
              <div
                key={b._id}
                className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-md font-black uppercase ${
                        b.type === "update" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        b.type === "news" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                        "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {b.type}
                      </span>
                      <p className="text-sm font-bold text-white">{b.title}</p>
                    </div>
                    <p className="text-xs text-slate-400 mb-1">{b.message}</p>
                    <p className="text-[9px] text-slate-600">
                      Sent to {b.recipientCount} users • {new Date(b.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── User Notification Stats ── */}
      {stats && stats.userStats.length > 0 && (
        <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5 mb-4">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">
            👤 User Notification Stats
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.userStats.map((u, i) => (
              <div
                key={i}
                className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">@{u.username}</p>
                    <p className="text-[10px] text-slate-500">
                      {u.totalCount} total • {u.unreadCount} unread
                    </p>
                  </div>
                  {u.unreadCount > 0 && (
                    <div className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-[10px] font-black text-red-400">
                      {u.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Create account ── */}
      <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5 mb-4">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">
          Create New Account
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
              Username
            </label>
            <input
              className={inputCls}
              placeholder="e.g. john_doe"
              value={newUser.username}
              onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && createAccount()}
            />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
              Password
            </label>
            <input
              type="password"
              className={inputCls}
              placeholder="Set a password"
              value={newUser.password}
              onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && createAccount()}
            />
          </div>
        </div>

        <button
          onClick={createAccount}
          disabled={creating || !newUser.username.trim() || !newUser.password.trim()}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            creating || !newUser.username.trim() || !newUser.password.trim()
              ? "bg-slate-800 text-slate-600 cursor-not-allowed"
              : "bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer shadow-[0_0_16px_rgba(16,185,129,0.2)]"
          }`}
        >
          {creating ? "Creating..." : "+ Create Account"}
        </button>
      </div>

      {/* ── Broadcast Notification ── */}
      <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5 mb-4">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">
          📢 Broadcast Notification
        </p>

        {/* Type selector */}
        <div className="flex gap-2 mb-3">
          {(["update", "news", "maintenance"] as const).map(t => (
            <button
              key={t}
              onClick={() => setBroadcast(b => ({ ...b, type: t }))}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer ${
                broadcast.type === t
                  ? t === "update"      ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                  : t === "news"        ? "bg-blue-500/20   border-blue-500/30   text-blue-400"
                  : "bg-amber-500/20  border-amber-500/30  text-amber-400"
                  : "bg-white/[0.03] border-white/[0.06] text-slate-500"
              }`}
            >
              {t === "update" ? "🔄" : t === "news" ? "📰" : "🔧"} {t}
            </button>
          ))}
        </div>

        <div className="grid gap-3 mb-3">
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
              Title
            </label>
            <input
              className={inputCls}
              placeholder="e.g. New feature released!"
              value={broadcast.title}
              onChange={e => setBroadcast(b => ({ ...b, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
              Message
            </label>
            <textarea
              className={`${inputCls} resize-none h-20`}
              placeholder="Write your announcement here..."
              value={broadcast.message}
              onChange={e => setBroadcast(b => ({ ...b, message: e.target.value }))}
            />
          </div>
        </div>

        <button
          onClick={sendBroadcast}
          disabled={sending || !broadcast.title.trim() || !broadcast.message.trim()}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            sending || !broadcast.title.trim() || !broadcast.message.trim()
              ? "bg-slate-800 text-slate-600 cursor-not-allowed"
              : "bg-violet-500 hover:bg-violet-600 text-white cursor-pointer shadow-[0_0_16px_rgba(139,92,246,0.25)]"
          }`}
        >
          {sending ? "Sending..." : "📢 Send to Everyone"}
        </button>
      </div>

      {/* ── Users list ── */}
      <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
            All Users
          </p>
          <span className="text-[9px] font-bold text-slate-600">
            {users.length} account{users.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-xs text-slate-600">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-2 opacity-30">👤</div>
            <p className="text-xs text-slate-600">No users yet. Create one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map(user => (
              <div
                key={user._id}
                className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs font-black text-emerald-400 uppercase">
                      {user.username.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        @{user.username}
                        {user.username === ADMIN && (
                          <span className="ml-2 text-[9px] bg-violet-500/10 text-violet-400 border border-violet-500/20 px-1.5 py-0.5 rounded-md font-black uppercase tracking-wide">
                            Admin
                          </span>
                        )}
                      </p>
                      <p className="text-[9px] text-slate-600 mt-0.5">
                        Created {new Date(user.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Delete — not for admin */}
                  {user.username !== ADMIN && (
                    <button
                      onClick={() => deleteUser(user._id, user.username)}
                      className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black rounded-lg hover:bg-red-500/20 transition-all cursor-pointer"
                    >
                      Delete
                    </button>
                  )}
                </div>

                {/* Change password — not for admin */}
                {user.username !== ADMIN && (
                  <div className="flex gap-2">
                    <input
                      type="password"
                      className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 text-slate-300 text-xs outline-none focus:border-violet-500/40 transition-colors placeholder:text-slate-600"
                      placeholder="New password..."
                      value={newPassMap[user._id] || ""}
                      onChange={e => setNewPassMap(p => ({ ...p, [user._id]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && changePassword(user._id, user.username)}
                    />
                    <button
                      onClick={() => changePassword(user._id, user.username)}
                      disabled={!newPassMap[user._id]?.trim()}
                      className="px-3 py-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-black rounded-xl hover:bg-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
                    >
                      🔑 Change
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}