const BASE_URL = import.meta.env.VITE_BASE_URL;
/* LOGIN API */
export async function loginApi(username, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    throw new Error("Invalid credentials");
  }

  return res.json();
}

export async function signupApi(data) {
  const token = localStorage.getItem("token"); // 👈 founder token

  if (!token) {
    throw new Error("Unauthorized: Founder not logged in");
  }

  const response = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}` // 👈 SEND TOKEN
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || "Signup failed");
  }

  return response.json();
}
