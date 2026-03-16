import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { API_URL } from "../config/api";

interface SocketContextType {
  socket:      Socket | null;
  onlineUsers: string[];
  connected:   boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket:      null,
  onlineUsers: [],
  connected:   false,
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef                     = useRef<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [connected,   setConnected]   = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    // ✅ Don't connect if no token
    if (!token) return;

    const socket = io(API_URL, {
      auth:       { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay:    2000,
    });

    socketRef.current = socket;

    socket.on("connect",      () => setConnected(true));
    socket.on("disconnect",   () => setConnected(false));
    socket.on("online_users", (users: string[]) => setOnlineUsers(users));

    socket.on("connect_error", (err) => {
      console.warn("Socket connection error:", err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return (
    <SocketContext.Provider value={{
      socket:      socketRef.current,
      onlineUsers,
      connected,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);