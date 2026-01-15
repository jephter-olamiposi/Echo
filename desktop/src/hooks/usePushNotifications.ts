import { useEffect, useRef, useCallback } from "react";
import { apiFetch } from "../api";
import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";

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
      if (!token) {
        return false;
      }

      try {
        await apiFetch("/push/register", {
          method: "POST",
          body: JSON.stringify({
            device_id: deviceId,
            token: fcmToken,
          }),
        });
        hasRegistered.current = true;
        return true;
      } catch (error) {
        console.error("[Push] Error registering token:", error);
        return false;
      }
    },
    [token, deviceId]
  );

  useEffect(() => {
    hasRegistered.current = false;
  }, [token, deviceId]);

  useEffect(() => {
    if (!token || !isConnected || hasRegistered.current) {
      return;
    }

    const initPush = async () => {
      try {
        const { type } = await import("@tauri-apps/plugin-os");
        const platform = type();

        if (platform !== "android" && platform !== "ios") {
          return;
        }

        let permission = await isPermissionGranted();
        if (!permission) {
          permission = (await requestPermission()) === "granted";
        }

        if (!permission) {
          console.warn("[Push] Notification permission denied");
          return;
        }

        let bridge = window.EchoBridge;
        let attempts = 0;
        while (!bridge && attempts < 20) {
          await new Promise((r) => setTimeout(r, 250));
          bridge = window.EchoBridge;
          attempts++;
        }

        if (!bridge) {
          console.warn("[Push] Bridge not available after timeout");
          return;
        }

        let fcmToken = bridge.getFcmToken?.();
        let tokenAttempts = 0;
        while (!fcmToken && tokenAttempts < 5) {
          await new Promise((r) => setTimeout(r, 1000));
          fcmToken = bridge.getFcmToken?.();
          tokenAttempts++;
        }

        if (fcmToken) {
          await registerPushToken(fcmToken);
        } else {
          console.warn("[Push] FCM token not available after retries");
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
      if (bridge?.wasOpenedFromPush?.()) {
        onSyncRequest();
        bridge.clearOpenedFromPush?.();
      }
    };

    checkPushOpen();

    const handleSyncTrigger = () => {
      onSyncRequest();
    };

    window.addEventListener("echo-sync-trigger", handleSyncTrigger);
    return () =>
      window.removeEventListener("echo-sync-trigger", handleSyncTrigger);
  }, [onSyncRequest]);

  return { registerPushToken };
}
