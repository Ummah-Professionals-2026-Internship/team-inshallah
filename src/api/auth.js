// Frontend connector for the login / sign up API (backend routes: /api/auth/*).
// The login and signup pages import these helpers instead of writing raw
// fetch calls, so all the "talk to the backend" logic lives in one place.

const TOKEN_KEY = "up_token"; // where we keep the login token in the browser

// --- token storage (so the user stays logged in across refreshes) ---
export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
export function isLoggedIn() {
  return !!getToken();
}

// small helper: send a JSON request and return the parsed response.
// if the backend responds with an error, throw its message so the page can show it.
async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };

  // attach the login token on protected calls (like /me)
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Something went wrong. Please try again.");
  }
  return data;
}

// --- the functions the login / signup pages actually call ---

// create an account, then remember the login token
export async function signup({ email, password, role }) {
  const data = await request("/api/auth/signup", {
    method: "POST",
    body: { email, password, role },
  });
  if (data.token) saveToken(data.token);
  return data.user;
}

// log in, then remember the login token
export async function login({ email, password }) {
  const data = await request("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
  if (data.token) saveToken(data.token);
  return data.user;
}

// ask the backend "who is logged in?" using the saved token (used on page load)
export async function getMe() {
  const data = await request("/api/auth/me", { auth: true });
  return data.user;
}

// log out = forget the token on this device
export function logout() {
  clearToken();
}
