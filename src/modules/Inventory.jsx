import Pagination from "../layout/Pagination";
import { useEffect, useState } from "react";
import { getInventory, addInventoryItem, updateInventoryItem } from "../services/inventoryService";
import { getFinishedGoods } from "../services/finishedGoodsService";

const PAGE_SIZE = 10;
const IcoPlus  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;
const IcoEdit  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcoAlert = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

// low-stock threshold
const LOW_STOCK = 10;

export default function Inventory() {
  const [inventory, setInventory]   = useState([]);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editId, setEditId]         = useState(null);
  const [form, setForm]             = useState({ itemCategory: "", itemCode: "", qty: "", unit: "", location: "" });
  const [search, setSearch]         = useState("");
  const [filterLow, setFilterLow]   = useState(false);

  const [finishedGoods, setFinishedGoods]   = useState([]);
  const [fgPage, setFgPage]                 = useState(1);
  const [fgTotalPages, setFgTotalPages]     = useState(1);

  // consumption log from production module
  const [consumeLog, setConsumeLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem("prod_consume_log") || "{}"); } catch { return {}; }
  });

  useEffect(() => { loadInventory(page); }, [page]);
  useEffect(() => { loadFinishedGoods(fgPage); }, [fgPage]);

  // refresh consume log from localStorage whenever tab focuses
  useEffect(() => {
    const sync = () => {
      try { setConsumeLog(JSON.parse(localStorage.getItem("prod_consume_log") || "{}")); } catch {}
    };
    window.addEventListener("focus", sync);
    return () => window.removeEventListener("focus", sync);
  }, []);

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

  // build consumption totals per inventory item from production logs
  const consumeTotals = {};
  Object.values(consumeLog).forEach(entries => {
    entries.forEach(e => {
      consumeTotals[e.inventoryId] = (consumeTotals[e.inventoryId] || 0) + Number(e.qty);
    });
  });

  const isEditing = !!editId;
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const lowStockItems   = inventory.filter(i => i.quantity <= LOW_STOCK);
  const totalItems      = inventory.length;
  const totalQty        = inventory.reduce((s, i) => s + (i.quantity || 0), 0);

  const filtered = inventory.filter(i => {
    const matchSearch = !search || i.itemCode?.toLowerCase().includes(search.toLowerCase()) || i.itemCategory?.toLowerCase().includes(search.toLowerCase());
    const matchLow    = !filterLow || i.quantity <= LOW_STOCK;
    return matchSearch && matchLow;
  });

  return (
    <div className="mod-page">
      {/* Header */}
      <div className="mod-header">
        <div className="mod-header-left">
          <h2 className="mod-title">Inventory</h2>
          <p className="mod-subtitle">Raw materials, stock levels, consumption tracking, and finished goods</p>
        </div>
        <div className="mod-header-right">
          <span className="mod-count-badge">{totalItems} items</span>
          {lowStockItems.length > 0 && (
            <span className="mod-badge mod-badge--out" style={{ gap: 5 }}>
              <IcoAlert /> {lowStockItems.length} low stock
            </span>
          )}
        </div>
      </div>

      {/* Summary strip */}
      <div className="qc-summary-strip">
        <div className="qc-summary-item">
          <span className="qc-summary-label">Total Items</span>
          <span className="qc-summary-val">{totalItems}</span>
        </div>
        <div className="qc-summary-item">
          <span className="qc-summary-label">Total Units</span>
          <span className="qc-summary-val">{totalQty.toLocaleString("en-IN")}</span>
        </div>
        <div className="qc-summary-item">
          <span className="qc-summary-label">Low Stock (≤{LOW_STOCK})</span>
          <span className="qc-summary-val" style={{ color: lowStockItems.length > 0 ? "var(--danger)" : "var(--success)" }}>
            {lowStockItems.length}
          </span>
        </div>
        <div className="qc-summary-item">
          <span className="qc-summary-label">Consumed (Production)</span>
          <span className="qc-summary-val" style={{ color: "var(--warning)" }}>
            {Object.values(consumeTotals).reduce((a, b) => a + b, 0)}
          </span>
        </div>
        <div className="qc-summary-item">
          <span className="qc-summary-label">Finished Goods</span>
          <span className="qc-summary-val" style={{ color: "var(--success)" }}>{finishedGoods.length}</span>
        </div>
      </div>

      {/* Low stock alert banner */}
      {lowStockItems.length > 0 && (
        <div className="inv-alert-banner">
          <IcoAlert />
          <span><strong>{lowStockItems.length} item{lowStockItems.length > 1 ? "s" : ""}</strong> running low on stock:</span>
          {lowStockItems.slice(0, 4).map(i => (
            <span key={i.id} className="inv-alert-chip">{i.itemCode} ({i.quantity} {i.unit})</span>
          ))}
          {lowStockItems.length > 4 && <span style={{ color: "var(--danger)", fontSize: 12 }}>+{lowStockItems.length - 4} more</span>}
        </div>
      )}

      {/* Add / Edit Form */}
      <div className="mod-form-panel">
        <div className="mod-form-header">
          <h3 className="mod-form-title">
            <span className="mod-form-icon" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
              {isEditing ? <IcoEdit /> : <IcoPlus />}
            </span>
            {isEditing ? "Edit Item" : "Add Stock Item"}
          </h3>
          {isEditing && (
            <button className="mod-btn-cancel" onClick={() => { setForm({ itemCategory: "", itemCode: "", qty: "", unit: "", location: "" }); setEditId(null); }}>✕ Cancel</button>
          )}
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

      {/* Raw Materials Table */}
      <div className="mod-table-panel">
        <div className="mod-table-header">
          <span className="mod-table-title">Raw Material Stock</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input className="mod-search" placeholder="Search code / category…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <button
              className={`mod-btn-edit ${filterLow ? "mod-btn-action" : ""}`}
              style={filterLow ? { color: "var(--danger)", background: "var(--danger-soft)", borderColor: "rgba(239,68,68,0.3)" } : {}}
              onClick={() => setFilterLow(v => !v)}
              title="Show low-stock items only">
              <IcoAlert /> {filterLow ? "All" : "Low"}
            </button>
          </div>
        </div>
        <div className="table-scroll">
          <table className="mod-table">
            <thead><tr>
              <th>ID</th><th>Category</th><th>Code</th><th>Stock Qty</th><th>Unit</th>
              <th>Stock Level</th><th>Consumed</th><th>Location</th>
              <th>Created By</th><th>Updated At</th><th>Action</th>
            </tr></thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(i => {
                const consumed  = consumeTotals[i.id] || 0;
                const isLow     = i.quantity <= LOW_STOCK;
                const isOut     = i.quantity === 0;
                const stockColor = isOut ? "var(--danger)" : isLow ? "var(--warning)" : "var(--success)";
                const stockLabel = isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock";
                const stockCls   = isOut ? "mod-badge--out" : isLow ? "mod-badge--partial" : "mod-badge--in";

                return (
                  <tr key={i.id} style={isLow ? { background: "rgba(239,68,68,0.03)" } : {}}>
                    <td className="mod-td-id">#{i.id}</td>
                    <td>{i.itemCategory}</td>
                    <td style={{ color: "var(--primary)", fontWeight: 600, fontFamily: "monospace" }}>{i.itemCode}</td>
                    <td>
                      <strong style={{ color: stockColor, fontSize: 14 }}>{i.quantity}</strong>
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>{i.unit}</td>
                    <td><span className={`mod-badge ${stockCls}`}>{stockLabel}</span></td>
                    <td style={{ color: consumed > 0 ? "var(--warning)" : "var(--text-dim)", fontWeight: consumed > 0 ? 600 : 400, fontSize: 12 }}>
                      {consumed > 0 ? `-${consumed}` : "—"}
                    </td>
                    <td>{i.location}</td>
                    <td style={{ color: "var(--text-muted)" }}>{i.createdBy || "—"}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{i.updatedAt ? new Date(i.updatedAt).toLocaleString() : "—"}</td>
                    <td><button className="mod-btn-edit" onClick={() => startEdit(i)}><IcoEdit /> Edit</button></td>
                  </tr>
                );
              }) : <tr className="mod-empty-row"><td colSpan="11">{filterLow ? "No low-stock items 🎉" : "No inventory items"}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Finished Goods */}
      <div style={{ marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid var(--border-light)" }}>
          <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700, margin: 0, color: "var(--text-main)" }}>Finished Goods</h3>
          <span className="mod-count-badge">{finishedGoods.length} items</span>
        </div>
        <div className="mod-table-panel">
          <div className="table-scroll">
            <table className="mod-table">
              <thead><tr>
                <th>ID</th><th>Project</th><th>Prod. Order</th>
                <th>Product Code</th><th>Product Name</th><th>Qty</th>
                <th>Created At</th><th>Updated At</th>
              </tr></thead>
              <tbody>
                {finishedGoods.length > 0 ? finishedGoods.map(fg => (
                  <tr key={fg.id}>
                    <td className="mod-td-id">#{fg.id}</td>
                    <td style={{ color: "var(--purple)" }}>{fg.projectId}</td>
                    <td style={{ color: "var(--teal)" }}>#{fg.productionOrderId}</td>
                    <td style={{ color: "var(--primary)", fontWeight: 600, fontFamily: "monospace" }}>{fg.productCode}</td>
                    <td><strong>{fg.productName}</strong></td>
                    <td><span className="mod-badge mod-badge--finished">{fg.quantity} units</span></td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{fg.createdAt ? new Date(fg.createdAt).toLocaleString() : "—"}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{fg.updatedAt ? new Date(fg.updatedAt).toLocaleString() : "—"}</td>
                  </tr>
                )) : <tr className="mod-empty-row"><td colSpan="8">No finished goods yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <Pagination page={fgPage} totalPages={fgTotalPages} onPageChange={setFgPage} />
      </div>
    </div>
  );
}
