import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ALL_PAGES, usePagesContext } from "../context/PagesContext";
import { API_URL } from "../config/api";

const APP_VERSION = "1.0.0";

interface ProfileData {
  username:       string;
  profilePicture: string;
  bio:            string;
}

interface StatsData {
  friendRequestsSent:     number;
  friendRequestsAccepted: number;
  blockedUsers:           number;
}

const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const SettingRow = ({
  icon, label, sublabel, onClick, danger = false, right,
}: {
  icon:      string;
  label:     string;
  sublabel?: string;
  onClick?:  () => void;
  danger?:   boolean;
  right?:    React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition-colors cursor-pointer text-left ${danger ? "text-red-400" : "text-slate-200"}`}
  >
    <span className="text-lg shrink-0">{icon}</span>
    <div className="flex-1 min-w-0">
      <p className={`text-sm font-semibold ${danger ? "text-red-400" : "text-slate-200"}`}>{label}</p>
      {sublabel && <p className="text-[10px] text-slate-600 mt-0.5">{sublabel}</p>}
    </div>
    {right ?? <ChevronRight />}
  </button>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-5">
    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 px-1">
      {title}
    </p>
    <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
      {children}
    </div>
  </div>
);

export default function SettingsPage() {
  const token    = localStorage.getItem("token");
  const navigate = useNavigate();

  const { enabledPages, savePages } = usePagesContext();
  const [selected,  setSelected]  = useState<string[]>(enabledPages);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [profile,   setProfile]   = useState<ProfileData>({ username: "", profilePicture: "", bio: "" });
  const [stats,     setStats]     = useState<StatsData>({ friendRequestsSent: 0, friendRequestsAccepted: 0, blockedUsers: 0 });
  // Add this state at the top with other states
const [showPages, setShowPages] = useState(false);

  // Change password
  const [showPassModal,  setShowPassModal]  = useState(false);
  const [oldPass,        setOldPass]        = useState("");
  const [newPass,        setNewPass]        = useState("");
  const [passMsg,        setPassMsg]        = useState({ text: "", type: "" });
  const [changingPass,   setChangingPass]   = useState(false);

  // Feedback
  const [showFeedback,   setShowFeedback]   = useState(false);
  const [feedback,       setFeedback]       = useState("");
  const [feedbackMsg,    setFeedbackMsg]    = useState({ text: "", type: "" });
  const [sendingFeedback, setSendingFeedback] = useState(false);

  // FAQ
  const [showFAQ,        setShowFAQ]        = useState(false);
  const [openFAQ,        setOpenFAQ]        = useState<number | null>(null);

  // ── Fetch profile ──────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    try {
      const payload = JSON.parse(atob(token!.split(".")[1]));
      const res     = await fetch(`${API_URL}/api/chat/profile/${payload.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setProfile({
        username:       data.username       || localStorage.getItem("username") || "",
        profilePicture: data.profilePicture || "",
        bio:            data.bio            || "",
      });
    } catch {
      // Profile fetch failed silently
    }
  }, [token]);

  // ── Fetch stats ────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/api/friends/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // Stats fetch failed silently
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, [fetchProfile, fetchStats]);

  // ── Save pages ─────────────────────────────────────────────────────────────
  
  const handleSavePages = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    await savePages(selected);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const togglePage = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
    setSaved(false);
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!oldPass || !newPass) {
      setPassMsg({ text: "Both fields are required", type: "error" });
      return;
    }
    if (newPass.length < 6) {
      setPassMsg({ text: "New password must be at least 6 characters", type: "error" });
      return;
    }
    setChangingPass(true);
    try {
      const res  = await fetch(`${API_URL}/api/auth/change-password`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ oldPassword: oldPass, newPassword: newPass }),
      });
      const data = await res.json();
      if (res.ok) {
        setPassMsg({ text: "✅ Password changed!", type: "success" });
        setOldPass(""); setNewPass("");
        setTimeout(() => { setPassMsg({ text: "", type: "" }); setShowPassModal(false); }, 2000);
      } else {
        setPassMsg({ text: data.message || "Failed", type: "error" });
      }
    } catch {
      setPassMsg({ text: "Server error", type: "error" });
    } finally {
      setChangingPass(false);
    }
  };

  // ── Send feedback ──────────────────────────────────────────────────────────
  const handleFeedback = async () => {
    if (!feedback.trim()) return;
    setSendingFeedback(true);
    try {
      const res = await fetch(`${API_URL}/api/feedback`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ message: feedback, username: profile.username }),
      });
      if (res.ok) {
        setFeedbackMsg({ text: "✅ Feedback sent! Thank you.", type: "success" });
        setFeedback("");
        setTimeout(() => { setFeedbackMsg({ text: "", type: "" }); setShowFeedback(false); }, 2000);
      } else {
        setFeedbackMsg({ text: "Failed to send", type: "error" });
      }
    } catch {
      setFeedbackMsg({ text: "Server error", type: "error" });
    } finally {
      setSendingFeedback(false);
    }
  };

  const FAQ_ITEMS = [
    { q: "How do I add a new friend?",             a: "Go to Chat, tap the 🔍 search icon, search by username and send a friend request." },
    { q: "Can I use the app offline?",             a: "Some features like viewing cached data work offline, but adding or syncing data requires internet." },
    { q: "How do I enable more pages?",            a: "Scroll down to App Preferences in Settings and toggle the pages you want." },
    { q: "Are my messages private?",               a: "Yes — all messages are end-to-end encrypted using AES-256-GCM. Nobody except you and the recipient can read them." },
    { q: "How do I change my profile picture?",   a: "Go to Profile from the sidebar and tap your avatar to upload a new picture." },
    { q: "Why am I not getting notifications?",    a: "Make sure you allowed notification permissions in your browser. On mobile, install the app as a PWA for best results." },
  ];

  const inputCls = "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-slate-200 text-[13px] outline-none focus:border-emerald-500/40 transition-colors placeholder:text-slate-600";

  return (
  <div className="p-4 md:p-6 min-h-screen bg-[#04040a] text-slate-200 pb-48">

      {/* ── Profile header ── */}
      <div className="flex flex-col items-center mb-8 pt-2">
        <div className="relative mb-3">
          {profile.profilePicture ? (
            <img
              src={profile.profilePicture}
              alt="Profile"
              className="w-20 h-20 rounded-2xl object-cover border-2 border-white/10"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center text-2xl font-black text-emerald-400 uppercase">
              {profile.username.charAt(0)}
            </div>
          )}
          <Link
            to="/profile"
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg cursor-pointer hover:bg-emerald-600 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </Link>
        </div>
        <p className="text-lg font-black text-white capitalize">{profile.username}</p>
        {profile.bio && (
          <p className="text-xs text-slate-500 mt-0.5 text-center max-w-xs">{profile.bio}</p>
        )}
      </div>

      {/* ── Account Settings ── */}
      <Section title="Account Settings">
        <SettingRow
          icon="👤"
          label="Edit Profile"
          sublabel="Change your picture and bio"
          onClick={() => navigate("/profile")}
        />
        <SettingRow
          icon="🔑"
          label="Change Password"
          sublabel="Update your login password"
          onClick={() => setShowPassModal(true)}
        />
      </Section>

      {/* ── My Activity ── */}
      <Section title="My Activity">
        <div className="px-4 py-4 grid grid-cols-3 gap-3">
          {[
            { label: "Requests Sent",     value: stats.friendRequestsSent,     color: "text-violet-400" },
            { label: "Friends Made",      value: stats.friendRequestsAccepted, color: "text-emerald-400" },
            { label: "Blocked Users",     value: stats.blockedUsers,            color: "text-red-400"    },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 text-center">
              <p className={`text-xl font-black font-mono ${color}`}>{value}</p>
              <p className="text-[9px] text-slate-600 mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── App Preferences ── */}
      {/* ── App Preferences ── */}
<Section title="App Preferences">
  <SettingRow
    icon="📱"
    label="Manage Pages"
    sublabel={`${selected.length} of ${ALL_PAGES.length} pages enabled`}
    onClick={() => setShowPages(s => !s)}
    right={
      <svg
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
        className={`transition-transform duration-200 ${showPages ? "rotate-180" : ""}`}
      >
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    }
  />

  {/* Expandable page list */}
  {showPages && (
    <div className="px-4 pb-4 pt-1 border-t border-white/[0.04]">
      <div className="space-y-2 mb-4 mt-3">
        {ALL_PAGES.map(page => {
          const isOn = selected.includes(page.id);
          return (
            <button
              key={page.id}
              onClick={() => togglePage(page.id)}
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
        onClick={handleSavePages}
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
    </div>
  )}
</Section>

      {/* ── Support & About ── */}
      <Section title="Support & About">
        <SettingRow
          icon="💬"
          label="Send Feedback"
          sublabel="Help us improve the app"
          onClick={() => setShowFeedback(true)}
        />
        <SettingRow
          icon="❓"
          label="FAQ"
          sublabel="Frequently asked questions"
          onClick={() => setShowFAQ(true)}
        />
        <SettingRow
          icon="📧"
          label="Contact Us"
          sublabel="sarbamon@gmail.com"
          onClick={() => window.open("mailto:sarbamon@gmail.com")}
        />
        <SettingRow
          icon="📄"
          label="Terms of Service"
          sublabel="Read our terms"
          onClick={() => {}}
        />
        <SettingRow
          icon="🔒"
          label="Privacy Policy"
          sublabel="How we handle your data"
          onClick={() => {}}
        />
      </Section>

      {/* ── Sign out ── */}
      <div className="mt-2 mb-6">
        <button
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("username");
            window.location.href = "/";
          }}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl font-bold text-sm hover:bg-red-500/20 transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </button>
      </div>

      {/* ── Version ── */}
      <p className="text-center text-[10px] text-slate-700 uppercase tracking-widest">
        Akieme One — Version {APP_VERSION}
      </p>

      {/* ══════════════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════════════ */}

      {/* ── Change Password Modal ── */}
      {showPassModal && (
        <>
          <div className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm" onClick={() => setShowPassModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
            <div className="w-full max-w-sm bg-[#0d0d1a] border border-white/[0.08] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] pointer-events-auto">

              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <p className="text-sm font-black text-white">Change Password</p>
                <button onClick={() => setShowPassModal(false)} className="w-7 h-7 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-slate-400 cursor-pointer">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <div className="px-5 py-5 space-y-3">
                {passMsg.text && (
                  <div className={`px-3 py-2 rounded-xl text-xs font-bold border ${
                    passMsg.type === "success"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}>{passMsg.text}</div>
                )}
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Current Password</label>
                  <input type="password" className={inputCls} placeholder="Enter current password" value={oldPass} onChange={e => setOldPass(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">New Password</label>
                  <input type="password" className={inputCls} placeholder="Enter new password" value={newPass} onChange={e => setNewPass(e.target.value)} />
                </div>
                <button
                  onClick={handleChangePassword}
                  disabled={changingPass}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-black uppercase tracking-widest rounded-xl cursor-pointer transition-colors"
                >
                  {changingPass ? "Changing..." : "Change Password"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Feedback Modal ── */}
      {showFeedback && (
        <>
          <div className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm" onClick={() => setShowFeedback(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
            <div className="w-full max-w-sm bg-[#0d0d1a] border border-white/[0.08] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] pointer-events-auto">

              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <p className="text-sm font-black text-white">Send Feedback</p>
                <button onClick={() => setShowFeedback(false)} className="w-7 h-7 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-slate-400 cursor-pointer">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <div className="px-5 py-5 space-y-3">
                {feedbackMsg.text && (
                  <div className={`px-3 py-2 rounded-xl text-xs font-bold border ${
                    feedbackMsg.type === "success"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}>{feedbackMsg.text}</div>
                )}
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Your Feedback</label>
                  <textarea
                    rows={4}
                    className={`${inputCls} resize-none`}
                    placeholder="Tell us what you think, report a bug, or suggest a feature..."
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    maxLength={500}
                  />
                  <p className="text-[9px] text-slate-600 text-right mt-0.5">{feedback.length}/500</p>
                </div>
                <button
                  onClick={handleFeedback}
                  disabled={!feedback.trim() || sendingFeedback}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-black uppercase tracking-widest rounded-xl cursor-pointer transition-colors"
                >
                  {sendingFeedback ? "Sending..." : "Send Feedback"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── FAQ Modal ── */}
      {showFAQ && (
        <>
          <div className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm" onClick={() => setShowFAQ(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
            <div className="w-full max-w-md bg-[#0d0d1a] border border-white/[0.08] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] pointer-events-auto max-h-[80vh] flex flex-col">

              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
                <p className="text-sm font-black text-white">FAQ</p>
                <button onClick={() => setShowFAQ(false)} className="w-7 h-7 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-slate-400 cursor-pointer">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <div className="overflow-y-auto px-5 py-4 space-y-2">
                {FAQ_ITEMS.map((item, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/[0.05] rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
                      className="w-full flex items-center justify-between px-4 py-3 cursor-pointer text-left"
                    >
                      <p className="text-xs font-bold text-slate-200 pr-3">{item.q}</p>
                      <svg
                        width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                        className={`shrink-0 transition-transform ${openFAQ === i ? "rotate-180" : ""}`}
                      >
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                    {openFAQ === i && (
                      <div className="px-4 pb-3">
                        <p className="text-xs text-slate-500 leading-relaxed">{item.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
      {/* ── Version ── */}
      <p className="text-center text-[10px] text-slate-700 uppercase tracking-widest pb-4">
        Akieme One — Version {APP_VERSION}
      </p>

    </div>
  );
}