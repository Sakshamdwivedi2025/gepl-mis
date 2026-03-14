import PaginationBar from "../layout/Pagination";
import { useEffect, useState, useRef } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler
} from "chart.js";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler
);

import {
  getDashboardSummary, getProjectDashboard,
  getUsers, getAuditLogs, resetUserPassword
} from "../services/dashboardService";
import { getInventory } from "../services/inventoryService";

/* ─── utils ─── */
function decodeToken() {
  try {
    const t = localStorage.getItem("token");
    return t ? JSON.parse(atob(t.split(".")[1])) : null;
  } catch { return null; }
}

const fmt = n => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
const fmtShort = n => {
  const v = Number(n || 0);
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)}Cr`;
  if (v >= 1_00_000)    return `₹${(v / 1_00_000).toFixed(1)}L`;
  if (v >= 1_000)       return `₹${(v / 1_000).toFixed(1)}K`;
  return `₹${v}`;
};

/* ─── chart defaults ─── */
const CHART_OPTS = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false,
    backgroundColor: "#1c2333", titleColor: "#e6edf3", bodyColor: "#7d8590",
    borderColor: "#30404f", borderWidth: 1, padding: 10, cornerRadius: 8 } },
  scales: {
    x: { grid: { color: "rgba(48,64,79,0.4)", drawBorder: false },
         ticks: { color: "#7d8590", font: { size: 11 } } },
    y: { grid: { color: "rgba(48,64,79,0.4)", drawBorder: false },
         ticks: { color: "#7d8590", font: { size: 11 },
                  callback: v => fmtShort(v) } }
  }
};

const DONUT_OPTS = {
  responsive: true, maintainAspectRatio: false, cutout: "72%",
  plugins: {
    legend: { position: "bottom", labels: { color: "#7d8590", font: { size: 11 }, padding: 14, boxWidth: 10 } },
    tooltip: { backgroundColor: "#1c2333", titleColor: "#e6edf3", bodyColor: "#7d8590",
                borderColor: "#30404f", borderWidth: 1, padding: 10, cornerRadius: 8 }
  }
};

/* ─── tiny icon components ─── */
const Ico = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ArrowUpRight = () => <Ico size={13} d="M7 17L17 7M17 7H7M17 7v10" />;

/* ─────────────────────────────────────────────── */
/*  KPI CARD                                       */
/* ─────────────────────────────────────────────── */
function KpiCard({ label, value, sub, accent, icon, trend, onClick, delay = "0s" }) {
  return (
    <div
      className={`dash-kpi dash-kpi--${accent}`}
      onClick={onClick}
      style={{ animationDelay: delay, cursor: onClick ? "pointer" : "default" }}
      title={onClick ? `Go to ${label}` : ""}
    >
      <div className="dash-kpi-top">
        <span className="dash-kpi-label">{label}</span>
        <span className={`dash-kpi-icon dash-kpi-icon--${accent}`}>{icon}</span>
      </div>
      <div className="dash-kpi-value">{value}</div>
      {sub && (
        <div className="dash-kpi-bottom">
          {trend && (
            <span className={`dash-kpi-trend ${trend > 0 ? "up" : trend < 0 ? "down" : "flat"}`}>
              {trend > 0 ? "▲" : trend < 0 ? "▼" : "—"} {Math.abs(trend)}%
            </span>
          )}
          <span className="dash-kpi-sub">{sub}</span>
          {onClick && <span className="dash-kpi-nav"><ArrowUpRight /></span>}
        </div>
      )}
      {!sub && onClick && (
        <div className="dash-kpi-bottom">
          <span className="dash-kpi-nav"><ArrowUpRight /></span>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────── */
/*  SECTION HEADING                                */
/* ─────────────────────────────────────────────── */
function SectionHead({ title, sub, action }) {
  return (
    <div className="dash-section-head">
      <div>
        <h3 className="dash-section-title">{title}</h3>
        {sub && <p className="dash-section-sub">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/*  MAIN DASHBOARD                                 */
/* ═══════════════════════════════════════════════ */
export default function Dashboard({ onLogout, setPage }) {
  const [loggedUser, setLoggedUser] = useState(null);
  const [summary, setSummary]       = useState(null);
  const [inventory, setInventory]   = useState([]);
  const [loading, setLoading]       = useState(true);

  /* project lookup */
  const [projectId, setProjectId]     = useState("");
  const [projectData, setProjectData] = useState(null);
  const [showProject, setShowProject] = useState(false);
  const [projLoading, setProjLoading] = useState(false);

  useEffect(() => {
    setLoggedUser(decodeToken());
    Promise.all([loadSummary(), loadInventory()]).finally(() => setLoading(false));
  }, []);

  async function loadSummary() {
    try { setSummary(await getDashboardSummary()); } catch { console.log("summary failed"); }
  }

  async function loadInventory() {
    try {
      const res = await getInventory(0, 50);
      setInventory(res.content || []);
    } catch { console.log("inventory failed"); }
  }

  async function openProject() {
    if (!projectId) return;
    try {
      setProjLoading(true);
      setProjectData(await getProjectDashboard(projectId));
      setShowProject(true);
    } catch { alert("Invalid Project ID"); }
    finally { setProjLoading(false); }
  }

  /* ── loading skeleton ── */
  if (loading) return (
    <div className="dash-loading">
      <div className="dash-spinner" />
      <span>Loading dashboard…</span>
    </div>
  );

  if (!summary) return (
    <div className="dash-loading">
      <span style={{ color: "var(--danger)" }}>Failed to load dashboard data.</span>
    </div>
  );

  /* ── derived chart data ── */
  const cashFlowData = {
    labels: ["Jan","Feb","Mar","Apr","May","Jun"],
    datasets: [
      {
        label: "Cash In",
        data: [0, 0, 0, 0, 0, summary.totalCashIn || 0],
        borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.08)",
        fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: "#3b82f6"
      },
      {
        label: "Cash Out",
        data: [0, 0, 0, 0, 0, summary.totalCashOut || 0],
        borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.06)",
        fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: "#ef4444"
      }
    ]
  };

  const financeDonutData = {
    labels: ["Receivables", "Payables", "Net Cash"],
    datasets: [{
      data: [
        Math.abs(summary.totalReceivableOutstanding || 0),
        Math.abs(summary.totalPayableOutstanding    || 0),
        Math.abs(summary.netCashPosition            || 0),
      ],
      backgroundColor: ["#f59e0b", "#ef4444", "#3b82f6"],
      borderWidth: 0, hoverOffset: 6
    }]
  };

  const projectBarData = {
    labels: ["Total", "Active", "Completed"],
    datasets: [{
      label: "Projects",
      data: [
        summary.totalProjects  || 0,
        summary.activeProjects || 0,
        (summary.totalProjects || 0) - (summary.activeProjects || 0)
      ],
      backgroundColor: ["rgba(168,85,247,0.75)", "rgba(20,184,166,0.75)", "rgba(34,197,94,0.75)"],
      borderRadius: 6, borderSkipped: false
    }]
  };

  const invBarData = {
    labels: inventory.slice(0, 8).map(i => i.itemCode || i.itemCategory || "–"),
    datasets: [{
      label: "Qty",
      data: inventory.slice(0, 8).map(i => i.quantity || 0),
      backgroundColor: "rgba(59,130,246,0.7)",
      borderRadius: 5, borderSkipped: false
    }]
  };

  /* ── health badge ── */
  const health = (summary.cashHealth || "").toUpperCase();
  const healthColor = health === "HEALTHY" ? "var(--success)"
    : health === "MODERATE" ? "var(--warning)" : "var(--danger)";

  /* ── project fullscreen ── */
  if (showProject && projectData) {
    const budgetPct   = Math.min(Number(projectData.budgetUtilizationPercent || 0), 100);
    const budgetColor = budgetPct >= 90 ? "var(--danger)" : budgetPct >= 70 ? "var(--warning)" : "var(--success)";
    const cashNetFlow = (Number(projectData.cashIn) || 0) - (Number(projectData.cashOut) || 0);

    const projCashDonut = {
      labels: ["Cash In","Cash Out","Receivables","Payables"],
      datasets: [{
        data: [
          Math.abs(projectData.cashIn || 0),
          Math.abs(projectData.cashOut || 0),
          Math.abs(projectData.receivableOutstanding || 0),
          Math.abs(projectData.payableOutstanding || 0),
        ],
        backgroundColor: ["#3b82f6","#ef4444","#f59e0b","#a855f7"],
        borderWidth: 0, hoverOffset: 6
      }]
    };

    const budgetBarData = {
      labels: ["Planned Budget","Actual Spend"],
      datasets: [{
        data: [projectData.plannedBudget || 0, projectData.actualSpend || 0],
        backgroundColor: ["rgba(59,130,246,0.75)","rgba(239,68,68,0.75)"],
        borderRadius: 6, borderSkipped: false
      }]
    };

    return (
      <div className="dpfs-root">

        {/* ── Header ── */}
        <div className="dpfs-header">
          <div className="dpfs-header-left">
            <div className="dpfs-breadcrumb">
              <span className="dpfs-breadcrumb-link" onClick={() => setShowProject(false)}>← Dashboard</span>
              <span className="dpfs-breadcrumb-sep">/</span>
              <span style={{ color: "var(--text-muted)" }}>Project Analysis</span>
            </div>
            <h2 className="dpfs-title">
              {projectData.projectCode || `Project #${projectData.projectId}`}
            </h2>
            <div className="dpfs-title-meta">
              <span className="dpfs-chip dpfs-chip--id">ID #{projectData.projectId}</span>
              <span className="dpfs-chip dpfs-chip--code">{projectData.projectCode || "—"}</span>
            </div>
          </div>
          <button className="dpfs-close-btn" onClick={() => setShowProject(false)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            Close
          </button>
        </div>

        {/* ── Status ribbon ── */}
        <div className="dpfs-status-row">
          {[
            ["Cost Status",     projectData.costStatus,     projectData.costStatus     === "OVER_BUDGET" ? "danger"  : "success"],
            ["Cash Flow",       projectData.cashFlowStatus, projectData.cashFlowStatus === "NEGATIVE"    ? "danger"  : "success"],
            ["Receivable Risk", projectData.receivableRisk, projectData.receivableRisk === "HIGH"        ? "danger"  : projectData.receivableRisk === "MEDIUM" ? "warning" : "success"],
          ].map(([label, value, accent]) => (
            <div key={label} className="dpfs-status-card">
              <span className="dpfs-status-lbl">{label}</span>
              <span className={`dash-status-badge dash-status-badge--${accent}`} style={{ fontSize: 12.5, padding: "4px 12px", marginTop: 4 }}>
                {value || "—"}
              </span>
            </div>
          ))}
          <div className="dpfs-status-card">
            <span className="dpfs-status-lbl">Budget Used</span>
            <span className="dpfs-budget-pct-badge" style={{ color: budgetColor, background: `${budgetColor}18`, border: `1px solid ${budgetColor}30` }}>
              {budgetPct}%
            </span>
          </div>
        </div>

        {/* ── KPI grid — 10 cards including ID & Code ── */}
        <div className="dpfs-kpi-grid">
          {[
            ["Project ID",      `#${projectData.projectId}`,                   "indigo",  "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"],
            ["Project Code",    projectData.projectCode || "—",                "blue",    "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"],
            ["Planned Budget",  `₹ ${fmt(projectData.plannedBudget)}`,         "blue",    "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"],
            ["Actual Spend",    `₹ ${fmt(projectData.actualSpend)}`,           "danger",  "M19 12H5M12 19l-7-7 7-7"],
            ["Cash In",         `₹ ${fmt(projectData.cashIn)}`,                "success", "M5 12h14M12 5l7 7-7 7"],
            ["Cash Out",        `₹ ${fmt(projectData.cashOut)}`,               "rose",    "M19 12H5M12 19l-7-7 7-7"],
            ["Receivables",     `₹ ${fmt(projectData.receivableOutstanding)}`, "warning", "M5 12h14M12 5l7 7-7 7"],
            ["Payables",        `₹ ${fmt(projectData.payableOutstanding)}`,    "purple",  "M19 12H5M12 19l-7-7 7-7"],
            ["Inv Consumed",    `${projectData.inventoryConsumed || 0} units`, "teal",    "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"],
            ["Net Cash Flow",   `₹ ${fmt(cashNetFlow)}`,                       cashNetFlow >= 0 ? "success" : "danger", "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"],
          ].map(([label, value, accent, iconPath], i) => (
            <div key={label} className={`dpfs-kpi-card dash-kpi--${accent}`} style={{ animationDelay: `${i * 0.04}s` }}>
              <div className="dpfs-kpi-top">
                <span className="dash-kpi-label">{label}</span>
                <span className={`dash-kpi-icon dash-kpi-icon--${accent}`}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={iconPath}/>
                  </svg>
                </span>
              </div>
              <span className="dpfs-kpi-val">{value}</span>
            </div>
          ))}
        </div>

        {/* ── Budget progress ── */}
        <div className="dpfs-budget-card">
          <div className="dpfs-budget-hd">
            <div>
              <span className="dash-section-title">Budget Utilisation</span>
              <p className="dash-section-sub" style={{ marginTop: 2 }}>
                Spent ₹ {fmt(projectData.actualSpend)} of ₹ {fmt(projectData.plannedBudget)} planned
              </p>
            </div>
            <span className="dpfs-budget-pct-badge" style={{ color: budgetColor, background: `${budgetColor}18`, border: `1px solid ${budgetColor}30`, fontSize: 18, padding: "4px 14px" }}>
              {budgetPct}%
            </span>
          </div>
          <div className="dpfs-budget-track">
            <div className="dpfs-budget-fill" style={{ width: `${budgetPct}%`, background: budgetColor }} />
          </div>
          <div className="dpfs-budget-markers">
            <span>₹0</span>
            <span style={{ color: budgetColor, fontWeight: 600 }}>▲ {budgetPct}% used</span>
            <span>₹ {fmt(projectData.plannedBudget)}</span>
          </div>
        </div>

        {/* ── Charts ── */}
        <div className="dpfs-charts-row">
          <div className="dash-chart-card dash-chart-card--wide">
            <SectionHead title="Budget vs Actual Spend" sub="Planned budget against actual expenditure" />
            <div className="dash-chart-body" style={{ height: 190 }}>
              <Bar data={budgetBarData} options={{ ...CHART_OPTS, plugins: { ...CHART_OPTS.plugins, legend: { display: false } } }} />
            </div>
            <div className="dash-chart-legend">
              <span className="dcl-item"><span className="dcl-dot" style={{ background: "#3b82f6" }} />Planned Budget</span>
              <span className="dcl-item"><span className="dcl-dot" style={{ background: "#ef4444" }} />Actual Spend</span>
            </div>
          </div>
          <div className="dash-chart-card">
            <SectionHead title="Cash Distribution" sub="All financial flows breakdown" />
            <div className="dash-chart-body" style={{ height: 190 }}>
              <Doughnut data={projCashDonut} options={DONUT_OPTS} />
            </div>
          </div>
        </div>

      </div>
    );
  }

  /* ─────────────────── MAIN RENDER ─────────────────── */
  const isFounder = loggedUser?.role === "FOUNDER";

  return (
    <div className="dash-root">

      {/* ══ PAGE HEADER ══ */}
      <div className="dash-page-header">
        <div>
          <p className="dash-greeting">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},
            <strong> {loggedUser?.username || loggedUser?.sub || "User"}</strong> 👋
          </p>
          <h1 className="dash-page-title">Executive Dashboard</h1>
        </div>
        <div className="dash-header-right">
          <div className="dash-date-chip">
            {new Date().toLocaleDateString("en-IN", { weekday:"short", day:"2-digit", month:"short", year:"numeric" })}
          </div>
          <div className={`dash-health-chip`} style={{ background: `${healthColor}18`, color: healthColor, border: `1px solid ${healthColor}30` }}>
            <span className="dash-health-dot" style={{ background: healthColor }} />
            {health || "—"}
          </div>
        </div>
      </div>

      {/* ══ KPI ROW ══ */}
      <div className="dash-kpi-grid">
        <KpiCard label="Net Cash Position" value={fmtShort(summary.netCashPosition)}
          sub={`Full: ₹${fmt(summary.netCashPosition)}`} accent="blue"
          icon={<Ico size={16} d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>}
          onClick={() => setPage?.("cash")} delay="0s" />

        <KpiCard label="Receivables" value={fmtShort(summary.totalReceivableOutstanding)}
          sub="Outstanding" accent="warning"
          icon={<Ico size={16} d="M5 12h14M12 5l7 7-7 7"/>}
          onClick={() => setPage?.("receivables")} delay="0.05s" />

        <KpiCard label="Payables" value={fmtShort(summary.totalPayableOutstanding)}
          sub="Outstanding" accent="danger"
          icon={<Ico size={16} d="M19 12H5M12 19l-7-7 7-7"/>}
          onClick={() => setPage?.("payables")} delay="0.1s" />

        <KpiCard label="Total Projects" value={summary.totalProjects || 0}
          sub={`${summary.activeProjects || 0} active`} accent="purple"
          icon={<Ico size={16} d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>}
          onClick={() => setPage?.("projects")} delay="0.15s" />

        <KpiCard label="Cash In" value={fmtShort(summary.totalCashIn)}
          sub="Total received" accent="success"
          icon={<Ico size={16} d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>}
          onClick={() => setPage?.("cash")} delay="0.2s" />

        <KpiCard label="Cash Out" value={fmtShort(summary.totalCashOut)}
          sub="Total spent" accent="rose"
          icon={<Ico size={16} d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>}
          onClick={() => setPage?.("cash")} delay="0.25s" />

        <KpiCard label="Active Projects" value={summary.activeProjects || 0}
          sub="In progress" accent="teal"
          icon={<Ico size={16} d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>}
          onClick={() => setPage?.("projects")} delay="0.3s" />

        <KpiCard label="Inventory Items" value={inventory.length}
          sub="In stock" accent="indigo"
          icon={<Ico size={16} d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>}
          onClick={() => setPage?.("inventory")} delay="0.35s" />
      </div>

      {/* ══ CHARTS ROW 1 ══ */}
      <div className="dash-charts-row">

        {/* Cash Flow Line */}
        <div className="dash-chart-card dash-chart-card--wide">
          <SectionHead title="Cash Flow Overview" sub="Inflow vs outflow trend" />
          <div className="dash-chart-body">
            <Line data={cashFlowData} options={CHART_OPTS} />
          </div>
          <div className="dash-chart-legend">
            <span className="dcl-item"><span className="dcl-dot" style={{background:"#3b82f6"}} />Cash In</span>
            <span className="dcl-item"><span className="dcl-dot" style={{background:"#ef4444"}} />Cash Out</span>
          </div>
        </div>

        {/* Finance Donut */}
        <div className="dash-chart-card">
          <SectionHead title="Finance Split" sub="Receivables · Payables · Cash" />
          <div className="dash-chart-body" style={{ height: 200 }}>
            <Doughnut data={financeDonutData} options={DONUT_OPTS} />
          </div>
          <div className="dash-donut-center-stats">
            <div className="dash-donut-stat">
              <span style={{ color: "#f59e0b" }}>Recv</span>
              <strong>{fmtShort(summary.totalReceivableOutstanding)}</strong>
            </div>
            <div className="dash-donut-stat">
              <span style={{ color: "#ef4444" }}>Pay</span>
              <strong>{fmtShort(summary.totalPayableOutstanding)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ══ CHARTS ROW 2 ══ */}
      <div className="dash-charts-row">

        {/* Project Bar */}
        <div className="dash-chart-card">
          <SectionHead title="Project Overview" sub="Total · Active · Completed" />
          <div className="dash-chart-body" style={{ height: 180 }}>
            <Bar data={projectBarData} options={{ ...CHART_OPTS, plugins: { ...CHART_OPTS.plugins, legend: { display: false } } }} />
          </div>
        </div>

        {/* Inventory Bar */}
        <div className="dash-chart-card dash-chart-card--wide">
          <SectionHead
            title="Top Inventory Items"
            sub="Quantity by item code"
            action={
              <button className="secondary" style={{ fontSize: 12, padding: "5px 12px", height: "auto" }}
                onClick={() => setPage?.("inventory")}>
                View all →
              </button>
            }
          />
          <div className="dash-chart-body" style={{ height: 180 }}>
            {inventory.length > 0
              ? <Bar data={invBarData} options={{ ...CHART_OPTS, plugins: { ...CHART_OPTS.plugins, legend: { display: false } } }} />
              : <div className="dash-empty">No inventory data</div>
            }
          </div>
        </div>
      </div>

      {/* ══ PROJECT LOOKUP ══ */}
      <div className="dash-project-lookup">
        <SectionHead title="Project Deep-Dive" sub="Enter a project ID to view its full financial breakdown" />
        <div className="dash-lookup-row">
          <input
            className="dash-lookup-input"
            placeholder="Enter Project ID…"
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            onKeyDown={e => e.key === "Enter" && openProject()}
          />
          <button className="dash-lookup-btn" onClick={openProject} disabled={projLoading || !projectId}>
            {projLoading ? <><span className="as-spin" /> Loading…</> : "Analyse →"}
          </button>
        </div>
      </div>

      {/* ══ BOTTOM TABLES ══ */}
      <div className="dash-tables-row">
        <UsersTable isFounder={isFounder} />
        <AuditLogTable />
      </div>

    </div>
  );
}

/* ─── Users Table ─── */
function UsersTable({ isFounder }) {
  const PAGE_SIZE = 5;
  const [page, setPage]             = useState(1);
  const [data, setData]             = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [showReset, setShowReset]   = useState(false);
  const [selUser, setSelUser]       = useState(null);
  const [newPw, setNewPw]           = useState("");
  const [confPw, setConfPw]         = useState("");
  const [showPw, setShowPw]         = useState(false);

  useEffect(() => { load(); }, [page]);

  async function load() {
    try {
      const res = await getUsers(page - 1, PAGE_SIZE);
      setData(res.content || []); setTotalPages(res.totalPages || 1);
    } catch { console.log("users failed"); }
  }

  async function changePassword() {
    if (!newPw || !confPw) return alert("All fields required");
    if (newPw !== confPw) return alert("Passwords do not match");
    try {
      await resetUserPassword(selUser.id, { newPassword: newPw });
      alert("Password changed successfully");
      setShowReset(false); setNewPw(""); setConfPw(""); setShowPw(false);
    } catch (err) { alert(err.message || "Reset failed"); }
  }

  const roleColor = r => ({
    FOUNDER: "var(--purple)", ACCOUNTS: "var(--primary)", PRODUCTION: "var(--teal)",
    PROCUREMENT: "var(--warning)", PROJECT: "var(--success)"
  }[r] || "var(--text-muted)");

  return (
    <>
      <div className="dash-table-card">
        <SectionHead title="Users" sub={`${data.length} users loaded`} />
        <div className="table-scroll">
          <table className="styled-table">
            <thead><tr>
              <th>ID</th><th>Username</th><th>Role</th>
              <th>Created</th><th>Updated</th><th>Action</th>
            </tr></thead>
            <tbody>
              {data.map(u => (
                <tr key={u.id}>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>#{u.id}</td>
                  <td><strong>{u.username}</strong></td>
                  <td>
                    <span className="dash-role-badge" style={{ color: roleColor(u.role), background: `${roleColor(u.role)}18`, border: `1px solid ${roleColor(u.role)}30` }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{u.createdAt}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{u.updatedAt}</td>
                  <td>
                    <button className="btn-edit" disabled={!isFounder}
                      onClick={() => { setSelUser(u); setShowReset(true); }}
                      title={!isFounder ? "Founder only" : "Reset password"}>
                      {isFounder ? "Reset" : "—"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {showReset && selUser && (
        <div className="modal">
          <div className="modal-card" style={{ minWidth: 320 }}>
            <h3>Reset Password</h3>
            <p>Resetting password for <b>{selUser.username}</b></p>
            <div className="date-field">
              <label>New Password</label>
              <div className="password-wrapper">
                <input type={showPw ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)} />
                <span className="eye-icon" onClick={() => setShowPw(v => !v)}>
                  {showPw ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
            </div>
            <div className="date-field">
              <label>Confirm Password</label>
              <div className="password-wrapper">
                <input type={showPw ? "text" : "password"} value={confPw} onChange={e => setConfPw(e.target.value)} />
                <span className="eye-icon" onClick={() => setShowPw(v => !v)}>
                  {showPw ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
            </div>
            <button onClick={changePassword}>Change Password</button>
            <button className="secondary" style={{ marginTop: 8 }} onClick={() => setShowReset(false)}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Audit Log Table ─── */
function AuditLogTable() {
  const PAGE_SIZE = 8;
  const [page, setPage]             = useState(1);
  const [data, setData]             = useState([]);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { load(); }, [page]);

  async function load() {
    try {
      const res = await getAuditLogs(page - 1, PAGE_SIZE);
      setData(res.content || []); setTotalPages(res.totalPages || 1);
    } catch { console.log("audit failed"); }
  }

  const actionColor = a => ({
    CREATE: "var(--success)", UPDATE: "var(--primary)", DELETE: "var(--danger)"
  }[a?.toUpperCase()] || "var(--text-muted)");

  return (
    <div className="dash-table-card">
      <SectionHead title="Audit Log" sub="Recent system activity" />
      <div className="table-scroll">
        <table className="styled-table">
          <thead><tr>
            <th>ID</th><th>User</th><th>Module</th><th>Action</th><th>Note</th><th>Time</th>
          </tr></thead>
          <tbody>
            {data.map(l => (
              <tr key={l.id}>
                <td style={{ color: "var(--text-muted)", fontSize: 12 }}>#{l.id}</td>
                <td><strong>{l.username}</strong></td>
                <td style={{ color: "var(--primary)", fontSize: 12, fontWeight: 600 }}>{l.module}</td>
                <td>
                  <span className="dash-role-badge" style={{ color: actionColor(l.action), background: `${actionColor(l.action)}18`, border: `1px solid ${actionColor(l.action)}28` }}>
                    {l.action}
                  </span>
                </td>
                <td style={{ color: "var(--text-muted)", fontSize: 12, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.note}</td>
                <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{l.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
