import {
  impactFeedback,
  notificationFeedback,
  selectionFeedback,
} from "@tauri-apps/plugin-haptics";

export const haptic = {
  light: () => {
    impactFeedback("light").catch(() => {});
  },
  medium: () => {
    impactFeedback("medium").catch(() => {});
  },
  success: () => {
    notificationFeedback("success").catch(() => {});
  },
  selection: () => {
    selectionFeedback().catch(() => {});
  },
};
