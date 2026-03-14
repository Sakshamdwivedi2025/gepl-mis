import Pagination from "../layout/Pagination";
import { useEffect, useState } from "react";
import { getProjects, addProject as addProjectApi, updateProject } from "../services/projectService";

const PAGE_SIZE = 10;

const IcoPlus = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;
const IcoEdit = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;

const STATUS_COLORS = {
  PLANNED:     { bg: "var(--primary-soft)", color: "var(--primary)",  border: "rgba(59,130,246,0.2)" },
  IN_PROGRESS: { bg: "var(--teal-soft)",    color: "var(--teal)",     border: "rgba(20,184,166,0.2)" },
  ON_HOLD:     { bg: "var(--warning-soft)", color: "var(--warning)",  border: "rgba(245,158,11,0.2)" },
  COMPLETED:   { bg: "var(--success-soft)", color: "var(--success)",  border: "rgba(34,197,94,0.2)"  },
  CLOSED:      { bg: "var(--bg-hover)",     color: "var(--text-muted)",border: "var(--border)"        },
};

const emptyForm = { projectName: "", projectCode: "", clientName: "", plannedStartDate: "", plannedEndDate: "", plannedBudget: "", status: "PLANNED" };

export default function Projects() {
  const [projects, setProjects]     = useState([]);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editId, setEditId]         = useState(null);
  const [form, setForm]             = useState(emptyForm);

  useEffect(() => { loadProjects(); }, [page]);

  async function loadProjects(p = page) {
    try {
      const res = await getProjects(p - 1, PAGE_SIZE);
      setProjects(Array.isArray(res?.content) ? res.content : []);
      setTotalPages(res.totalPages || 1);
    } catch { setProjects([]); }
  }

  async function submitProject() {
    if (!form.projectName || !form.projectCode || !form.plannedStartDate || !form.plannedEndDate) return;
    try {
      if (editId) { await updateProject(editId, form); }
      else { await addProjectApi({ ...form, status: "PLANNED" }); }
      setForm(emptyForm); setEditId(null); loadProjects();
    } catch { alert("Save failed"); }
  }

  function startEdit(p) {
    setEditId(p.id);
    setForm({ projectName: p.projectName, projectCode: p.projectCode, clientName: p.clientName,
      plannedStartDate: p.plannedStartDate, plannedEndDate: p.plannedEndDate,
      plannedBudget: p.plannedBudget, status: p.status || "PLANNED" });
  }

  const isEditing = !!editId;
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  // duration helper
  const duration = (start, end) => {
    if (!start || !end) return "—";
    const d = Math.round((new Date(end) - new Date(start)) / 86400000);
    return d > 0 ? `${d}d` : "—";
  };

  return (
    <div className="mod-page">
      <div className="mod-header">
        <div className="mod-header-left">
          <h2 className="mod-title">Projects</h2>
          <p className="mod-subtitle">Project portfolio — timelines, budgets, and status tracking</p>
        </div>
        <div className="mod-header-right">
          <span className="mod-count-badge">{projects.length} projects</span>
          {["PLANNED","IN_PROGRESS","COMPLETED"].map(s => {
            const c = projects.filter(p => p.status === s).length;
            const sc = STATUS_COLORS[s] || STATUS_COLORS.PLANNED;
            return c > 0 ? (
              <span key={s} className="mod-badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                {c} {s.replace("_", " ").toLowerCase()}
              </span>
            ) : null;
          })}
        </div>
      </div>

      {/* Form */}
      <div className="mod-form-panel">
        <div className="mod-form-header">
          <h3 className="mod-form-title">
            <span className="mod-form-icon" style={{ background: "var(--purple-soft)", color: "var(--purple)" }}>
              {isEditing ? <IcoEdit /> : <IcoPlus />}
            </span>
            {isEditing ? "Edit Project" : "New Project"}
          </h3>
          {isEditing && <button className="mod-btn-cancel" onClick={() => { setForm(emptyForm); setEditId(null); }}>✕ Cancel</button>}
        </div>
        <div className="mod-form-body">
          {[["Project Name","projectName","text","e.g. Solar Panel Installation"],
            ["Project Code","projectCode","text","PROJ-001"],
            ["Client Name","clientName","text","Client name"],
            ["Planned Budget","plannedBudget","number","0.00"]].map(([lbl,key,type,ph]) => (
            <div key={key} className="mod-field">
              <label className="mod-label">{lbl}</label>
              <input className="mod-input" type={type} placeholder={ph} value={form[key]} onChange={e => set(key, e.target.value)} />
            </div>
          ))}
          {[["Planned Start","plannedStartDate"],["Planned End","plannedEndDate"]].map(([lbl,key]) => (
            <div key={key} className="mod-field">
              <label className="mod-label">{lbl}</label>
              <input className="mod-input" type="date" value={form[key]} onChange={e => set(key, e.target.value)} />
            </div>
          ))}
          {isEditing && (
            <div className="mod-field">
              <label className="mod-label">Status</label>
              <select className="mod-select" value={form.status} onChange={e => set("status", e.target.value)}>
                {["PLANNED","IN_PROGRESS","ON_HOLD","COMPLETED","CLOSED"].map(s => (
                  <option key={s} value={s}>{s.replace("_"," ")}</option>
                ))}
              </select>
            </div>
          )}
          <button className={`mod-submit-btn ${isEditing ? "mod-submit-btn--update" : ""}`}
            style={!isEditing ? { background: "linear-gradient(135deg,var(--purple),#7c3aed)", boxShadow: "0 3px 10px var(--purple-soft)" } : {}}
            onClick={submitProject}>
            {isEditing ? <><IcoEdit /> Update</> : <><IcoPlus /> Add Project</>}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mod-table-panel">
        <div className="mod-table-header"><span className="mod-table-title">Project Register</span></div>
        <div className="table-scroll">
          <table className="mod-table">
            <thead><tr>
              <th>ID</th><th>Code</th><th>Name</th><th>Client</th>
              <th>Start</th><th>End</th><th>Duration</th>
              <th>Budget</th><th>Status</th>
              <th>Created By</th><th>Created At</th><th>Updated At</th><th>Action</th>
            </tr></thead>
            <tbody>
              {projects.length > 0 ? projects.map((p, i) => {
                const sc = STATUS_COLORS[p.status] || STATUS_COLORS.PLANNED;
                return (
                  <tr key={p.id}>
                    <td className="mod-td-id">#{p.id}</td>
                    <td style={{ color: "var(--primary)", fontWeight: 600, fontFamily: "monospace" }}>{p.projectCode}</td>
                    <td><strong>{p.projectName}</strong></td>
                    <td>{p.clientName || "—"}</td>
                    <td>{p.plannedStartDate}</td>
                    <td>{p.plannedEndDate}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{duration(p.plannedStartDate, p.plannedEndDate)}</td>
                    <td className="mod-amount">₹ {Number(p.plannedBudget || 0).toLocaleString("en-IN")}</td>
                    <td>
                      <span className="mod-badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                        {(p.status || "PLANNED").replace("_"," ")}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>{p.createdBy || "—"}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{p.createdAt || "—"}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{p.updatedAt || "—"}</td>
                    <td>
                      <button className="mod-btn-edit" onClick={() => startEdit(p)}><IcoEdit /> Edit</button>
                    </td>
                  </tr>
                );
              }) : <tr className="mod-empty-row"><td colSpan="13">No projects found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
