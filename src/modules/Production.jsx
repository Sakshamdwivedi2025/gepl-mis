import Pagination from "../layout/Pagination";
import { useEffect, useState } from "react";
import { getProduction, addProduction as addProductionApi, updateProduction } from "../services/productionService";

const PAGE_SIZE = 10;
const BASE_URL = import.meta.env.VITE_BASE_URL;
function authHeaders() {
  const token = localStorage.getItem("token");
  return { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" };
}

const IcoPlus    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;
const IcoEdit    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcoPlay    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const IcoConsume = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>;
const IcoProduce = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;

const statusBadge = s => {
  const u = (s || "").toUpperCase();
  if (u === "COMPLETED" || u === "FINISHED") return "mod-badge--finished";
  if (u === "IN_PROGRESS" || u === "STARTED") return "mod-badge--inprogress";
  return "mod-badge--pending";
};

export default function Production() {
  const [production, setProduction] = useState([]);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editId, setEditId]         = useState(null);
  const [showConsume, setShowConsume] = useState(false);
  const [showProduce, setShowProduce] = useState(false);
  const [selectedId, setSelectedId]   = useState(null);
  const [consumeForm, setConsumeForm] = useState({ inventoryId: "", quantity: "", remark: "" });
  const [produceQty, setProduceQty]   = useState("");
  const [form, setForm] = useState({ projectId: "", productCode: "", productName: "", plannedQuantity: "", remarks: "" });

  useEffect(() => { loadProduction(page); }, [page]);

  async function loadProduction(p = page) {
    const res = await getProduction(p - 1, PAGE_SIZE);
    setProduction(res.content || []); setTotalPages(res.totalPages || 1);
  }

  async function submitProduction() {
    if (!form.projectId || !form.productCode || !form.productName || !form.plannedQuantity) return;
    const payload = { ...form, plannedQuantity: Number(form.plannedQuantity) };
    if (editId) { await updateProduction(editId, payload); } else { await addProductionApi(payload); }
    setForm({ projectId: "", productCode: "", productName: "", plannedQuantity: "", remarks: "" }); setEditId(null); loadProduction();
  }

  async function startProduction(id) {
    await fetch(`${BASE_URL}/api/production/${id}/start`, { method: "POST", headers: authHeaders() });
    loadProduction();
  }

  async function submitConsume() {
    await fetch(`${BASE_URL}/api/production/${selectedId}/consume`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ inventoryId: Number(consumeForm.inventoryId), quantity: Number(consumeForm.quantity), remark: consumeForm.remark })
    });
    setShowConsume(false); setConsumeForm({ inventoryId: "", quantity: "", remark: "" });
  }

  async function submitProduce() {
    await fetch(`${BASE_URL}/api/production/${selectedId}/produce`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ producedQuantity: Number(produceQty) })
    });
    setShowProduce(false); setProduceQty(""); loadProduction();
  }

  function startEdit(p) {
    setEditId(p.id);
    setForm({ projectId: p.projectId || "", productCode: p.productCode || "", productName: p.productName || "", plannedQuantity: p.plannedQuantity || "", remarks: p.remarks || "" });
  }

  const isEditing = !!editId;
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="mod-page">
      <div className="mod-header">
        <div className="mod-header-left">
          <h2 className="mod-title">Production</h2>
          <p className="mod-subtitle">Production orders, material consumption, and output tracking</p>
        </div>
        <span className="mod-count-badge">{production.length} orders</span>
      </div>

      <div className="mod-form-panel">
        <div className="mod-form-header">
          <h3 className="mod-form-title">
            <span className="mod-form-icon" style={{ background: "var(--teal-soft)", color: "var(--teal)" }}>{isEditing ? <IcoEdit /> : <IcoPlus />}</span>
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

      {/* Consume Panel */}
      {showConsume && (
        <div className="mod-receive-panel">
          <div className="mod-receive-header">
            <h3 className="mod-receive-title"><IcoConsume /> Consume Material</h3>
            <button className="mod-btn-cancel" onClick={() => setShowConsume(false)}>✕ Cancel</button>
          </div>
          <div className="mod-form-body">
            {[["Inventory ID","inventoryId","text","—"],["Quantity","quantity","number","0"],["Remark","remark","text","Optional…"]].map(([lbl,key,type,ph]) => (
              <div key={key} className="mod-field">
                <label className="mod-label">{lbl}</label>
                <input className="mod-input" type={type} placeholder={ph} value={consumeForm[key]} onChange={e => setConsumeForm(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
            <button className="mod-submit-btn" style={{ background: "linear-gradient(135deg,var(--warning),#d97706)", boxShadow: "0 3px 10px var(--warning-soft)" }} onClick={submitConsume}><IcoConsume /> Consume</button>
          </div>
        </div>
      )}

      {/* Produce Panel */}
      {showProduce && (
        <div className="mod-receive-panel" style={{ borderColor: "rgba(34,197,94,0.25)", boxShadow: "0 4px 20px rgba(34,197,94,0.08)" }}>
          <div className="mod-receive-header" style={{ background: "var(--success-soft)" }}>
            <h3 className="mod-receive-title" style={{ color: "var(--success)" }}><IcoProduce /> Record Output</h3>
            <button className="mod-btn-cancel" onClick={() => setShowProduce(false)}>✕ Cancel</button>
          </div>
          <div className="mod-form-body">
            <div className="mod-field">
              <label className="mod-label">Produced Quantity</label>
              <input className="mod-input" type="number" placeholder="0" value={produceQty} onChange={e => setProduceQty(e.target.value)} />
            </div>
            <button className="mod-submit-btn" style={{ background: "linear-gradient(135deg,var(--success),#16a34a)", boxShadow: "0 3px 10px var(--success-soft)" }} onClick={submitProduce}><IcoProduce /> Record</button>
          </div>
        </div>
      )}

      <div className="mod-table-panel">
        <div className="mod-table-header"><span className="mod-table-title">Production Orders</span></div>
        <div className="table-scroll">
          <table className="mod-table">
            <thead><tr>
              <th>ID</th><th>Project</th><th>Product Code</th><th>Product Name</th>
              <th>Planned Qty</th><th>Produced Qty</th><th>Status</th>
              <th>Remarks</th><th>Created At</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {production.length > 0 ? production.map((p, i) => (
                <tr key={p.id}>
                  <td className="mod-td-id">#{p.id}</td>
                  <td style={{ color: "var(--purple)" }}>{p.projectId}</td>
                  <td style={{ color: "var(--teal)", fontWeight: 600, fontFamily: "monospace" }}>{p.productCode}</td>
                  <td><strong>{p.productName}</strong></td>
                  <td>{p.plannedQuantity}</td>
                  <td style={{ color: p.producedQuantity >= p.plannedQuantity ? "var(--success)" : "var(--text-main)", fontWeight: 600 }}>{p.producedQuantity || 0}</td>
                  <td><span className={`mod-badge ${statusBadge(p.status)}`}>{p.status || "PENDING"}</span></td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{p.remarks || "—"}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{p.createdAt ? new Date(p.createdAt).toLocaleString() : "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <button className="mod-btn-edit" onClick={() => startEdit(p)}><IcoEdit /></button>
                      <button className="mod-btn-edit" style={{ color: "var(--success)", borderColor: "rgba(34,197,94,0.3)" }} onClick={() => startProduction(p.id)}><IcoPlay /></button>
                      <button className="mod-btn-action" style={{ color: "var(--warning)", background: "var(--warning-soft)", borderColor: "rgba(245,158,11,0.25)" }} onClick={() => { setSelectedId(p.id); setShowConsume(true); }}><IcoConsume /></button>
                      <button className="mod-btn-action" onClick={() => { setSelectedId(p.id); setShowProduce(true); }}><IcoProduce /></button>
                    </div>
                  </td>
                </tr>
              )) : <tr className="mod-empty-row"><td colSpan="10">No production orders</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
