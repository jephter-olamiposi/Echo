// Basic platform check
const isAndroid = () => navigator.userAgent.includes("Android");

// Helper to sanitize WS URL
const getWsUrl = (apiUrl: string, explicitWsUrl?: string) => {
  if (explicitWsUrl) {
    if (explicitWsUrl.endsWith("/ws")) return explicitWsUrl;
    return `${explicitWsUrl}/ws`;
  }

  try {
    const url = new URL(apiUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    if (!url.pathname.endsWith("/ws")) {
      url.pathname = url.pathname.replace(/\/+$/, "") + "/ws";
    }
    return url.toString();
  } catch {
    return "ws://localhost:3000/ws";
  }
};

const getApiUrl = () => {
  let url = import.meta.env.VITE_API_URL || "http://localhost:3000";

  // Use 10.0.2.2 for Android emulator loopback
  if (isAndroid() && url.includes("localhost")) {
    url = url.replace("localhost", "10.0.2.2");
  }
  return url;
};

const API_URL = getApiUrl();
const WS_URL = getWsUrl(API_URL, import.meta.env.VITE_WS_URL);

export const config = {
  apiUrl: API_URL,
  wsUrl: WS_URL,
};
