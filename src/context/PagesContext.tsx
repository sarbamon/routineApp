import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { API_URL } from "../config/api";

export const ALL_PAGES = [
  { id: "routine",    label: "Routine",        iconName: "CalendarDays",   desc: "Daily schedule & habits"     },
  { id: "today",      label: "Today",          iconName: "CheckSquare font-medium",    desc: "Tasks & reminders"           },
  { id: "health",     label: "Health & Photos",iconName: "Activity",        desc: "Track health, meals, reports & share photos" },
  { id: "money",      label: "Money Tracker",  iconName: "Wallet",          desc: "Income, expenses & goals"    },
  { id: "attendance", label: "Attendance",     iconName: "GraduationCap font-medium",   desc: "Track classes & subjects"    },
  { id: "monthly",    label: "Monthly Report", iconName: "BarChart3 font-medium",      desc: "Reports from all your pages" }
];

interface PagesContextType {
  enabledPages:   string[];
  isNew:          boolean;
  loading:        boolean;
  savePages:      (pages: string[]) => Promise<void>;
  togglePage:     (id: string) => void;
  refetchPages:   () => Promise<void>;
}

const PagesContext = createContext<PagesContextType | null>(null);

export function PagesProvider({ children }: { children: ReactNode }) {
  const [enabledPages, setEnabledPages] = useState<string[]>([]);
  const [isNew,        setIsNew]        = useState(false);
  const [loading,      setLoading]      = useState(true);

  const token = localStorage.getItem("token");

  const refetchPages = async () => {
    if (!token) return;
    try {
      const res  = await fetch(`${API_URL}/api/pages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setEnabledPages(data.enabledPages || []);
      setIsNew(data.isNew || false);
    } catch (err) {
      console.error("Fetch pages error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refetchPages(); }, [token]);

  const savePages = async (pages: string[]) => {
    setEnabledPages(pages);
    setIsNew(false);
    await fetch(`${API_URL}/api/pages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ enabledPages: pages }),
    });
  };

  const togglePage = (id: string) => {
    const next = enabledPages.includes(id)
      ? enabledPages.filter(p => p !== id)
      : [...enabledPages, id];
    savePages(next);
  };

  return (
    <PagesContext.Provider value={{ enabledPages, isNew, loading, savePages, togglePage, refetchPages }}>
      {children}
    </PagesContext.Provider>
  );
}

export function usePagesContext() {
  const ctx = useContext(PagesContext);
  if (!ctx) throw new Error("usePagesContext must be used within PagesProvider");
  return ctx;
}