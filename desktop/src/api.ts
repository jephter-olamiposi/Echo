import { config } from "./config";
import { Store } from "@tauri-apps/plugin-store";

const AUTH_STORE_PATH = "echo-auth.json";
const TOKEN_KEY = "auth_token";

let authStore: Store | null = null;
const getAuthStore = async () => (authStore ??= await Store.load(AUTH_STORE_PATH));

// Secure token management functions
export async function saveAuthToken(token: string): Promise<void> {
  const store = await getAuthStore();
  await store.set(TOKEN_KEY, token);
  await store.save();
}

export async function getAuthToken(): Promise<string | null> {
  try {
    const store = await getAuthStore();
    return await store.get<string>(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export async function removeAuthToken(): Promise<void> {
  try {
    const store = await getAuthStore();
    await store.delete(TOKEN_KEY);
    await store.save();
  } catch {
    // Ignore errors during token removal
  }
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${config.apiUrl}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    await removeAuthToken();
    window.dispatchEvent(new Event("auth-error"));
  }

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || "Request failed");
  }

  return response.json();
}
