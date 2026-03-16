import { useState, useRef, useEffect } from "react";
import { API_URL } from "../config/api";

export default function ProfilePage() {
  const token    = localStorage.getItem("token");
  const username = localStorage.getItem("username") || "";

  const [profile, setProfile] = useState({ profilePicture: "", bio: "" });
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState({ text: "", type: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Get own ID from token
        const payload = JSON.parse(atob(token!.split(".")[1]));
        const res     = await fetch(`${API_URL}/api/chat/profile/${payload.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setProfile({ profilePicture: data.profilePicture || "", bio: data.bio || "" });
      } catch {}
    };
    fetchProfile();
  }, []);

  const showMsg = (text: string, type: "success" | "error") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showMsg("Image must be under 2MB", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProfile(p => ({ ...p, profilePicture: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/chat/profile`, {
        method:  "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });
      if (res.ok) showMsg("✅ Profile updated!", "success");
      else        showMsg("Failed to save", "error");
    } catch {
      showMsg("Server error", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 min-h-screen bg-[#04040a] text-slate-200">

      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Profile</h1>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
          Manage your profile
        </p>
      </div>

      {msg.text && (
        <div className={`mb-4 px-4 py-3 rounded-xl border text-xs font-bold ${
          msg.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          {msg.text}
        </div>
      )}

      <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-6 max-w-md">

        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div
            onClick={() => fileRef.current?.click()}
            className="relative w-24 h-24 rounded-2xl overflow-hidden cursor-pointer group"
          >
            {profile.profilePicture ? (
              <img
                src={profile.profilePicture}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-3xl font-black text-emerald-400 uppercase">
                {username.charAt(0)}
              </div>
            )}
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-bold">Change</span>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImage}
          />

          <p className="text-[10px] text-slate-600 mt-2">
            Click avatar to change • Max 2MB
          </p>
        </div>

        {/* Username (read only) */}
        <div className="mb-4">
          <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
            Username
          </label>
          <div className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl px-3 py-2.5 text-slate-500 text-[13px]">
            {username}
          </div>
        </div>

        {/* Bio */}
        <div className="mb-5">
          <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
            Bio
          </label>
          <textarea
            rows={3}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-slate-200 text-[13px] outline-none focus:border-emerald-500/40 transition-colors placeholder:text-slate-600 resize-none"
            placeholder="Write something about yourself..."
            value={profile.bio}
            onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
            maxLength={150}
          />
          <p className="text-[9px] text-slate-600 text-right mt-0.5">
            {profile.bio.length}/150
          </p>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            saving
              ? "bg-slate-800 text-slate-600 cursor-not-allowed"
              : "bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer"
          }`}
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}