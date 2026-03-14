import { useState, useEffect, useRef } from "react";
import { loginApi } from "../api/authApi";

function GridCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf, t = 0;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const sp = 38;
      const cols = Math.ceil(canvas.width / sp) + 1;
      const rows = Math.ceil(canvas.height / sp) + 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const wave = Math.sin(t * 0.55 + r * 0.45 + c * 0.35) * 0.5 + 0.5;
          ctx.beginPath();
          ctx.arc(c * sp, r * sp, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(59,130,246,${0.05 + wave * 0.14})`;
          ctx.fill();
        }
      }
      t += 0.014;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }} />;
}

const IcoUser  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IcoLock  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IcoEyeOff= () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5.05 0-9.27-3.11-11-8 1.21-3.06 3.56-5.4 6.42-6.61"/><path d="M1 1l22 22"/><path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c5.05 0 9.27 3.11 11 8a10.97 10.97 0 0 1-4.17 5.12"/></svg>;
const IcoEye   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>;
const IcoArrow = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>;
const IcoAlert = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;

function AuthField({ label, icon, children }) {
  return (
    <div className="af-row">
      <label className="af-label">{label}</label>
      <div className="af-wrap">
        <span className="af-icon">{icon}</span>
        {children}
      </div>
    </div>
  );
}

export default function Login({ onLogin, onSignup }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);

  async function handleLogin() {
    if (!username || !password) { setError("Please enter username and password"); return; }
    try {
      setLoading(true); setError("");
      const data = await loginApi(username, password);
      localStorage.setItem("token", data.token);
      onLogin({ username: data.username, role: data.role, token: data.token });
    } catch (err) { setError(err.message || "Invalid credentials. Please try again.");
    } finally { setLoading(false); }
  }

  const onKey = e => e.key === "Enter" && handleLogin();

  return (
    <div className="as-shell">
      {/* LEFT */}
      <div className="as-left">
        <GridCanvas />
        <div className="as-orb as-orb1" /><div className="as-orb as-orb2" />

        <div className="as-brand">
          <div className="as-brand-icon">
            <svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 12h4l2-6 4 12 2-6h4" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <div className="as-brand-name">GEATPEC</div>
            <div className="as-brand-sub">Electronics Pvt. Ltd.</div>
          </div>
        </div>

        <div className="as-hero">
          <p className="as-eyebrow">Enterprise MIS Platform</p>
          <h1 className="as-headline">One dashboard.<br/><span className="as-accent">Every decision.</span></h1>
          <p className="as-byline">Real-time visibility across finance, inventory,<br/>production, procurement &amp; projects.</p>
        </div>

        <div className="as-stats">
          {[["9+","Modules"],["5","User Roles"],["Live","Real-time"]].map(([v,l],i) => (
            <div key={l} className="as-stat" style={{animationDelay:`${i*0.12}s`}}>
              <span className="as-stat-val">{v}</span>
              <span className="as-stat-lbl">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT */}
      <div className="as-right">
        <button className="as-theme-btn" onClick={() => document.body.classList.toggle("light")} title="Toggle theme">🌗</button>

        <div className="as-form-wrap">
          <div className="as-badge"><span className="as-badge-dot" />Secure Access Portal</div>

          <h2 className="as-form-title">Welcome back</h2>
          <p className="as-form-sub">Sign in to your GEATPEC account</p>

          <div className="as-sep"><span>credentials</span></div>

          <AuthField label="Username" icon={<IcoUser />}>
            <input className="as-input" placeholder="Enter your username" value={username}
              onChange={e => setUsername(e.target.value)} onKeyDown={onKey} autoComplete="username" />
          </AuthField>

          <AuthField label="Password" icon={<IcoLock />}>
            <input className="as-input" type={showPw ? "text" : "password"} placeholder="Enter your password"
              value={password} onChange={e => setPassword(e.target.value)} onKeyDown={onKey}
              autoComplete="current-password" style={{ paddingRight: 42 }} />
            <button type="button" className="as-eye" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
              {showPw ? <IcoEyeOff /> : <IcoEye />}
            </button>
          </AuthField>

          {error && <div className="as-error"><IcoAlert />{error}</div>}

          <button className="as-btn" onClick={handleLogin} disabled={loading}>
            {loading ? <><span className="as-spin" />Signing in…</> : <>Sign In <IcoArrow /></>}
          </button>

          <p className="as-footer-txt">Don't have an account?{" "}<span className="as-link" onClick={onSignup}>Create one →</span></p>

          <div className="as-secure-note">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Secured with JWT · Enterprise-grade encryption
          </div>
        </div>
      </div>
    </div>
  );
}
