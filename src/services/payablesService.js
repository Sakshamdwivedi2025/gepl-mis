const BASE_URL = "http://192.168.29.68:8080";
function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : ""
  };
}

/* ============== GET (PAGEABLE) ============== */
export async function getPayables(page = 0, size = 10) {
  const res = await fetch(
    `${BASE_URL}/api/payables?page=${page}&size=${size}`,
    { headers: authHeaders() }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch payables");
  }
  return res.json();
}

/* ============== POST (CREATE) ============== */
export async function addPayable(data) {
  const res = await fetch(`${BASE_URL}/api/payables`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}

/* ============== PUT (UPDATE) ============== */
export async function updatePayable(id, data) {
  const res = await fetch(`${BASE_URL}/api/payables/${id}/pay`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}
