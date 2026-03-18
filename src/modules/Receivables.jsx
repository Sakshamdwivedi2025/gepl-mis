import Pagination from "../layout/Pagination";
import { useEffect, useState } from "react";
import { getReceivables, addReceivable, updateReceivable } from "../services/receivablesService";

const PAGE_SIZE = 10;

const IcoPlus = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>;
const IcoCash = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 12h.01M18 12h.01" /></svg>;

function statusBadge(status = "") {
  const s = status.toUpperCase();
  if (s === "PAID") return "mod-badge--paid";
  if (s.includes("PARTIAL")) return "mod-badge--partial";
  return "mod-badge--open";
}

export default function Receivables() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [paymentMode, setPaymentMode] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ paymentDate: "", amount: "" });

  const [form, setForm] = useState({
    clientName: "", projectId: "", invoiceNo: "", invoiceDate: "",
    dueDate: "", invoiceAmount: "", tdsApplicable: "NO", tdsRate: "", tdsDescription: ""
  });

  useEffect(() => { loadReceivables(page); }, [page]);

  async function loadReceivables(p = page) {
    try {
      const res = await getReceivables(p - 1, PAGE_SIZE);
      setData(res.content || []); setTotalPages(res.totalPages || 1);
    } catch { setData([]); }
  }

  async function submitReceivable() {
    if (!form.clientName || !form.invoiceNo || !form.invoiceAmount || !form.invoiceDate) {
      alert("Client, Invoice No, Invoice Date & Amount are required"); return;
    }
    try {
      await addReceivable({
        clientName: form.clientName,
        projectId: form.projectId ? Number(form.projectId) : null,
        invoiceNo: form.invoiceNo, invoiceDate: form.invoiceDate,
        dueDate: form.dueDate || null,
        invoiceAmount: Number(form.invoiceAmount),
        tdsApplicable: form.tdsApplicable === "YES",
        tdsRate: form.tdsApplicable === "YES" ? Number(form.tdsRate || 0) : 0,
        tdsDescription: form.tdsApplicable === "YES" ? form.tdsDescription : null
      });
      resetForm(); loadReceivables();
    } catch { alert("Save failed"); }
  }

  async function submitPayment() {
    if (!paymentForm.paymentDate || !paymentForm.amount) {
      alert("Payment date and amount are required"); return;
    }
    try {
      await updateReceivable(selectedReceivable.id, { amount: Number(paymentForm.amount), paymentDate: paymentForm.paymentDate });
    } catch (err) { console.error(err); alert("Receivable update failed"); }
    setPaymentMode(false); setSelectedReceivable(null);
    setPaymentForm({ paymentDate: "", amount: "" }); loadReceivables();
  }

  function resetForm() {
    setForm({
      clientName: "", projectId: "", invoiceNo: "", invoiceDate: "",
      dueDate: "", invoiceAmount: "", tdsApplicable: "NO", tdsRate: "", tdsDescription: ""
    });
  }

  const filtered = data.filter(r => r.clientName?.toLowerCase().includes(search.toLowerCase()));
  const f = form;
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="mod-page">
      <div className="mod-header">
        <div className="mod-header-left">
          <h2 className="mod-title">Receivables</h2>
          <p className="mod-subtitle">Track client invoices and incoming payments</p>
        </div>
        <div className="mod-header-right">
          <span className="mod-count-badge">{data.length} invoices</span>
        </div>
      </div>

      {/* Add Invoice Form */}
      <div className="mod-form-panel">
        <div className="mod-form-header">
          <h3 className="mod-form-title">
            <span className="mod-form-icon" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}><IcoPlus /></span>
            Add Invoice
          </h3>
        </div>
        <div className="mod-form-body">
          {[["Client Name", "clientName", "text", "e.g. Acme Corp"], ["Project ID", "projectId", "text", "—"],
          ["Invoice No", "invoiceNo", "text", "INV-001"], ["Invoice Amount", "invoiceAmount", "number", "0.00"]].map(([lbl, key, type, ph]) => (
            <div key={key} className="mod-field">
              <label className="mod-label">{lbl}</label>
              <input className="mod-input" type={type} placeholder={ph} value={f[key]}
                onChange={e => set(key, e.target.value)} />
            </div>
          ))}
          {[["Invoice Date", "invoiceDate"], ["Due Date", "dueDate"]].map(([lbl, key]) => (
            <div key={key} className="mod-field">
              <label className="mod-label">{lbl}</label>
              <input className="mod-input" type="date" value={f[key]} onChange={e => set(key, e.target.value)} />
            </div>
          ))}
          <div className="mod-field">
            <label className="mod-label">TDS Applicable</label>
            <select className="mod-select" value={f.tdsApplicable}
              onChange={e => set("tdsApplicable", e.target.value)}>
              <option value="NO">No</option><option value="YES">Yes</option>
            </select>
          </div>
          <div className="mod-field">
            <label className="mod-label">TDS Rate (%)</label>
            <input className="mod-input" type="number" placeholder="%" value={f.tdsRate}
              disabled={f.tdsApplicable === "NO"} onChange={e => set("tdsRate", e.target.value)} />
          </div>
          <div className="mod-field">
            <label className="mod-label">TDS Description</label>
            <input className="mod-input" placeholder="—" value={f.tdsDescription}
              disabled={f.tdsApplicable === "NO"} onChange={e => set("tdsDescription", e.target.value)} />
          </div>
          <button className="mod-submit-btn" onClick={submitReceivable}><IcoPlus /> Add Invoice</button>
        </div>
      </div>

      {/* Payment Panel */}
      {paymentMode && selectedReceivable && (
        <div className="mod-pay-panel">
          <div className="mod-pay-header">
            <h3 className="mod-pay-title"><IcoCash /> Receive Payment</h3>
            <button className="mod-btn-cancel" onClick={() => setPaymentMode(false)}>✕ Cancel</button>
          </div>
          <div className="mod-pay-meta">
            <div className="mod-pay-meta-item">
              <span className="mod-pay-meta-lbl">Client</span>
              <span className="mod-pay-meta-val">{selectedReceivable.clientName}</span>
            </div>
            <div className="mod-pay-meta-item">
              <span className="mod-pay-meta-lbl">Invoice</span>
              <span className="mod-pay-meta-val">{selectedReceivable.invoiceNo}</span>
            </div>
            <div className="mod-pay-meta-item">
              <span className="mod-pay-meta-lbl">Outstanding</span>
              <span className="mod-pay-meta-val" style={{ color: "var(--warning)" }}>
                ₹ {Number(selectedReceivable.invoiceAmount || 0).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
          <div className="mod-pay-body">
            <div className="mod-field">
              <label className="mod-label">Payment Date</label>
              <input className="mod-input" type="date" value={paymentForm.paymentDate}
                onChange={e => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} />
            </div>
            <div className="mod-field">
              <label className="mod-label">Amount (₹)</label>
              <input className="mod-input" type="number" placeholder="0.00" value={paymentForm.amount}
                onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
            </div>
            <button className="mod-submit-btn" onClick={submitPayment}><IcoCash /> Record Payment</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="mod-table-panel">
        <div className="mod-table-header">
          <span className="mod-table-title">Invoice Register</span>
          <input className="mod-search" placeholder="Search client…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="table-scroll">
          <table className="mod-table">
            <thead><tr>
              <th>ID</th><th>Client</th><th>Project</th><th>Invoice</th>
              <th>Invoice Date</th><th>Due Date</th><th>Amount</th><th>Status</th>
              <th>Received</th><th>TDS Amt</th><th>Net Amt</th>
              <th>TDS Appl.</th><th>TDS Rate</th>
              <th>Created At</th><th>Created By</th><th>Action</th>
            </tr></thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(r => (
                <tr key={r.id}>
                  <td className="mod-td-id">#{r.id}</td>
                  <td><strong>{r.clientName}</strong></td>
                  <td style={{ color: "var(--text-muted)" }}>{r.projectId ?? "—"}</td>
                  <td style={{ color: "var(--primary)", fontWeight: 600 }}>{r.invoiceNo}</td>
                  <td>{r.invoiceDate}</td>
                  <td style={{ color: r.dueDate && new Date(r.dueDate) < new Date() ? "var(--danger)" : "var(--text-main)" }}>
                    {r.dueDate || "—"}
                  </td>
                  <td className="mod-amount">₹ {Number(r.invoiceAmount || 0).toLocaleString("en-IN")}</td>
                  <td><span className={`mod-badge ${statusBadge(r.status)}`}>{r.status}</span></td>
                  <td className="mod-amount mod-amount-in">₹ {Number(r.receivedAmount || 0).toLocaleString("en-IN")}</td>
                  <td className="mod-amount">₹ {Number(r.tdsAmount || 0).toLocaleString("en-IN")}</td>
                  <td className="mod-amount">₹ {Number(r.netAmount || 0).toLocaleString("en-IN")}</td>
                  <td><span className={`mod-badge ${r.tdsApplicable ? "mod-badge--paid" : "mod-badge--open"}`}>{r.tdsApplicable ? "YES" : "NO"}</span></td>
                  <td style={{ color: "var(--text-muted)" }}>{r.tdsRate || "—"}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{r.createdAt || "—"}</td>
                  <td style={{ color: "var(--text-muted)" }}>{r.createdBy || "—"}</td>
                  <td>
                    {r.status === "PAID"
                      ? <span className="mod-finished-badge">✓ Paid</span>
                      : <button className="mod-btn-action" onClick={() => {
                        setSelectedReceivable(r);
                        setPaymentForm({
                          paymentDate: "",
                          amount: r.invoiceAmount - (r.receivedAmount || 0)
                        });
                        setPaymentMode(true);
                      }}><IcoCash /> Receive</button>
                    }
                  </td>
                </tr>
              )) : (
                <tr className="mod-empty-row"><td colSpan="16">No invoices found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
