import { useEffect, useState } from "react";

/* AUTH */
import Login from "./modules/Login";
import Signup from "./modules/Signup";

/* LAYOUT */
import Sidebar from "./layout/Sidebar";
import TopBar from "./layout/TopBar";

/* PAGES */
import Dashboard from "./dashboards/Dashboard";
import CashBank from "./modules/CashBank";
import Receivables from "./modules/Receivables";
import Payables from "./modules/Payables";
import Inventory from "./modules/Inventory";
import Production from "./modules/Production";
import QC from "./modules/QC";
import Procurement from "./modules/Procurement";
import Projects from "./modules/Projects";

/* ================= TOKEN DECODER ================= */
function decodeToken() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

/* ================= ROLE CONFIG ================= */
const ROLE_DEFAULT_PAGE = {
  FOUNDER: "dashboard",
  ACCOUNTS: "dashboard",
  PRODUCTION: "production",
  PROCUREMENT: "procurement",
  PROJECT: "dashboard"
};

const ROLE_ALLOWED_PAGES = {
  FOUNDER: [
    "dashboard",
    "cash",
    "receivables",
    "payables",
    "inventory",
    "production",
    "qc",
    "projects",
    "procurement"
  ],
  ACCOUNTS: [
    "dashboard",
    "cash",
    "receivables",
    "payables"
  ],
  PRODUCTION: [
    "production",
    "inventory",
    "qc"
  ],
  PROCUREMENT: [
    "procurement",
    "inventory",
    "qc"
  ],
  PROJECT: [
    "dashboard",
    "production",
    "projects",
    "procurement",
    "qc"
  ]
};

function getDefaultPage(role) {
  return ROLE_DEFAULT_PAGE[role] || "production";
}

export default function App() {
  const [user, setUser] = useState(null);
  const [showSignup, setShowSignup] = useState(false);
  const [page, setPage] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  /* ================= RESTORE LOGIN ================= */
  /* ================= RESTORE USER ON REFRESH ================= */
  useEffect(() => {
    const decoded = decodeToken();
    const sessionActive = localStorage.getItem("sessionActive");

    if (decoded && sessionActive === "true") {
      const userObj = {
        username: decoded.username || decoded.sub,
        role: decoded.role,
        token: localStorage.getItem("token")
      };

      setUser(userObj);
      setPage(getDefaultPage(decoded.role));
    }
  }, []);


  /* ================= PAGE GUARD ================= */
  useEffect(() => {
    if (!user || !page) return;

    const allowed = ROLE_ALLOWED_PAGES[user.role] || [];
    if (!allowed.includes(page)) {
      setPage(getDefaultPage(user.role));
    }
  }, [page, user]);

  /* ================= LOGOUT ================= */
  function logout() {
    localStorage.removeItem("sessionActive");  // ✅ REMOVE SESSION ONLY
    setUser(null);
    setPage(null);
  }

  /* ================= AUTH ================= */
  if (!user) {
    return showSignup ? (
      <Signup onBack={() => setShowSignup(false)} />
    ) : (
      <Login
        onLogin={u => {
          localStorage.setItem("sessionActive", "true");   // ✅ ADD THIS
          setUser(u);
          setPage(getDefaultPage(u.role));
        }}
        onSignup={() => setShowSignup(true)
        }
      />
    );
  }

  /* ================= PAGE SWITCH ================= */
  let content;

  switch (page) {
    case "cash":
      content = <CashBank user={user} />;
      break;
    case "receivables":
      content = <Receivables />;
      break;
    case "payables":
      content = <Payables />;
      break;
    case "inventory":
      content = <Inventory />;
      break;
    case "production":
      content = <Production />;
      break;
    case "qc":
      content = <QC />;
      break;
    case "procurement":
      content = <Procurement />;
      break;
    case "projects":
      content = <Projects />;
      break;
    case "vendor-scorecard":
      content = <VendorScorecard />;
      break;
    case "dashboard":
      content = <Dashboard user={user} onLogout={logout} setPage={setPage} />;
      break;
    default:
      content = null;
  }

  /* ================= LAYOUT ================= */
  return (
    <div className="app-root">
      {/* 🔝 TOP NAVBAR */}
      <TopBar user={user} onLogout={logout} />

      {/* 🔽 BODY */}
      <div className="app-body">
        <Sidebar
          user={user}
          page={page}
          setPage={setPage}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />

        <main className="content page-transition">
          {content}
        </main>
      </div>
    </div>
  );

}
