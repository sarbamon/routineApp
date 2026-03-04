import { useState } from "react";
import { API_URL } from "./config/api";

type Props = {
  onLogin: () => void;
};

function Login({ onLogin }: Props) {

  const [username,setUsername] = useState("");
  const [password,setPassword] = useState("");
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");
  const [loading,setLoading] = useState(false);

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

        setMessage("Login successful ✅");

        setTimeout(()=>{
          onLogin();
        },1000);

      } else {

        setError(data.message || "Login failed");

      }

    } catch {

      setError("Server not responding");

    } finally {

      setLoading(false);

    }

  };

  return (

    <div className="min-h-screen flex items-center justify-center bg-slate-100">

      <div className="bg-white p-8 rounded-xl shadow-md w-96">

        <h2 className="text-xl font-semibold mb-4 text-center">
          Akieme Member Login
        </h2>

        {message && (
          <div className="text-green-600 text-sm mb-3">
            {message}
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm mb-3">
            {error}
          </div>
        )}

        <input
          className="w-full border p-2 mb-3 rounded"
          placeholder="Username"
          value={username}
          onChange={(e)=>setUsername(e.target.value)}
        />

        <input
          type="password"
          className="w-full border p-2 mb-4 rounded"
          placeholder="Password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-slate-800 text-white py-2 rounded"
        >
          {loading ? "Logging in..": "Login"}
        </button>

      </div>

    </div>
  );
}

export default Login;