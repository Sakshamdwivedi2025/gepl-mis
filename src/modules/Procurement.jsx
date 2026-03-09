import { useEffect, useState } from "react";
import {
  getProcurements,
  addProcurement,
  updateProcurement,
  receiveProcurement
} from "../services/procurementService";

const PAGE_SIZE = 10;

export default function Procurement() {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [form, setForm] = useState({
    projectId: "",
    bomVersion: "",
    partNo: "",
    description: "",
    supplier: "",
    plannedQty: "",
    orderedQty: "",
    receivedQty: "",
    rate: "",
    leadTime: ""
  });

  const [editingIndex, setEditingIndex] = useState(null);

  /* ===== RECEIVE POPUP ===== */
  const [showReceive, setShowReceive] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [receiveForm, setReceiveForm] = useState({
    inventoryId: "",
    receivedQty: "",
    remarks: ""
  });

  /* ================= LOAD ================= */
  useEffect(() => {
    loadData();
  }, [page]);

  async function loadData() {
    try {
      const res = await getProcurements(page - 1, PAGE_SIZE); // backend is 0-based
      setData(res.content || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error("Load failed", err);
    }
  }

  /* ================= ADD / UPDATE ================= */
  async function submit() {
    const payload = {
      ...form,
      plannedQty: Number(form.plannedQty || 0),
      orderedQty: Number(form.orderedQty || 0),
      receivedQty: Number(form.receivedQty || 0),
      rate: Number(form.rate || 0),
      leadTime: Number(form.leadTime || 0)
    };

    try {
      if (editingIndex !== null) {
        const id = data[editingIndex].id;
        await updateProcurement(id, payload);
      } else {
        await addProcurement(payload);
      }

      resetForm();
      setEditingIndex(null);
      loadData();
    } catch (err) {
      console.error("Save failed", err);
      alert("Save failed");
    }
  }

  function resetForm() {
    setForm({
      projectId: "",
      bomVersion: "",
      partNo: "",
      description: "",
      supplier: "",
      plannedQty: "",
      orderedQty: "",
      receivedQty: "",
      rate: "",
      leadTime: ""
    });
  }

  function editRow(index) {
    setForm(data[index]);
    setEditingIndex(index);
  }

  /* ================= RECEIVE ================= */
  async function submitReceive() {
    if (!receiveForm.inventoryId || !receiveForm.receivedQty) {
      alert("Inventory ID and Received Quantity are required");
      return;
    }

    try {
      await receiveProcurement(selectedId, {
        inventoryId: Number(receiveForm.inventoryId),
        receivedQty: Number(receiveForm.receivedQty),
        remarks: receiveForm.remarks
      });

      alert("Material received successfully");

      setShowReceive(false);
      setReceiveForm({
        inventoryId: "",
        receivedQty: "",
        remarks: ""
      });

      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="page">
      <h2>Procurement</h2>

      {/* ================= FORM ================= */}
      <div className="card">
        <div className="form-row">
          <div className="date-field">
            <label>Project ID</label>
            <input value={form.projectId} placeholder="0" onChange={e => setForm({ ...form, projectId: e.target.value })} />
          </div>
          <div className="date-field">
            <label>BOM Version</label>
            <input value={form.bomVersion} placeholder="--" onChange={e => setForm({ ...form, bomVersion: e.target.value })} />
          </div>
          <div className="date-field">
            <label>Part No</label>
            <input value={form.partNo} placeholder="--" onChange={e => setForm({ ...form, partNo: e.target.value })} />
          </div>
          <div className="date-field">
            <label>Description</label>
            <input value={form.description} placeholder="XYZ..." onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="date-field">
            <label>Supplier</label>
            <input value={form.supplier} placeholder="Name.." onChange={e => setForm({ ...form, supplier: e.target.value })} />
          </div>
          <div className="date-field">
            <label>Planned Qty</label>
            <input type="number" value={form.plannedQty} placeholder="0" onChange={e => setForm({ ...form, plannedQty: e.target.value })} />
          </div>
          <div className="date-field">
            <label>Ordered Qty</label>
            <input type="number" value={form.orderedQty} placeholder="0" onChange={e => setForm({ ...form, orderedQty: e.target.value })} />
          </div>
          <div className="date-field">
            <label>Received Qty</label>
            <input type="number" value={form.receivedQty} placeholder="0" onChange={e => setForm({ ...form, receivedQty: e.target.value })} />
          </div>
          <div className="date-field">
            <label>Rate</label>
            <input type="number" value={form.rate} placeholder="$" onChange={e => setForm({ ...form, rate: e.target.value })} />
          </div>
          <div className="date-field">
            <label>Lead Time</label>
            <input type="number" value={form.leadTime} placeholder="0" onChange={e => setForm({ ...form, leadTime: e.target.value })} />
          </div>

          <button onClick={submit}>
            {editingIndex !== null ? "Update" : "Add"}
          </button>
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div className="card">
        <table className="styled-table">
          <thead>
            <tr>
              <th>ID</th><th>Project</th><th>BOM</th><th>Part</th>
              <th>Description</th><th>Supplier</th>
              <th>Planned</th><th>Ordered</th><th>Received</th>
              <th>Rate</th><th>Total</th><th>Lead Time</th>
              <th>Excess</th><th>Created</th><th>Updated</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.projectId}</td>
                <td>{row.bomVersion}</td>
                <td>{row.partNo}</td>
                <td>{row.description}</td>
                <td>{row.supplier}</td>
                <td>{row.plannedQty}</td>
                <td>{row.orderedQty}</td>
                <td>{row.receivedQty}</td>
                <td>₹ {row.rate}</td>
                <td><b>₹ {(row.orderedQty || 0) * (row.rate || 0)}</b></td>
                <td>{row.leadTime}</td>
                <td>{row.excessQty}</td>
                <td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}</td>
                <td>{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "-"}</td>
                <td className="action-cell">
                  <button onClick={() => editRow(i)}>Edit</button>
                  <button
                    style={{ marginLeft: 6 }}
                    onClick={() => {
                      setSelectedId(row.id);
                      setShowReceive(true);
                    }}
                  >
                    Receive
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ================= PAGINATION ================= */}
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

      {/* ================= RECEIVE MODAL ================= */}
      {showReceive && (
        <div className="modal">
          <div className="modal-card">
            <h3>Receive Material</h3>

            <input
              placeholder="Inventory ID"
              value={receiveForm.inventoryId}
              onChange={e =>
                setReceiveForm({ ...receiveForm, inventoryId: e.target.value })
              }
            />

            <input
              type="number"
              placeholder="Received Quantity"
              value={receiveForm.receivedQty}
              onChange={e =>
                setReceiveForm({ ...receiveForm, receivedQty: e.target.value })
              }
            />

            <input
              placeholder="Remarks"
              value={receiveForm.remarks}
              onChange={e =>
                setReceiveForm({ ...receiveForm, remarks: e.target.value })
              }
            />

            <button onClick={submitReceive}>Submit</button>
            <button className="secondary" onClick={() => setShowReceive(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
