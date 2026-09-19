import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { API_URL } from "../config/api";

interface SocketContextType {
  socket:      Socket | null;
  onlineUsers: string[];
  connected:   boolean;
  offline:     boolean; 
}

const SocketContext = createContext<SocketContextType>({
  socket:      null,
  onlineUsers: [],
  connected:   false,
  offline:     false,
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket]           = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [connected,   setConnected]   = useState(false);
  const [offline,     setOffline]     = useState(false); 

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socketInstance = io(API_URL, {
      auth:       { token },
      transports: ["websocket"],

      // ✅ Stop after 5 attempts
      reconnectionAttempts: 5,
      reconnectionDelay:    2000,    // wait 2s between attempts
      reconnectionDelayMax: 5000,    // max 5s wait
      timeout:              10000,   // 10s connection timeout
    });

    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      setConnected(true);
      setOffline(false);
    });

    socketInstance.on("disconnect", () => {
      setConnected(false);
    });

    socketInstance.on("online_users", (users: string[]) => {
      setOnlineUsers(users);
    });

    // ✅ After 5 failed attempts — give up
    socketInstance.on("reconnect_failed", () => {
      console.warn("Socket gave up after 5 attempts");
      setConnected(false);
      setOffline(true);
      socketInstance.disconnect(); // stop all further attempts
    });

    socketInstance.on("connect_error", (err) => {
      if (err.message !== "Unauthorized") {
        console.warn("Socket error:", err.message);
      }
    });

    return () => {
      socketInstance.disconnect();
      setSocket(null);
    };
  }, []);

  return (
    <SocketContext.Provider value={{
      socket,
      onlineUsers,
      connected,
      offline,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);