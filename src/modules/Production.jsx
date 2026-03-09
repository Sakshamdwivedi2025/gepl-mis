import { useEffect, useState } from "react";
import {
  getProduction,
  addProduction as addProductionApi,
  updateProduction
} from "../services/productionService";

const PAGE_SIZE = 10;
const BASE_URL = import.meta.env.VITE_BASE_URL;

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : ""
  };
}

export default function Production() {
  const [production, setProduction] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editId, setEditId] = useState(null);

  const [showConsume, setShowConsume] = useState(false);
  const [showProduce, setShowProduce] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const [consumeForm, setConsumeForm] = useState({
    inventoryId: "",
    quantity: "",
    remark: ""
  });

  const [produceQty, setProduceQty] = useState("");

  /* ================= FORM ================= */
  const [form, setForm] = useState({
    projectId: "",
    productCode: "",
    productName: "",
    plannedQuantity: "",
    remarks: ""
  });

  /* ================= LOAD ================= */
  useEffect(() => {
    loadProduction(page);
  }, [page]);

  async function loadProduction(p = page) {
    const res = await getProduction(p - 1, PAGE_SIZE);
    setProduction(res.content || []);
    setTotalPages(res.totalPages || 1);
  }

  /* ================= ADD / UPDATE ================= */
  async function submitProduction() {
    if (
      !form.projectId ||
      !form.productCode ||
      !form.productName ||
      !form.plannedQuantity
    ) return;

    const payload = {
      ...form,
      plannedQuantity: Number(form.plannedQuantity)
    };

    if (editId) {
      await updateProduction(editId, payload);
    } else {
      await addProductionApi(payload);
    }

    resetForm();
    setEditId(null);
    loadProduction();
  }

  function editRow(index) {
    const p = production[index];
    setForm({
      projectId: p.projectId || "",
      productCode: p.productCode || "",
      productName: p.productName || "",
      plannedQuantity: p.plannedQuantity || "",
      remarks: p.remarks || ""
    });
    setEditId(p.id);
  }

  function resetForm() {
    setForm({
      projectId: "",
      productCode: "",
      productName: "",
      plannedQuantity: "",
      remarks: ""
    });
  }

  /* ================= START ================= */
  async function startProduction(id) {
    await fetch(`${BASE_URL}/api/production/${id}/start`, {
      method: "POST",
      headers: authHeaders()
    });
    loadProduction();
  }

  /* ================= CONSUME ================= */
  async function submitConsume() {
    await fetch(`${BASE_URL}/api/production/${selectedId}/consume`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        inventoryId: Number(consumeForm.inventoryId),
        quantity: Number(consumeForm.quantity),
        remark: consumeForm.remark
      })
    });

    setShowConsume(false);
    setConsumeForm({ inventoryId: "", quantity: "", remark: "" });
  }

  /* ================= PRODUCE ================= */
  async function submitProduce() {
    await fetch(`${BASE_URL}/api/production/${selectedId}/produce`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        producedQuantity: Number(produceQty)
      })
    });

    setShowProduce(false);
    setProduceQty("");
    loadProduction();
  }

  return (
    <div className="page">
      <h2>Production</h2>

      {/* ================= FORM ================= */}
      <div className="card">
        <div className="form-row">
          <div className="date-field">
            <label>Project ID</label>
            <input
              value={form.projectId}
              placeholder="0"
              onChange={e => setForm({ ...form, projectId: e.target.value })}
            />
          </div>

          <div className="date-field">
            <label>Product Code</label>
            <input
              value={form.productCode}
              placeholder="123..."
              onChange={e => setForm({ ...form, productCode: e.target.value })}
            />
          </div>

          <div className="date-field">
            <label>Product Name</label>
            <input
              value={form.productName}
              placeholder="Name.."
              onChange={e => setForm({ ...form, productName: e.target.value })}
            />
          </div>

          <div className="date-field">
            <label>Planned Quantity</label>
            <input
              type="number"
              placeholder="0"
              value={form.plannedQuantity}
              onChange={e =>
                setForm({ ...form, plannedQuantity: e.target.value })
              }
            />
          </div>

          <div className="date-field">
            <label>Remarks</label>
            <input
              value={form.remarks}
              placeholder="XYZ..."
              onChange={e => setForm({ ...form, remarks: e.target.value })}
            />
          </div>

          <button onClick={submitProduction}>Add
          </button>
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div className="card">
        <table className="styled-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Project</th>
              <th>Product Code</th>
              <th>Product Name</th>
              <th>Planned Qty</th>
              <th>Produced Qty</th>
              <th>Status</th>
              <th>Created By</th>
              <th>Created At</th>
              <th>Updated At</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {production.map((p, i) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.projectId}</td>
                <td>{p.productCode}</td>
                <td>{p.productName}</td>
                <td>{p.plannedQuantity}</td>
                <td>{p.producedQuantity || "-"}</td>
                <td>{p.status}</td>
                <td>{p.createdBy || "-"}</td>
                <td>
                  {p.createdAt
                    ? new Date(p.createdAt).toLocaleString()
                    : "-"}
                </td>
                <td>
                  {p.updatedAt
                    ? new Date(p.updatedAt).toLocaleString()
                    : "-"}
                </td>
                <td className="action-cell">
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => startProduction(p.id)}>Start</button>

                    <button
                      onClick={() => {
                        setSelectedId(p.id);
                        setShowConsume(true);
                      }}
                    >
                      Consume
                    </button>

                    <button
                      onClick={() => {
                        setSelectedId(p.id);
                        setShowProduce(true);
                      }}
                    >
                      Produce
                    </button>

                  </div>
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

      {/* ================= CONSUME MODAL ================= */}
      {showConsume && (
        <div className="modal">
          <div className="modal-card">
            <h3>Consume Inventory</h3>

            <input
              placeholder="Inventory ID"
              value={consumeForm.inventoryId}
              onChange={e =>
                setConsumeForm({ ...consumeForm, inventoryId: e.target.value })
              }
            />

            <input
              placeholder="Quantity"
              value={consumeForm.quantity}
              onChange={e =>
                setConsumeForm({ ...consumeForm, quantity: e.target.value })
              }
            />

            <input
              placeholder="Remark"
              value={consumeForm.remark}
              onChange={e =>
                setConsumeForm({ ...consumeForm, remark: e.target.value })
              }
            />

            <button onClick={submitConsume}>Submit</button>
            <button className="secondary" onClick={() => setShowConsume(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ================= PRODUCE MODAL ================= */}
      {showProduce && (
        <div className="modal">
          <div className="modal-card">
            <h3>Produce Quantity</h3>

            <input
              type="number"
              placeholder="Produced Quantity"
              value={produceQty}
              onChange={e => setProduceQty(e.target.value)}
            />

            <button onClick={submitProduce}>Submit</button>
            <button className="secondary" onClick={() => setShowProduce(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
