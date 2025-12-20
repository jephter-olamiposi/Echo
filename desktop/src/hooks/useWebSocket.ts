import { useRef, useCallback } from "react";
import { ClipboardEntry, LinkedDevice } from "../types";

const MSG_HANDSHAKE = "handshake";
const MSG_PRESENCE_JOIN = "__JOIN__";
const MSG_PRESENCE_LEAVE = "__LEAVE__";

interface UseWebSocketOptions {
  token: string | null;
  deviceId: string;
  deviceName: string;
  onConnectionChange: (connected: boolean) => void;
  onIncomingCopy: (entry: ClipboardEntry) => void;
  onDeviceJoin: (device: LinkedDevice) => void;
  onDeviceLeave: (deviceId: string) => void;
}

export function useWebSocket({
  token,
  deviceId,
  deviceName,
  onConnectionChange,
  onIncomingCopy,
  onDeviceJoin,
  onDeviceLeave,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const connect = useCallback(() => {
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) return;

    // Use environment variable or fallback to localhost
    const wsUrl = `ws://localhost:3000/ws?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      onConnectionChange(true);
      // Send handshake
      ws.send(
        JSON.stringify({
          device_id: deviceId,
          device_name: deviceName,
          content: MSG_HANDSHAKE,
          timestamp: Date.now(),
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.content === MSG_PRESENCE_JOIN) {
          onDeviceJoin({
            id: msg.device_id,
            name: msg.device_name || "Unknown Device",
            lastSeen: msg.timestamp,
            isCurrentDevice: msg.device_id === deviceId,
          });
        } else if (msg.content === MSG_PRESENCE_LEAVE) {
          onDeviceLeave(msg.device_id);
        } else {
          // Regular clipboard sync
          onIncomingCopy({
            id: Math.random().toString(36).substring(2, 11),
            content: msg.content,
            timestamp: msg.timestamp,
            contentType: "text",
            source: "remote",
            deviceName: msg.device_name || "Remote Device",
            pinned: false,
          });
        }
      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };

    ws.onclose = () => {
      onConnectionChange(false);
      wsRef.current = null;
      // Simple exponential backoff or fixed retry could go here
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = (e) => {
      console.error("WS Error", e);
    };
  }, [
    token,
    deviceId,
    deviceName,
    onConnectionChange,
    onIncomingCopy,
    onDeviceJoin,
    onDeviceLeave,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    onConnectionChange(false);
  }, [onConnectionChange]);

  const send = useCallback(
    (text: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            device_id: deviceId,
            device_name: deviceName,
            content: text,
            timestamp: Date.now(),
          })
        );
      }
    },
    [deviceId, deviceName]
  );

  return {
    wsRef,
    connect,
    disconnect,
    send,
  };
}
