import type { BuildingAnnouncement, NotificationPreference, Profile } from "../types";
import { friendlyErrorMessage } from "./friendlyErrors";
import { isSupabaseConfigured, supabase } from "./supabase";

export const defaultNotificationPreferences: Omit<NotificationPreference, "id" | "user_id" | "updated_at"> = {
  personal_notifications: true,
  building_notifications: true,
  help_notifications: false,
  report_notifications: false,
  knowledge_notifications: false,
  bulletin_notifications: false,
};

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

async function invokePushFunction(body: Record<string, unknown>) {
  if (!supabase || !isSupabaseConfigured) return undefined;

  const { data, error } = await supabase.functions.invoke("send-push-notification", { body });
  if (error) {
    throw new Error(friendlyErrorMessage(error, "Pushmelding versturen lukt nu niet. Probeer het later opnieuw."));
  }
  return data as { sent?: number; skipped?: string; error?: string } | undefined;
}

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
    throw new Error("Pushmeldingen werken niet in deze browser. Probeer de app op je telefoon via Chrome, Edge of Safari als beginscherm-app.");
  }
  if (!vapidPublicKey) {
    throw new Error("Pushmeldingen zijn nog niet helemaal ingesteld. Geef dit door aan de beheerder.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Je browser staat pushmeldingen niet toe. Zet meldingen aan in je browser of telefooninstellingen.");
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
    const { error } = await supabase.from("push_subscriptions").upsert(storedSubscription, { onConflict: "endpoint" });
    if (error) throw error;
  }

  await registration.showNotification("Pushmeldingen staan aan", {
    body: "Je ontvangt nu belangrijke mededelingen en persoonlijke meldingen.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "push-enabled",
    data: { url: "/profiel" },
  });

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
  return invokePushFunction({
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
  });
}

export async function notifyUser(userId: string, payload: { title: string; body: string; url: string; category: "personal" | "help" | "report" | "knowledge" | "bulletin" }) {
  if (!supabase || !isSupabaseConfigured) return;

  return invokePushFunction({
    audience: "user",
    user_id: userId,
    title: payload.title,
    body: payload.body,
    url: payload.url,
    category: payload.category,
    importance: "normaal",
  });
}
