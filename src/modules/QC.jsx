import Pagination from "../layout/Pagination";
import { useEffect, useState } from "react";
import { getQCRecords, addQCRecord, finishQC } from "../services/qcService";

const PAGE_SIZE = 10;
const IcoPlus  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;
const IcoCheck = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>;
const IcoFlag  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;

export default function QC() {
  const [data, setData]             = useState([]);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [form, setForm] = useState({ productionOrderId: "", inspectedQty: "", acceptedQty: "", reworkQty: "", scrapQty: "", remarks: "" });

  useEffect(() => { loadQC(); }, [page]);

  async function loadQC() {
    try {
      const res = await getQCRecords(page - 1, PAGE_SIZE);
      setData(res.content || []); setTotalPages(res.totalPages || 1);
    } catch { setData([]); }
  }

  async function submitQC() {
    if (!form.productionOrderId) { alert("Production Order ID is required"); return; }
    try {
      await addQCRecord({ inspectedQty: Number(form.inspectedQty), acceptedQty: Number(form.acceptedQty), reworkQty: Number(form.reworkQty), scrapQty: Number(form.scrapQty), remarks: form.remarks }, Number(form.productionOrderId));
      setForm({ productionOrderId: "", inspectedQty: "", acceptedQty: "", reworkQty: "", scrapQty: "", remarks: "" }); loadQC();
    } catch (err) { alert(err.message); }
  }

  async function handleFinish(id) {
    if (!window.confirm("Mark this QC record as FINISHED?")) return;
    try { await finishQC(id); loadQC(); } catch (err) { alert(err.message || "Failed"); }
  }

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  // yield rate helper
  const yieldRate = row => {
    const ins = Number(row.inspectedQty || 0);
    const acc = Number(row.acceptedQty  || 0);
    return ins > 0 ? Math.round((acc / ins) * 100) : 0;
  };

  return (
    <div className="mod-page">
      <div className="mod-header">
        <div className="mod-header-left">
          <h2 className="mod-title">Quality Control</h2>
          <p className="mod-subtitle">Inspection records, yield tracking, and QC status management</p>
        </div>
        <span className="mod-count-badge">{data.length} records</span>
      </div>

      <div className="mod-form-panel">
        <div className="mod-form-header">
          <h3 className="mod-form-title">
            <span className="mod-form-icon" style={{ background: "rgba(168,85,247,0.1)", color: "var(--purple)" }}><IcoPlus /></span>
            Add QC Record
          </h3>
        </div>
        <div className="mod-form-body">
          <div className="mod-field">
            <label className="mod-label">Production Order ID</label>
            <input className="mod-input" type="number" placeholder="0" value={form.productionOrderId} onChange={e => set("productionOrderId", e.target.value)} />
          </div>
          {[["Inspected Qty","inspectedQty"],["Accepted Qty","acceptedQty"],["Rework Qty","reworkQty"],["Scrap Qty","scrapQty"]].map(([lbl,key]) => (
            <div key={key} className="mod-field">
              <label className="mod-label">{lbl}</label>
              <input className="mod-input" type="number" placeholder="0" value={form[key]} onChange={e => set(key, e.target.value)} />
            </div>
          ))}
          <div className="mod-field">
            <label className="mod-label">Remarks</label>
            <input className="mod-input" placeholder="Inspection notes…" value={form.remarks} onChange={e => set("remarks", e.target.value)} />
          </div>
          <button className="mod-submit-btn" style={{ background: "linear-gradient(135deg,var(--purple),#7c3aed)", boxShadow: "0 3px 10px var(--purple-soft)" }} onClick={submitQC}><IcoPlus /> Add QC</button>
        </div>
      </div>

      <div className="mod-table-panel">
        <div className="mod-table-header"><span className="mod-table-title">QC Records</span></div>
        <div className="table-scroll">
          <table className="mod-table">
            <thead><tr>
              <th>ID</th><th>Prod. Order</th><th>Project</th>
              <th>Inspected</th><th>Accepted</th><th>Rework</th><th>Scrap</th>
              <th>Yield %</th><th>Status</th><th>Remarks</th>
              <th>Created At</th><th>Updated At</th><th>Action</th>
            </tr></thead>
            <tbody>
              {data.length > 0 ? data.map(qc => {
                const yr = yieldRate(qc);
                const yColor = yr >= 90 ? "var(--success)" : yr >= 70 ? "var(--warning)" : "var(--danger)";
                return (
                  <tr key={qc.id}>
                    <td className="mod-td-id">#{qc.id}</td>
                    <td style={{ color: "var(--teal)", fontWeight: 600 }}>{qc.productionOrderId}</td>
                    <td style={{ color: "var(--text-muted)" }}>{qc.projectId || "—"}</td>
                    <td><strong>{qc.inspectedQty}</strong></td>
                    <td style={{ color: "var(--success)", fontWeight: 600 }}>{qc.acceptedQty}</td>
                    <td style={{ color: "var(--warning)" }}>{qc.reworkQty}</td>
                    <td style={{ color: "var(--danger)" }}>{qc.scrapQty}</td>
                    <td>
                      <span style={{ color: yColor, fontWeight: 700, fontSize: 13 }}>{yr}%</span>
                    </td>
                    <td>
                      {qc.status === "FINISHED"
                        ? <span className="mod-badge mod-badge--finished">✓ Finished</span>
                        : <span className="mod-badge mod-badge--inprogress">In Progress</span>
                      }
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{qc.remarks || "—"}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{qc.createdAt || "—"}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{qc.updatedAt || "—"}</td>
                    <td>
                      {qc.status === "FINISHED"
                        ? <span className="mod-finished-badge"><IcoCheck /> Finished</span>
                        : <button className="mod-btn-action" style={{ background: "var(--purple-soft)", color: "var(--purple)", borderColor: "rgba(168,85,247,0.25)" }} onClick={() => handleFinish(qc.id)}><IcoFlag /> Finish</button>
                      }
                    </td>
                  </tr>
                );
              }) : <tr className="mod-empty-row"><td colSpan="13">No QC records</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
