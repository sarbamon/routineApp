// Request permission and send OS notification
export const requestPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  const result = await Notification.requestPermission();
  return result === "granted";
};

export const sendOSNotification = (title: string, body: string, icon = "/pwa-192x192.png") => {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  // Only send if tab is not focused
  if (document.visibilityState === "visible") return;
  new Notification(title, { body, icon });
};

// Update PWA badge count
export const updateBadge = async (count: number) => {
  try {
    const nav = navigator as Navigator & NavigatorBadge;

    if ("setAppBadge" in nav) {
      if (count > 0) {
        await nav.setAppBadge?.(count);
      } else {
        await nav.clearAppBadge?.();
      }
    } else {
      console.log("Badge API not supported");
    }
  } catch (err) {
    console.log("Badge error:", err);
  }
};