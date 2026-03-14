import { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from "chart.js";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export default function VendorScorecard() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const procurement = JSON.parse(localStorage.getItem("procurement")) || [];
    setRows(procurement);
  }, []);

  const vendors = useMemo(() => {
    const map = {};
    rows.forEach(r => {
      if (!map[r.vendor]) {
        map[r.vendor] = { vendor: r.vendor, totalOrders: 0, onTime: 0, delayed: 0, totalDelay: 0, penalty: 0 };
      }
      map[r.vendor].totalOrders++;
      const expected = new Date(r.expectedDate);
      const received = r.receivedDate ? new Date(r.receivedDate) : new Date();
      const diff = Math.floor((received - expected) / 86400000);
      if (diff <= 0) { map[r.vendor].onTime++; }
      else { map[r.vendor].delayed++; map[r.vendor].totalDelay += diff; map[r.vendor].penalty += diff * 50 * Number(r.quantity); }
    });
    return Object.values(map);
  }, [rows]);

  const totalVendors = vendors.length;
  const avgOnTime    = vendors.reduce((s, v) => s + (v.onTime / v.totalOrders) * 100, 0) / (vendors.length || 1);
  const totalPenalty = vendors.reduce((s, v) => s + v.penalty, 0);

  const chartData = {
    labels: vendors.map(v => v.vendor),
    datasets: [{
      label: "On-Time %",
      data: vendors.map(v => Math.round((v.onTime / v.totalOrders) * 100)),
      borderColor: "#3b82f6",
      backgroundColor: "rgba(59,130,246,0.08)",
      tension: 0.4, fill: true, pointRadius: 5,
      pointBackgroundColor: "#3b82f6", pointBorderColor: "var(--bg-card)", pointBorderWidth: 2,
    }]
  };

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false },
      tooltip: { backgroundColor: "#1c2333", titleColor: "#e6edf3", bodyColor: "#7d8590",
        borderColor: "#30404f", borderWidth: 1, padding: 10, cornerRadius: 8 }
    },
    scales: {
      x: { grid: { color: "rgba(48,64,79,0.4)" }, ticks: { color: "#7d8590", font: { size: 11 } } },
      y: { min: 0, max: 100, grid: { color: "rgba(48,64,79,0.4)" },
           ticks: { color: "#7d8590", font: { size: 11 }, callback: v => `${v}%` } }
    }
  };

  const ratingOf = pct => pct >= 90 ? "excellent" : pct >= 75 ? "average" : "poor";
  const ratingColor = r => r === "excellent" ? "var(--success)" : r === "average" ? "var(--warning)" : "var(--danger)";
  const ratingBg    = r => r === "excellent" ? "var(--success-soft)" : r === "average" ? "var(--warning-soft)" : "var(--danger-soft)";

  return (
    <div className="mod-page">
      {/* Header */}
      <div className="mod-header">
        <div className="mod-header-left">
          <h2 className="mod-title">Vendor Scorecard</h2>
          <p className="mod-subtitle">Supplier delivery performance and penalty tracking</p>
        </div>
        <span className="mod-count-badge">{totalVendors} vendors</span>
      </div>

      {/* KPI Strip */}
      <div className="vs-kpi-row">
        <div className="vs-kpi vs-kpi--blue">
          <span className="vs-kpi-label">Total Vendors</span>
          <span className="vs-kpi-value">{totalVendors}</span>
        </div>
        <div className="vs-kpi vs-kpi--success">
          <span className="vs-kpi-label">Avg On-Time Rate</span>
          <span className="vs-kpi-value">{Math.round(avgOnTime)}%</span>
        </div>
        <div className="vs-kpi vs-kpi--danger">
          <span className="vs-kpi-label">Total Penalty</span>
          <span className="vs-kpi-value">₹ {totalPenalty.toLocaleString("en-IN")}</span>
        </div>
        <div className="vs-kpi vs-kpi--warning">
          <span className="vs-kpi-label">Delayed Orders</span>
          <span className="vs-kpi-value">{vendors.reduce((s, v) => s + v.delayed, 0)}</span>
        </div>
      </div>

      {/* Chart */}
      {vendors.length > 0 && (
        <div className="mod-table-panel">
          <div className="mod-table-header"><span className="mod-table-title">On-Time Delivery Performance</span></div>
          <div style={{ padding: "16px 20px", height: 220 }}>
            <Line data={chartData} options={chartOpts} />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="mod-table-panel">
        <div className="mod-table-header"><span className="mod-table-title">Vendor Performance Details</span></div>
        <div className="table-scroll">
          <table className="mod-table">
            <thead><tr>
              <th>Vendor</th><th>Total Orders</th><th>On-Time</th>
              <th>Delayed</th><th>On-Time %</th><th>Avg Delay</th>
              <th>Penalty (₹)</th><th>Rating</th>
            </tr></thead>
            <tbody>
              {vendors.length > 0 ? vendors.map((v, i) => {
                const pct = Math.round((v.onTime / v.totalOrders) * 100);
                const avgDelay = v.delayed > 0 ? Math.round(v.totalDelay / v.delayed) : 0;
                const rating = ratingOf(pct);
                return (
                  <tr key={i}>
                    <td><strong>{v.vendor}</strong></td>
                    <td>{v.totalOrders}</td>
                    <td style={{ color: "var(--success)", fontWeight: 600 }}>{v.onTime}</td>
                    <td style={{ color: v.delayed > 0 ? "var(--danger)" : "var(--text-muted)", fontWeight: 600 }}>{v.delayed}</td>
                    <td>
                      <div className="vs-progress-wrap">
                        <div className="vs-progress-bar-bg">
                          <div className="vs-progress-bar-fill" style={{ width: `${pct}%`, background: ratingColor(rating) }} />
                        </div>
                        <span style={{ color: ratingColor(rating), fontWeight: 700, fontSize: 12, minWidth: 36 }}>{pct}%</span>
                      </div>
                    </td>
                    <td style={{ color: avgDelay > 0 ? "var(--warning)" : "var(--text-muted)" }}>{avgDelay > 0 ? `${avgDelay}d` : "—"}</td>
                    <td className="mod-amount" style={{ color: v.penalty > 0 ? "var(--danger)" : "var(--text-muted)" }}>
                      {v.penalty > 0 ? `₹ ${v.penalty.toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td>
                      <span className="mod-badge" style={{ background: ratingBg(rating), color: ratingColor(rating), border: `1px solid ${ratingColor(rating)}30` }}>
                        {rating.charAt(0).toUpperCase() + rating.slice(1)}
                      </span>
                    </td>
                  </tr>
                );
              }) : (
                <tr className="mod-empty-row"><td colSpan="8">No vendor data — add procurement records with vendor names to see scorecard</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
