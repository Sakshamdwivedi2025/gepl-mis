import Pagination from "../layout/Pagination";
import { useEffect, useState } from "react";
import { getInventory, addInventoryItem, updateInventoryItem } from "../services/inventoryService";
import { getFinishedGoods } from "../services/finishedGoodsService";

const PAGE_SIZE = 10;
const IcoPlus = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;
const IcoEdit = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;

export default function Inventory() {
  const [inventory, setInventory]   = useState([]);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editId, setEditId]         = useState(null);
  const [form, setForm] = useState({ itemCategory: "", itemCode: "", qty: "", unit: "", location: "" });

  const [finishedGoods, setFinishedGoods]   = useState([]);
  const [fgPage, setFgPage]                 = useState(1);
  const [fgTotalPages, setFgTotalPages]     = useState(1);

  useEffect(() => { loadInventory(page); }, [page]);
  useEffect(() => { loadFinishedGoods(fgPage); }, [fgPage]);

  async function loadInventory(p) {
    try {
      const res = await getInventory(p - 1, PAGE_SIZE);
      setInventory(Array.isArray(res?.content) ? res.content : []);
      setTotalPages(res.totalPages || 1);
    } catch { setInventory([]); }
  }

  async function loadFinishedGoods(p) {
    try {
      const res = await getFinishedGoods(p - 1, PAGE_SIZE);
      setFinishedGoods(Array.isArray(res?.content) ? res.content : []);
      setFgTotalPages(res.totalPages || 1);
    } catch { setFinishedGoods([]); }
  }

  async function submitItem() {
    if (!form.itemCategory || !form.itemCode || !form.qty || !form.unit || !form.location) return;
    try {
      const payload = { itemCategory: form.itemCategory, itemCode: form.itemCode, quantity: Number(form.qty), unit: form.unit, location: form.location };
      if (editId) { await updateInventoryItem(editId, payload); } else { await addInventoryItem(payload); }
      setForm({ itemCategory: "", itemCode: "", qty: "", unit: "", location: "" }); setEditId(null);
      loadInventory(page);
    } catch { alert("Save failed"); }
  }

  function startEdit(item) {
    setEditId(item.id);
    setForm({ itemCategory: item.itemCategory, itemCode: item.itemCode, qty: item.quantity, unit: item.unit, location: item.location });
  }

  const isEditing = !!editId;
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="mod-page">
      <div className="mod-header">
        <div className="mod-header-left">
          <h2 className="mod-title">Inventory</h2>
          <p className="mod-subtitle">Raw materials, components, and finished goods</p>
        </div>
        <span className="mod-count-badge">{inventory.length} items</span>
      </div>

      <div className="mod-form-panel">
        <div className="mod-form-header">
          <h3 className="mod-form-title">
            <span className="mod-form-icon" style={{ background: "var(--success-soft)", color: "var(--success)" }}>{isEditing ? <IcoEdit /> : <IcoPlus />}</span>
            {isEditing ? "Edit Item" : "Add Item"}
          </h3>
          {isEditing && <button className="mod-btn-cancel" onClick={() => { setForm({ itemCategory: "", itemCode: "", qty: "", unit: "", location: "" }); setEditId(null); }}>✕ Cancel</button>}
        </div>
        <div className="mod-form-body">
          {[["Item Category","itemCategory","text","e.g. Electronics"],["Item Code","itemCode","text","PART-001"],
            ["Quantity","qty","number","0"],["Unit","unit","text","pcs / kg / box"],["Location","location","text","Warehouse A"]].map(([lbl,key,type,ph]) => (
            <div key={key} className="mod-field">
              <label className="mod-label">{lbl}</label>
              <input className="mod-input" type={type} placeholder={ph} value={form[key]} onChange={e => set(key, e.target.value)} />
            </div>
          ))}
          <button className={`mod-submit-btn ${isEditing ? "mod-submit-btn--update" : ""}`} onClick={submitItem}>
            {isEditing ? <><IcoEdit /> Update</> : <><IcoPlus /> Add</>}
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="mod-table-panel">
        <div className="mod-table-header"><span className="mod-table-title">Raw Material Inventory</span></div>
        <div className="table-scroll">
          <table className="mod-table">
            <thead><tr><th>ID</th><th>Category</th><th>Code</th><th>Qty</th><th>Unit</th><th>Location</th><th>Created By</th><th>Created At</th><th>Updated At</th><th>Action</th></tr></thead>
            <tbody>
              {inventory.length > 0 ? inventory.map(i => (
                <tr key={i.id}>
                  <td className="mod-td-id">#{i.id}</td>
                  <td>{i.itemCategory}</td>
                  <td style={{ color: "var(--primary)", fontWeight: 600, fontFamily: "monospace" }}>{i.itemCode}</td>
                  <td><strong>{i.quantity}</strong></td>
                  <td style={{ color: "var(--text-muted)" }}>{i.unit}</td>
                  <td>{i.location}</td>
                  <td style={{ color: "var(--text-muted)" }}>{i.createdBy || "—"}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{i.createdAt ? new Date(i.createdAt).toLocaleString() : "—"}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{i.updatedAt ? new Date(i.updatedAt).toLocaleString() : "—"}</td>
                  <td><button className="mod-btn-edit" onClick={() => startEdit(i)}><IcoEdit /> Edit</button></td>
                </tr>
              )) : <tr className="mod-empty-row"><td colSpan="10">No inventory items</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Finished Goods */}
      <div className="mod-table-panel" style={{ marginTop: 8 }}>
        <div className="mod-table-header">
          <span className="mod-table-title">Finished Goods</span>
          <span className="mod-count-badge">{finishedGoods.length} items</span>
        </div>
        <div className="table-scroll">
          <table className="mod-table">
            <thead><tr><th>ID</th><th>Project</th><th>Prod. Order</th><th>Product Code</th><th>Product Name</th><th>Qty</th><th>Created At</th><th>Updated At</th></tr></thead>
            <tbody>
              {finishedGoods.length > 0 ? finishedGoods.map(fg => (
                <tr key={fg.id}>
                  <td className="mod-td-id">#{fg.id}</td>
                  <td style={{ color: "var(--purple)" }}>{fg.projectId}</td>
                  <td style={{ color: "var(--text-muted)" }}>{fg.productionOrderId}</td>
                  <td style={{ color: "var(--teal)", fontWeight: 600, fontFamily: "monospace" }}>{fg.productCode}</td>
                  <td><strong>{fg.productName}</strong></td>
                  <td><strong>{fg.quantity}</strong></td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{fg.createdAt ? new Date(fg.createdAt).toLocaleString() : "—"}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{fg.updatedAt ? new Date(fg.updatedAt).toLocaleString() : "—"}</td>
                </tr>
              )) : <tr className="mod-empty-row"><td colSpan="8">No finished goods</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={fgPage} totalPages={fgTotalPages} onPageChange={setFgPage} />
    </div>
  );
}
