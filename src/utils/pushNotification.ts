// Service worker registration helper
export const registerServiceWorker = async () => {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    return reg;
  } catch (err) {
    console.warn("ServiceWorker registration failed:", err);
    return null;
  }
};

// Request permission and send OS notification
export const requestPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  try {
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
};

// Send system notification (works on Android PWA, iOS PWA, Chrome & Desktop)
export const sendOSNotification = async (title: string, body: string, icon = "/icon-192.png") => {
  try {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    // 1. Try Service Worker showNotification first (Required for Mobile PWA / Android / iOS)
    if ("serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, {
            body,
            icon,
            badge: "/icon-192.png",
            vibrate: [100, 50, 100],
            data: { url: "/" },
          } as NotificationOptions);
          return;
        }
      } catch (swErr) {
        console.warn("SW showNotification failed, trying fallback:", swErr);
      }
    }

    // 2. Desktop Browser fallback
    new Notification(title, { body, icon });
  } catch (err) {
    console.error("OS Notification error:", err);
  }
};

interface NavigatorBadge extends Navigator {
  setAppBadge?: (count: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
}

// Update PWA badge count
export const updateBadge = async (count: number) => {
  try {
    const nav = navigator as NavigatorBadge;

    if ("setAppBadge" in nav) {
      if (count > 0) {
        await nav.setAppBadge?.(count);
      } else {
        await nav.clearAppBadge?.();
      }
    }
  } catch (err) {
    console.log("Badge error:", err);
  }
};