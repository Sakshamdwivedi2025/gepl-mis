const BASE_URL = import.meta.env.VITE_BASE_URL;
function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : ""
  };
}

/* ================= GET (PAGEABLE) ================= */
export async function getCashTransactions(page = 0, size = 10) {
  const res = await fetch(
    `${BASE_URL}/api/cash?page=${page}&size=${size}`,
    { headers: authHeaders() }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch cash transactions");
  }

  return res.json(); // pageable object
}

/* ================= POST ================= */
export async function addCashTransaction(data) {
  const res = await fetch(`${BASE_URL}/api/cash`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }

  return res.json();
}

/* ================= PUT ================= */
export async function updateCashTransaction(id, data) {
  const res = await fetch(`${BASE_URL}/api/cash/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }

  return res.json();
}
