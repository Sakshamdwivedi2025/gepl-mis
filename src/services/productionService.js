const BASE_URL = "http://192.168.29.68:8080";
function authHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` })
  };
}

/* ================= GET (PAGEABLE) ================= */
export async function getProduction(page = 0, size = 5) {
  try {
    const res = await fetch(
      `${BASE_URL}/api/production?page=${page}&size=${size}`,
      {
        method: "GET",
        headers: authHeaders()
      }
    );

    if (!res.ok) {
      const msg = await res.text();
      console.error("GET production error:", msg);
      throw new Error(msg || "Fetch failed");
    }

    return await res.json();
  } catch (err) {
    console.error("Network error:", err);
    throw err;
  }
}

/* ================= POST ================= */
export async function addProduction(data) {
  try {
    const res = await fetch(`${BASE_URL}/api/production`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const msg = await res.text();
      console.error("POST production error:", msg);
      throw new Error(msg);
    }

    return await res.json();
  } catch (err) {
    console.error("Network error:", err);
    throw err;
  }
}

/* ================= PUT ================= */
export async function updateProduction(id, data) {
  try {
    const res = await fetch(`${BASE_URL}/api/production/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const msg = await res.text();
      console.error("PUT production error:", msg);
      throw new Error(msg);
    }

    return await res.json();
  } catch (err) {
    console.error("Network error:", err);
    throw err;
  }
}
