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

  // 🔥 NEW
  selectedNotification: NotifItem | null;
  openNotification: (notif: NotifItem) => void;
  closeNotification: () => void;
}

const NotifContext = createContext<NotifContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const token      = localStorage.getItem("token");
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<NotifItem | null>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // ── Permission ─────────────────
  useEffect(() => { requestPermission(); }, []);

  // ── Fetch ──────────────────────
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

  // ── Badge ──────────────────────
  useEffect(() => { updateBadge(unreadCount); }, [unreadCount]);

  // ── Socket ─────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on("new_notification", (notif: NotifItem) => {
      setNotifications(prev => [notif, ...prev]);

      if (notif.type === "message") playMessageSound();
      if (notif.type === "friend_request") playRequestSound();
      if (notif.type === "todo_reminder") playTodoSound();
      if (notif.type === "friend_accepted") playRequestSound();

      sendOSNotification(notif.title, notif.body);
    });

    return () => { socket.off("new_notification"); };
  }, [socket]);

  // ── Mark one read ──────────────
  const markRead = async (id: string) => {
    setNotifications(prev =>
      prev.map(n => n._id === id ? { ...n, read: true } : n)
    );

    await fetch(`${API_URL}/api/notifications/${id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  // ── Mark all ───────────────────
  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    await fetch(`${API_URL}/api/notifications/read-all`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  // ── Delete ─────────────────────
  const deleteNotif = async (id: string) => {
    setNotifications(prev => prev.filter(n => n._id !== id));

    await fetch(`${API_URL}/api/notifications/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  // ── Clear ──────────────────────
  const clearAll = async () => {
    setNotifications([]);
    await fetch(`${API_URL}/api/notifications`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  // ── 🔥 OPEN NOTIFICATION ───────
  const openNotification = (notif: NotifItem) => {
    setSelectedNotification(notif);

    // auto mark as read
    if (!notif.read) {
      markRead(notif._id);
    }
  };

  // ── 🔥 CLOSE ───────────────────
  const closeNotification = () => {
    setSelectedNotification(null);
  };

  return (
    <NotifContext.Provider value={{
      notifications,
      unreadCount,
      fetchNotifs,
      markRead,
      markAllRead,
      deleteNotif,
      clearAll,

      // NEW
      selectedNotification,
      openNotification,
      closeNotification,
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