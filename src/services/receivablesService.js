const BASE_URL = "http://192.168.29.68:8080";
function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : ""
  };
}

/* ============== GET (PAGEABLE) ============== */
export async function getReceivables(page = 0, size = 5) {
  const res = await fetch(
    `${BASE_URL}/api/receivables?page=${page}&size=${size}`,
    { headers: authHeaders() }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch receivables");
  }

  return res.json(); // pageable response (includes status)
}

/* ============== POST (CREATE) ============== */
export async function addReceivable(data) {
  const res = await fetch(`${BASE_URL}/api/receivables`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

/* ============== PUT (UPDATE – STATUS INCLUDED) ============== */
export async function updateReceivable(id, data) {
  const res = await fetch(`${BASE_URL}/api/receivables/${id}/pay`, {
    method: "POST", // ✅ FIXED (was POST)
    headers: authHeaders(),
    body: JSON.stringify(data) // status goes here
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json(); // updated entity with status
}

