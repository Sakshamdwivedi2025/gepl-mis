import Pagination from "../layout/Pagination";
import { useEffect, useState } from "react";
import { getCashTransactions, addCashTransaction, updateCashTransaction } from "../services/cashBankService";

const PAGE_SIZE = 10;

const IcoPlus  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;
const IcoEdit  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;

export default function CashBank({ user }) {
  const [data, setData]             = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [page, setPage]             = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [form, setForm] = useState({
    type: "IN", amount: "", category: "Advance", referenceType: "Manual",
    referenceId: "", projectId: "", description: "", transactionDate: ""
  });

  useEffect(() => { loadCash(0); }, []);

  async function loadCash(p = page) {
    try {
      const res = await getCashTransactions(p, PAGE_SIZE);
      const list = Array.isArray(res?.content) ? res.content : [];
      setData(list.map(item => ({ ...item, type: item.type?.toUpperCase(), transactionDate: item.txnDate })));
      setTotalPages(res.totalPages || 0);
      setPage(p);
    } catch (err) { console.error(err); setData([]); }
  }

  async function submit() {
    if (!form.amount || !form.transactionDate) return;
    const now = new Date().toISOString();
    const payload = { ...form, txnDate: form.transactionDate, amount: Number(form.amount),
      createdBy: user?.username || "System",
      createdAt: editingIndex === null ? now : data[editingIndex].createdAt, updatedAt: now };
    delete payload.transactionDate;
    try {
      if (editingIndex !== null) { await updateCashTransaction(data[editingIndex].id, payload); loadCash(page); }
      else { await addCashTransaction(payload); loadCash(totalPages); }
      resetForm(); setEditingIndex(null);
    } catch (err) { console.error(err); alert("Save failed"); }
  }

  function editRow(i) {
    const r = data[i];
    setForm({ type: r.type, amount: r.amount, category: r.category, referenceType: r.referenceType,
      referenceId: r.referenceId, projectId: r.projectId, description: r.description, transactionDate: r.transactionDate });
    setEditingIndex(i);
  }

  function resetForm() {
    setForm({ type: "IN", amount: "", category: "Advance", referenceType: "Manual",
      referenceId: "", projectId: "", description: "", transactionDate: "" });
  }

  const isEditing = editingIndex !== null;

  return (
    <div className="mod-page">
      {/* Header */}
      <div className="mod-header">
        <div className="mod-header-left">
          <h2 className="mod-title">Cash &amp; Bank</h2>
          <p className="mod-subtitle">Manage all cash inflow and outflow transactions</p>
        </div>
        <div className="mod-header-right">
          <span className="mod-count-badge">{data.length} transactions</span>
        </div>
      </div>

      {/* Form */}
      <div className="mod-form-panel">
        <div className="mod-form-header">
          <h3 className="mod-form-title">
            <span className="mod-form-icon" style={{ background: isEditing ? "var(--teal-soft)" : "var(--primary-soft)", color: isEditing ? "var(--teal)" : "var(--primary)" }}>
              {isEditing ? <IcoEdit /> : <IcoPlus />}
            </span>
            {isEditing ? "Edit Transaction" : "Add Transaction"}
          </h3>
          {isEditing && (
            <button className="mod-btn-cancel" onClick={() => { resetForm(); setEditingIndex(null); }}>✕ Cancel</button>
          )}
        </div>
        <div className="mod-form-body">
          <div className="mod-field">
            <label className="mod-label">Type</label>
            <select className="mod-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="IN">IN — Inflow</option>
              <option value="OUT">OUT — Outflow</option>
            </select>
          </div>
          <div className="mod-field">
            <label className="mod-label">Amount (₹)</label>
            <input className="mod-input" type="number" placeholder="0.00" value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="mod-field">
            <label className="mod-label">Category</label>
            <select className="mod-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {["Advance","Expense","Payment","Refund","Receipt","Transfer"].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="mod-field">
            <label className="mod-label">Reference Type</label>
            <select className="mod-select" value={form.referenceType} onChange={e => setForm({ ...form, referenceType: e.target.value })}>
              {["Manual","Receivables","Payables"].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="mod-field">
            <label className="mod-label">Reference ID</label>
            <input className="mod-input" placeholder="—" value={form.referenceId}
              onChange={e => setForm({ ...form, referenceId: e.target.value })} />
          </div>
          <div className="mod-field">
            <label className="mod-label">Project ID</label>
            <input className="mod-input" placeholder="—" value={form.projectId}
              onChange={e => setForm({ ...form, projectId: e.target.value })} />
          </div>
          <div className="mod-field">
            <label className="mod-label">Description</label>
            <input className="mod-input" placeholder="Transaction notes…" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="mod-field">
            <label className="mod-label">Transaction Date</label>
            <input className="mod-input" type="date" value={form.transactionDate}
              onChange={e => setForm({ ...form, transactionDate: e.target.value })} />
          </div>
          <button className={`mod-submit-btn ${isEditing ? "mod-submit-btn--update" : ""}`} onClick={submit}>
            {isEditing ? <><IcoEdit /> Update</> : <><IcoPlus /> Add</>}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mod-table-panel">
        <div className="mod-table-header">
          <span className="mod-table-title">Transaction History</span>
        </div>
        <div className="table-scroll">
          <table className="mod-table">
            <thead><tr>
              <th>Txn ID</th><th>Type</th><th>Amount</th><th>Date</th>
              <th>Category</th><th>Ref Type</th><th>Ref ID</th>
              <th>Project</th><th>Created By</th><th>Created At</th><th>Updated At</th>
              <th>Description</th><th>Action</th>
            </tr></thead>
            <tbody>
              {data.length > 0 ? data.map((c, i) => (
                <tr key={c.id || i}>
                  <td className="mod-td-id">#{c.transactionId || c.id}</td>
                  <td>
                    <span className={`mod-badge mod-badge--${c.type === "IN" ? "in" : "out"}`}>{c.type}</span>
                  </td>
                  <td className={`mod-amount ${c.type === "IN" ? "mod-amount-in" : "mod-amount-out"}`}>
                    {c.type === "IN" ? "+" : "−"}₹ {Number(c.amount || 0).toLocaleString("en-IN")}
                  </td>
                  <td>{c.transactionDate}</td>
                  <td>{c.category}</td>
                  <td>{c.referenceType}</td>
                  <td style={{ color: "var(--text-muted)" }}>{c.referenceId || "—"}</td>
                  <td style={{ color: "var(--text-muted)" }}>{c.projectId || "—"}</td>
                  <td>{c.createdBy}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{new Date(c.createdAt).toLocaleString()}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{new Date(c.updatedAt).toLocaleString()}</td>
                  <td style={{ color: "var(--text-muted)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.description}</td>
                  <td>
                    <button className="mod-btn-edit" onClick={() => editRow(i)}><IcoEdit /> Edit</button>
                  </td>
                </tr>
              )) : (
                <tr className="mod-empty-row"><td colSpan="13">No transactions found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={loadCash} zeroBased={true} />
    </div>
  );
}
