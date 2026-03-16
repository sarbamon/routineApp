import { Link } from "react-router-dom";
import { usePagesContext, ALL_PAGES } from "../context/PagesContext";

export default function HomePage() {
  const { enabledPages } = usePagesContext();
  const username = localStorage.getItem("username") || "";

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const myPages = ALL_PAGES.filter(p => enabledPages.includes(p.id));

  return (
    <div className="p-4 md:p-6 min-h-screen bg-[#04040a] text-slate-200">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">
          {greeting}, <span className="text-emerald-400 capitalize">{username}</span> 👋
        </h1>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long", day: "numeric",
            month: "long", year: "numeric",
          })}
        </p>
      </div>

      {/* Page grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {myPages.map(page => (
          <Link
            key={page.id}
            to={`/${page.id === "routine" ? "" : page.id}`}
            className="group bg-[#0d0d1a] border border-white/5 rounded-2xl p-5 hover:border-emerald-500/20 hover:bg-emerald-500/[0.03] transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-white/[0.04] group-hover:bg-emerald-500/10 flex items-center justify-center text-xl transition-colors">
                {page.emoji}
              </div>
              <svg
                className="text-slate-700 group-hover:text-emerald-500/50 transition-colors mt-1"
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <line x1="7" y1="17" x2="17" y2="7"/>
                <polyline points="7 7 17 7 17 17"/>
              </svg>
            </div>
            <p className="text-sm font-bold text-white mb-0.5">{page.label}</p>
            <p className="text-[11px] text-slate-600">{page.desc}</p>
          </Link>
        ))}

        {/* Manage pages shortcut */}
        <Link
          to="/settings"
          className="group bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl p-5 hover:border-white/20 transition-all flex flex-col items-center justify-center gap-2 text-center"
        >
          <div className="w-11 h-11 rounded-xl bg-white/[0.03] flex items-center justify-center text-xl">
            ⚙️
          </div>
          <p className="text-xs font-bold text-slate-500 group-hover:text-slate-300 transition-colors">
            Manage Pages
          </p>
        </Link>
      </div>
    </div>
  );
}