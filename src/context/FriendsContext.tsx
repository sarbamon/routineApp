import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { API_URL } from "../config/api";

interface FriendRequest {
  _id: string;
  from: { _id: string; username: string };
  to: string;
  status: string;
  createdAt: string;
}

interface Friend {
  _id: string;
  username: string;
  canMessage: boolean;
  requestId: string;
}

interface FriendsContextType {
  friends:        Friend[];
  pendingCount:   number;
  pendingRequests: FriendRequest[];
  refetchFriends: () => Promise<void>;
  refetchPending: () => Promise<void>;
}

const FriendsContext = createContext<FriendsContextType | null>(null);

export function FriendsProvider({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("token");

  const [friends,         setFriends]         = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);

  const refetchFriends = useCallback(async () => {
    if (!token) return;
    try {
      const res  = await fetch(`${API_URL}/api/friends/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setFriends(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch friends error:", err);
    }
  }, [token]);

  const refetchPending = useCallback(async () => {
    if (!token) return;
    try {
      const res  = await fetch(`${API_URL}/api/friends/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPendingRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch pending error:", err);
    }
  }, [token]);

  useEffect(() => {
    refetchFriends();
    refetchPending();
  }, [refetchFriends, refetchPending]);

  return (
    <FriendsContext.Provider value={{
      friends,
      pendingCount:   pendingRequests.length,
      pendingRequests,
      refetchFriends,
      refetchPending,
    }}>
      {children}
    </FriendsContext.Provider>
  );
}

export const useFriends = () => {
  const ctx = useContext(FriendsContext);
  if (!ctx) throw new Error("useFriends must be used within FriendsProvider");
  return ctx;
};