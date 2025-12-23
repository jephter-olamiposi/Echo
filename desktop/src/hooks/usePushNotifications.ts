import { useEffect, useRef, useCallback } from "react";
import { config } from "../config";

declare global {
  interface Window {
    EchoBridge?: {
      getFcmToken(): string | null;
      wasOpenedFromPush(): boolean;
    };
  }
}

interface UsePushNotificationsOptions {
  token: string | null;
  deviceId: string;
  isConnected?: boolean;
  onSyncRequest?: () => void;
}

export function usePushNotifications({
  token,
  deviceId,
  isConnected,
  onSyncRequest,
}: UsePushNotificationsOptions) {
  const hasRegistered = useRef(false);

  const registerPushToken = useCallback(
    async (fcmToken: string) => {
      if (!token) return;

      try {
        const response = await fetch(`${config.apiUrl}/push/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            device_id: deviceId,
            token: fcmToken,
          }),
        });

        if (response.ok) {
          console.log("[Push] Token registered with backend");
          hasRegistered.current = true;
        }
      } catch (error) {
        console.error("[Push] Error registering token:", error);
      }
    },
    [token, deviceId]
  );

  useEffect(() => {
    if (!token || !isConnected || hasRegistered.current) return;

    const initPush = async () => {
      try {
        const { type } = await import("@tauri-apps/plugin-os");
        const platform = type();

        if (platform !== "android" && platform !== "ios") return;

        const bridge = window.EchoBridge;
        if (!bridge) {
          setTimeout(initPush, 500);
          return;
        }

        const fcmToken = bridge.getFcmToken();
        if (fcmToken) {
          await registerPushToken(fcmToken);
        } else {
          setTimeout(initPush, 1000);
        }
      } catch (error) {
        console.error("[Push] Error initializing:", error);
      }
    };

    initPush();
  }, [token, isConnected, registerPushToken]);

  useEffect(() => {
    if (!onSyncRequest) return;

    const checkPushOpen = () => {
      const bridge = window.EchoBridge;
      if (bridge?.wasOpenedFromPush()) {
        onSyncRequest();
      }
    };

    checkPushOpen();
    const interval = setInterval(checkPushOpen, 2000);
    return () => clearInterval(interval);
  }, [onSyncRequest]);

  return { registerPushToken };
}
