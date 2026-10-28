const TOKEN_KEY = "hs_token";
const USER_KEY = "hs_user";
const SESSION_TOKEN_KEY = "hs_session_token";

export const setToken = (token: string, remember = true) => {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  }
};
export const getToken = () =>
  typeof window === "undefined"
    ? null
    : localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(SESSION_TOKEN_KEY);
export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
};

export const setUser = (user: { id: string; name: string; email: string }) =>
  localStorage.setItem(USER_KEY, JSON.stringify(user));
export const getUser = () => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { id: string; name: string; email: string };
  } catch {
    return null;
  }
};
export const removeUser = () => localStorage.removeItem(USER_KEY);

export const clearAuth = () => {
  removeToken();
  removeUser();
};
