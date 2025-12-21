import { useRef, useCallback } from "react";
import { ClipboardEntry, LinkedDevice } from "../types";
import { config } from "../config";
import { encrypt, decrypt } from "../crypto";

const MSG_HANDSHAKE = "handshake";
const MSG_PRESENCE_JOIN = "__JOIN__";
const MSG_PRESENCE_LEAVE = "__LEAVE__";

interface UseWebSocketOptions {
  token: string | null;
  deviceId: string;
  deviceName: string;
  onConnectionChange: (connected: boolean) => void;
  onIncomingCopy: (entry: ClipboardEntry, isHistory?: boolean) => void;
  onDeviceJoin: (device: LinkedDevice) => void;
  onDeviceLeave: (deviceId: string) => void;
  encryptionKey?: Uint8Array | null;
}

export function useWebSocket({
  token,
  deviceId,
  deviceName,
  onConnectionChange,
  onIncomingCopy,
  onDeviceJoin,
  onDeviceLeave,
  encryptionKey,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const connect = useCallback(() => {
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) return;

    // Use environment variable for backend connection
    const wsUrl = `${config.wsUrl}/ws?token=${token}`;
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

      // Start client-side heartbeat (keep-alive)
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send("ping");
        }
      }, 15000);

      // Store interval to clear it on close
      (ws as any)._pingInterval = pingInterval;
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
          let content = msg.content;

          // Ignore ping messages that might have slipped through
          if (content === "ping") return;

          if (msg.encrypted && encryptionKey && msg.nonce) {
            try {
              content = decrypt(msg.content, msg.nonce, encryptionKey);
            } catch (e) {
              console.error("Decryption failed", e);
              return;
            }
          }

          onIncomingCopy(
            {
              id: Math.random().toString(36).substring(2, 11),
              content,
              timestamp: msg.timestamp,
              contentType: "text",
              source: "remote",
              deviceName: msg.device_name || "Remote Device",
              pinned: false,
            },
            msg.is_history
          );
        }
      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };

    ws.onclose = () => {
      onConnectionChange(false);
      // Clear heartbeat
      if ((ws as any)._pingInterval) clearInterval((ws as any)._pingInterval);

      wsRef.current = null;
      // Simple exponential backoff or fixed retry
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
    encryptionKey,
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
        let finalContent = text;
        let nonce: string | undefined;
        let encrypted = false;

        if (encryptionKey) {
          const result = encrypt(text, encryptionKey);
          finalContent = result.ciphertext;
          nonce = result.nonce;
          encrypted = true;
        }

        wsRef.current.send(
          JSON.stringify({
            device_id: deviceId,
            device_name: deviceName,
            content: finalContent,
            nonce,
            encrypted,
            timestamp: Date.now(),
          })
        );
      }
    },
    [deviceId, deviceName, encryptionKey]
  );

  return {
    wsRef,
    connect,
    disconnect,
    send,
  };
}
