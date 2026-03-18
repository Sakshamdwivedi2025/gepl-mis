const BASE_URL = "http://192.168.29.68:8080";
function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : ""
  };
}

/* ============== GET (PAGEABLE) ============== */
export async function getInventory(page = 0, size = 10) {
  const res = await fetch(
    `${BASE_URL}/api/inventory?page=${page}&size=${size}`,
    { headers: authHeaders() }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch inventory");
  }

  return res.json(); // pageable response
}

/* ============== POST ============== */
export async function addInventoryItem(data) {
  const res = await fetch(`${BASE_URL}/api/inventory`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

/* ============== PUT ============== */
export async function updateInventoryItem(id, data) {
  const res = await fetch(`${BASE_URL}/api/inventory/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}
