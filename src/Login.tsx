import { useState } from "react";
import { API_URL } from "./config/api";

type Props = {
  onLogin: (username: string) => void;
};

export default function Login({ onLogin }: Props) {

  const [username,setUsername] = useState("");
  const [password,setPassword] = useState("");
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");
  const [loading,setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {

    setError("");
    setMessage("");
    setLoading(true);

    try {

      const res = await fetch(`${API_URL}/api/auth/login`,{
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({username,password})
      });

      const data = await res.json();

      if(res.ok){

        localStorage.setItem("token",data.token);
        localStorage.setItem("username", username);
        setMessage("Login successful ✅");
          setTimeout(()=>{onLogin(username);},1000);
        } else { 
          setError(data.message || "Login failed");
        }

    } catch {

      setError("Server not responding");

    } finally {

      setLoading(false);

    }

  };

  const canSubmit = username.trim() && password.trim() && !loading

  return (
    <div className="min-h-screen bg-[#04040a] flex items-center justify-center px-4 relative overflow-hidden">

      {/* ── Background glow orbs ── */}
      <div className="absolute top-[-150px] left-[-150px] w-[500px] h-[500px] bg-emerald-500/[0.07] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-150px] right-[-150px] w-[500px] h-[500px] bg-violet-500/[0.07] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-emerald-500/[0.03] rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">

        {/* ── Logo block ── */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight">
            Akieme <span className="text-emerald-400">One</span>
          </h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-[4px] mt-2 font-bold">
            Your Personal App
          </p>
        </div>

        {/* ── Card ── */}
        <div className="bg-[#0d0d1a] border border-white/[0.06] rounded-3xl p-7 shadow-[0_0_80px_rgba(0,0,0,0.6)]">

          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[3px] mb-6">
            Member Login
          </p>

          {/* ── Success banner ── */}
          {message && (
            <div className="mb-5 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5">
              <span className="text-base">✅</span>
              <span className="text-emerald-400 text-xs font-bold">{message}</span>
            </div>
          )}

          {/* ── Error banner ── */}
          {error && (
            <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2.5">
              <span className="text-base">⚠️</span>
              <span className="text-red-400 text-xs font-bold">{error}</span>
            </div>
          )}

          {/* ── Username ── */}
          <div className="mb-3.5">
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <input
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-slate-200 text-sm outline-none focus:border-emerald-500/50 focus:bg-white/[0.06] transition-all placeholder:text-slate-600"
                placeholder="Enter your username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === "Enter" && canSubmit && handleLogin()}
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          {/* ── Password ── */}
          <div className="mb-6">
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                type={showPass ? "text" : "password"}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-11 py-3 text-slate-200 text-sm outline-none focus:border-emerald-500/50 focus:bg-white/[0.06] transition-all placeholder:text-slate-600"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && canSubmit && handleLogin()}
                autoComplete="current-password"
              />
              {/* Show / hide toggle */}
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors cursor-pointer p-0.5"
              >
                {showPass ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* ── Login button ── */}
          <button
            onClick={handleLogin}
            disabled={!canSubmit}
            className={`w-full py-3.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
              canSubmit
                ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_24px_rgba(16,185,129,0.25)] hover:shadow-[0_0_32px_rgba(16,185,129,0.35)] active:scale-[0.98] cursor-pointer"
                : "bg-slate-800 text-slate-600 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin"
                  width="14" height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Logging in...
              </span>
            ) : (
              "Login →"
            )}
          </button>

        </div>

        {/* ── Footer ── */}
        <p className="text-center text-[10px] text-slate-600 mt-6 font-medium tracking-wider">
          Akieme One · Personal Productivity App
        </p>

      </div>
    </div>
  );
}