import { useState } from "react";
import { ALL_PAGES, usePagesContext } from "../context/PagesContext";

export default function OnboardingPage() {
  const { savePages } = usePagesContext();
  const [selected, setSelected] = useState<string[]>(["today"]);
  const [saving,   setSaving]   = useState(false);

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    await savePages(selected);
    setSaving(false);
  };

  const username = localStorage.getItem("username") || "there";

  return (
    <div className="min-h-screen bg-[#04040a] text-slate-200 flex items-center justify-center px-4 relative overflow-hidden">

      {/* Glow orbs */}
      <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-emerald-500/[0.06] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-violet-500/[0.06] rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4 text-2xl">
            👋
          </div>
          <h1 className="text-2xl font-black text-white mb-2">
            Welcome, <span className="text-emerald-400 capitalize">{username}</span>!
          </h1>
          <p className="text-sm text-slate-500">
            Choose the pages you want to use. You can always change this later in Settings.
          </p>
        </div>

        {/* Page cards */}
        <div className="space-y-3 mb-6">
          {ALL_PAGES.map(page => {
            const isOn = selected.includes(page.id);
            return (
              <button
                key={page.id}
                onClick={() => toggle(page.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all text-left ${
                  isOn
                    ? "bg-emerald-500/[0.08] border-emerald-500/30"
                    : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]"
                }`}
              >
                {/* Checkbox */}
                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                  isOn ? "bg-emerald-500 border-emerald-500" : "border-white/20"
                }`}>
                  {isOn && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>

                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                  isOn ? "bg-emerald-500/10" : "bg-white/[0.04]"
                }`}>
                  {page.emoji}
                </div>

                {/* Label */}
                <div>
                  <p className={`text-sm font-bold ${isOn ? "text-white" : "text-slate-400"}`}>
                    {page.label}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">{page.desc}</p>
                </div>

                {/* Badge */}
                {isOn && (
                  <span className="ml-auto text-[9px] font-black text-emerald-400 uppercase tracking-widest shrink-0">
                    ON
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={selected.length === 0 || saving}
          className={`w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${
            selected.length === 0 || saving
              ? "bg-slate-800 text-slate-600 cursor-not-allowed"
              : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_24px_rgba(16,185,129,0.25)] cursor-pointer active:scale-[0.98]"
          }`}
        >
          {saving ? "Saving..." : `Get Started with ${selected.length} Page${selected.length !== 1 ? "s" : ""} →`}
        </button>

        {selected.length === 0 && (
          <p className="text-center text-[11px] text-red-400 mt-2">
            Please select at least one page
          </p>
        )}
      </div>
    </div>
  );
}