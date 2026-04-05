import { Link, useLocation } from "react-router-dom";

export default function BottomNav() {
  const location = useLocation();

  const tabs = [
    { path: "/home", label: "HOME", icon: "🏠" }, 
    { path: "/chat", label: "CHATS", icon: "💬" },
    { path: "/money", label: "MONEY", icon: "💰" },
    { path: "/settings", label: "SETTINGS", icon: "⚙️" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d0d1a] border-t border-white/5 md:hidden">
      <div className="flex justify-around items-center py-3 relative">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center gap-1 transition-all ${
                active ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <span className={`text-xl ${active ? "scale-110" : ""}`}>
                {tab.icon}
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest">
                {tab.label}
              </span>
              
              {/* Active Indicator Dot */}
              {active && (
                <div className="absolute -bottom-1 w-1 h-1 bg-emerald-400 rounded-full shadow-[0_0_8px_#34d399]" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}