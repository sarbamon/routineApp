import {
  createContext, useContext, useState,
  useEffect, useCallback, ReactNode,
} from "react";
import { API_URL } from "../config/api";
import { useSocket } from "./SocketContext";
import { playMessageSound, playRequestSound, playTodoSound } from "../utils/sound";
import { sendOSNotification, updateBadge, requestPermission } from "../utils/pushNotification";

interface NotifItem {
  _id:       string;
  type:      "friend_request" | "friend_accepted" | "message" | "todo_reminder";
  title:     string;
  body:      string;
  read:      boolean;
  data:      Record<string, any>;
  createdAt: string;
}

interface NotifContextType {
  notifications:  NotifItem[];
  unreadCount:    number;
  fetchNotifs:    () => Promise<void>;
  markRead:       (id: string) => Promise<void>;
  markAllRead:    () => Promise<void>;
  deleteNotif:    (id: string) => Promise<void>;
  clearAll:       () => Promise<void>;
}

const NotifContext = createContext<NotifContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const token           = localStorage.getItem("token");
  const { socket }      = useSocket();
  const [notifications, setNotifications] = useState<NotifItem[]>([]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // ── Request OS notification permission on mount ───────────────────────────
  useEffect(() => { requestPermission(); }, []);

  // ── Fetch notifications ───────────────────────────────────────────────────
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

  // ── Update badge whenever unread count changes ────────────────────────────
  useEffect(() => { updateBadge(unreadCount); }, [unreadCount]);

  // ── Listen for real-time notifications ───────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on("new_notification", (notif: NotifItem) => {
      setNotifications(prev => [notif, ...prev]);

      // Play sound based on type
      if (notif.type === "message")        playMessageSound();
      if (notif.type === "friend_request") playRequestSound();
      if (notif.type === "todo_reminder")  playTodoSound();
      if (notif.type === "friend_accepted") playRequestSound();

      // OS notification
      sendOSNotification(notif.title, notif.body);
    });

    return () => { socket.off("new_notification"); };
  }, [socket]);

  // ── Mark one read ─────────────────────────────────────────────────────────
  const markRead = async (id: string) => {
    setNotifications(prev =>
      prev.map(n => n._id === id ? { ...n, read: true } : n)
    );
    await fetch(`${API_URL}/api/notifications/${id}/read`, {
      method:  "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  // ── Mark all read ─────────────────────────────────────────────────────────
  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await fetch(`${API_URL}/api/notifications/read-all`, {
      method:  "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  // ── Delete one ────────────────────────────────────────────────────────────
  const deleteNotif = async (id: string) => {
    setNotifications(prev => prev.filter(n => n._id !== id));
    await fetch(`${API_URL}/api/notifications/${id}`, {
      method:  "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  // ── Clear all ─────────────────────────────────────────────────────────────
  const clearAll = async () => {
    setNotifications([]);
    await fetch(`${API_URL}/api/notifications`, {
      method:  "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  return (
    <NotifContext.Provider value={{
      notifications, unreadCount,
      fetchNotifs, markRead, markAllRead, deleteNotif, clearAll,
    }}>
      {children}
    </NotifContext.Provider>
  );
}

export const useNotifications = () => {
  const ctx = useContext(NotifContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};