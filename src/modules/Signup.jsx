import { useState } from "react";
import { signupApi } from "../api/authApi";

const IcoUser   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IcoLock   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IcoShield = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcoArrow  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>;
const IcoBack   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;
const IcoAlert  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IcoCheck  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;

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

/* role card — clickable selection */
const ROLES = [
  { id:"ACCOUNTS",   emoji:"💰", label:"Accounts",   desc:"Finance & cash" },
  { id:"PRODUCTION", emoji:"🏭", label:"Production",  desc:"Manufacturing" },
  { id:"PROCUREMENT",emoji:"📦", label:"Procurement", desc:"Purchasing" },
  { id:"PROJECT",    emoji:"📐", label:"Project",     desc:"Project mgmt" },
  { id:"FOUNDER",    emoji:"👑", label:"Founder",     desc:"Full access" },
];

export default function Signup({ onBack }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [role, setRole]         = useState("ACCOUNTS");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  async function handleSignup() {
    if (!username || !password) { setError("Username and password are required"); return; }
    if (password.length < 4)    { setError("Password must be at least 4 characters"); return; }
    try {
      setLoading(true); setError(""); setSuccess("");
      await signupApi({ username, password, role });
      setSuccess("Account created! You can now sign in.");
      setUsername(""); setPassword(""); setRole("ACCOUNTS");
    } catch (err) { setError(err.message || "Signup failed. Please try again.");
    } finally { setLoading(false); }
  }

  const IcoEyeOff= () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5.05 0-9.27-3.11-11-8 1.21-3.06 3.56-5.4 6.42-6.61"/><path d="M1 1l22 22"/><path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c5.05 0 9.27 3.11 11 8a10.97 10.97 0 0 1-4.17 5.12"/></svg>;
  const IcoEye   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>;

  return (
    <div className="as-shell">

      {/* LEFT */}
      <div className="as-left">
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
          <p className="as-eyebrow">New User Registration</p>
          <h1 className="as-headline">Join the<br/><span className="as-accent">MIS Platform</span></h1>
          <p className="as-byline">Get role-based access to the modules that matter for your work.</p>
        </div>

        {/* role preview cards */}
        <div className="as-role-preview">
          {ROLES.map(r => (
            <div key={r.id} className={`as-role-chip ${role === r.id ? "as-role-chip--active" : ""}`}
              onClick={() => setRole(r.id)}>
              <span style={{fontSize:15}}>{r.emoji}</span>
              <span>{r.label}</span>
            </div>
          ))}
        </div>

        <div className="as-orb as-orb1" /><div className="as-orb as-orb2" />
      </div>

      {/* RIGHT */}
      <div className="as-right">
        <button className="as-theme-btn" onClick={() => document.body.classList.toggle("light")} title="Toggle theme">🌗</button>

        <div className="as-form-wrap">
          <div className="as-badge"><span className="as-badge-dot" style={{background:"var(--success)"}} />Create Account</div>

          <h2 className="as-form-title">Register new user</h2>
          <p className="as-form-sub">Fill in details to create a GEATPEC account</p>

          <div className="as-sep"><span>user details</span></div>

          <AuthField label="Username" icon={<IcoUser />}>
            <input className="as-input" placeholder="Choose a username" value={username}
              onChange={e => setUsername(e.target.value)} autoComplete="username" />
          </AuthField>

          <AuthField label="Password" icon={<IcoLock />}>
            <input className="as-input" type={showPw ? "text" : "password"} placeholder="Choose a password"
              value={password} onChange={e => setPassword(e.target.value)}
              style={{ paddingRight: 42 }} />
            <button type="button" className="as-eye" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
              {showPw ? <IcoEyeOff /> : <IcoEye />}
            </button>
          </AuthField>

          {/* role selector */}
          <div className="af-row">
            <label className="af-label">Access Role</label>
            <div className="af-wrap">
              <span className="af-icon"><IcoShield /></span>
              <select className="as-input" value={role} onChange={e => setRole(e.target.value)}>
                {ROLES.map(r => <option key={r.id} value={r.id}>{r.emoji} {r.label} — {r.desc}</option>)}
              </select>
            </div>
          </div>

          {/* role description chip */}
          <div className="as-role-info">
            {ROLES.find(r => r.id === role)?.emoji}{" "}
            <strong>{ROLES.find(r => r.id === role)?.label}</strong> — {ROLES.find(r => r.id === role)?.desc}
          </div>

          {error   && <div className="as-error"><IcoAlert />{error}</div>}
          {success && <div className="as-success"><IcoCheck />{success}</div>}

          <button className="as-btn as-btn--success" onClick={handleSignup} disabled={loading}>
            {loading ? <><span className="as-spin" />Creating account…</> : <>Create Account <IcoArrow /></>}
          </button>

          <button className="as-btn-back" onClick={onBack}>
            <IcoBack /> Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
