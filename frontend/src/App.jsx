import { useEffect, useState } from "react";
import "./App.css";

const BACKEND = "http://localhost:3001";

export default function App() {
  const [me, setMe] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | authed | error
  const [error, setError] = useState("");

  async function loadMe() {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch(`${BACKEND}/api/me`, { credentials: "include" });
      if (!res.ok) {
        setMe(null);
        setStatus("idle");
        return;
      }
      const data = await res.json();
      setMe(data);
      setStatus("authed");
    } catch (e) {
      setStatus("error");
      setError(e?.message || "Failed to load profile");
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  function login() {
    window.location.href = `${BACKEND}/auth/linkedin`;
  }

  async function logout() {
    await fetch(`${BACKEND}/api/logout`, {
      method: "POST",
      credentials: "include",
    });
    setMe(null);
    setStatus("idle");
  }

  return (
    <div className="page">
      <div className="card">
        <h1>LinkedIn Login Demo</h1>
        <p className="muted">React + Node/Express + OAuth/OIDC</p>

        {status === "loading" && <div className="info">Loading…</div>}
        {status === "error" && <div className="error">Error: {error}</div>}

        {status !== "authed" ? (
          <button onClick={login} className="btn">
            Sign in with LinkedIn
          </button>
        ) : (
          <>
            <div className="profile">
              {me?.picture && (
                <img className="avatar" src={me.picture} alt="Profile" />
              )}
              <div>
                <div className="name">{me?.name || "Signed in"}</div>
                {me?.email && <div className="muted">{me.email}</div>}
              </div>
            </div>

            <button onClick={logout} className="btn secondary">
              Log out
            </button>
          </>
        )}
      </div>
    </div>
  );
}
