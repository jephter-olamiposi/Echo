export const config = {
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:3000",
  // Properly handle WebSocket URL - add /ws if not present
  wsUrl: (() => {
    const envWsUrl = import.meta.env.VITE_WS_URL;
    if (!envWsUrl) return "ws://localhost:3000/ws";
    // If user provided URL already has /ws endpoint, use as-is
    if (envWsUrl.endsWith("/ws")) return envWsUrl;
    // Otherwise append /ws to the provided URL
    return `${envWsUrl}/ws`;
  })(),
};
