import { useEffect, useRef, useCallback } from "react";
import { apiFetch } from "../api";
import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";

declare global {
  interface Window {
    EchoBridge?: {
      getFcmToken(): string | null;
      wasOpenedFromPush(): boolean;
      clearOpenedFromPush(): void;
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
        await apiFetch("/push/register", {
          method: "POST",
          body: JSON.stringify({
            device_id: deviceId,
            token: fcmToken,
          }),
        });
        hasRegistered.current = true;
      } catch (error) {
        console.error("[Push] Error registering token:", error);
      }
    },
    [token, deviceId]
  );

  useEffect(() => {
    hasRegistered.current = false;
  }, [token, deviceId]);

  useEffect(() => {
    if (!token || !isConnected || hasRegistered.current) return;

    const initPush = async () => {
      try {
        const { type } = await import("@tauri-apps/plugin-os");
        const platform = type();

        if (platform !== "android" && platform !== "ios") return;

        // REQUEST PERMISSION HERE
        let permission = await isPermissionGranted();
        if (!permission) {
          permission = (await requestPermission()) === "granted";
        }

        if (!permission) {
          console.warn("[Push] Notification permission denied");
          return;
        }

        const checkForBridge = async (
          retries = 0
        ): Promise<NonNullable<Window["EchoBridge"]>> => {
          if (window.EchoBridge) return window.EchoBridge;

          if (retries > 20) throw new Error("Bridge not ready after timeout");

          return new Promise((resolve) => {
            const onBridgeReady = () => {
              window.removeEventListener("EchoBridgeReady", onBridgeReady);
              resolve(window.EchoBridge!);
            };

            setTimeout(async () => {
              if (window.EchoBridge) resolve(window.EchoBridge);
              else resolve(await checkForBridge(retries + 1));
            }, 250);

            window.addEventListener("EchoBridgeReady", onBridgeReady);
          });
        };

        const bridge = await checkForBridge().catch((e) => {
          console.warn("[Push] Bridge check failed:", e);
          return null;
        });

        if (!bridge) return;

        const fcmToken = bridge.getFcmToken?.();
        if (fcmToken) {
          await registerPushToken(fcmToken);
        } else {
          // Retry with exponential backoff (1s, 2s, 4s, 8s, 16s)
          const retryGetToken = async (attempt = 0, maxAttempts = 5) => {
            if (attempt >= maxAttempts) {
              console.warn("[Push] FCM token not available after max retries");
              return;
            }
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise((r) => setTimeout(r, delay));
            const token = bridge.getFcmToken?.();
            if (token) {
              registerPushToken(token);
            } else {
              retryGetToken(attempt + 1, maxAttempts);
            }
          };
          retryGetToken();
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
      if (bridge && bridge.wasOpenedFromPush?.()) {
        console.log("[Push] Cold start from notification");
        onSyncRequest();
        bridge.clearOpenedFromPush?.();
      }
    };

    // Check on mount (for cold start)
    checkPushOpen();

    // Listen for warm start event from Android
    const handleSyncTrigger = () => {
      console.log("[Push] Warm start sync triggered");
      onSyncRequest();
    };

    window.addEventListener("echo-sync-trigger", handleSyncTrigger);

    return () => {
      window.removeEventListener("echo-sync-trigger", handleSyncTrigger);
    };
  }, [onSyncRequest]);

  return { registerPushToken };
}
