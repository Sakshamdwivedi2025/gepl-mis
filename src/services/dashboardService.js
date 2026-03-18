const BASE_URL = "http://192.168.29.68:8080";
function authHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : ""
  };
}

/* ================= DASHBOARD KPI API ================= */
export async function getDashboardSummary() {
  const res = await fetch(`${BASE_URL}/api/kpi/org`, {
    headers: authHeaders()
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Failed to fetch dashboard");
  }

  return res.json();
}

export async function getProjectDashboard(projectId) {
  const res = await fetch(
    `${BASE_URL}/api/kpi/projects/${projectId}`,
    { headers: authHeaders() }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Failed to load project dashboard");
  }

  return res.json();
}

/* ===================================================== */
/* ================= USERS TABLE API =================== */
/* ===================================================== */

export async function getUsers(page = 0, size = 5) {
  const res = await fetch(
    `${BASE_URL}/api/auth/users?page=${page}&size=${size}`,
    { headers: authHeaders() }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Failed to fetch users");
  }

  return res.json();
}

/* ===================================================== */
/* ================= AUDIT LOG TABLE API =============== */
/* ===================================================== */

export async function getAuditLogs(page = 0, size = 5) {
  const res = await fetch(
    `${BASE_URL}/api/auth/audit?page=${page}&size=${size}`,
    { headers: authHeaders() }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Failed to fetch audit logs");
  }

  return res.json();
}

export async function resetUserPassword(userId, payload) {
  const token = localStorage.getItem("token");

  const res = await fetch(
    `${BASE_URL}/api/auth/${userId}/reset-password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    }
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}
