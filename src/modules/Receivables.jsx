import { useEffect, useState } from "react";
import {
  getReceivables,
  addReceivable,
  updateReceivable
} from "../services/receivablesService";
import { addCashTransaction } from "../services/cashBankService";

const PAGE_SIZE = 10;

export default function Receivables() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  /* ================= RECEIVABLE FORM ================= */
  const [form, setForm] = useState({
    clientName: "",
    projectId: "",
    invoiceNo: "",
    invoiceDate: "",
    dueDate: "",
    invoiceAmount: "",
    tdsApplicable: "NO",
    tdsRate: "",
    tdsDescription: ""
  });

  /* ================= PAYMENT MODE ================= */
  const [paymentMode, setPaymentMode] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: "",
    amount: ""
  });

  /* ================= LOAD ================= */
  useEffect(() => {
    loadReceivables(page);
  }, [page]);

  async function loadReceivables(p = page) {
    try {
      const res = await getReceivables(p - 1, PAGE_SIZE);
      setData(res.content || []);
      setTotalPages(res.totalPages || 1);
    } catch {
      setData([]);
    }
  }

  /* ================= ADD RECEIVABLE ================= */
  async function submitReceivable() {
    if (!form.clientName || !form.invoiceNo || !form.invoiceAmount || !form.invoiceDate) {
      alert("Client, Invoice No, Invoice Date & Amount are required");
      return;
    }

    const payload = {
      clientName: form.clientName,
      projectId: form.projectId ? Number(form.projectId) : null,
      invoiceNo: form.invoiceNo,
      invoiceDate: form.invoiceDate,
      dueDate: form.dueDate || null,
      invoiceAmount: Number(form.invoiceAmount),
      tdsApplicable: form.tdsApplicable === "YES",
      tdsRate: form.tdsApplicable === "YES" ? Number(form.tdsRate || 0) : 0,
      tdsDescription: form.tdsApplicable === "YES" ? form.tdsDescription : null
    };

    try {
      await addReceivable(payload);
      resetReceivableForm();
      loadReceivables();
    } catch {
      alert("Save failed");
    }
  }

  /* ================= RECEIVE PAYMENT ================= */
  async function submitPayment() {
    if (!paymentForm.paymentDate || !paymentForm.amount) {
      alert("Payment date and amount are required");
      return;
    }

    const paidAmount = Number(paymentForm.amount);


    /* ================= 2️⃣ UPDATE RECEIVABLE ================= */
    try {
      await updateReceivable(selectedReceivable.id, {
        amount: paidAmount,           // ✅ backend-friendly
        paymentDate: paymentForm.paymentDate
      });
    } catch (err) {
      console.error("Receivable update failed", err);
      alert(
        "Payment added to Cash, but Receivable status update failed. Please refresh."
      );
    }

    /* ================= CLEANUP ================= */
    setPaymentMode(false);
    setSelectedReceivable(null);
    setPaymentForm({ paymentDate: "", amount: "" });
    loadReceivables();
  }


  function resetReceivableForm() {
    setForm({
      clientName: "",
      projectId: "",
      invoiceNo: "",
      invoiceDate: "",
      dueDate: "",
      invoiceAmount: "",
      tdsApplicable: "NO",
      tdsRate: "",
      tdsDescription: ""
    });
  }

  /* ================= SEARCH ================= */
  const filtered = data.filter(r =>
    r.clientName?.toLowerCase().includes(search.toLowerCase())
  );

  function getStatusClass(status = "") {
    const s = status.toUpperCase();

    if (s === "PAID") return "status-badge paid";
    if (s.includes("PARTIAL")) return "status-badge partial";
    if (s === "OPEN" || s === "PENDING") return "status-badge open";

    return "status-badge";
  }
  /* ================= UI ================= */
  return (
    <div className="module">
      <h2>Receivables</h2>

      {/* ================= ADD RECEIVABLE ================= */}
      <div className="card form-card">
        <h3>Add Invoice</h3>
        <div className="date-field">
          <label>Client Name</label>
          <input placeholder="Name.." value={form.clientName}
            onChange={e => setForm({ ...form, clientName: e.target.value })} />
        </div>

        <div className="date-field">
          <label>Project ID</label>
          <input placeholder="0" value={form.projectId}
            onChange={e => setForm({ ...form, projectId: e.target.value })} />
        </div>

        <div className="date-field">
          <label>Invoice No</label>
          <input placeholder="0" value={form.invoiceNo}
            onChange={e => setForm({ ...form, invoiceNo: e.target.value })} />
        </div>

        <div className="date-field">
          <label>Invoice Date</label>
          <input type="date" value={form.invoiceDate}
            onChange={e => setForm({ ...form, invoiceDate: e.target.value })} />
        </div>

        <div className="date-field">
          <label>Due Date</label>
          <input type="date" value={form.dueDate}
            onChange={e => setForm({ ...form, dueDate: e.target.value })} />
        </div>

        <div className="date-field">
          <label>Invoice Amount</label>
          <input type="number" placeholder="0" value={form.invoiceAmount}
            onChange={e => setForm({ ...form, invoiceAmount: e.target.value })} />
        </div>

        {/* ===== TDS FIELDS (ADDED ONLY) ===== */}
        <div className="date-field">
          <label>TDS Applicable</label>
          <select value={form.tdsApplicable}
            onChange={e => setForm({ ...form, tdsApplicable: e.target.value, tdsRate: "", tdsDescription: "" })}>
            <option value="NO">No</option>
            <option value="YES">Yes</option>
          </select>
        </div>

        <div className="date-field">
          <label>TDS Rate</label>
          <input type="number" placeholder="%"
            disabled={form.tdsApplicable === "NO"}
            value={form.tdsRate}
            onChange={e => setForm({ ...form, tdsRate: e.target.value })} />
        </div>

        <div className="date-field">
          <label>TDS Description</label>
          <input placeholder="XYZ.."
            disabled={form.tdsApplicable === "NO"}
            value={form.tdsDescription}
            onChange={e => setForm({ ...form, tdsDescription: e.target.value })} />
        </div>

        <button onClick={submitReceivable}>Add Receivable</button>
      </div>

      {/* ================= RECEIVE PAYMENT FORM (RESTORED) ================= */}
      {paymentMode && selectedReceivable && (
        <div className="card form-card">
          <h3>Receive Payment</h3>

          <p><b>Client:</b> {selectedReceivable.clientName}</p>
          <p><b>Invoice:</b> {selectedReceivable.invoiceNo}</p>

          <div className="date-field">
            <label>Payment Date</label>
            <input
              type="date"
              value={paymentForm.paymentDate}
              onChange={e =>
                setPaymentForm({ ...paymentForm, paymentDate: e.target.value })
              }
            />
          </div>

          <div className="date-field">
            <label>Amount</label>
            <input
              type="number"
              placeholder="0"
              value={paymentForm.amount}
              onChange={e =>
                setPaymentForm({ ...paymentForm, amount: e.target.value })
              }
            />
          </div>

          <button onClick={submitPayment}>Add to Cash</button>
          <button className="secondary" onClick={() => setPaymentMode(false)}>
            Cancel
          </button>
        </div>
      )}

      {/* SEARCH */}
      <input
        className="search"
        placeholder="Search Client..."
        value={search}
        onChange={e => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />

      {/* ================= TABLE ================= */}
      <div className="card table-card">
        <div className="table-wrapper">
          <table className="styled-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Client</th>
                <th>Project</th>
                <th>Invoice</th>
                <th>Invoice Date</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Created By</th>
                <th>Updated At</th>
                <th>TDS Applicable</th>
                <th>TDS Rate</th>
                <th>TDS Description</th>
                <th>Received Amount</th>
                <th>TDS Amount</th>
                <th>Net Amount</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.clientName}</td>
                  <td>{r.projectId ?? "-"}</td>
                  <td>{r.invoiceNo}</td>
                  <td>{r.invoiceDate}</td>
                  <td>{r.dueDate || "-"}</td>
                  <td>₹{r.invoiceAmount}</td>
                  <td>
                    <span className={getStatusClass(r.status)}>
                      {r.status}
                    </span>
                  </td>
                  <td>{r.createdAt || "-"}</td>
                  <td>{r.createdBy || "-"}</td>
                  <td>{r.updatedAt || "-"}</td>
                  <td>{r.tdsApplicable ? "YES" : "NO"}</td>
                  <td>{r.tdsRate || "-"}</td>
                  <td>{r.tdsDescription || "-"}</td>
                  <td>₹{r.receivedAmount || 0}</td>
                  <td>₹{r.tdsAmount || 0}</td>
                  <td>₹{r.netAmount || 0}</td>
                  <td className="action-cell">
                    <button
                      disabled={r.status === "PAID"}
                      onClick={() => {
                        setSelectedReceivable(r);
                        setPaymentForm({
                          paymentDate: "",
                          amount: r.invoiceAmount
                        });
                        setPaymentMode(true);
                      }}
                    >
                      {r.status === "PAID" ? "Paid" : "Receive Payment"}
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Prev
          </button>

          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              className={page === i + 1 ? "active" : ""}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}

          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
