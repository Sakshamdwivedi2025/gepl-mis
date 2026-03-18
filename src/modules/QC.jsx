import Pagination from "../layout/Pagination";
import { useEffect, useState } from "react";
import { getQCRecords, addQCRecord, finishQC } from "../services/qcService";
import { getProduction } from "../services/productionService";
import { getFinishedGoods } from "../services/finishedGoodsService";

const PAGE_SIZE = 10;
const IcoPlus   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;
const IcoCheck  = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>;
const IcoFlag   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;
const IcoBox    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;

function deriveStatus(qc) {
  if (qc.status === "FINISHED") return "FINISHED";
  const ins  = Number(qc.inspectedQty || 0);
  const acc  = Number(qc.acceptedQty  || 0);
  const rw   = Number(qc.reworkQty    || 0);
  const sc   = Number(qc.scrapQty     || 0);
  if (ins === 0) return "PENDING";
  if (acc === ins) return "COMPLETED";
  if (acc > 0 || rw > 0 || sc > 0) return "IN_PROGRESS";
  return "PENDING";
}

const STATUS_STYLE = {
  FINISHED:    { cls: "mod-badge--finished",   label: "✓ Finished"   },
  COMPLETED:   { cls: "mod-badge--finished",   label: "✓ Completed"  },
  IN_PROGRESS: { cls: "mod-badge--inprogress", label: "In Progress"  },
  PENDING:     { cls: "mod-badge--pending",    label: "Pending"      },
};

export default function QC() {
  const [data, setData]             = useState([]);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // linked data
  const [productionOrders, setProductionOrders] = useState([]);
  const [finishedGoods, setFinishedGoods]       = useState([]);
  const [fgPage, setFgPage]                     = useState(1);
  const [fgTotalPages, setFgTotalPages]         = useState(1);

  // persist finished IDs
  const [loadingIds, setLoadingIds]   = useState(new Set());
  const [finishedIds, setFinishedIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("qc_finished_ids") || "[]")); } catch { return new Set(); }
  });

  useEffect(() => {
    try { localStorage.setItem("qc_finished_ids", JSON.stringify([...finishedIds])); } catch {}
  }, [finishedIds]);

  const [form, setForm] = useState({ productionOrderId: "", inspectedQty: "", acceptedQty: "", reworkQty: "", scrapQty: "", remarks: "" });
  const [formError, setFormError] = useState("");

  useEffect(() => { loadQC(); }, [page]);
  useEffect(() => { loadFinishedGoods(fgPage); }, [fgPage]);
  useEffect(() => { loadProductionOrders(); }, []);

  async function loadQC() {
    try {
      const res = await getQCRecords(page - 1, PAGE_SIZE);
      setData(res.content || []); setTotalPages(res.totalPages || 1);
      const sf = new Set((res.content || []).filter(r => r.status === "FINISHED").map(r => r.id));
      setFinishedIds(prev => new Set([...prev, ...sf]));
    } catch { setData([]); }
  }

  async function loadProductionOrders() {
    try {
      const res = await getProduction(0, 100);
      setProductionOrders(res.content || []);
    } catch {}
  }

  async function loadFinishedGoods(p) {
    try {
      const res = await getFinishedGoods(p - 1, PAGE_SIZE);
      setFinishedGoods(res.content || []); setFgTotalPages(res.totalPages || 1);
    } catch { setFinishedGoods([]); }
  }

  /* ─────────────────────────────────────────────────────────────
     Rework-aware inspection budget calculation:
       allowedInspection = producedQty + totalReworkQty (all rows)
     So if 2000 produced, 500 reworked → you can inspect 2500 total.
     Each new rework batch adds to the inspection budget automatically.
  ───────────────────────────────────────────────────────────── */
  function getOrderQCStats(productionOrderId) {
    const rows = data.filter(r => Number(r.productionOrderId) === Number(productionOrderId));
    const alreadyInspected = rows.reduce((s, r) => s + Number(r.inspectedQty || 0), 0);
    const totalRework      = rows.reduce((s, r) => s + Number(r.reworkQty    || 0), 0);
    const totalAccepted    = rows.reduce((s, r) => s + Number(r.acceptedQty  || 0), 0);
    const totalScrap       = rows.reduce((s, r) => s + Number(r.scrapQty     || 0), 0);
    // rework units that haven't been re-inspected yet
    // pendingRework = totalRework - (units re-inspected beyond original produced qty)
    const selOrder    = productionOrders.find(p => p.id === Number(productionOrderId));
    const producedQty = Number(selOrder?.producedQuantity || 0);
    const pendingRework = Math.max(0, totalRework - Math.max(0, alreadyInspected - producedQty));
    return { alreadyInspected, totalRework, totalAccepted, totalScrap, producedQty, pendingRework };
  }

  async function submitQC() {
    setFormError("");
    if (!form.productionOrderId) { setFormError("Please select a production order."); return; }

    const ins = Number(form.inspectedQty || 0);
    const acc = Number(form.acceptedQty  || 0);
    const rw  = Number(form.reworkQty    || 0);
    const sc  = Number(form.scrapQty     || 0);

    if (ins <= 0) { setFormError("Inspected Qty must be greater than 0."); return; }
    if (acc + rw + sc > ins) {
      setFormError(`Accepted + Rework + Scrap (${acc+rw+sc}) cannot exceed Inspected (${ins}).`);
      return;
    }

    const { alreadyInspected, totalRework, producedQty, pendingRework } = getOrderQCStats(form.productionOrderId);

    // ── Total inspection budget = produced + all rework (rework re-enters inspection) ──
    const inspectionBudget = producedQty + totalRework;
    const totalAfterThis   = alreadyInspected + ins;

    if (producedQty > 0 && totalAfterThis > inspectionBudget) {
      // Only show error if this is NOT a rework batch (pendingRework === 0)
      // If there's pending rework, allow it up to pendingRework qty
      if (pendingRework === 0) {
        setFormError(
          `Over-inspection: Total inspected would be ${totalAfterThis} but inspection budget is ` +
          `${inspectionBudget} (${producedQty} produced + ${totalRework} rework). ` +
          `You can inspect at most ${Math.max(0, inspectionBudget - alreadyInspected)} more units.`
        );
        return;
      }
      // Has pending rework but trying to inspect more than pending rework
      if (ins > pendingRework) {
        setFormError(
          `You have ${pendingRework} rework unit${pendingRework !== 1 ? "s" : ""} pending re-inspection. ` +
          `You can inspect at most ${pendingRework} units in this batch.`
        );
        return;
      }
    }

    try {
      await addQCRecord({ inspectedQty: ins, acceptedQty: acc, reworkQty: rw, scrapQty: sc, remarks: form.remarks }, Number(form.productionOrderId));
      setForm({ productionOrderId: "", inspectedQty: "", acceptedQty: "", reworkQty: "", scrapQty: "", remarks: "" });
      setFormError("");
      loadQC();
    } catch (err) { setFormError(err.message || "Failed to add QC record."); }
  }

  async function handleFinish(id) {
    if (!window.confirm("Mark this QC record as FINISHED? This will move accepted units to Finished Goods.")) return;
    setLoadingIds(prev => new Set([...prev, id]));
    try {
      await finishQC(id);
      setFinishedIds(prev => new Set([...prev, id]));
      loadQC(); loadFinishedGoods(fgPage);
    } catch (err) { alert(err.message || "Failed to finish QC"); }
    finally { setLoadingIds(prev => { const s = new Set(prev); s.delete(id); return s; }); }
  }

  const set = (k, v) => {
    setFormError("");
    setForm(prev => ({ ...prev, [k]: v }));
  };

  // Auto-fill inspectedQty with pending rework qty when order is selected
  useEffect(() => {
    if (!form.productionOrderId || data.length === 0) return;
    const { pendingRework } = getOrderQCStats(form.productionOrderId);
    if (pendingRework > 0) {
      setForm(prev => ({ ...prev, inspectedQty: String(pendingRework) }));
      setFormError("");
    }
  }, [form.productionOrderId, data]);

  const yieldRate = row => {
    const ins = Number(row.inspectedQty || 0);
    const acc = Number(row.acceptedQty  || 0);
    return ins > 0 ? Math.round((acc / ins) * 100) : 0;
  };

  // get linked production order name for a qc record
  const getOrderName = id => {
    const o = productionOrders.find(p => p.id === Number(id));
    return o ? `${o.productName} (${o.productCode})` : null;
  };

  return (
    <div className="mod-page">
      {/* Header */}
      <div className="mod-header">
        <div className="mod-header-left">
          <h2 className="mod-title">Quality Control</h2>
          <p className="mod-subtitle">Inspection, yield analysis, and finished goods dispatch</p>
        </div>
        <div className="mod-header-right">
          <span className="mod-count-badge">{data.length} records</span>
          {["COMPLETED","IN_PROGRESS","PENDING"].map(s => {
            const count = data.filter(r => {
              const st = finishedIds.has(r.id) ? "FINISHED" : deriveStatus(r);
              return (s === "COMPLETED" && (st === "COMPLETED" || st === "FINISHED")) || st === s;
            }).length;
            const st = s === "COMPLETED" ? STATUS_STYLE.COMPLETED : STATUS_STYLE[s];
            return count > 0 ? (
              <span key={s} className={`mod-badge ${st.cls}`} style={{ fontSize: 11 }}>
                {count} {s.replace("_"," ").toLowerCase()}
              </span>
            ) : null;
          })}
        </div>
      </div>

      {/* ── QC Summary strip ── */}
      {data.length > 0 && (() => {
        const totalInspected = data.reduce((s, r) => s + Number(r.inspectedQty || 0), 0);
        const totalAccepted  = data.reduce((s, r) => s + Number(r.acceptedQty  || 0), 0);
        const totalRework    = data.reduce((s, r) => s + Number(r.reworkQty    || 0), 0);
        const totalScrap     = data.reduce((s, r) => s + Number(r.scrapQty     || 0), 0);
        const overallYield   = totalInspected > 0 ? Math.round((totalAccepted / totalInspected) * 100) : 0;
        const yColor = overallYield >= 90 ? "var(--success)" : overallYield >= 70 ? "var(--warning)" : "var(--danger)";
        return (
          <div className="qc-summary-strip">
            <div className="qc-summary-item">
              <span className="qc-summary-label">Total Inspected</span>
              <span className="qc-summary-val">{totalInspected}</span>
            </div>
            <div className="qc-summary-item">
              <span className="qc-summary-label">Accepted</span>
              <span className="qc-summary-val" style={{ color: "var(--success)" }}>{totalAccepted}</span>
            </div>
            <div className="qc-summary-item">
              <span className="qc-summary-label">Rework</span>
              <span className="qc-summary-val" style={{ color: "var(--warning)" }}>{totalRework}</span>
            </div>
            <div className="qc-summary-item">
              <span className="qc-summary-label">Scrap</span>
              <span className="qc-summary-val" style={{ color: "var(--danger)" }}>{totalScrap}</span>
            </div>
            <div className="qc-summary-item qc-summary-item--yield">
              <span className="qc-summary-label">Overall Yield</span>
              <span className="qc-summary-val" style={{ color: yColor, fontSize: 22 }}>{overallYield}%</span>
            </div>
          </div>
        );
      })()}

      {/* Add QC Form */}
      <div className="mod-form-panel">
        <div className="mod-form-header">
          <h3 className="mod-form-title">
            <span className="mod-form-icon" style={{ background: "rgba(168,85,247,0.1)", color: "var(--purple)" }}><IcoPlus /></span>
            Add QC Record
          </h3>
        </div>
        <div className="mod-form-body">
          {/* production order dropdown */}
          <div className="mod-field" style={{ gridColumn: "1 / -1" }}>
            <label className="mod-label">Production Order</label>
            <select className="mod-select" value={form.productionOrderId}
              onChange={e => set("productionOrderId", e.target.value)}>
              <option value="">— select production order —</option>
              {productionOrders.map(o => (
                <option key={o.id} value={o.id}>
                  [{o.id}] {o.productName} — {o.productCode} (Produced: {o.producedQuantity || 0} / Planned: {o.plannedQuantity})
                </option>
              ))}
            </select>
          </div>

          {/* live order context — rework-aware inspection tracker */}
          {form.productionOrderId && (() => {
            const { alreadyInspected, totalRework, producedQty, pendingRework } = getOrderQCStats(form.productionOrderId);
            const inspectionBudget = producedQty + totalRework;
            const remaining   = Math.max(0, inspectionBudget - alreadyInspected);
            const currentIns  = Number(form.inspectedQty || 0);
            const totalAfter  = alreadyInspected + currentIns;
            const wouldExceed = producedQty > 0 && totalAfter > inspectionBudget && pendingRework === 0;
            const isReworkBatch = pendingRework > 0;

            return (
              <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 }}>

                {/* flat info bar */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 0,
                  padding: "10px 16px",
                  background: wouldExceed ? "var(--danger-soft)" : isReworkBatch ? "var(--warning-soft)" : "var(--bg-hover)",
                  border: `1px solid ${wouldExceed ? "rgba(239,68,68,0.3)" : isReworkBatch ? "rgba(245,158,11,0.3)" : "var(--border-light)"}`,
                  borderRadius: "var(--radius-xs)",
                  transition: "background 0.15s, border-color 0.15s",
                }}>
                  {[
                    ["Produced",          producedQty,       "var(--teal)"],
                    ["Rework Units",       totalRework,       totalRework > 0 ? "var(--warning)" : "var(--text-dim)"],
                    ["Pending Rework",     pendingRework,     pendingRework > 0 ? "var(--warning)" : "var(--text-dim)"],
                    ["Already Inspected",  alreadyInspected,  alreadyInspected > 0 ? "var(--primary)" : "var(--text-dim)"],
                    [isReworkBatch ? "Rework to Inspect" : "Remaining", remaining, remaining === 0 ? "var(--danger)" : "var(--success)"],
                  ].map(([label, val, color], i, arr) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "0 14px" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{label}</span>
                        <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{val}</span>
                      </div>
                      {i < arr.length - 1 && <div style={{ width: 1, height: 32, background: "var(--border-light)", flexShrink: 0 }} />}
                    </div>
                  ))}
                  {wouldExceed && (
                    <>
                      <div style={{ width: 1, height: 32, background: "rgba(239,68,68,0.3)", flexShrink: 0 }} />
                      <div style={{ padding: "0 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--danger)", whiteSpace: "nowrap" }}>⚠ Exceeds by</span>
                        <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 800, color: "var(--danger)" }}>+{(alreadyInspected + currentIns) - producedQty}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* rework banner */}
                {isReworkBatch && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px",
                    background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.28)",
                    borderRadius: "var(--radius-xs)", fontSize: 12.5, color: "var(--warning)", fontWeight: 500 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                    Rework batch detected — <strong style={{margin:"0 3px"}}>{pendingRework} unit{pendingRework !== 1 ? "s" : ""}</strong> pending re-inspection. Inspected Qty auto-filled.
                  </div>
                )}
              </div>
            );
          })()}

          {[["Inspected Qty","inspectedQty"],["Accepted Qty","acceptedQty"],
            ["Rework Qty","reworkQty"],["Scrap Qty","scrapQty"]].map(([lbl,key]) => (
            <div key={key} className="mod-field">
              <label className="mod-label">{lbl}</label>
              <input className="mod-input" type="number" placeholder="0" value={form[key]} onChange={e => set(key, e.target.value)} />
            </div>
          ))}
          <div className="mod-field">
            <label className="mod-label">Remarks</label>
            <input className="mod-input" placeholder="Inspection notes…" value={form.remarks} onChange={e => set("remarks", e.target.value)} />
          </div>

          {/* live yield preview */}
          {form.inspectedQty && form.acceptedQty && (
            <div className="qc-yield-preview">
              {(() => {
                const ins = Number(form.inspectedQty); const acc = Number(form.acceptedQty);
                const yr  = ins > 0 ? Math.round((acc / ins) * 100) : 0;
                const col = yr >= 90 ? "var(--success)" : yr >= 70 ? "var(--warning)" : "var(--danger)";
                return <span>Preview Yield: <strong style={{ color: col }}>{yr}%</strong></span>;
              })()}
            </div>
          )}

          {/* form error */}
          {formError && (
            <div className="qc-form-error" style={{ gridColumn: "1 / -1" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              {formError}
            </div>
          )}

          <button className="mod-submit-btn"
            style={{ background: "linear-gradient(135deg,var(--purple),#7c3aed)", boxShadow: "0 3px 10px var(--purple-soft)" }}
            onClick={submitQC}>
            <IcoPlus /> Add QC
          </button>
        </div>
      </div>

      {/* QC Records Table */}
      <div className="mod-table-panel">
        <div className="mod-table-header"><span className="mod-table-title">QC Inspection Records</span></div>
        <div className="table-scroll">
          <table className="mod-table">
            <thead><tr>
              <th>ID</th><th>Prod. Order</th><th>Product</th>
              <th>Inspected</th><th>Accepted</th><th>Rework</th><th>Scrap</th>
              <th>Yield %</th><th>Pass / Fail</th><th>Status</th>
              <th>Remarks</th><th>Created At</th><th>Updated At</th><th>Action</th>
            </tr></thead>
            <tbody>
              {data.length > 0 ? data.map(qc => {
                const yr         = yieldRate(qc);
                const yColor     = yr >= 90 ? "var(--success)" : yr >= 70 ? "var(--warning)" : "var(--danger)";
                const isFinished = qc.status === "FINISHED" || finishedIds.has(qc.id);
                const isLoading  = loadingIds.has(qc.id);
                const status     = isFinished ? "FINISHED" : deriveStatus(qc);
                const statusSt   = STATUS_STYLE[status] || STATUS_STYLE.PENDING;
                const orderName  = getOrderName(qc.productionOrderId);
                const ins = Number(qc.inspectedQty || 0);
                const acc = Number(qc.acceptedQty  || 0);
                const pass = acc; const fail = ins - acc;

                return (
                  <tr key={qc.id}>
                    <td className="mod-td-id">#{qc.id}</td>
                    <td style={{ color: "var(--teal)", fontWeight: 600 }}>#{qc.productionOrderId}</td>
                    <td style={{ fontSize: 12, color: orderName ? "var(--text-main)" : "var(--text-dim)" }}>
                      {orderName || "—"}
                    </td>
                    <td><strong>{qc.inspectedQty}</strong></td>
                    <td style={{ color: "var(--success)", fontWeight: 600 }}>{qc.acceptedQty}</td>
                    <td style={{ color: "var(--warning)" }}>{qc.reworkQty}</td>
                    <td style={{ color: "var(--danger)" }}>{qc.scrapQty}</td>
                    <td>
                      <span style={{ color: yColor, fontWeight: 700, fontSize: 13 }}>{yr}%</span>
                    </td>
                    {/* pass/fail bar */}
                    <td style={{ minWidth: 90 }}>
                      <div style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 11 }}>
                        <span style={{ color: "var(--success)", fontWeight: 600 }}>✓{pass}</span>
                        {fail > 0 && <span style={{ color: "var(--danger)", fontWeight: 600 }}>✗{fail}</span>}
                        <div style={{ flex: 1, height: 5, background: "var(--bg-hover)", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${yr}%`, background: yColor, borderRadius: 99 }} />
                        </div>
                      </div>
                    </td>
                    <td><span className={`mod-badge ${statusSt.cls}`}>{statusSt.label}</span></td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{qc.remarks || "—"}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{qc.createdAt || "—"}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{qc.updatedAt || "—"}</td>
                    <td>
                      {isFinished ? (
                        <span className="mod-finished-badge"><IcoCheck /> Finished</span>
                      ) : isLoading ? (
                        <button className="mod-btn-action" disabled
                          style={{ background: "var(--purple-soft)", color: "var(--purple)", borderColor: "rgba(168,85,247,0.25)", opacity: 0.6 }}>
                          <span className="as-spin" style={{ borderTopColor: "var(--purple)", borderColor: "rgba(168,85,247,0.3)", width: 10, height: 10 }} />
                          Finishing…
                        </button>
                      ) : (
                        <button className="mod-btn-action"
                          style={{ background: "var(--purple-soft)", color: "var(--purple)", borderColor: "rgba(168,85,247,0.25)" }}
                          onClick={() => handleFinish(qc.id)}>
                          <IcoFlag /> Finish → FG
                        </button>
                      )}
                    </td>
                  </tr>
                );
              }) : <tr className="mod-empty-row"><td colSpan="14">No QC records</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* ── Finished Goods section ── */}
      <div style={{ marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid var(--border-light)" }}>
          <IcoBox />
          <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700, margin: 0, color: "var(--text-main)" }}>Finished Goods</h3>
          <span className="mod-count-badge">{finishedGoods.length} items</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>— automatically populated when QC is marked finished</span>
        </div>
        <div className="mod-table-panel">
          <div className="table-scroll">
            <table className="mod-table">
              <thead><tr>
                <th>ID</th><th>Project</th><th>Prod. Order</th>
                <th>Product Code</th><th>Product Name</th><th>Qty</th>
                <th>Created At</th><th>Updated At</th>
              </tr></thead>
              <tbody>
                {finishedGoods.length > 0 ? finishedGoods.map(fg => (
                  <tr key={fg.id}>
                    <td className="mod-td-id">#{fg.id}</td>
                    <td style={{ color: "var(--purple)" }}>{fg.projectId}</td>
                    <td style={{ color: "var(--teal)" }}>#{fg.productionOrderId}</td>
                    <td style={{ color: "var(--primary)", fontWeight: 600, fontFamily: "monospace" }}>{fg.productCode}</td>
                    <td><strong>{fg.productName}</strong></td>
                    <td><span className="mod-badge mod-badge--finished">{fg.quantity} units</span></td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{fg.createdAt ? new Date(fg.createdAt).toLocaleString() : "—"}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{fg.updatedAt ? new Date(fg.updatedAt).toLocaleString() : "—"}</td>
                  </tr>
                )) : (
                  <tr className="mod-empty-row"><td colSpan="8">No finished goods yet — finish a QC record to populate this table</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <Pagination page={fgPage} totalPages={fgTotalPages} onPageChange={setFgPage} />
      </div>
    </div>
  );
}
