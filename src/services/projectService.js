const BASE_URL = import.meta.env.VITE_BASE_URL;
function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : ""
  };
}

/* ============== GET (PAGEABLE) ============== */
export async function getProjects(page = 0, size = 5) {
  const res = await fetch(
    `${BASE_URL}/api/projects?page=${page}&size=${size}`,
    { headers: authHeaders() }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch projects");
  }

  return res.json();
}

/* ============== POST ============== */
export async function addProject(data) {
  const res = await fetch(`${BASE_URL}/api/projects`, {
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
export async function updateProject(id, data) {
  const res = await fetch(`${BASE_URL}/api/projects/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}
