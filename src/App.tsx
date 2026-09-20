import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Login        from "./Login";
import { PagesProvider, usePagesContext, ALL_PAGES } from "./context/PagesContext";
import { SocketProvider }        from "./context/SocketContext";
import { FriendsProvider }       from "./context/FriendsContext";
import { NotificationProvider }  from "./context/NotificationContext";
import NotificationBell          from "./components/NotificationBell";
import { unlockAudio }           from "./utils/sound";

import { 
  Home, 
  CalendarDays, 
  CheckSquare, 
  Activity, 
  Wallet, 
  GraduationCap, 
  BarChart3, 
  User, 
  Settings, 
  ShieldCheck, 
  Layers,
  Menu
} from "lucide-react";

import OnboardingPage        from "./pages/OnboardingPage";
import HomePage              from "./pages/HomePage";
import RoutinePage           from "./pages/RoutinePage";
import TodayPage             from "./pages/TodayPage";
import MonthlyReportPage     from "./pages/MonthlyReportPage";
import MoneyTrackerPage      from "./pages/MoneyTrackerPage";
import AttendanceTrackerPage from "./pages/AttendanceTrackerPage";
import HealthPage            from "./pages/HealthPage";
import SettingsPage          from "./pages/SettingsPage";
import AdminPage             from "./pages/AdminPage";
import ProfilePage           from "./pages/ProfilePage";
import BottomNav             from "./components/BottomNav";

const ADMIN = "sarbamon";

const ICON_MAP: Record<string, any> = {
  home:       Home,
  routine:    CalendarDays,
  today:      CheckSquare,
  health:     Activity,
  money:      Wallet,
  attendance: GraduationCap,
  monthly:    BarChart3,
  profile:    User,
  settings:   Settings,
  admin:      ShieldCheck,
};

// ── Inner app ─────────────────────────────────────────────────────────────────
function InnerApp({ username, onLogout }: { username: string; onLogout: () => void }) {
  const { enabledPages, isNew, loading } = usePagesContext();
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) return (
    <div className="min-h-screen bg-[#04040a] flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  if (isNew) return <OnboardingPage />;

  const NAV_LINKS = [
    { to: "/home", label: "Home", pageId: "home" },
    ...ALL_PAGES
      .filter(p => enabledPages.includes(p.id))
      .map(p => ({
        to:    p.id === "routine" ? "/" : `/${p.id}`,
        label: p.label,
        pageId: p.id,
      })),
    { to: "/profile",  label: "Profile",  pageId: "profile"  },
    { to: "/settings", label: "Settings", pageId: "settings" },
    ...(username === ADMIN ? [{ to: "/admin", label: "Admin", pageId: "admin" }] : []),
  ];

  return (
    <div className="relative min-h-screen bg-[#04040a] overflow-x-hidden">

      {/* ── Mobile overlay ── */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <div className={`
        fixed z-50 top-0 left-0 h-full w-64 bg-[#0d0d1a]
        border-r border-white/5 text-white
        transform transition-transform duration-300 flex flex-col
        ${menuOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0
      `}>

        {/* Logo */}
        <div className="px-6 pt-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Layers className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-lg font-black text-white">
              Akieme <span className="text-emerald-400">One</span>
            </h2>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-0.5 px-3 py-4 flex-1 overflow-y-auto">
          {NAV_LINKS.map(({ to, label, pageId }) => {
            const Icon = ICON_MAP[pageId] || Home;
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-medium flex items-center gap-3"
              >
                <Icon className="w-4 h-4 text-emerald-400/80 shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User card */}
        {username && (
          <div className="px-3 pb-3">
            <Link
              to="/profile"
              onClick={() => setMenuOpen(false)}
              className="px-3 py-3 bg-white/[0.03] border border-white/[0.05] rounded-xl flex items-center gap-3 hover:bg-white/[0.06] transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-sm font-black text-emerald-400 uppercase shrink-0">
                {username.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  Logged in as
                </p>
                <p className="text-sm font-bold text-white capitalize truncate">
                  {username}
                </p>
              </div>
            </Link>
          </div>
        )}

        {/* Logout */}
        <div className="px-3 pb-6">
          <button
            onClick={onLogout}
            className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="h-screen md:ml-64 flex flex-col bg-[#04040a] overflow-hidden">

        {/* ── Mobile top bar ── */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0d0d1a] border-b border-white/5 shrink-0">
          <button
            onClick={() => setMenuOpen(true)}
            className="text-slate-400 hover:text-white transition-colors text-xl leading-none flex items-center justify-center cursor-pointer"
          >
            <Menu className="w-5 h-5 text-slate-300" />
          </button>

          <span className="font-black text-white">
            Akieme <span className="text-emerald-400">One</span>
          </span>

          <div className="flex items-center gap-2">
            <NotificationBell />
            {username && (
              <Link to="/profile">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs font-black text-emerald-400 uppercase cursor-pointer hover:bg-emerald-500/20 transition-colors">
                  {username.charAt(0)}
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* ── Desktop top bar ── */}
        <div className="hidden md:flex items-center justify-between px-6 py-3 bg-[#0d0d1a] border-b border-white/5 shrink-0">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
            Dashboard Workspace
          </p>
          {username && (
            <div className="flex items-center gap-3">
              <NotificationBell />
              <Link to="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    Welcome back
                  </p>
                  <p className="text-sm font-bold text-white capitalize">{username}</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-sm font-black text-emerald-400 uppercase cursor-pointer">
                  {username.charAt(0)}
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* ── Routes ── */}
        <div className="flex-1 flex flex-col min-h-[calc(100vh-80px)] pb-[110px] overflow-y-auto">
          <Routes>
            <Route path="/home"          element={<HomePage />}          />
            <Route path="/settings"      element={<SettingsPage />}      />
            <Route path="/profile"       element={<ProfilePage />}       />
            <Route path="/admin"         element={<AdminPage />}         />

            {enabledPages.includes("routine")    && <Route path="/"           element={<RoutinePage />}           />}
            {enabledPages.includes("today")      && <Route path="/today"      element={<TodayPage />}             />}
            {enabledPages.includes("health")     && <Route path="/health"     element={<HealthPage />}            />}
            {enabledPages.includes("money")      && <Route path="/money"      element={<MoneyTrackerPage />}      />}
            {enabledPages.includes("attendance") && <Route path="/attendance" element={<AttendanceTrackerPage />} />}
            {enabledPages.includes("monthly")    && <Route path="/monthly"    element={<MonthlyReportPage />}     />}
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));
  const [username,   setUsername]   = useState(localStorage.getItem("username") || "");

  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      window.removeEventListener("click",      unlock);
      window.removeEventListener("keydown",    unlock);
      window.removeEventListener("touchstart", unlock);
    };
    window.addEventListener("click",      unlock);
    window.addEventListener("keydown",    unlock);
    window.addEventListener("touchstart", unlock);

    return () => {
      window.removeEventListener("click",      unlock);
      window.removeEventListener("keydown",    unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  const handleLoginSuccess = (u: string, t: string) => {
    localStorage.setItem("token",    t);
    localStorage.setItem("username", u);
    setUsername(u);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setIsLoggedIn(false);
    setUsername("");
  };

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <BrowserRouter>
      <SocketProvider>
        <NotificationProvider>
          <FriendsProvider>
            <PagesProvider>
              <InnerApp username={username} onLogout={handleLogout} />
            </PagesProvider>
          </FriendsProvider>
        </NotificationProvider>
      </SocketProvider>
    </BrowserRouter>
  );
}

export default App;