import { config } from "./config";
import { Store } from "@tauri-apps/plugin-store";
import { fetch } from "@tauri-apps/plugin-http";
import { AppError, ErrorType } from "./utils/AppError";



const AUTH_STORE_PATH = "echo-auth.json";
const TOKEN_KEY = "auth_token";

let authStore: Store | null = null;
const getAuthStore = async () =>
  (authStore ??= await Store.load(AUTH_STORE_PATH));

export async function saveAuthToken(token: string): Promise<void> {
  const store = await getAuthStore();
  await store.set(TOKEN_KEY, token);
  await store.save();

  if (window.EchoBridge?.saveAuthToken) {
    try {
      window.EchoBridge.saveAuthToken(token);
    } catch (e) {
      console.warn("Failed to save token to Android SharedPreferences:", e);
    }
  }
}

export async function getAuthToken(): Promise<string | null> {
  try {
    const store = await getAuthStore();
    return (await store.get<string>(TOKEN_KEY)) || null;
  } catch {
    return null;
  }
}

export async function removeAuthToken(): Promise<void> {
  try {
    const store = await getAuthStore();
    await store.delete(TOKEN_KEY);
    await store.save();

    if (window.EchoBridge?.clearAuthToken) {
      try {
        window.EchoBridge.clearAuthToken();
      } catch (e) {
        console.warn(
          "Failed to clear token from Android SharedPreferences:",
          e
        );
      }
    }
  } catch {
  }
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${config.apiUrl}${path}`, {
      ...options,
      headers,
    });

    if (
      response.status === 401 &&
      !path.includes("/login") &&
      !path.includes("/register")
    ) {
      await removeAuthToken();
      window.dispatchEvent(new Event("auth-error"));
      throw new AppError("Session expired", ErrorType.AUTH, null, 401);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error || errorData.message || "Request failed";

      let type = ErrorType.UNKNOWN;
      if (response.status === 400) type = ErrorType.VALIDATION;
      if (response.status === 403) type = ErrorType.FORBIDDEN;
      if (response.status === 404) type = ErrorType.NOT_FOUND;
      if (response.status >= 500) type = ErrorType.SERVER;

      throw new AppError(message, type, errorData, response.status);
    }

    return response.json();
  } catch (err: any) {
    if (err instanceof AppError) throw err;

    const errorMessage = typeof err === "string" ? err : err?.message;

    const isNetworkError =
      (err instanceof TypeError && err.message === "Failed to fetch") ||
      (typeof errorMessage === "string" &&
        (errorMessage.includes("Network error") ||
          errorMessage.includes("connection refused") ||
          errorMessage.includes("connect error") ||
          errorMessage.includes("Failed to connect")));

    if (isNetworkError) {
      throw new AppError(
        "Network error. Please check your connection.",
        ErrorType.NETWORK,
        err
      );
    }

    throw AppError.from(err);
  }
}


export async function fetchClipboardHistory(): Promise<any[]> {
  return apiFetch("/history", { method: "GET" });
}
