import Pagination from "../layout/Pagination";
import { useEffect, useState } from "react";
import { getPayables, addPayable, updatePayable } from "../services/payablesService";

const PAGE_SIZE = 10;
const IcoPlus = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;
const IcoPay  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 12h.01M18 12h.01"/></svg>;

function statusClass(s = "") {
  const u = s.toUpperCase();
  if (u === "PAID") return "mod-badge--paid";
  if (u.includes("PARTIAL")) return "mod-badge--partial";
  return "mod-badge--open";
}

export default function Payables() {
  const [data, setData]             = useState([]);
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [paymentMode, setPaymentMode]       = useState(false);
  const [selectedPayable, setSelectedPayable] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ paymentDate: "", amount: "" });

  const [form, setForm] = useState({ vendorName: "", projectId: "", invoiceNo: "", invoiceDate: "", dueDate: "", invoiceAmount: "" });

  useEffect(() => { load(page); }, [page]);

  async function load(p = page) {
    try {
      const res = await getPayables(p - 1, PAGE_SIZE);
      setData(Array.isArray(res?.content) ? res.content : []);
      setTotalPages(res.totalPages || 1);
    } catch { setData([]); }
  }

  async function submitPayable() {
    if (!form.vendorName || !form.invoiceNo || !form.invoiceAmount || !form.invoiceDate) {
      alert("Vendor, Invoice No, Invoice Date & Amount are required"); return;
    }
    try {
      await addPayable({ ...form, projectId: form.projectId ? Number(form.projectId) : null, invoiceAmount: Number(form.invoiceAmount), dueDate: form.dueDate || null });
      setForm({ vendorName: "", projectId: "", invoiceNo: "", invoiceDate: "", dueDate: "", invoiceAmount: "" });
      load(page);
    } catch { alert("Save failed"); }
  }

  async function submitPayment() {
    if (!paymentForm.paymentDate || !paymentForm.amount) { alert("Payment date and amount are required"); return; }
    try {
      await updatePayable(selectedPayable.id, { amount: Number(paymentForm.amount), paymentDate: paymentForm.paymentDate });
    } catch (err) { console.error(err); alert("Payable update failed"); return; }
    setPaymentMode(false); setSelectedPayable(null);
    setPaymentForm({ paymentDate: "", amount: "" }); load(page);
  }

  const filtered = data.filter(p => p.vendorName?.toLowerCase().includes(search.toLowerCase()));
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="mod-page">
      <div className="mod-header">
        <div className="mod-header-left">
          <h2 className="mod-title">Payables</h2>
          <p className="mod-subtitle">Manage vendor invoices and outgoing payments</p>
        </div>
        <span className="mod-count-badge">{data.length} invoices</span>
      </div>

      <div className="mod-form-panel">
        <div className="mod-form-header">
          <h3 className="mod-form-title">
            <span className="mod-form-icon" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}><IcoPlus /></span>
            Add Payable
          </h3>
        </div>
        <div className="mod-form-body">
          {[["Vendor Name","vendorName","text","e.g. ABC Supplier"],["Project ID","projectId","text","—"],
            ["Invoice No","invoiceNo","text","INV-001"],["Invoice Amount","invoiceAmount","number","0.00"]].map(([lbl,key,type,ph]) => (
            <div key={key} className="mod-field">
              <label className="mod-label">{lbl}</label>
              <input className="mod-input" type={type} placeholder={ph} value={form[key]} onChange={e => set(key, e.target.value)} />
            </div>
          ))}
          {[["Invoice Date","invoiceDate"],["Due Date","dueDate"]].map(([lbl,key]) => (
            <div key={key} className="mod-field">
              <label className="mod-label">{lbl}</label>
              <input className="mod-input" type="date" value={form[key]} onChange={e => set(key, e.target.value)} />
            </div>
          ))}
          <button className="mod-submit-btn" onClick={submitPayable}><IcoPlus /> Add Payable</button>
        </div>
      </div>

      {paymentMode && selectedPayable && (
        <div className="mod-pay-panel">
          <div className="mod-pay-header">
            <h3 className="mod-pay-title"><IcoPay /> Make Payment</h3>
            <button className="mod-btn-cancel" onClick={() => setPaymentMode(false)}>✕ Cancel</button>
          </div>
          <div className="mod-pay-meta">
            <div className="mod-pay-meta-item"><span className="mod-pay-meta-lbl">Vendor</span><span className="mod-pay-meta-val">{selectedPayable.vendorName}</span></div>
            <div className="mod-pay-meta-item"><span className="mod-pay-meta-lbl">Invoice</span><span className="mod-pay-meta-val">{selectedPayable.invoiceNo}</span></div>
            <div className="mod-pay-meta-item"><span className="mod-pay-meta-lbl">Outstanding</span><span className="mod-pay-meta-val" style={{ color: "var(--danger)" }}>₹ {Number(selectedPayable.invoiceAmount || 0).toLocaleString("en-IN")}</span></div>
          </div>
          <div className="mod-pay-body">
            <div className="mod-field">
              <label className="mod-label">Payment Date</label>
              <input className="mod-input" type="date" value={paymentForm.paymentDate} onChange={e => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} />
            </div>
            <div className="mod-field">
              <label className="mod-label">Amount (₹)</label>
              <input className="mod-input" type="number" placeholder="0.00" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
            </div>
            <button className="mod-submit-btn" style={{ background: "linear-gradient(135deg,var(--danger),#dc2626)", boxShadow: "0 3px 10px var(--danger-soft)" }} onClick={submitPayment}><IcoPay /> Pay Now</button>
          </div>
        </div>
      )}

      <div className="mod-table-panel">
        <div className="mod-table-header">
          <span className="mod-table-title">Payable Register</span>
          <input className="mod-search" placeholder="Search vendor…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="table-scroll">
          <table className="mod-table">
            <thead><tr>
              <th>ID</th><th>Vendor</th><th>Project</th><th>Invoice</th>
              <th>Invoice Date</th><th>Due Date</th><th>Amount</th><th>Status</th>
              <th>Paid Amt</th><th>Remaining</th><th>Created At</th><th>Created By</th><th>Action</th>
            </tr></thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(p => (
                <tr key={p.id}>
                  <td className="mod-td-id">#{p.id}</td>
                  <td><strong>{p.vendorName}</strong></td>
                  <td style={{ color: "var(--text-muted)" }}>{p.projectId ?? "—"}</td>
                  <td style={{ color: "var(--primary)", fontWeight: 600 }}>{p.invoiceNo}</td>
                  <td>{p.invoiceDate}</td>
                  <td style={{ color: p.dueDate && new Date(p.dueDate) < new Date() ? "var(--danger)" : "var(--text-main)" }}>{p.dueDate || "—"}</td>
                  <td className="mod-amount">₹ {Number(p.invoiceAmount || 0).toLocaleString("en-IN")}</td>
                  <td><span className={`mod-badge ${statusClass(p.status)}`}>{p.status}</span></td>
                  <td className="mod-amount mod-amount-out">₹ {Number(p.paidAmount || 0).toLocaleString("en-IN")}</td>
                  <td className="mod-amount">₹ {Number(p.remainingAmount || 0).toLocaleString("en-IN")}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{p.createdAt || "—"}</td>
                  <td style={{ color: "var(--text-muted)" }}>{p.createdBy || "—"}</td>
                  <td>
                    {p.status === "PAID"
                      ? <span className="mod-finished-badge">✓ Paid</span>
                      : <button className="mod-btn-action" style={{ color: "var(--danger)", background: "var(--danger-soft)", borderColor: "rgba(239,68,68,0.25)" }}
                          onClick={() => { setSelectedPayable(p); setPaymentForm({ paymentDate: "", amount: p.invoiceAmount }); setPaymentMode(true); }}>
                          <IcoPay /> Pay
                        </button>
                    }
                  </td>
                </tr>
              )) : <tr className="mod-empty-row"><td colSpan="13">No payables found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
