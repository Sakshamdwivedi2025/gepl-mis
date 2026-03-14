import Pagination from "../layout/Pagination";
import { useEffect, useState } from "react";
import { getProcurements, addProcurement, updateProcurement, receiveProcurement } from "../services/procurementService";

const PAGE_SIZE = 10;
const IcoPlus    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;
const IcoEdit    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcoReceive = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;

const emptyForm = { projectId: "", bomVersion: "", partNo: "", description: "", supplier: "", plannedQty: "", orderedQty: "", receivedQty: "", rate: "", leadTime: "" };

export default function Procurement() {
  const [data, setData]             = useState([]);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [form, setForm]             = useState(emptyForm);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showReceive, setShowReceive]   = useState(false);
  const [selectedId, setSelectedId]     = useState(null);
  const [receiveForm, setReceiveForm]   = useState({ inventoryId: "", receivedQty: "", remarks: "" });

  useEffect(() => { loadData(); }, [page]);

  async function loadData() {
    try {
      const res = await getProcurements(page - 1, PAGE_SIZE);
      setData(res.content || []); setTotalPages(res.totalPages || 1);
    } catch { console.error("Load failed"); }
  }

  async function submit() {
    const payload = { ...form, plannedQty: Number(form.plannedQty || 0), orderedQty: Number(form.orderedQty || 0),
      receivedQty: Number(form.receivedQty || 0), rate: Number(form.rate || 0), leadTime: Number(form.leadTime || 0) };
    try {
      if (editingIndex !== null) { await updateProcurement(data[editingIndex].id, payload); }
      else { await addProcurement(payload); }
      setForm(emptyForm); setEditingIndex(null); loadData();
    } catch { alert("Save failed"); }
  }

  async function submitReceive() {
    if (!receiveForm.inventoryId || !receiveForm.receivedQty) { alert("Inventory ID and Received Quantity are required"); return; }
    try {
      await receiveProcurement(selectedId, { inventoryId: Number(receiveForm.inventoryId), receivedQty: Number(receiveForm.receivedQty), remarks: receiveForm.remarks });
      alert("Material received successfully");
      setShowReceive(false); setReceiveForm({ inventoryId: "", receivedQty: "", remarks: "" }); loadData();
    } catch (err) { alert(err.message); }
  }

  const isEditing = editingIndex !== null;
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="mod-page">
      <div className="mod-header">
        <div className="mod-header-left">
          <h2 className="mod-title">Procurement</h2>
          <p className="mod-subtitle">Purchase orders, BOM tracking, and material receipts</p>
        </div>
        <span className="mod-count-badge">{data.length} orders</span>
      </div>

      <div className="mod-form-panel">
        <div className="mod-form-header">
          <h3 className="mod-form-title">
            <span className="mod-form-icon" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>{isEditing ? <IcoEdit /> : <IcoPlus />}</span>
            {isEditing ? "Edit Order" : "New Purchase Order"}
          </h3>
          {isEditing && <button className="mod-btn-cancel" onClick={() => { setForm(emptyForm); setEditingIndex(null); }}>✕ Cancel</button>}
        </div>
        <div className="mod-form-body">
          {[["Project ID","projectId","text","—"],["BOM Version","bomVersion","text","v1.0"],
            ["Part No","partNo","text","PART-001"],["Description","description","text","Component name…"],
            ["Supplier","supplier","text","Supplier name"],["Planned Qty","plannedQty","number","0"],
            ["Ordered Qty","orderedQty","number","0"],["Received Qty","receivedQty","number","0"],
            ["Rate (₹)","rate","number","0.00"],["Lead Time (days)","leadTime","number","0"]].map(([lbl,key,type,ph]) => (
            <div key={key} className="mod-field">
              <label className="mod-label">{lbl}</label>
              <input className="mod-input" type={type} placeholder={ph} value={form[key]} onChange={e => set(key, e.target.value)} />
            </div>
          ))}
          <button className={`mod-submit-btn ${isEditing ? "mod-submit-btn--update" : ""}`} onClick={submit}>
            {isEditing ? <><IcoEdit /> Update</> : <><IcoPlus /> Add</>}
          </button>
        </div>
      </div>

      {/* Receive Material Panel */}
      {showReceive && (
        <div className="mod-receive-panel">
          <div className="mod-receive-header">
            <h3 className="mod-receive-title"><IcoReceive /> Receive Material</h3>
            <button className="mod-btn-cancel" onClick={() => setShowReceive(false)}>✕ Cancel</button>
          </div>
          <div className="mod-form-body">
            {[["Inventory ID","inventoryId","text","—"],["Received Qty","receivedQty","number","0"],["Remarks","remarks","text","Optional notes…"]].map(([lbl,key,type,ph]) => (
              <div key={key} className="mod-field">
                <label className="mod-label">{lbl}</label>
                <input className="mod-input" type={type} placeholder={ph} value={receiveForm[key]}
                  onChange={e => setReceiveForm(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
            <button className="mod-submit-btn" style={{ background: "linear-gradient(135deg,var(--teal),#0d9488)", boxShadow: "0 3px 10px var(--teal-soft)" }} onClick={submitReceive}>
              <IcoReceive /> Receive
            </button>
          </div>
        </div>
      )}

      <div className="mod-table-panel">
        <div className="mod-table-header"><span className="mod-table-title">Purchase Orders</span></div>
        <div className="table-scroll">
          <table className="mod-table">
            <thead><tr>
              <th>ID</th><th>Project</th><th>BOM</th><th>Part No</th><th>Description</th>
              <th>Supplier</th><th>Planned</th><th>Ordered</th><th>Received</th>
              <th>Rate</th><th>Total Value</th><th>Lead (days)</th><th>Excess</th>
              <th>Created</th><th>Updated</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {data.length > 0 ? data.map((row, i) => (
                <tr key={row.id}>
                  <td className="mod-td-id">#{row.id}</td>
                  <td style={{ color: "var(--purple)" }}>{row.projectId}</td>
                  <td style={{ color: "var(--text-muted)" }}>{row.bomVersion}</td>
                  <td style={{ color: "var(--primary)", fontWeight: 600, fontFamily: "monospace" }}>{row.partNo}</td>
                  <td style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.description}</td>
                  <td>{row.supplier}</td>
                  <td>{row.plannedQty}</td>
                  <td>{row.orderedQty}</td>
                  <td style={{ color: row.receivedQty >= row.orderedQty ? "var(--success)" : "var(--warning)", fontWeight: 600 }}>{row.receivedQty}</td>
                  <td>₹ {row.rate}</td>
                  <td className="mod-amount"><strong>₹ {((row.orderedQty || 0) * (row.rate || 0)).toLocaleString("en-IN")}</strong></td>
                  <td style={{ color: "var(--text-muted)" }}>{row.leadTime}d</td>
                  <td style={{ color: row.excessQty > 0 ? "var(--warning)" : "var(--text-muted)" }}>{row.excessQty || 0}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "—"}</td>
                  <td style={{ display: "flex", gap: 5 }}>
                    <button className="mod-btn-edit" onClick={() => { setForm(row); setEditingIndex(i); }}><IcoEdit /></button>
                    <button className="mod-btn-action" onClick={() => { setSelectedId(row.id); setShowReceive(true); }}><IcoReceive /> Receive</button>
                  </td>
                </tr>
              )) : <tr className="mod-empty-row"><td colSpan="16">No purchase orders</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
