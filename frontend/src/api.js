const BASE = import.meta.env.VITE_API_URL || "";

export const getToken = () => localStorage.getItem("token");
export const setSession = (user) => {
  localStorage.setItem("token", user.token);
  localStorage.setItem("user", JSON.stringify({ ...user, token: undefined }));
};
export const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};
export const getUser = () => {
  try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
};

export async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error("Cannot reach the server. Start the backend with: uvicorn main:app --reload");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && getToken()) { clearSession(); window.location.href = "/login"; }
    const detail = Array.isArray(data.detail) ? "Please check the entered values" : data.detail;
    throw new Error(detail || "Something went wrong. Try again");
  }
  return data;
}
