export const haptic = {
  light: async () => {
    try {
      const { impactFeedback } = await import("@tauri-apps/plugin-haptics");
      await impactFeedback("light");
    } catch {
      /* Silently fail on desktop */
    }
  },
  medium: async () => {
    try {
      const { impactFeedback } = await import("@tauri-apps/plugin-haptics");
      await impactFeedback("medium");
    } catch {
      /* Silently fail on desktop */
    }
  },
  success: async () => {
    try {
      const { notificationFeedback } = await import(
        "@tauri-apps/plugin-haptics"
      );
      await notificationFeedback("success");
    } catch {
      /* Silently fail on desktop */
    }
  },
  selection: async () => {
    try {
      const { selectionFeedback } = await import("@tauri-apps/plugin-haptics");
      await selectionFeedback();
    } catch {
      /* Silently fail on desktop */
    }
  },
};
