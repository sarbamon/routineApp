import { Link, useLocation } from "react-router-dom";
import { Home, CheckSquare, Wallet, Settings } from "lucide-react";

export default function BottomNav() {
  const location = useLocation();

  const tabs = [
    { path: "/home", label: "HOME", Icon: Home }, 
    { path: "/today", label: "TODAY", Icon: CheckSquare },
    { path: "/money", label: "MONEY", Icon: Wallet },
    { path: "/settings", label: "SETTINGS", Icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d0d1a] border-t border-white/5 md:hidden">
      <div className="flex justify-around items-center py-2.5 relative">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          const Icon = tab.Icon;

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center gap-1 transition-all ${
                active ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? "scale-110 text-emerald-400" : "text-slate-400"}`} />
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