import Pagination from "../layout/Pagination";
import { useEffect, useState } from "react";
import { getProduction, addProduction as addProductionApi, updateProduction } from "../services/productionService";
import { getInventory, updateInventoryItem } from "../services/inventoryService";

const PAGE_SIZE = 10;
const BASE_URL = "http://192.168.29.68:8080";
function authHeaders() {
  const token = localStorage.getItem("token");
  return { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" };
}

const IcoPlus    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;
const IcoEdit    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcoPlay    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const IcoConsume = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>;
const IcoProduce = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IcoCheck   = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>;
const IcoBox     = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;

function deriveStatus(p) {
  const s = (p.status || "").toUpperCase();
  if (s === "COMPLETED" || s === "FINISHED") return "COMPLETED";
  const planned  = Number(p.plannedQuantity  || 0);
  const produced = Number(p.producedQuantity || 0);
  if (planned > 0 && produced >= planned) return "COMPLETED";
  if (s === "IN_PROGRESS" || s === "STARTED" || produced > 0) return "IN_PROGRESS";
  return "PENDING";
}

const STATUS_STYLE = {
  COMPLETED:   { cls: "mod-badge--finished",   label: "✓ Completed"  },
  IN_PROGRESS: { cls: "mod-badge--inprogress", label: "In Progress"  },
  PENDING:     { cls: "mod-badge--pending",    label: "Pending"      },
};

export default function Production() {
  const [production, setProduction] = useState([]);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editId, setEditId]         = useState(null);

  // inventory lookup for consume dropdown
  const [allInventory, setAllInventory] = useState([]);

  const [showConsume, setShowConsume] = useState(false);
  const [showProduce, setShowProduce] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null); // full order object
  const [consumeForm, setConsumeForm] = useState({ inventoryId: "", quantity: "", remark: "" });
  const [consumeError, setConsumeError] = useState("");
  const [produceQty, setProduceQty] = useState("");
  const [produceError, setProduceError] = useState("");

  // consumption log: { orderId -> [{inventoryId, itemCode, qty, ts}] }
  const [consumeLog, setConsumeLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem("prod_consume_log") || "{}"); } catch { return {}; }
  });

  const [form, setForm] = useState({ projectId: "", productCode: "", productName: "", plannedQuantity: "", remarks: "" });

  // persist completed/started IDs across refresh
  const [completedIds, setCompletedIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("prod_completed_ids") || "[]")); } catch { return new Set(); }
  });
  const [startedIds, setStartedIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("prod_started_ids") || "[]")); } catch { return new Set(); }
  });

  useEffect(() => {
    try { localStorage.setItem("prod_completed_ids", JSON.stringify([...completedIds])); } catch {}
  }, [completedIds]);
  useEffect(() => {
    try { localStorage.setItem("prod_started_ids", JSON.stringify([...startedIds])); } catch {}
  }, [startedIds]);
  useEffect(() => {
    try { localStorage.setItem("prod_consume_log", JSON.stringify(consumeLog)); } catch {}
  }, [consumeLog]);

  useEffect(() => { loadProduction(page); loadAllInventory(); }, [page]);

  async function loadProduction(p = page) {
    try {
      const res = await getProduction(p - 1, PAGE_SIZE);
      const list = res.content || [];
      setProduction(list); setTotalPages(res.totalPages || 1);
      const sc = new Set(list.filter(r => deriveStatus(r) === "COMPLETED").map(r => r.id));
      const ss = new Set(list.filter(r => deriveStatus(r) === "IN_PROGRESS").map(r => r.id));
      setCompletedIds(prev => new Set([...prev, ...sc]));
      setStartedIds(prev => new Set([...prev, ...ss]));
    } catch { console.error("Load failed"); }
  }

  async function loadAllInventory() {
    try {
      const res = await getInventory(0, 200);
      setAllInventory(res.content || []);
    } catch { console.error("Inventory load failed"); }
  }

  async function submitProduction() {
    if (!form.projectId || !form.productCode || !form.productName || !form.plannedQuantity) return;
    try {
      const payload = { ...form, plannedQuantity: Number(form.plannedQuantity) };
      if (editId) { await updateProduction(editId, payload); } else { await addProductionApi(payload); }
      setForm({ projectId: "", productCode: "", productName: "", plannedQuantity: "", remarks: "" });
      setEditId(null); loadProduction();
    } catch { alert("Save failed"); }
  }

  async function startProduction(id) {
    try {
      await fetch(`${BASE_URL}/api/production/${id}/start`, { method: "POST", headers: authHeaders() });
      setStartedIds(prev => new Set([...prev, id]));
      loadProduction();
    } catch { alert("Failed to start production"); }
  }

  /* ── CONSUME: deducts qty from inventory, logs it, calls backend ── */
  async function submitConsume() {
    setConsumeError("");
    const invId = Number(consumeForm.inventoryId);
    const qty   = Number(consumeForm.quantity);
    if (!invId || !qty) { setConsumeError("Inventory item and quantity are required."); return; }

    // find the inventory item to validate stock
    const invItem = allInventory.find(i => i.id === invId);
    if (!invItem) { setConsumeError(`Inventory ID ${invId} not found.`); return; }
    if (invItem.quantity < qty) {
      setConsumeError(`Insufficient stock. Available: ${invItem.quantity} ${invItem.unit || "units"}.`); return;
    }

    try {
      // 1. call backend consume endpoint
      await fetch(`${BASE_URL}/api/production/${selectedOrder.id}/consume`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ inventoryId: invId, quantity: qty, remark: consumeForm.remark })
      });

      // 2. deduct from inventory via PUT
      await updateInventoryItem(invId, {
        itemCategory: invItem.itemCategory,
        itemCode:     invItem.itemCode,
        quantity:     invItem.quantity - qty,
        unit:         invItem.unit,
        location:     invItem.location,
      });

      // 3. log consumption entry for this order
      const entry = { inventoryId: invId, itemCode: invItem.itemCode, itemCategory: invItem.itemCategory, qty, remark: consumeForm.remark, ts: new Date().toISOString() };
      setConsumeLog(prev => ({
        ...prev,
        [selectedOrder.id]: [...(prev[selectedOrder.id] || []), entry]
      }));

      // 4. refresh inventory data
      loadAllInventory();
      setShowConsume(false);
      setConsumeForm({ inventoryId: "", quantity: "", remark: "" });
      setConsumeError("");
    } catch (err) {
      setConsumeError(err.message || "Consume failed. Please try again.");
    }
  }

  async function submitProduce() {
    setProduceError("");
    const qty      = Number(produceQty);
    const planned  = Number(selectedOrder?.plannedQuantity  || 0);
    const produced = Number(selectedOrder?.producedQuantity || 0);
    const remaining = Math.max(0, planned - produced);

    if (!qty || qty <= 0) {
      setProduceError("Produced quantity must be greater than 0.");
      return;
    }
    if (produced + qty > planned) {
      setProduceError(
        `Cannot exceed planned quantity. ` +
        `Already produced: ${produced}, Planned: ${planned}. ` +
        `You can record at most ${remaining} more unit${remaining !== 1 ? "s" : ""}.`
      );
      return;
    }

    try {
      await fetch(`${BASE_URL}/api/production/${selectedOrder?.id}/produce`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ producedQuantity: qty })
      });
      setShowProduce(false);
      setProduceQty("");
      setProduceError("");
      loadProduction();
    } catch { alert("Produce failed"); }
  }

  function startEdit(p) {
    setEditId(p.id);
    setForm({ projectId: p.projectId || "", productCode: p.productCode || "", productName: p.productName || "", plannedQuantity: p.plannedQuantity || "", remarks: p.remarks || "" });
  }

  // selected inventory item for consume panel
  const selectedInvItem = allInventory.find(i => i.id === Number(consumeForm.inventoryId));

  const isEditing = !!editId;
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="mod-page">
      {/* Header */}
      <div className="mod-header">
        <div className="mod-header-left">
          <h2 className="mod-title">Production</h2>
          <p className="mod-subtitle">Production orders, material consumption, and output tracking</p>
        </div>
        <div className="mod-header-right">
          <span className="mod-count-badge">{production.length} orders</span>
          {["COMPLETED","IN_PROGRESS","PENDING"].map(s => {
            const count = production.filter(p => {
              const st = completedIds.has(p.id) ? "COMPLETED" : startedIds.has(p.id) ? "IN_PROGRESS" : deriveStatus(p);
              return st === s;
            }).length;
            return count > 0 ? (
              <span key={s} className={`mod-badge ${STATUS_STYLE[s].cls}`} style={{ fontSize: 11 }}>
                {count} {s.replace("_"," ").toLowerCase()}
              </span>
            ) : null;
          })}
        </div>
      </div>

      {/* Add / Edit Form */}
      <div className="mod-form-panel">
        <div className="mod-form-header">
          <h3 className="mod-form-title">
            <span className="mod-form-icon" style={{ background: "var(--teal-soft)", color: "var(--teal)" }}>
              {isEditing ? <IcoEdit /> : <IcoPlus />}
            </span>
            {isEditing ? "Edit Order" : "New Production Order"}
          </h3>
          {isEditing && <button className="mod-btn-cancel" onClick={() => { setForm({ projectId: "", productCode: "", productName: "", plannedQuantity: "", remarks: "" }); setEditId(null); }}>✕ Cancel</button>}
        </div>
        <div className="mod-form-body">
          {[["Project ID","projectId","text","—"],["Product Code","productCode","text","PROD-001"],
            ["Product Name","productName","text","Product name"],["Planned Qty","plannedQuantity","number","0"],
            ["Remarks","remarks","text","Optional notes…"]].map(([lbl,key,type,ph]) => (
            <div key={key} className="mod-field">
              <label className="mod-label">{lbl}</label>
              <input className="mod-input" type={type} placeholder={ph} value={form[key]} onChange={e => set(key, e.target.value)} />
            </div>
          ))}
          <button className={`mod-submit-btn ${isEditing ? "mod-submit-btn--update" : ""}`} onClick={submitProduction}>
            {isEditing ? <><IcoEdit /> Update</> : <><IcoPlus /> Add</>}
          </button>
        </div>
      </div>

      {/* ── CONSUME PANEL ── */}
      {showConsume && selectedOrder && (
        <div className="mod-receive-panel">
          <div className="mod-receive-header">
            <h3 className="mod-receive-title"><IcoConsume /> Consume Material — Order #{selectedOrder.id}</h3>
            <button className="mod-btn-cancel" onClick={() => { setShowConsume(false); setConsumeError(""); }}>✕ Cancel</button>
          </div>

          {/* order meta */}
          <div className="mod-pay-meta">
            <div className="mod-pay-meta-item"><span className="mod-pay-meta-lbl">Product</span><span className="mod-pay-meta-val">{selectedOrder.productName}</span></div>
            <div className="mod-pay-meta-item"><span className="mod-pay-meta-lbl">Code</span><span className="mod-pay-meta-val" style={{ color: "var(--teal)", fontFamily: "monospace" }}>{selectedOrder.productCode}</span></div>
            <div className="mod-pay-meta-item"><span className="mod-pay-meta-lbl">Planned Qty</span><span className="mod-pay-meta-val">{selectedOrder.plannedQuantity}</span></div>
          </div>

          <div className="mod-form-body" style={{ alignItems: "end" }}>
            {/* inventory dropdown */}
            <div className="mod-field" style={{ gridColumn: "span 2" }}>
              <label className="mod-label">Select Inventory Item</label>
              <select className="mod-select" value={consumeForm.inventoryId}
                onChange={e => setConsumeForm(p => ({ ...p, inventoryId: e.target.value }))}>
                <option value="">— choose item —</option>
                {allInventory.map(i => (
                  <option key={i.id} value={i.id}>
                    [{i.id}] {i.itemCode} — {i.itemCategory} ({i.quantity} {i.unit} available)
                  </option>
                ))}
              </select>
            </div>

            {/* live stock indicator */}
            {selectedInvItem && (
              <div className="prod-stock-chip" style={{ gridColumn: "span 2" }}>
                <IcoBox />
                <span>Stock: <strong>{selectedInvItem.quantity} {selectedInvItem.unit}</strong></span>
                <span style={{ color: "var(--text-dim)" }}>·</span>
                <span style={{ color: "var(--text-muted)" }}>{selectedInvItem.location}</span>
              </div>
            )}

            <div className="mod-field">
              <label className="mod-label">Quantity to Consume</label>
              <input className="mod-input" type="number" placeholder="0"
                value={consumeForm.quantity}
                max={selectedInvItem?.quantity || ""}
                onChange={e => setConsumeForm(p => ({ ...p, quantity: e.target.value }))} />
            </div>

            <div className="mod-field">
              <label className="mod-label">Remark</label>
              <input className="mod-input" placeholder="Optional notes…"
                value={consumeForm.remark}
                onChange={e => setConsumeForm(p => ({ ...p, remark: e.target.value }))} />
            </div>

            <button className="mod-submit-btn"
              style={{ background: "linear-gradient(135deg,var(--warning),#d97706)", boxShadow: "0 3px 10px var(--warning-soft)" }}
              onClick={submitConsume}>
              <IcoConsume /> Consume &amp; Deduct
            </button>
          </div>

          {consumeError && (
            <div style={{ margin: "0 18px 14px", padding: "10px 14px", background: "var(--danger-soft)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-xs)", color: "var(--danger)", fontSize: 13, display: "flex", gap: 8 }}>
              ⚠ {consumeError}
            </div>
          )}

          {/* consumption history for this order */}
          {(consumeLog[selectedOrder.id] || []).length > 0 && (
            <div style={{ padding: "0 18px 16px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--text-muted)", marginBottom: 8 }}>
                Consumption History
              </p>
              <div className="table-scroll">
                <table className="mod-table" style={{ fontSize: 12 }}>
                  <thead><tr><th>Item Code</th><th>Category</th><th>Qty Consumed</th><th>Remark</th><th>Time</th></tr></thead>
                  <tbody>
                    {consumeLog[selectedOrder.id].map((e, i) => (
                      <tr key={i}>
                        <td style={{ color: "var(--teal)", fontFamily: "monospace", fontWeight: 600 }}>{e.itemCode}</td>
                        <td>{e.itemCategory}</td>
                        <td style={{ color: "var(--warning)", fontWeight: 600 }}>-{e.qty}</td>
                        <td style={{ color: "var(--text-muted)" }}>{e.remark || "—"}</td>
                        <td style={{ color: "var(--text-muted)" }}>{new Date(e.ts).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PRODUCE PANEL ── */}
      {showProduce && selectedOrder && (
        <div className="mod-receive-panel" style={{ borderColor: "rgba(34,197,94,0.25)", boxShadow: "0 4px 20px rgba(34,197,94,0.08)" }}>
          <div className="mod-receive-header" style={{ background: "var(--success-soft)" }}>
            <h3 className="mod-receive-title" style={{ color: "var(--success)" }}><IcoProduce /> Record Output — Order #{selectedOrder.id}</h3>
            <button className="mod-btn-cancel" onClick={() => { setShowProduce(false); setProduceError(""); setProduceQty(""); }}>✕ Cancel</button>
          </div>
          <div className="mod-pay-meta">
            <div className="mod-pay-meta-item"><span className="mod-pay-meta-lbl">Product</span><span className="mod-pay-meta-val">{selectedOrder.productName}</span></div>
            <div className="mod-pay-meta-item"><span className="mod-pay-meta-lbl">Planned</span><span className="mod-pay-meta-val">{selectedOrder.plannedQuantity}</span></div>
            <div className="mod-pay-meta-item"><span className="mod-pay-meta-lbl">Produced So Far</span><span className="mod-pay-meta-val" style={{ color: "var(--success)" }}>{selectedOrder.producedQuantity || 0}</span></div>
            <div className="mod-pay-meta-item"><span className="mod-pay-meta-lbl">Remaining</span><span className="mod-pay-meta-val" style={{ color: "var(--warning)" }}>{Math.max(0, (selectedOrder.plannedQuantity || 0) - (selectedOrder.producedQuantity || 0))}</span></div>
          </div>
          <div className="mod-form-body">
            <div className="mod-field">
              <label className="mod-label">
                Produced Quantity
                {selectedOrder && (() => {
                  const rem = Math.max(0, (selectedOrder.plannedQuantity || 0) - (selectedOrder.producedQuantity || 0));
                  const cur = Number(produceQty || 0);
                  const over = cur > rem;
                  return (
                    <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700,
                      color: over ? "var(--danger)" : "var(--text-muted)" }}>
                      {over ? `⚠ exceeds by ${cur - rem}` : `max ${rem}`}
                    </span>
                  );
                })()}
              </label>
              <input className="mod-input" type="number" placeholder="0"
                min="1"
                max={Math.max(0, (selectedOrder?.plannedQuantity || 0) - (selectedOrder?.producedQuantity || 0))}
                value={produceQty}
                style={{ borderColor: Number(produceQty) > Math.max(0, (selectedOrder?.plannedQuantity||0)-(selectedOrder?.producedQuantity||0)) ? "var(--danger)" : undefined }}
                onChange={e => { setProduceError(""); setProduceQty(e.target.value); }} />
            </div>
            {produceError && (
              <div style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"10px 13px",
                background:"var(--danger-soft)", border:"1px solid rgba(239,68,68,0.25)",
                borderRadius:"var(--radius-xs)", color:"var(--danger)", fontSize:13, fontWeight:500,
                lineHeight:1.5, alignSelf:"flex-end" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                {produceError}
              </div>
            )}
            <button className="mod-submit-btn"
              style={{ background: "linear-gradient(135deg,var(--success),#16a34a)", boxShadow: "0 3px 10px var(--success-soft)" }}
              onClick={submitProduce}>
              <IcoProduce /> Record Output
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="mod-table-panel">
        <div className="mod-table-header"><span className="mod-table-title">Production Orders</span></div>
        <div className="table-scroll">
          <table className="mod-table">
            <thead><tr>
              <th>ID</th><th>Project</th><th>Product Code</th><th>Product Name</th>
              <th>Planned Qty</th><th>Produced Qty</th><th>Progress</th><th>Status</th>
              <th>Materials Used</th><th>Remarks</th><th>Created At</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {production.length > 0 ? production.map(p => {
                const isCompleted = completedIds.has(p.id) || deriveStatus(p) === "COMPLETED";
                const isStarted   = !isCompleted && (startedIds.has(p.id) || deriveStatus(p) === "IN_PROGRESS");
                const status      = isCompleted ? "COMPLETED" : isStarted ? "IN_PROGRESS" : "PENDING";
                const statusSt    = STATUS_STYLE[status];
                const planned     = Number(p.plannedQuantity  || 0);
                const produced    = Number(p.producedQuantity || 0);
                const pct         = planned > 0 ? Math.min(100, Math.round((produced / planned) * 100)) : 0;
                const logs        = consumeLog[p.id] || [];

                return (
                  <tr key={p.id}>
                    <td className="mod-td-id">#{p.id}</td>
                    <td style={{ color: "var(--purple)" }}>{p.projectId}</td>
                    <td style={{ color: "var(--teal)", fontWeight: 600, fontFamily: "monospace" }}>{p.productCode}</td>
                    <td><strong>{p.productName}</strong></td>
                    <td>{planned}</td>
                    <td style={{ color: produced >= planned && planned > 0 ? "var(--success)" : "var(--text-main)", fontWeight: 600 }}>{produced}</td>
                    {/* progress bar */}
                    <td style={{ minWidth: 80 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ flex: 1, height: 6, background: "var(--bg-hover)", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "var(--success)" : pct > 50 ? "var(--teal)" : "var(--primary)", borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 28 }}>{pct}%</span>
                      </div>
                    </td>
                    <td><span className={`mod-badge ${statusSt.cls}`}>{statusSt.label}</span></td>
                    {/* materials consumed summary */}
                    <td>
                      {logs.length > 0 ? (
                        <span style={{ fontSize: 11, color: "var(--warning)", fontWeight: 600 }}>
                          {logs.length} item{logs.length > 1 ? "s" : ""} consumed
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>—</span>
                      )}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{p.remarks || "—"}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{p.createdAt ? new Date(p.createdAt).toLocaleString() : "—"}</td>
                    <td>
                      {isCompleted ? (
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <button className="mod-btn-edit" onClick={() => startEdit(p)}><IcoEdit /></button>
                          <span className="mod-finished-badge" style={{ fontSize: 11 }}><IcoCheck /> Done</span>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          <button className="mod-btn-edit" title="Edit" onClick={() => startEdit(p)}><IcoEdit /></button>
                          <button className="mod-btn-edit" title={isStarted ? "Already started" : "Start production"}
                            style={{ color: "var(--success)", borderColor: "rgba(34,197,94,0.3)" }}
                            disabled={isStarted} onClick={() => startProduction(p.id)}><IcoPlay /></button>
                          <button className="mod-btn-action"
                            title={!isStarted ? "Start production first" : "Consume material from inventory"}
                            style={{ color: "var(--warning)", background: "var(--warning-soft)", borderColor: "rgba(245,158,11,0.25)" }}
                            disabled={!isStarted}
                            onClick={() => { setSelectedOrder(p); setConsumeForm({ inventoryId: "", quantity: "", remark: "" }); setConsumeError(""); setShowConsume(true); setShowProduce(false); }}>
                            <IcoConsume />
                          </button>
                          <button className="mod-btn-action"
                            title={!isStarted ? "Start production first" : "Record produced output"}
                            disabled={!isStarted}
                            onClick={() => { setSelectedOrder(p); setProduceQty(""); setShowProduce(true); setShowConsume(false); }}>
                            <IcoProduce />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              }) : <tr className="mod-empty-row"><td colSpan="12">No production orders</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
