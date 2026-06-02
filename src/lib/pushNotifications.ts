import type { BuildingAnnouncement, NotificationPreference, Profile } from "../types";
import { isSupabaseConfigured, supabase } from "./supabase";

export const defaultNotificationPreferences: Omit<NotificationPreference, "id" | "user_id" | "updated_at"> = {
  personal_notifications: true,
  building_notifications: true,
  help_notifications: true,
  report_notifications: true,
  knowledge_notifications: true,
  bulletin_notifications: false,
};

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function arrayBufferToBase64(buffer: ArrayBuffer | null) {
  if (!buffer) return "";
  return window.btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

export function pushSupported() {
  return "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

export function localPreferenceKey(userId: string) {
  return `mijn-graaf-van-schuyt:${userId}:notification-preferences`;
}

export function mergeNotificationPreference(userId: string, preference?: NotificationPreference): NotificationPreference {
  return {
    ...defaultNotificationPreferences,
    ...preference,
    id: userId,
    user_id: userId,
    updated_at: preference?.updated_at ?? new Date().toISOString(),
  };
}

export async function saveNotificationPreference(preference: NotificationPreference) {
  window.localStorage.setItem(localPreferenceKey(preference.user_id), JSON.stringify(preference));
  if (!supabase) return;

  const { id: _id, ...databasePreference } = preference;
  void _id;
  await supabase.from("notification_preferences").upsert(databasePreference, { onConflict: "user_id" });
}

export async function enablePushNotifications(profile: Profile, preference: NotificationPreference) {
  if (!pushSupported()) {
    throw new Error("Pushmeldingen worden door deze browser niet ondersteund.");
  }
  if (!vapidPublicKey) {
    throw new Error("De publieke VAPID-sleutel ontbreekt nog in de omgevingsvariabelen.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Pushmeldingen zijn niet toegestaan.");
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));

  const p256dh = arrayBufferToBase64(subscription.getKey("p256dh"));
  const auth = arrayBufferToBase64(subscription.getKey("auth"));
  const storedSubscription = {
    user_id: profile.user_id,
    endpoint: subscription.endpoint,
    p256dh,
    auth,
  };

  window.localStorage.setItem(`mijn-graaf-van-schuyt:${profile.user_id}:push-subscription`, JSON.stringify(storedSubscription));
  await saveNotificationPreference(preference);

  if (isSupabaseConfigured && supabase) {
    await supabase.from("push_subscriptions").upsert(storedSubscription, { onConflict: "endpoint" });
  }

  return subscription;
}

export async function disablePushNotifications(profile: Profile) {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  await subscription?.unsubscribe();
  window.localStorage.removeItem(`mijn-graaf-van-schuyt:${profile.user_id}:push-subscription`);

  if (isSupabaseConfigured && supabase && subscription) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
  }
}

export async function notifyBuildingAnnouncement(announcement: BuildingAnnouncement, isUpdate: boolean) {
  if (!supabase || !isSupabaseConfigured) return;
  if (!announcement.notify_all || announcement.importance === "normaal") return;

  const urgent = announcement.importance === "urgent";
  await supabase.functions.invoke("send-push-notification", {
    body: {
      kind: "building_announcement",
      audience: "all",
      announcement_id: announcement.id,
      title: isUpdate ? "Melding bijgewerkt" : urgent ? "Urgente melding Graaf van Schuyt" : "Nieuwe melding Graaf van Schuyt",
      body: isUpdate
        ? `Een belangrijke mededeling is bijgewerkt: ${announcement.titel}`
        : urgent
          ? `${announcement.titel}\nBekijk de app voor meer informatie.`
          : `Er is een belangrijke mededeling geplaatst: ${announcement.titel}`,
      url: "/",
      category: "building",
      importance: announcement.importance,
    },
  });
}

export async function notifyUser(userId: string, payload: { title: string; body: string; url: string; category: "personal" | "help" | "report" | "knowledge" | "bulletin" }) {
  if (!supabase || !isSupabaseConfigured) return;

  await supabase.functions.invoke("send-push-notification", {
    body: {
      audience: "user",
      user_id: userId,
      title: payload.title,
      body: payload.body,
      url: payload.url,
      category: payload.category,
      importance: "normaal",
    },
  });
}
