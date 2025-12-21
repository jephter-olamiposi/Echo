import { config } from "./config";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("echo_token");
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
    localStorage.removeItem("echo_token");
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
