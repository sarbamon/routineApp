import { useState } from "react";
import { ALL_PAGES, usePagesContext } from "../context/PagesContext";

export default function SettingsPage() {
  const { enabledPages, savePages } = usePagesContext();
  const [selected, setSelected]     = useState<string[]>(enabledPages);
  const [saving,   setSaving]       = useState(false);
  const [saved,    setSaved]        = useState(false);

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
    setSaved(false);
  };

  const handleSave = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    await savePages(selected);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-4 md:p-6 min-h-screen bg-[#04040a] text-slate-200">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Settings</h1>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
          Manage your pages and preferences
        </p>
      </div>

      <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
            My Pages
          </p>
          <span className="text-[9px] text-slate-600">
            {selected.length} of {ALL_PAGES.length} enabled
          </span>
        </div>

        <div className="space-y-2 mb-5">
          {ALL_PAGES.map(page => {
            const isOn = selected.includes(page.id);
            return (
              <button
                key={page.id}
                onClick={() => toggle(page.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all text-left ${
                  isOn
                    ? "bg-emerald-500/[0.06] border-emerald-500/20"
                    : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]"
                }`}
              >
                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                  isOn ? "bg-emerald-500 border-emerald-500" : "border-white/20"
                }`}>
                  {isOn && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
                <span className="text-lg shrink-0">{page.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${isOn ? "text-white" : "text-slate-500"}`}>
                    {page.label}
                  </p>
                  <p className="text-[10px] text-slate-600 truncate">{page.desc}</p>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest shrink-0 ${
                  isOn ? "text-emerald-400" : "text-slate-700"
                }`}>
                  {isOn ? "ON" : "OFF"}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleSave}
          disabled={selected.length === 0 || saving}
          className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            saved
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default"
              : selected.length === 0 || saving
              ? "bg-slate-800 text-slate-600 cursor-not-allowed"
              : "bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer"
          }`}
        >
          {saved ? "✅ Saved!" : saving ? "Saving..." : "Save Changes"}
        </button>

        {selected.length === 0 && (
          <p className="text-center text-[11px] text-red-400 mt-2">
            Select at least one page
          </p>
        )}
      </div>
    </div>
  );
}