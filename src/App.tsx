import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import { useState } from "react";
import Login from "./Login";

import RoutinePage from "./pages/RoutinePage";
import TodayPage from "./pages/TodayPage";
import MonthlyReportPage from "./pages/MonthlyReportPage";
import MoneyTrackerPage from "./pages/MoneyTrackerPage";
import AttendanceTrackerPage from "./pages/AttendanceTrackerPage";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("isLoggedIn") === "true"
  );

  const [menuOpen, setMenuOpen] = useState(false);

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <BrowserRouter>
      <div className="relative min-h-screen bg-slate-100 overflow-x-hidden">

        {/* MOBILE OVERLAY */}
        {menuOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
        )}

        {/* SIDEBAR */}
        <div
          className={`
            fixed z-50 top-0 left-0 h-full w-64 bg-slate-900 text-white p-6
            transform transition-transform duration-300
            ${menuOpen ? "translate-x-0" : "-translate-x-full"}
            md:translate-x-0 md:block
          `}
        >
          <div>
            <h2 className="text-xl font-semibold mb-8">
              Productivity
            </h2>

            <nav className="flex flex-col gap-4 text-sm">
              <Link to="/" onClick={() => setMenuOpen(false)}>Routine</Link>
              <Link to="/today" onClick={() => setMenuOpen(false)}>Today</Link>
              <Link to="/monthly" onClick={() => setMenuOpen(false)}>Monthly Report</Link>
              <Link to="/money" onClick={() => setMenuOpen(false)}>Money Tracker</Link>
              <Link to="/attendance" onClick={() => setMenuOpen(false)}>Attendance</Link>
            </nav>
          </div>

          <button
            onClick={() => {
              localStorage.removeItem("isLoggedIn");
              setIsLoggedIn(false);
            }}
            className="bg-red-500 hover:bg-red-600 py-2 rounded-lg mt-10 text-sm"
          >
            Logout
          </button>
        </div>

        {/* MAIN AREA */}
        <div className="min-h-screen md:ml-64 flex flex-col">

          {/* MOBILE TOP BAR */}
          <div className="md:hidden flex items-center justify-between p-4 bg-white shadow-sm">
            <button
              onClick={() => setMenuOpen(true)}
              className="text-xl text-slate-700"
            >
              ☰
            </button>
            <span className="font-semibold text-slate-700">
              Productivity
            </span>
          </div>

          {/* CONTENT */}
          <div className="flex-1 flex justify-center">
            <div className="w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
              <Routes>
                <Route path="/" element={<RoutinePage onAddRoutine={() => {}} />} />
                <Route path="/today" element={<TodayPage />} />
                <Route path="/monthly" element={<MonthlyReportPage />} />
                <Route path="/money" element={<MoneyTrackerPage />} />
                <Route path="/attendance" element={<AttendanceTrackerPage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
          </div>

        </div>

      </div>
    </BrowserRouter>
  );
}

export default App;