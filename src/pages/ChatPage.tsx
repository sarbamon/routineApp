import { useState, useEffect, useRef, useCallback } from "react";
import { API_URL } from "../config/api";
import { useSocket } from "../context/SocketContext";
import { useFriends } from "../context/FriendsContext";
import { encryptMessage, decryptMessage, getSharedSecret } from "../utils/crypto";

interface SearchResult {
  _id:            string;
  username:       string;
  profilePicture?: string;
  requestStatus:  "none" | "pending" | "incoming" | "accepted" | "rejected";
  requestId:      string | null;
}

interface Message {
  _id:       string;
  from:      string | { _id: string; username: string; profilePicture?: string };
  to:        string;
  content:   string;
  iv:        string;
  type:      "text" | "image";
  imageData: string;
  seen:      boolean;
  createdAt: string;
}

interface DecryptedMessage extends Message {
  text: string;
}

interface ActiveUser {
  _id:             string;
  username:        string;
  canMessage:      boolean;
  profilePicture?: string;
  bio?:            string;
}

const getCurrentUserId = (): string => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return "";
    return JSON.parse(atob(token.split(".")[1])).id;
  } catch { return ""; }
};

// ── Avatar component ──────────────────────────────────────────────────────────
const Avatar = ({
  src, name, size = "sm",
}: { src?: string; name: string; size?: "sm" | "md" | "lg" }) => {
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-16 h-16 text-xl" };
  return src ? (
    <img
      src={src} alt={name}
      className={`${sizes[size]} rounded-xl object-cover border border-white/10 shrink-0`}
    />
  ) : (
    <div className={`${sizes[size]} rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-black text-emerald-400 uppercase shrink-0`}>
      {name.charAt(0)}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function ChatPage() {
  const token = localStorage.getItem("token");
  const myId  = getCurrentUserId();

  const { socket, onlineUsers }     = useSocket();
  const { friends, refetchFriends } = useFriends();

  const [activeUser,  setActiveUser]  = useState<ActiveUser | null>(null);
  const [messages,    setMessages]    = useState<DecryptedMessage[]>([]);
  const [input,       setInput]       = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const [unread,      setUnread]      = useState<Record<string, number>>({});
  const [sending,     setSending]     = useState(false);
  const [longPress,   setLongPress]   = useState<string | null>(null);
  const [showInfo,    setShowInfo]    = useState(false);

  // Search
  const [searchQ,       setSearchQ]       = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching,     setSearching]     = useState(false);
  const [showSearch,    setShowSearch]    = useState(false);
  const [requesting,    setRequesting]    = useState<string | null>(null);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageRef    = useRef<HTMLInputElement>(null);

  // ── Fetch unread ──────────────────────────────────────────────────────────
  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/chat/unread`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnread(await res.json());
    } catch {}
  }, [token]);

  useEffect(() => { fetchUnread(); }, [fetchUnread]);

  // ── Load messages ─────────────────────────────────────────────────────────
  const loadMessages = useCallback(async (user: ActiveUser) => {
    try {
      const res  = await fetch(`${API_URL}/api/chat/messages/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: Message[] = await res.json();
      const secret  = getSharedSecret(myId, user._id);
      const decoded = await Promise.all(data.map(async msg => ({
        ...msg,
        text: msg.type === "image" ? "" : await decryptMessage(msg.content, msg.iv, secret),
      })));
      setMessages(decoded);

      await fetch(`${API_URL}/api/chat/seen/${user._id}`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` },
      });
      socket?.emit("mark_seen", { from: user._id });
      setUnread(prev => ({ ...prev, [user._id]: 0 }));
    } catch {}
  }, [token, myId, socket]);

  // ── Load profile ──────────────────────────────────────────────────────────
  const loadProfile = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/chat/profile/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return await res.json();
    } catch { return null; }
  }, [token]);

  const openChat = async (friend: typeof friends[0]) => {
    const profile = await loadProfile(friend._id);
    const user: ActiveUser = {
      _id:            friend._id,
      username:       friend.username,
      canMessage:     friend.canMessage,
      profilePicture: profile?.profilePicture || "",
      bio:            profile?.bio || "",
    };
    setActiveUser(user);
    loadMessages(user);
    setShowSearch(false);
    setShowInfo(false);
  };

  // ── Socket events ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on("receive_message", async (msg: Message) => {
      const fromId = typeof msg.from === "object" ? msg.from._id : msg.from;
      if (activeUser && fromId === activeUser._id) {
        const secret = getSharedSecret(myId, activeUser._id);
        const text   = msg.type === "image" ? "" : await decryptMessage(msg.content, msg.iv, secret);
        setMessages(prev => [...prev, { ...msg, text }]);
        socket.emit("mark_seen", { from: activeUser._id });
      } else {
        setUnread(prev => ({ ...prev, [fromId]: (prev[fromId] || 0) + 1 }));
      }
    });

    socket.on("message_sent", async (msg: Message) => {
      const toId   = typeof msg.to === "object" ? (msg.to as any)._id : msg.to;
      const secret = getSharedSecret(myId, toId);
      const text   = msg.type === "image" ? "" : await decryptMessage(msg.content, msg.iv, secret);
      setMessages(prev => [...prev, { ...msg, text }]);
    });

    socket.on("messages_seen", ({ by }: { by: string }) => {
      if (activeUser && by === activeUser._id) {
        setMessages(prev => prev.map(m => ({ ...m, seen: true })));
      }
    });

    socket.on("user_typing", ({ from, isTyping }: { from: string; isTyping: boolean }) => {
      if (activeUser && from === activeUser._id) setOtherTyping(isTyping);
    });

    return () => {
      socket.off("receive_message");
      socket.off("message_sent");
      socket.off("messages_seen");
      socket.off("user_typing");
    };
  }, [socket, activeUser, myId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherTyping]);

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = (val: string) => {
    setSearchQ(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!val.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${API_URL}/api/friends/search?q=${encodeURIComponent(val)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSearchResults(await res.json());
      } catch {} finally { setSearching(false); }
    }, 400);
  };

  const sendRequest = async (userId: string) => {
    setRequesting(userId);
    try {
      await fetch(`${API_URL}/api/friends/request/${userId}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      setSearchResults(prev => prev.map(u =>
        u._id === userId ? { ...u, requestStatus: "pending" as const } : u
      ));
    } catch {} finally { setRequesting(null); }
  };

  // ── Send text ─────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!input.trim() || !activeUser || !socket || sending) return;
    setSending(true);
    const secret      = getSharedSecret(myId, activeUser._id);
    const { content, iv } = await encryptMessage(input.trim(), secret);
    socket.emit("send_message", { to: activeUser._id, content, iv, type: "text" });
    setInput("");
    setSending(false);
    socket.emit("typing", { to: activeUser._id, isTyping: false });
  };

  // ── Send image ────────────────────────────────────────────────────────────
  const handleImageSend = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUser || !socket) return;
    if (file.size > 5 * 1024 * 1024) { alert("Image must be under 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      socket.emit("send_message", {
        to: activeUser._id, content: "", iv: "",
        type: "image", imageData: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── Typing ────────────────────────────────────────────────────────────────
  const handleInputChange = (val: string) => {
    setInput(val);
    if (!activeUser || !socket) return;
    socket.emit("typing", { to: activeUser._id, isTyping: true });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit("typing", { to: activeUser._id, isTyping: false });
    }, 1500);
  };

  // ── Delete message ────────────────────────────────────────────────────────
  const deleteMessage = async (id: string) => {
    await fetch(`${API_URL}/api/chat/messages/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    setMessages(prev => prev.filter(m => m._id !== id));
    setLongPress(null);
  };

  // ── Clear chat ────────────────────────────────────────────────────────────
  const clearChat = async () => {
    if (!activeUser) return;
    if (!confirm(`Clear all messages with @${activeUser.username}? This cannot be undone.`)) return;
    await fetch(`${API_URL}/api/chat/clear/${activeUser._id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    setMessages([]);
    setShowInfo(false);
  };

  // ── Unfriend ──────────────────────────────────────────────────────────────
  const unfriend = async () => {
    if (!activeUser) return;
    if (!confirm(`Unfriend @${activeUser.username}?`)) return;
    await fetch(`${API_URL}/api/friends/remove/${activeUser._id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    await refetchFriends();
    setActiveUser(null);
    setMessages([]);
  };

  // ── Block ─────────────────────────────────────────────────────────────────
  const blockUser = async () => {
    if (!activeUser) return;
    if (!confirm(`Block @${activeUser.username}? They won't be able to contact you.`)) return;
    await fetch(`${API_URL}/api/friends/block/${activeUser._id}`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    });
    await refetchFriends();
    setActiveUser(null);
    setMessages([]);
  };

  const isOnline  = (userId: string) => onlineUsers.includes(userId);
  const getFromId = (msg: Message) =>
    typeof msg.from === "object" ? msg.from._id : msg.from;
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  const requestStatusLabel = (status: string) => {
    switch (status) {
      case "pending":  return { label: "Requested", cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
      case "incoming": return { label: "Accept?",   cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
      case "accepted": return { label: "Friends ✓", cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
      case "rejected": return { label: "Rejected",  cls: "text-red-400 bg-red-500/10 border-red-500/20" };
      default:         return null;
    }
  };

  return (
    <div className="flex h-screen bg-[#04040a] text-slate-200 overflow-hidden">

      {/* ── Left panel ── */}
      <div className={`${activeUser ? "hidden md:flex" : "flex"} flex-col w-full md:w-72 bg-[#0d0d1a] border-r border-white/5 shrink-0`}>

        {/* Header */}
        <div className="px-4 py-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-sm font-black text-white">Messages</h1>
            <div className="flex items-center gap-2">
              {totalUnread > 0 && (
                <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded-full">
                  {totalUnread}
                </span>
              )}
              <button
                onClick={() => setShowSearch(s => !s)}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${showSearch ? "bg-emerald-500/10 text-emerald-400" : "text-slate-500 hover:text-white"}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </button>
            </div>
          </div>

          {showSearch && (
            <div className="relative">
              <input
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-slate-200 text-xs outline-none focus:border-emerald-500/40 transition-colors placeholder:text-slate-600"
                placeholder="Search username..."
                value={searchQ}
                onChange={e => handleSearch(e.target.value)}
                autoFocus
              />
              {searching && (
                <div className="absolute right-3 top-2.5">
                  <div className="w-3 h-3 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Search results */}
        {showSearch && searchQ && (
          <div className="border-b border-white/5">
            {searchResults.length === 0 && !searching ? (
              <div className="px-4 py-4 text-center">
                <p className="text-xs text-slate-600">No users found</p>
              </div>
            ) : searchResults.map(user => {
              const statusInfo = requestStatusLabel(user.requestStatus);
              return (
                <div key={user._id} className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.03]">
                  <Avatar src={user.profilePicture} name={user.username} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{user.username}</p>
                  </div>
                  {statusInfo ? (
                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg border ${statusInfo.cls}`}>
                      {statusInfo.label}
                    </span>
                  ) : (
                    <button
                      onClick={() => sendRequest(user._id)}
                      disabled={requesting === user._id}
                      className="text-[9px] font-black px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/20 cursor-pointer disabled:opacity-50"
                    >
                      {requesting === user._id ? "..." : "+ Add"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Friends list */}
        <div className="flex-1 overflow-y-auto">
          {friends.length === 0 ? (
            <div className="text-center py-10 px-4">
              <div className="text-2xl mb-2 opacity-30">💬</div>
              <p className="text-xs text-slate-600 mb-1">No friends yet</p>
              <p className="text-[10px] text-slate-700">Tap 🔍 to search and add someone</p>
            </div>
          ) : friends.map(friend => (
            <button
              key={friend._id}
              onClick={() => openChat(friend)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors cursor-pointer text-left border-b border-white/[0.03] ${
                activeUser?._id === friend._id ? "bg-white/[0.06]" : ""
              }`}
            >
              <div className="relative shrink-0">
                <Avatar src={undefined} name={friend.username} size="md" />
                {isOnline(friend._id) && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0d0d1a]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{friend.username}</p>
                <p className={`text-[10px] ${isOnline(friend._id) ? "text-emerald-400" : "text-slate-600"}`}>
                  {isOnline(friend._id) ? "Online" : "Offline"}
                </p>
              </div>
              {unread[friend._id] > 0 && (
                <span className="w-5 h-5 bg-emerald-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shrink-0">
                  {unread[friend._id]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chat window ── */}
      <div className={`${activeUser ? "flex" : "hidden md:flex"} flex-1 flex-col min-w-0`}>

        {!activeUser ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-3 opacity-30">💬</div>
              <p className="text-sm font-bold text-slate-500">Select a friend to chat</p>
              <p className="text-xs text-slate-600 mt-1">Messages are end-to-end encrypted 🔒</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Chat header ── */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#0d0d1a] border-b border-white/5 shrink-0">
              <button
                onClick={() => setActiveUser(null)}
                className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"/>
                  <polyline points="12 19 5 12 12 5"/>
                </svg>
              </button>

              <div className="relative cursor-pointer" onClick={() => setShowInfo(s => !s)}>
                <Avatar src={activeUser.profilePicture} name={activeUser.username} size="md" />
                {isOnline(activeUser._id) && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0d0d1a]" />
                )}
              </div>

              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setShowInfo(s => !s)}>
                <p className="text-sm font-bold text-white">{activeUser.username}</p>
                <p className={`text-[10px] ${isOnline(activeUser._id) ? "text-emerald-400" : "text-slate-600"}`}>
                  {otherTyping ? "typing..." : isOnline(activeUser._id) ? "Online" : "Offline"}
                </p>
              </div>

              <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-1 shrink-0">
                <span className="text-[9px]">🔒</span>
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wide">E2E</span>
              </div>

              <button
                onClick={() => setShowInfo(s => !s)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
                </svg>
              </button>
            </div>

            {/* ── User info panel ── */}
            {showInfo && (
              <div className="bg-[#0d0d1a] border-b border-white/5 px-4 py-4 shrink-0">
                <div className="flex items-center gap-4 mb-4">
                  <Avatar src={activeUser.profilePicture} name={activeUser.username} size="lg" />
                  <div>
                    <p className="text-base font-black text-white">{activeUser.username}</p>
                    {activeUser.bio && (
                      <p className="text-xs text-slate-500 mt-0.5">{activeUser.bio}</p>
                    )}
                    <p className={`text-[10px] mt-1 font-bold ${isOnline(activeUser._id) ? "text-emerald-400" : "text-slate-600"}`}>
                      {isOnline(activeUser._id) ? "● Online" : "● Offline"}
                    </p>
                  </div>
                </div>

                {/* ── Action buttons ── */}
                <div className="flex flex-col gap-2">
                  {/* Clear chat */}
                  <button
                    onClick={clearChat}
                    className="w-full py-2 bg-slate-500/10 border border-slate-500/20 text-slate-400 text-[10px] font-black rounded-xl hover:bg-slate-500/20 transition-colors cursor-pointer"
                  >
                    🗑️ Clear Chat
                  </button>

                  {/* Unfriend + Block */}
                  <div className="flex gap-2">
                    <button
                      onClick={unfriend}
                      className="flex-1 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black rounded-xl hover:bg-amber-500/20 transition-colors cursor-pointer"
                    >
                      👋 Unfriend
                    </button>
                    <button
                      onClick={blockUser}
                      className="flex-1 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black rounded-xl hover:bg-red-500/20 transition-colors cursor-pointer"
                    >
                      🚫 Block
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-3xl mb-2 opacity-30">👋</div>
                    <p className="text-xs text-slate-600">Say hi!</p>
                    <p className="text-[10px] text-slate-700 mt-1">🔒 End-to-end encrypted</p>
                  </div>
                </div>
              ) : messages.map(msg => {
                const fromId = getFromId(msg);
                const isMe   = fromId === myId;
                return (
                  <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"} gap-2 items-end`}>

                    {!isMe && (
                      <Avatar
                        src={typeof msg.from === "object" ? (msg.from as any).profilePicture : ""}
                        name={activeUser.username}
                        size="sm"
                      />
                    )}

                    <div className="relative max-w-[70%]">
                      {longPress === msg._id && isMe && (
                        <div className="absolute -top-8 right-0 z-10 flex gap-1">
                          <button
                            onClick={() => deleteMessage(msg._id)}
                            className="px-2 py-1 bg-red-500/90 text-white text-[10px] font-black rounded-lg cursor-pointer"
                          >
                            🗑️ Delete
                          </button>
                          <button
                            onClick={() => setLongPress(null)}
                            className="px-2 py-1 bg-slate-700 text-white text-[10px] font-black rounded-lg cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      <div
                        onDoubleClick={() => isMe && setLongPress(longPress === msg._id ? null : msg._id)}
                        className={`rounded-2xl overflow-hidden cursor-default select-none ${
                          isMe
                            ? "bg-emerald-500 text-white rounded-br-sm"
                            : "bg-[#0d0d1a] border border-white/[0.06] text-slate-200 rounded-bl-sm"
                        }`}
                      >
                        {msg.type === "image" ? (
                          <img
                            src={msg.imageData}
                            alt="Image"
                            className="max-w-[240px] max-h-[320px] object-cover rounded-2xl cursor-pointer"
                            onClick={() => window.open(msg.imageData, "_blank")}
                          />
                        ) : (
                          <p className="px-3.5 py-2.5 text-sm leading-relaxed">{msg.text}</p>
                        )}
                      </div>

                      <div className={`flex items-center gap-1 mt-0.5 ${isMe ? "justify-end" : "justify-start"}`}>
                        <span className="text-[9px] text-slate-600">
                          {new Date(msg.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {isMe && (
                          <span className={`text-[10px] ${msg.seen ? "text-emerald-400" : "text-slate-600"}`}>
                            {msg.seen ? "✓✓" : "✓"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {otherTyping && (
                <div className="flex justify-start gap-2 items-end">
                  <Avatar src={activeUser.profilePicture} name={activeUser.username} size="sm" />
                  <div className="bg-[#0d0d1a] border border-white/[0.06] px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* ── Input ── */}
            <div className="px-4 py-3 border-t border-white/5 bg-[#0d0d1a] flex gap-2 shrink-0 items-center">
              <input
                ref={imageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSend}
              />
              <button
                onClick={() => imageRef.current?.click()}
                className="p-2.5 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all cursor-pointer shrink-0"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </button>

              <input
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3 text-slate-200 text-sm outline-none focus:border-emerald-500/40 transition-colors placeholder:text-slate-600"
                placeholder="Message..."
                value={input}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              />

              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="w-11 h-11 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-2xl flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}