const BASE_URL = import.meta.env.VITE_BASE_URL;
function authHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` })
  };
}

/* ================= GET (PAGEABLE) ================= */
export async function getProcurements(page = 0, size = 5) {
  const res = await fetch(
    `${BASE_URL}/api/procurement?page=${page}&size=${size}`,
    { headers: authHeaders() }
  );

  if (!res.ok) throw new Error(await res.text());

  return res.json();
}

/* ================= POST ================= */
export async function addProcurement(data) {
  const res = await fetch(`${BASE_URL}/api/procurement`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data)
  });

  if (!res.ok) throw new Error(await res.text());

  return res.json();
}

/* ================= PUT ================= */
export async function updateProcurement(id, data) {
  const res = await fetch(`${BASE_URL}/api/procurement/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data)
  });

  if (!res.ok) throw new Error(await res.text());

  return res.json();
}
/* ================= RECEIVE PROCUREMENT ================= */

export async function receiveProcurement(procurementId, payload) {
  const res = await fetch(
    `${BASE_URL}/api/procurement/${procurementId}/receive`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload)
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Failed to receive material");
  }

  return res.json();
}
