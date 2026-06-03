// Web-push helpers. iOS Safari vereist dat de PWA op het beginscherm staat
// (display-mode: standalone) voordat Notification.permission gevraagd mag worden.

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function pushSupported(): boolean {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if ((window.navigator as { standalone?: boolean }).standalone === true) return true;
  return window.matchMedia("(display-mode: standalone)").matches;
}

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

export async function ensurePushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported() || !VAPID_PUBLIC) return null;
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
  });
  return sub;
}

export async function registerPushOnServer(sub: PushSubscription, accessToken: string, userAgent?: string): Promise<void> {
  const body = sub.toJSON();
  await fetch("/api/push-subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      endpoint: body.endpoint,
      keys: body.keys,
      user_agent: userAgent ?? navigator.userAgent,
    }),
  });
}
