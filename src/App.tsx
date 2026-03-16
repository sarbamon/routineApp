import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import { useState } from "react";
import Login from "./Login";

import RoutinePage          from "./pages/RoutinePage";
import TodayPage            from "./pages/TodayPage";
import MonthlyReportPage    from "./pages/MonthlyReportPage";
import MoneyTrackerPage     from "./pages/MoneyTrackerPage";
import AttendanceTrackerPage from "./pages/AttendanceTrackerPage";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("token")
  );
  const [username, setUsername] = useState(
    localStorage.getItem("username") || ""
  );
  const [menuOpen, setMenuOpen] = useState(false);

  if (!isLoggedIn) {
    return (
      <Login
        onLogin={(name: string) => {
          setUsername(name);
          setIsLoggedIn(true);
        }}
      />
    );
  }

  const NAV_LINKS = [
    { to: "/",           label: "🏠 Routine"        },
    { to: "/today",      label: "📋 Today"          },
    { to: "/monthly",    label: "📅 Monthly Report" },
    { to: "/money",      label: "💰 Money Tracker"  },
    { to: "/attendance", label: "📚 Attendance"     },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setIsLoggedIn(false);
    setUsername("");
  };

  return (
    <BrowserRouter>
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
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-sm">
                🤖
              </div>
              <h2 className="text-lg font-black text-white">
                Akieme <span className="text-emerald-400">One</span>
              </h2>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex flex-col gap-0.5 px-3 py-4 flex-1 overflow-y-auto">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* User card */}
          {username && (
            <div className="px-3 pb-3">
              <div className="px-3 py-3 bg-white/[0.03] border border-white/[0.05] rounded-xl flex items-center gap-3">
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
              </div>
            </div>
          )}

          {/* Logout */}
          <div className="px-3 pb-6">
            <button
              onClick={handleLogout}
              className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>

        {/* ── Main area ── */}
        <div className="min-h-screen md:ml-64 flex flex-col bg-[#04040a]">

          {/* ── Mobile top bar ── */}
          <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0d0d1a] border-b border-white/5 shrink-0">
            <button
              onClick={() => setMenuOpen(true)}
              className="text-slate-400 hover:text-white transition-colors text-xl leading-none"
            >
              ☰
            </button>

            <span className="font-black text-white">
              Akieme <span className="text-emerald-400">One</span>
            </span>

            {/* Username avatar — mobile */}
            {username && (
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs font-black text-emerald-400 uppercase">
                {username.charAt(0)}
              </div>
            )}
          </div>

          {/* ── Desktop top bar ── */}
          <div className="hidden md:flex items-center justify-between px-6 py-3 bg-[#0d0d1a] border-b border-white/5 shrink-0">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
              Dashboard
            </p>

            {username && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    Welcome back
                  </p>
                  <p className="text-sm font-bold text-white capitalize">
                    {username}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-sm font-black text-emerald-400 uppercase">
                  {username.charAt(0)}
                </div>
              </div>
            )}
          </div>

          {/* ── Page content ── */}
          <div className="flex-1 flex flex-col">
            <div className="w-full h-full">
              <Routes>
                <Route path="/"           element={<RoutinePage />}           />
                <Route path="/today"      element={<TodayPage />}             />
                <Route path="/monthly"    element={<MonthlyReportPage />}     />
                <Route path="/money"      element={<MoneyTrackerPage />}      />
                <Route path="/attendance" element={<AttendanceTrackerPage />} />
                <Route path="*"           element={<Navigate to="/" />}       />
              </Routes>
            </div>
          </div>

        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;