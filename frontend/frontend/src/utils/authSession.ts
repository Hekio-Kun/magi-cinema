export const AUTH_CHANGE_EVENT = "auth-change";

const TOKEN_KEY = "jwt_token";
type AuthChangeListener = () => void;

function normalizeStoredToken(value: string | null): string | null {
  const token = value?.trim();
  if (!token || token === "undefined" || token === "null") {
    return null;
  }
  return token;
}

export function getAuthToken(): string | null {
  return normalizeStoredToken(localStorage.getItem(TOKEN_KEY));
}

export function setAuthToken(token: string): void {
  const normalized = normalizeStoredToken(token);
  if (!normalized) {
    throw new Error("Không thể lưu token đăng nhập rỗng hoặc không hợp lệ.");
  }
  localStorage.setItem(TOKEN_KEY, normalized);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  notifyAuthChange();
}

export function notifyAuthChange(): void {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function subscribeAuthChanges(listener: AuthChangeListener): () => void {
  const handleAuthChange = () => listener();
  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === TOKEN_KEY) {
      listener();
    }
  };

  window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    window.removeEventListener("storage", handleStorage);
  };
}
