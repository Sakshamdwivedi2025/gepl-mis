import Pagination from "../layout/Pagination";
import { useEffect, useState } from "react";
import { getProjects, addProject as addProjectApi, updateProject } from "../services/projectService";
import { getReceivables } from "../services/receivablesService";
import { getPayables }    from "../services/payablesService";
import { getCashTransactions } from "../services/cashBankService";
import { getProduction }  from "../services/productionService";

const PAGE_SIZE = 10;

const IcoPlus    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;
const IcoEdit    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcoView    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>;
const IcoBack    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;
const IcoClose   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>;
const IcoRefresh = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;

const STATUS_COLORS = {
  PLANNED:     { bg: "var(--primary-soft)", color: "var(--primary)",   border: "rgba(59,130,246,0.2)"  },
  IN_PROGRESS: { bg: "var(--teal-soft)",    color: "var(--teal)",      border: "rgba(20,184,166,0.2)"  },
  ON_HOLD:     { bg: "var(--warning-soft)", color: "var(--warning)",   border: "rgba(245,158,11,0.2)"  },
  COMPLETED:   { bg: "var(--success-soft)", color: "var(--success)",   border: "rgba(34,197,94,0.2)"   },
  CLOSED:      { bg: "var(--bg-hover)",     color: "var(--text-muted)","border": "var(--border)"       },
};

const fmt      = n => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
const fmtShort = n => {
  const v = Number(n || 0);
  if (v >= 1_00_00_000) return `₹${(v/1_00_00_000).toFixed(1)}Cr`;
  if (v >= 1_00_000)    return `₹${(v/1_00_000).toFixed(1)}L`;
  if (v >= 1_000)       return `₹${(v/1_000).toFixed(1)}K`;
  return `₹${v}`;
};

const emptyForm = { projectName: "", projectCode: "", clientName: "", plannedStartDate: "", plannedEndDate: "", plannedBudget: "", status: "PLANNED" };

/* ═══════════════════════════════════════════════════════════
   PROJECT DETAIL DASHBOARD (inline, no API call needed)
   Fetches live data from all linked modules by projectId
═══════════════════════════════════════════════════════════ */
function ProjectDetail({ project, onClose }) {
  const pid = project.id;
  const [loading, setLoading] = useState(true);

  // cross-module data filtered by project ID
  const [receivables, setReceivables]   = useState([]);
  const [payables, setPayables]         = useState([]);
  const [cashTxns, setCashTxns]         = useState([]);
  const [prodOrders, setProdOrders]     = useState([]);
  const [activeSection, setActiveSection] = useState(null); // for card → table scroll

  // inventory consumed from production logs (localStorage)
  const consumeLog = (() => {
    try { return JSON.parse(localStorage.getItem("prod_consume_log") || "{}"); } catch { return {}; }
  })();

  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // expose manual refresh
  async function fetchAll(showLoader = false) {
    if (showLoader) setLoading(true);
    try {
      const [rec, pay, cash, prod] = await Promise.allSettled([
        getReceivables(0, 200),
        getPayables(0, 200),
        getCashTransactions(0, 200),
        getProduction(0, 200),
      ]);

      const recList  = (rec.value?.content  || []).filter(r => String(r.projectId) === String(pid));
      const payList  = (pay.value?.content  || []).filter(p => String(p.projectId) === String(pid));
      const cashList = (cash.value?.content || []).filter(c => String(c.projectId) === String(pid));
      const prodList = (prod.value?.content || []).filter(p => String(p.projectId) === String(pid));

      setReceivables(recList);
      setPayables(payList);
      setCashTxns(cashList);
      setProdOrders(prodList);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  // initial load
  useEffect(() => { fetchAll(true); }, [pid]);

  // auto-refresh every 30s while dashboard is open
  useEffect(() => {
    const timer = setInterval(() => fetchAll(false), 30000);
    return () => clearInterval(timer);
  }, [pid]);

  // refresh when tab regains focus (user added data in another tab/module)
  useEffect(() => {
    const onFocus = () => fetchAll(false);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [pid]);

  // ── derived KPIs ──
  const totalReceivable = receivables.reduce((s, r) => s + Number(r.invoiceAmount || 0), 0);
  const recReceived     = receivables.reduce((s, r) => s + Number(r.receivedAmount || 0), 0);
  const recOutstanding  = totalReceivable - recReceived;
  const recPaid         = receivables.filter(r => r.status === "PAID").length;

  const totalPayable    = payables.reduce((s, p) => s + Number(p.invoiceAmount || 0), 0);
  const payPaid         = payables.reduce((s, p) => s + Number(p.paidAmount || 0), 0);
  const payOutstanding  = totalPayable - payPaid;

  const cashIn  = cashTxns.filter(c => c.type === "IN" ).reduce((s, c) => s + Number(c.amount || 0), 0);
  const cashOut = cashTxns.filter(c => c.type === "OUT").reduce((s, c) => s + Number(c.amount || 0), 0);
  const netFlow = cashIn - cashOut;

  const totalProduced   = prodOrders.reduce((s, p) => s + Number(p.producedQuantity || 0), 0);
  const totalPlanned    = prodOrders.reduce((s, p) => s + Number(p.plannedQuantity  || 0), 0);
  const prodPct         = totalPlanned > 0 ? Math.round((totalProduced / totalPlanned) * 100) : 0;
  const completedOrders = prodOrders.filter(p => (p.status || "").toUpperCase() === "COMPLETED").length;

  // inventory consumed for this project's production orders
  const invConsumed = prodOrders.reduce((total, p) => {
    const entries = consumeLog[p.id] || [];
    return total + entries.reduce((s, e) => s + Number(e.qty || 0), 0);
  }, 0);

  const invItemsConsumed = prodOrders.reduce((items, p) => {
    const entries = consumeLog[p.id] || [];
    entries.forEach(e => { items[e.itemCode] = (items[e.itemCode] || 0) + Number(e.qty || 0); });
    return items;
  }, {});

  const budget    = Number(project.plannedBudget || 0);
  // actual spend = cash that actually left the project (same as backend uses)
  const budgetUsed = cashOut;
  const budgetPct  = budget > 0 ? Math.min(100, Math.round((budgetUsed / budget) * 100)) : 0;
  const budgetColor = budgetPct >= 90 ? "var(--danger)" : budgetPct >= 70 ? "var(--warning)" : "var(--success)";

  const sc = STATUS_COLORS[project.status] || STATUS_COLORS.PLANNED;

  // scroll to linked table and highlight it
  function scrollTo(section) {
    setActiveSection(section);
    setTimeout(() => {
      const el = document.getElementById(`proj-section-${section}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => setActiveSection(null), 1800);
    }, 50);
  }

  // duration
  const duration = () => {
    if (!project.plannedStartDate || !project.plannedEndDate) return "—";
    const d = Math.round((new Date(project.plannedEndDate) - new Date(project.plannedStartDate)) / 86400000);
    return `${d} days`;
  };

  // days remaining
  const daysLeft = () => {
    if (!project.plannedEndDate) return null;
    const d = Math.round((new Date(project.plannedEndDate) - new Date()) / 86400000);
    return d;
  };
  const dl = daysLeft();

  if (loading) return (
    <div className="proj-detail-root">
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "60px 0", justifyContent: "center", color: "var(--text-muted)", fontSize: 14 }}>
        <span className="as-spin" style={{ borderTopColor: "var(--primary)", width: 18, height: 18, borderWidth: 2.5 }} />
        Loading project data…
      </div>
    </div>
  );

  return (
    <div className="proj-detail-root">

      {/* ── Header ── */}
      <div className="proj-detail-header">
        <div className="proj-detail-header-left">
          <button className="proj-back-btn" onClick={onClose}>
            <IcoBack /> All Projects
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h2 className="proj-detail-title">{project.projectName}</h2>
            <span className="mod-badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, fontSize: 12 }}>
              {(project.status || "PLANNED").replace("_"," ")}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="dpfs-chip dpfs-chip--id">ID #{project.id}</span>
            <span className="dpfs-chip dpfs-chip--code">{project.projectCode}</span>
            {project.clientName && <span className="dpfs-chip" style={{ background: "var(--bg-hover)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>👤 {project.clientName}</span>}
            <span className="dpfs-chip" style={{ background: "var(--bg-hover)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>📅 {project.plannedStartDate} → {project.plannedEndDate} ({duration()})</span>
            {dl !== null && (
              <span className="dpfs-chip" style={{ background: dl < 0 ? "var(--danger-soft)" : dl < 14 ? "var(--warning-soft)" : "var(--success-soft)", color: dl < 0 ? "var(--danger)" : dl < 14 ? "var(--warning)" : "var(--success)", border: `1px solid ${dl < 0 ? "rgba(239,68,68,0.2)" : dl < 14 ? "rgba(245,158,11,0.2)" : "rgba(34,197,94,0.2)"}` }}>
                {dl < 0 ? `⚠ ${Math.abs(dl)}d overdue` : dl === 0 ? "Due today" : `${dl}d remaining`}
              </span>
            )}
          </div>
        </div>
        <button className="dpfs-close-btn" onClick={onClose}><IcoClose /> Close</button>
      </div>

      {/* ── KPI grid — all cards clickable, scroll to linked table ── */}
      <div className="proj-kpi-grid">

        {/* Budget — no linked table, just informational */}
        <div className="proj-kpi proj-kpi--blue" style={{ cursor: "default" }}>
          <span className="proj-kpi-label">Planned Budget</span>
          <span className="proj-kpi-val">{fmtShort(budget)}</span>
          <span className="proj-kpi-sub">₹ {fmt(budget)}</span>
        </div>
        <div className={`proj-kpi proj-kpi--${budgetPct >= 90 ? "danger" : budgetPct >= 70 ? "warning" : "success"}`} style={{ cursor: "default" }}>
          <span className="proj-kpi-label">Budget Used</span>
          <span className="proj-kpi-val" style={{ color: budgetColor }}>{budgetPct}%</span>
          <span className="proj-kpi-sub">{fmtShort(budgetUsed)} spent</span>
        </div>

        {/* Cash → scrolls to cash table */}
        <div className="proj-kpi proj-kpi--success proj-kpi--link" onClick={() => scrollTo("cash")}>
          <span className="proj-kpi-label">Cash In</span>
          <span className="proj-kpi-val">{fmtShort(cashIn)}</span>
          <span className="proj-kpi-sub">{cashTxns.filter(c=>c.type==="IN").length} transactions</span>
          <span className="proj-kpi-arrow">→</span>
        </div>
        <div className="proj-kpi proj-kpi--danger proj-kpi--link" onClick={() => scrollTo("cash")}>
          <span className="proj-kpi-label">Cash Out</span>
          <span className="proj-kpi-val">{fmtShort(cashOut)}</span>
          <span className="proj-kpi-sub">{cashTxns.filter(c=>c.type==="OUT").length} transactions</span>
          <span className="proj-kpi-arrow">→</span>
        </div>
        <div className={`proj-kpi proj-kpi--${netFlow >= 0 ? "success" : "danger"} proj-kpi--link`} onClick={() => scrollTo("cash")}>
          <span className="proj-kpi-label">Net Cash Flow</span>
          <span className="proj-kpi-val" style={{ color: netFlow >= 0 ? "var(--success)" : "var(--danger)" }}>{fmtShort(Math.abs(netFlow))}</span>
          <span className="proj-kpi-sub">{netFlow >= 0 ? "positive" : "negative"}</span>
          <span className="proj-kpi-arrow">→</span>
        </div>

        {/* Receivables → scrolls to receivables table */}
        <div className="proj-kpi proj-kpi--warning proj-kpi--link" onClick={() => scrollTo("receivables")}>
          <span className="proj-kpi-label">Receivables</span>
          <span className="proj-kpi-val">{fmtShort(totalReceivable)}</span>
          <span className="proj-kpi-sub">{recOutstanding > 0 ? `${fmtShort(recOutstanding)} outstanding` : `${recPaid} fully paid`}</span>
          <span className="proj-kpi-arrow">→</span>
        </div>

        {/* Payables → scrolls to payables table */}
        <div className="proj-kpi proj-kpi--purple proj-kpi--link" onClick={() => scrollTo("payables")}>
          <span className="proj-kpi-label">Payables</span>
          <span className="proj-kpi-val">{fmtShort(totalPayable)}</span>
          <span className="proj-kpi-sub">{payOutstanding > 0 ? `${fmtShort(payOutstanding)} outstanding` : "fully paid"}</span>
          <span className="proj-kpi-arrow">→</span>
        </div>

        {/* Production → scrolls to production table */}
        <div className="proj-kpi proj-kpi--teal proj-kpi--link" onClick={() => scrollTo("production")}>
          <span className="proj-kpi-label">Production Orders</span>
          <span className="proj-kpi-val">{prodOrders.length}</span>
          <span className="proj-kpi-sub">{completedOrders} completed</span>
          <span className="proj-kpi-arrow">→</span>
        </div>
        <div className={`proj-kpi proj-kpi--${prodPct >= 100 ? "success" : prodPct > 0 ? "teal" : "pending"} proj-kpi--link`} onClick={() => scrollTo("production")}>
          <span className="proj-kpi-label">Production Progress</span>
          <span className="proj-kpi-val">{prodPct}%</span>
          <span className="proj-kpi-sub">{totalProduced}/{totalPlanned} units</span>
          <span className="proj-kpi-arrow">→</span>
        </div>

        {/* Inventory Consumed → scrolls to production table (consume logs) */}
        <div className="proj-kpi proj-kpi--indigo proj-kpi--link" onClick={() => scrollTo("production")}>
          <span className="proj-kpi-label">Inventory Consumed</span>
          <span className="proj-kpi-val" style={{ color: "#6366f1" }}>{invConsumed}</span>
          <span className="proj-kpi-sub">{Object.keys(invItemsConsumed).length} item type{Object.keys(invItemsConsumed).length !== 1 ? "s" : ""}</span>
          <span className="proj-kpi-arrow">→</span>
        </div>

      </div>

      {/* ── Budget progress bar ── */}
      <div className="dpfs-budget-card">
        <div className="dpfs-budget-hd">
          <div>
            <span className="dash-section-title">Budget Utilisation</span>
            <p className="dash-section-sub" style={{ marginTop: 2 }}>
              {fmtShort(budgetUsed)} spent of {fmtShort(budget)} planned
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
          <span>₹ {fmt(budget)}</span>
        </div>
      </div>

      {/* ── Four linked tables in 2x2 grid ── */}
      <div className="proj-tables-grid">

        {/* Receivables table */}
        <div id="proj-section-receivables" className="proj-linked-card" style={activeSection === "receivables" ? { boxShadow: "0 0 0 2px var(--warning)", transition: "box-shadow 0.3s" } : {}}>
          <div className="proj-linked-header">
            <span className="proj-linked-title" style={{ color: "var(--warning)" }}>📥 Receivables</span>
            <span className="mod-count-badge">{receivables.length}</span>
          </div>
          <div className="table-scroll">
            <table className="mod-table" style={{ fontSize: 12 }}>
              <thead><tr><th>Invoice</th><th>Client</th><th>Amount</th><th>Status</th><th>Due</th></tr></thead>
              <tbody>
                {receivables.length > 0 ? receivables.map(r => (
                  <tr key={r.id}>
                    <td style={{ color: "var(--primary)", fontWeight: 600 }}>{r.invoiceNo}</td>
                    <td>{r.clientName}</td>
                    <td className="mod-amount">₹{Number(r.invoiceAmount||0).toLocaleString("en-IN")}</td>
                    <td><span className={`mod-badge ${r.status==="PAID"?"mod-badge--paid":r.status?.includes("PARTIAL")?"mod-badge--partial":"mod-badge--open"}`}>{r.status}</span></td>
                    <td style={{ color: r.dueDate && new Date(r.dueDate)<new Date() ? "var(--danger)" : "var(--text-muted)", fontSize:11 }}>{r.dueDate||"—"}</td>
                  </tr>
                )) : <tr className="mod-empty-row"><td colSpan="5">No receivables for this project</td></tr>}
              </tbody>
            </table>
          </div>
          {receivables.length > 0 && (
            <div className="proj-linked-footer">
              <span>Total: <strong>₹ {fmt(totalReceivable)}</strong></span>
              <span style={{ color: recOutstanding > 0 ? "var(--warning)" : "var(--success)" }}>
                Outstanding: ₹ {fmt(recOutstanding)}
              </span>
            </div>
          )}
        </div>

        {/* Payables table */}
        <div id="proj-section-payables" className="proj-linked-card" style={activeSection === "payables" ? { boxShadow: "0 0 0 2px var(--danger)", transition: "box-shadow 0.3s" } : {}}>
          <div className="proj-linked-header">
            <span className="proj-linked-title" style={{ color: "var(--danger)" }}>📤 Payables</span>
            <span className="mod-count-badge">{payables.length}</span>
          </div>
          <div className="table-scroll">
            <table className="mod-table" style={{ fontSize: 12 }}>
              <thead><tr><th>Invoice</th><th>Vendor</th><th>Amount</th><th>Status</th><th>Due</th></tr></thead>
              <tbody>
                {payables.length > 0 ? payables.map(p => (
                  <tr key={p.id}>
                    <td style={{ color: "var(--primary)", fontWeight: 600 }}>{p.invoiceNo}</td>
                    <td>{p.vendorName}</td>
                    <td className="mod-amount">₹{Number(p.invoiceAmount||0).toLocaleString("en-IN")}</td>
                    <td><span className={`mod-badge ${p.status==="PAID"?"mod-badge--paid":p.status?.includes("PARTIAL")?"mod-badge--partial":"mod-badge--open"}`}>{p.status}</span></td>
                    <td style={{ color: p.dueDate && new Date(p.dueDate)<new Date() ? "var(--danger)" : "var(--text-muted)", fontSize:11 }}>{p.dueDate||"—"}</td>
                  </tr>
                )) : <tr className="mod-empty-row"><td colSpan="5">No payables for this project</td></tr>}
              </tbody>
            </table>
          </div>
          {payables.length > 0 && (
            <div className="proj-linked-footer">
              <span>Total: <strong>₹ {fmt(totalPayable)}</strong></span>
              <span style={{ color: payOutstanding > 0 ? "var(--danger)" : "var(--success)" }}>
                Outstanding: ₹ {fmt(payOutstanding)}
              </span>
            </div>
          )}
        </div>

        {/* Cash transactions */}
        <div id="proj-section-cash" className="proj-linked-card" style={activeSection === "cash" ? { boxShadow: "0 0 0 2px var(--primary)", transition: "box-shadow 0.3s" } : {}}>
          <div className="proj-linked-header">
            <span className="proj-linked-title" style={{ color: "var(--primary)" }}>💰 Cash Transactions</span>
            <span className="mod-count-badge">{cashTxns.length}</span>
          </div>
          <div className="table-scroll">
            <table className="mod-table" style={{ fontSize: 12 }}>
              <thead><tr><th>Type</th><th>Amount</th><th>Category</th><th>Date</th><th>Description</th></tr></thead>
              <tbody>
                {cashTxns.length > 0 ? cashTxns.map(c => (
                  <tr key={c.id}>
                    <td><span className={`mod-badge ${c.type==="IN"?"mod-badge--in":"mod-badge--out"}`}>{c.type}</span></td>
                    <td className={`mod-amount ${c.type==="IN"?"mod-amount-in":"mod-amount-out"}`}>
                      {c.type==="IN"?"+":"-"}₹{Number(c.amount||0).toLocaleString("en-IN")}
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>{c.category}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 11 }}>{c.transactionDate||c.txnDate||"—"}</td>
                    <td style={{ color: "var(--text-muted)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11 }}>{c.description||"—"}</td>
                  </tr>
                )) : <tr className="mod-empty-row"><td colSpan="5">No cash transactions for this project</td></tr>}
              </tbody>
            </table>
          </div>
          {cashTxns.length > 0 && (
            <div className="proj-linked-footer">
              <span style={{ color: "var(--success)" }}>In: ₹ {fmt(cashIn)}</span>
              <span style={{ color: "var(--danger)" }}>Out: ₹ {fmt(cashOut)}</span>
              <span style={{ color: netFlow >= 0 ? "var(--success)" : "var(--danger)", fontWeight: 700 }}>Net: ₹ {fmt(Math.abs(netFlow))}</span>
            </div>
          )}
        </div>

        {/* Production orders */}
        <div id="proj-section-production" className="proj-linked-card" style={activeSection === "production" ? { boxShadow: "0 0 0 2px var(--teal)", transition: "box-shadow 0.3s" } : {}}>
          <div className="proj-linked-header">
            <span className="proj-linked-title" style={{ color: "var(--teal)" }}>🏭 Production Orders</span>
            <span className="mod-count-badge">{prodOrders.length}</span>
          </div>
          <div className="table-scroll">
            <table className="mod-table" style={{ fontSize: 12 }}>
              <thead><tr><th>Code</th><th>Product</th><th>Planned</th><th>Produced</th><th>Status</th></tr></thead>
              <tbody>
                {prodOrders.length > 0 ? prodOrders.map(p => {
                  const pct = Number(p.plannedQuantity) > 0 ? Math.round((Number(p.producedQuantity||0)/Number(p.plannedQuantity))*100) : 0;
                  const done = (p.status||"").toUpperCase() === "COMPLETED";
                  return (
                    <tr key={p.id}>
                      <td style={{ color: "var(--teal)", fontFamily: "monospace", fontWeight: 600 }}>{p.productCode}</td>
                      <td>{p.productName}</td>
                      <td>{p.plannedQuantity}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <div style={{ width: 40, height: 5, background: "var(--bg-hover)", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: done ? "var(--success)" : "var(--teal)", borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.producedQuantity||0}</span>
                        </div>
                      </td>
                      <td><span className={`mod-badge ${done?"mod-badge--finished":(p.status||"").toUpperCase().includes("PROGRESS")?"mod-badge--inprogress":"mod-badge--pending"}`}>{p.status||"PENDING"}</span></td>
                    </tr>
                  );
                }) : <tr className="mod-empty-row"><td colSpan="5">No production orders for this project</td></tr>}
              </tbody>
            </table>
          </div>
          {prodOrders.length > 0 && (
            <div className="proj-linked-footer">
              <span>Progress: <strong style={{ color: prodPct >= 100 ? "var(--success)" : "var(--teal)" }}>{prodPct}%</strong></span>
              <span>{completedOrders}/{prodOrders.length} completed</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PROJECTS MODULE
═══════════════════════════════════════════════════════════ */
export default function Projects() {
  const [projects, setProjects]         = useState([]);
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [editId, setEditId]             = useState(null);
  const [form, setForm]                 = useState(emptyForm);
  const [selectedProject, setSelectedProject] = useState(null); // for inline dashboard

  useEffect(() => { loadProjects(); }, [page]);

  async function loadProjects(p = page) {
    try {
      const res = await getProjects(p - 1, PAGE_SIZE);
      setProjects(Array.isArray(res?.content) ? res.content : []);
      setTotalPages(res.totalPages || 1);
    } catch { setProjects([]); }
  }

  async function submitProject() {
    if (!form.projectName || !form.projectCode || !form.plannedStartDate || !form.plannedEndDate) return;
    try {
      if (editId) { await updateProject(editId, form); }
      else { await addProjectApi({ ...form, status: "PLANNED" }); }
      setForm(emptyForm); setEditId(null); loadProjects();
    } catch { alert("Save failed"); }
  }

  function startEdit(p, e) {
    e?.stopPropagation();
    setEditId(p.id);
    setForm({ projectName: p.projectName, projectCode: p.projectCode, clientName: p.clientName,
      plannedStartDate: p.plannedStartDate, plannedEndDate: p.plannedEndDate,
      plannedBudget: p.plannedBudget, status: p.status || "PLANNED" });
    setSelectedProject(null);
  }

  const isEditing = !!editId;
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const duration = (start, end) => {
    if (!start || !end) return "—";
    const d = Math.round((new Date(end) - new Date(start)) / 86400000);
    return d > 0 ? `${d}d` : "—";
  };

  // ── show project detail ──
  if (selectedProject) {
    return <ProjectDetail project={selectedProject} onClose={() => setSelectedProject(null)} />;
  }

  return (
    <div className="mod-page">
      <div className="mod-header">
        <div className="mod-header-left">
          <h2 className="mod-title">Projects</h2>
          <p className="mod-subtitle">Click any row to open the full project dashboard</p>
        </div>
        <div className="mod-header-right">
          <span className="mod-count-badge">{projects.length} projects</span>
          {["PLANNED","IN_PROGRESS","ON_HOLD","COMPLETED"].map(s => {
            const c = projects.filter(p => p.status === s).length;
            const sc = STATUS_COLORS[s] || STATUS_COLORS.PLANNED;
            return c > 0 ? (
              <span key={s} className="mod-badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                {c} {s.replace("_"," ").toLowerCase()}
              </span>
            ) : null;
          })}
        </div>
      </div>

      {/* Form */}
      <div className="mod-form-panel">
        <div className="mod-form-header">
          <h3 className="mod-form-title">
            <span className="mod-form-icon" style={{ background: "var(--purple-soft)", color: "var(--purple)" }}>
              {isEditing ? <IcoEdit /> : <IcoPlus />}
            </span>
            {isEditing ? "Edit Project" : "New Project"}
          </h3>
          {isEditing && <button className="mod-btn-cancel" onClick={() => { setForm(emptyForm); setEditId(null); }}>✕ Cancel</button>}
        </div>
        <div className="mod-form-body">
          {[["Project Name","projectName","text","e.g. Solar Panel Installation"],
            ["Project Code","projectCode","text","PROJ-001"],
            ["Client Name","clientName","text","Client name"],
            ["Planned Budget","plannedBudget","number","0.00"]].map(([lbl,key,type,ph]) => (
            <div key={key} className="mod-field">
              <label className="mod-label">{lbl}</label>
              <input className="mod-input" type={type} placeholder={ph} value={form[key]} onChange={e => set(key, e.target.value)} />
            </div>
          ))}
          {[["Planned Start","plannedStartDate"],["Planned End","plannedEndDate"]].map(([lbl,key]) => (
            <div key={key} className="mod-field">
              <label className="mod-label">{lbl}</label>
              <input className="mod-input" type="date" value={form[key]} onChange={e => set(key, e.target.value)} />
            </div>
          ))}
          {isEditing && (
            <div className="mod-field">
              <label className="mod-label">Status</label>
              <select className="mod-select" value={form.status} onChange={e => set("status", e.target.value)}>
                {["PLANNED","IN_PROGRESS","ON_HOLD","COMPLETED","CLOSED"].map(s => (
                  <option key={s} value={s}>{s.replace("_"," ")}</option>
                ))}
              </select>
            </div>
          )}
          <button className={`mod-submit-btn ${isEditing ? "mod-submit-btn--update" : ""}`}
            style={!isEditing ? { background: "linear-gradient(135deg,var(--purple),#7c3aed)", boxShadow: "0 3px 10px var(--purple-soft)" } : {}}
            onClick={submitProject}>
            {isEditing ? <><IcoEdit /> Update</> : <><IcoPlus /> Add Project</>}
          </button>
        </div>
      </div>

      {/* Table — rows are clickable */}
      <div className="mod-table-panel">
        <div className="mod-table-header">
          <span className="mod-table-title">Project Register</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Click any row to view full project dashboard →</span>
        </div>
        <div className="table-scroll">
          <table className="mod-table">
            <thead><tr>
              <th>ID</th><th>Code</th><th>Name</th><th>Client</th>
              <th>Start</th><th>End</th><th>Duration</th>
              <th>Budget</th><th>Status</th>
              <th>Created By</th><th>Created At</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {projects.length > 0 ? projects.map(p => {
                const sc  = STATUS_COLORS[p.status] || STATUS_COLORS.PLANNED;
                const dl  = p.plannedEndDate ? Math.round((new Date(p.plannedEndDate) - new Date()) / 86400000) : null;
                return (
                  <tr key={p.id}
                    className="proj-table-row"
                    onClick={() => setSelectedProject(p)}
                    style={{ cursor: "pointer" }}>
                    <td className="mod-td-id">#{p.id}</td>
                    <td style={{ color: "var(--primary)", fontWeight: 600, fontFamily: "monospace" }}>{p.projectCode}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{p.projectName}</span>
                    </td>
                    <td>{p.clientName || "—"}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{p.plannedStartDate}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {p.plannedEndDate}
                      {dl !== null && dl < 0 && <span style={{ marginLeft: 5, fontSize: 10, color: "var(--danger)", fontWeight: 700 }}>OVERDUE</span>}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{duration(p.plannedStartDate, p.plannedEndDate)}</td>
                    <td className="mod-amount">₹ {Number(p.plannedBudget || 0).toLocaleString("en-IN")}</td>
                    <td>
                      <span className="mod-badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                        {(p.status || "PLANNED").replace("_"," ")}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>{p.createdBy || "—"}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{p.createdAt || "—"}</td>
                    <td onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 5 }}>
                      <button className="mod-btn-edit" onClick={e => startEdit(p, e)}><IcoEdit /></button>
                      <button className="mod-btn-action" onClick={e => { e.stopPropagation(); setSelectedProject(p); }}>
                        <IcoView /> View
                      </button>
                    </td>
                  </tr>
                );
              }) : <tr className="mod-empty-row"><td colSpan="12">No projects found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
