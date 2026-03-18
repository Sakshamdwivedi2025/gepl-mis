const BASE_URL = "http://192.168.29.68:8080";
function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : ""
  };
}

/* ============== GET FINISHED GOODS (PAGEABLE) ============== */
export async function getFinishedGoods(page = 0, size = 10) {
  const res = await fetch(
    `${BASE_URL}/api/finished-goods?page=${page}&size=${size}`,
    { headers: authHeaders() }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch finished goods");
  }

  return res.json();
}
