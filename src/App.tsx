import { useMemo, type ReactNode } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { LoadingState } from "./components/LoadingState";
import * as mock from "./data/mockData";
import { useSupabaseCollection } from "./hooks/useSupabaseCollection";
import { AppDataContext, type AppDataContextValue } from "./lib/AppDataContext";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { ConfirmProvider } from "./lib/ConfirmContext";
import {
  accessRequestToRow,
  buildingAnnouncementToRow,
  bulletinMessageToRow,
  bulletinPostToRow,
  contactToRow,
  feedbackItemToRow,
  helpMessageToRow,
  helpOfferToRow,
  helpRequestToRow,
  knowledgeDocumentToRow,
  mapAccessRequest,
  mapBuildingAnnouncement,
  mapBulletinMessage,
  mapBulletinPost,
  mapContact,
  mapFeedbackItem,
  mapHelpMessage,
  mapHelpOffer,
  mapHelpRequest,
  mapKnowledgeDocument,
  mapNotificationPreference,
  mapProfile,
  mapReport,
  notificationPreferenceToRow,
  profileToRow,
  reportToRow,
} from "./lib/dataMappers";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { paths } from "./routes/paths";
import { AdminPage } from "./pages/AdminPage";
import { AuthPage } from "./pages/AuthPage";
import { BulletinPage } from "./pages/BulletinPage";
import { ContactsPage } from "./pages/ContactsPage";
import { HelpPage } from "./pages/HelpPage";
import { HomePage } from "./pages/HomePage";
import { KnowledgePage } from "./pages/KnowledgePage";
import { ProfilePage } from "./pages/ProfilePage";
import { ReportsPage } from "./pages/ReportsPage";
import { UpdatePasswordPage } from "./pages/UpdatePasswordPage";
import type { AccessRequest, BuildingAnnouncement, BulletinMessage, BulletinPost, Contact, FeedbackItem, HelpMessage, HelpOffer, HelpRequest, KnowledgeDocument, NotificationPreference, Profile, Report } from "./types";

function requireSupabase() {
  if (!supabase) throw new Error("Supabase is nog niet gekoppeld.");
  return supabase;
}

function isMissingSchemaColumnError(error: unknown, columns: string[]) {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : "";
  return columns.some((column) => message.includes(`'${column}'`) || message.includes(`"${column}"`)) && message.includes("schema cache");
}

function omitColumns<T extends Record<string, unknown>>(row: T, columns: string[]) {
  const next = { ...row };
  columns.forEach((column) => delete next[column]);
  return next;
}

async function getCurrentActor() {
  const client = requireSupabase();
  const userId = (await client.auth.getUser()).data.user?.id;
  if (!userId) return { userId: undefined, canManageAll: false };

  const { data } = await client.from("profiles").select("rol").eq("user_id", userId).maybeSingle();
  return { userId, canManageAll: data?.rol === "admin" };
}

async function syncHelpOffers(helpRequestId: string, previousOffers: HelpOffer[] = [], nextOffers: HelpOffer[] = []) {
  const client = requireSupabase();
  const { userId: currentUserId, canManageAll } = await getCurrentActor();
  const previousIds = new Set(previousOffers.map((offer) => offer.id));
  const nextIds = new Set(nextOffers.map((offer) => offer.id));
  const added = nextOffers.filter((offer) => !previousIds.has(offer.id) && (offer.helper_id === currentUserId || canManageAll));
  const removed = previousOffers.filter((offer) => !nextIds.has(offer.id) && (offer.helper_id === currentUserId || canManageAll));

  if (added.length > 0) {
    const { error } = await client.from("help_offers").upsert(added.map(helpOfferToRow));
    if (error) throw error;
  }
  if (removed.length > 0) {
    const { error } = await client.from("help_offers").delete().in("id", removed.map((offer) => offer.id));
    if (error) throw error;
  }
  if (currentUserId && nextOffers.length === 0 && previousOffers.some((offer) => offer.helper_id === currentUserId)) {
    const { error } = await client.from("help_offers").delete().eq("help_request_id", helpRequestId).eq("helper_id", currentUserId);
    if (error) throw error;
  }
}

async function syncHelpMessages(helpRequestId: string, previousMessages: HelpMessage[] = [], nextMessages: HelpMessage[] = []) {
  const client = requireSupabase();
  const { userId: currentUserId, canManageAll } = await getCurrentActor();
  const previousById = new Map(previousMessages.map((message) => [message.id, message]));
  const nextIds = new Set(nextMessages.map((message) => message.id));
  const added = nextMessages.filter((message) => !previousById.has(message.id) && (message.author_id === currentUserId || canManageAll));
  const changed = nextMessages.filter(
    (message) => previousById.has(message.id) && previousById.get(message.id)?.message !== message.message && (message.author_id === currentUserId || canManageAll),
  );
  const removed = previousMessages.filter((message) => !nextIds.has(message.id) && (message.author_id === currentUserId || canManageAll));

  if (added.length > 0) {
    const { error } = await client.from("help_messages").upsert(added.map((message) => helpMessageToRow(message, helpRequestId)));
    if (error) throw error;
  }
  await Promise.all(changed.map(async (message) => {
    const { error } = await client.from("help_messages").update({ message: message.message }).eq("id", message.id);
    if (error) throw error;
  }));
  if (removed.length > 0) {
    const { error } = await client.from("help_messages").delete().in("id", removed.map((message) => message.id));
    if (error) throw error;
  }
}

async function syncBulletinMessages(bulletinPostId: string, previousMessages: BulletinMessage[] = [], nextMessages: BulletinMessage[] = []) {
  const client = requireSupabase();
  const { userId: currentUserId, canManageAll } = await getCurrentActor();
  const previousById = new Map(previousMessages.map((message) => [message.id, message]));
  const nextIds = new Set(nextMessages.map((message) => message.id));
  const added = nextMessages.filter((message) => !previousById.has(message.id) && (message.author_id === currentUserId || canManageAll));
  const changed = nextMessages.filter(
    (message) => previousById.has(message.id) && previousById.get(message.id)?.message !== message.message && (message.author_id === currentUserId || canManageAll),
  );
  const removed = previousMessages.filter((message) => !nextIds.has(message.id) && (message.author_id === currentUserId || canManageAll));

  if (added.length > 0) {
    const { error } = await client.from("bulletin_messages").upsert(added.map((message) => bulletinMessageToRow(message, bulletinPostId)));
    if (error) throw error;
  }
  await Promise.all(changed.map(async (message) => {
    const { error } = await client.from("bulletin_messages").update({ message: message.message }).eq("id", message.id);
    if (error) throw error;
  }));
  if (removed.length > 0) {
    const { error } = await client.from("bulletin_messages").delete().in("id", removed.map((message) => message.id));
    if (error) throw error;
  }
}

function AppDataProvider({ children }: { children: ReactNode }) {
  const { configured, loading, passwordRecovery, user, profile } = useAuth();
  const useDatabase = configured && Boolean(user) && Boolean(profile) && isSupabaseConfigured;

  const profilesOptions = useMemo(() => ({
    storageKey: "mijn-graaf-van-schuyt:profiles",
    enabled: useDatabase,
    fetchItems: async () => {
      const { data, error } = await requireSupabase().from("profiles").select("*").order("huisnummer", { ascending: true }).order("naam_of_bijnaam");
      if (error) throw error;
      return (data ?? []).map(mapProfile);
    },
    insertItem: async (item: Profile) => {
      const { error } = await requireSupabase().from("profiles").upsert(profileToRow(item), { onConflict: "user_id" });
      if (error) throw error;
    },
    updateItem: async (_id: string, changes: Partial<Profile>, nextItem: Profile) => {
      const editableChanges: Partial<Profile> = {};
      if (changes.rol) editableChanges.rol = changes.rol;
      if (changes.naam_of_bijnaam) editableChanges.naam_of_bijnaam = changes.naam_of_bijnaam;
      if ("achternaam" in changes) editableChanges.achternaam = nextItem.achternaam;
      if ("huisnummer" in changes) editableChanges.huisnummer = nextItem.huisnummer;
      if ("verdieping_of_gebouwdeel" in changes) editableChanges.verdieping_of_gebouwdeel = nextItem.verdieping_of_gebouwdeel;
      if ("profielfoto_url" in changes) editableChanges.profielfoto_url = nextItem.profielfoto_url;
      if ("email" in changes) editableChanges.email = nextItem.email;
      const row = profileToRow({ ...nextItem, ...editableChanges });
      const { error } = await requireSupabase().from("profiles").update(row).eq("id", nextItem.id);
      if (error) throw error;
    },
    deleteItem: async (id: string, item?: Profile) => {
      if (item?.user_id) {
        const { error } = await requireSupabase().rpc("admin_delete_user", { target_user_id: item.user_id });
        if (error) throw error;
        return;
      }
      const { error } = await requireSupabase().from("profiles").delete().eq("id", id);
      if (error) throw error;
    },
  }), [useDatabase]);
  const profiles = useSupabaseCollection(profile ? [profile] : [mock.activeProfile], profilesOptions);

  const accessRequestsOptions = useMemo(() => ({
    storageKey: "mijn-graaf-van-schuyt:access-requests",
    enabled: useDatabase && profile?.rol === "admin",
    fetchItems: async () => {
      const { data, error } = await requireSupabase().from("access_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapAccessRequest);
    },
    insertItem: async (item: AccessRequest) => {
      const { error } = await requireSupabase().from("access_requests").upsert(accessRequestToRow(item));
      if (error) throw error;
    },
    updateItem: async (_id: string, _changes: Partial<AccessRequest>, nextItem: AccessRequest) => {
      const { error } = await requireSupabase().from("access_requests").update(accessRequestToRow(nextItem)).eq("id", nextItem.id);
      if (error) throw error;
    },
    deleteItem: async (id: string) => {
      const { error } = await requireSupabase().from("access_requests").delete().eq("id", id);
      if (error) throw error;
    },
  }), [profile?.rol, useDatabase]);
  const accessRequests = useSupabaseCollection(mock.accessRequests, accessRequestsOptions);

  const contactsOptions = useMemo(() => ({
    storageKey: "mijn-graaf-van-schuyt:contacts",
    enabled: useDatabase,
    fetchItems: async () => {
      const { data, error } = await requireSupabase().from("contacts").select("*").order("categorie").order("naam");
      if (error) throw error;
      return (data ?? []).map(mapContact);
    },
    insertItem: async (item: Contact) => {
      const { error } = await requireSupabase().from("contacts").upsert(contactToRow(item));
      if (error) throw error;
    },
    updateItem: async (_id: string, _changes: Partial<Contact>, nextItem: Contact) => {
      const { error } = await requireSupabase().from("contacts").update(contactToRow(nextItem)).eq("id", nextItem.id);
      if (error) throw error;
    },
    deleteItem: async (id: string) => {
      const { error } = await requireSupabase().from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
  }), [useDatabase]);
  const contacts = useSupabaseCollection(mock.contacts, contactsOptions);

  const reportsOptions = useMemo(() => ({
    storageKey: "mijn-graaf-van-schuyt:reports",
    enabled: useDatabase,
    fetchItems: async () => {
      const client = requireSupabase();
      const [{ data: reportRows, error: reportsError }, { data: confirmationRows, error: confirmationsError }] = await Promise.all([
        client.from("reports").select("*").order("created_at", { ascending: false }),
        client.from("report_confirmations").select("report_id,user_id,herkent_probleem"),
      ]);
      if (reportsError) throw reportsError;
      if (confirmationsError) throw confirmationsError;
      return (reportRows ?? []).map((row) => {
        const confirmations = (confirmationRows ?? []).filter((item) => item.report_id === row.id && item.herkent_probleem).length;
        const declined = (confirmationRows ?? []).filter((item) => item.report_id === row.id && !item.herkent_probleem).length;
        const current = (confirmationRows ?? []).find((item) => item.report_id === row.id && item.user_id === user?.id);
        const response: Report["current_user_response"] | undefined = current ? (current.herkent_probleem ? "confirmed" : "declined") : undefined;
        return mapReport(row, confirmations, declined, response);
      });
    },
    insertItem: async (item: Report) => {
      const client = requireSupabase();
      const row = reportToRow(item);
      const optionalColumns = [
        "aangemaakt_door_naam",
        "aangemaakt_door_huisnummer",
        "image_urls",
        "opgelost_op",
        "opgelost_door",
        "opgelost_door_naam",
        "oplossing_omschrijving",
        "rebo_melding_op",
        "rebo_melding_door",
        "rebo_melding_door_naam",
      ];
      const { error } = await client.from("reports").upsert(row);
      if (error && isMissingSchemaColumnError(error, optionalColumns)) {
        const { error: retryError } = await client.from("reports").upsert(omitColumns(row, optionalColumns));
        if (retryError) throw retryError;
      } else if (error) {
        throw error;
      }
      if (item.current_user_response === "confirmed") {
        await client.from("report_confirmations").upsert({ report_id: item.id, user_id: item.aangemaakt_door, herkent_probleem: true }, { onConflict: "report_id,user_id" });
      }
    },
    updateItem: async (_id: string, changes: Partial<Report>, nextItem: Report, previousItem?: Report) => {
      const client = requireSupabase();
      const optionalColumns = [
        "aangemaakt_door_naam",
        "aangemaakt_door_huisnummer",
        "image_urls",
        "opgelost_op",
        "opgelost_door",
        "opgelost_door_naam",
        "oplossing_omschrijving",
        "rebo_melding_op",
        "rebo_melding_door",
        "rebo_melding_door_naam",
      ];
      const derivedKeys = new Set(["confirmations", "declined", "current_user_response"]);
      const hasReportChanges = Object.keys(changes).some((key) => !derivedKeys.has(key));
      if (hasReportChanges) {
        const previousRow: Record<string, unknown> = previousItem ? reportToRow(previousItem) : {};
        const nextRow = reportToRow(nextItem);
        const changedRow = Object.fromEntries(Object.entries(nextRow).filter(([key, value]) => value !== previousRow[key]));
        const row: Record<string, unknown> = { ...changedRow, id: nextItem.id };
        optionalColumns.forEach((key) => {
          const value = changes[key as keyof Report];
          if (Object.prototype.hasOwnProperty.call(changes, key) && (value == null || value === "")) {
            row[key] = null;
          }
        });
        const { error } = await client.from("reports").update(row).eq("id", nextItem.id);
        if (error && isMissingSchemaColumnError(error, optionalColumns)) {
          const { error: retryError } = await client.from("reports").update(omitColumns(row, optionalColumns)).eq("id", nextItem.id);
          if (retryError) throw retryError;
        } else if (error) {
          throw error;
        }
      }
      if (Object.prototype.hasOwnProperty.call(changes, "current_user_response") && user?.id) {
        if (changes.current_user_response) {
          const { error: confirmationError } = await client
            .from("report_confirmations")
            .upsert({ report_id: nextItem.id, user_id: user.id, herkent_probleem: changes.current_user_response === "confirmed" }, { onConflict: "report_id,user_id" });
          if (confirmationError) throw confirmationError;
        } else {
          const { error: confirmationError } = await client
            .from("report_confirmations")
            .delete()
            .eq("report_id", nextItem.id)
            .eq("user_id", user.id);
          if (confirmationError) throw confirmationError;
        }
      }
    },
    deleteItem: async (id: string) => {
      const { error } = await requireSupabase().from("reports").delete().eq("id", id);
      if (error) throw error;
    },
  }), [useDatabase, user?.id]);
  const reports = useSupabaseCollection(mock.reports, reportsOptions);

  const documentsOptions = useMemo(() => ({
    storageKey: "mijn-graaf-van-schuyt:knowledge-documents",
    enabled: useDatabase,
    fetchItems: async () => {
      const { data, error } = await requireSupabase().from("knowledge_documents").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapKnowledgeDocument);
    },
    insertItem: async (item: KnowledgeDocument) => {
      const row = knowledgeDocumentToRow(item);
      const optionalColumns = ["uitgebreide_uitleg", "image_urls"];
      const { error } = await requireSupabase().from("knowledge_documents").upsert(row);
      if (error && isMissingSchemaColumnError(error, optionalColumns)) {
        const { error: retryError } = await requireSupabase().from("knowledge_documents").upsert(omitColumns(row, optionalColumns));
        if (retryError) throw retryError;
      } else if (error) {
        throw error;
      }
    },
    updateItem: async (_id: string, _changes: Partial<KnowledgeDocument>, nextItem: KnowledgeDocument) => {
      const row = knowledgeDocumentToRow(nextItem);
      const optionalColumns = ["uitgebreide_uitleg", "image_urls"];
      const { error } = await requireSupabase().from("knowledge_documents").update(row).eq("id", nextItem.id);
      if (error && isMissingSchemaColumnError(error, optionalColumns)) {
        const { error: retryError } = await requireSupabase().from("knowledge_documents").update(omitColumns(row, optionalColumns)).eq("id", nextItem.id);
        if (retryError) throw retryError;
      } else if (error) {
        throw error;
      }
    },
    deleteItem: async (id: string) => {
      const { error } = await requireSupabase().from("knowledge_documents").delete().eq("id", id);
      if (error) throw error;
    },
  }), [useDatabase]);
  const documents = useSupabaseCollection(mock.knowledgeDocuments, documentsOptions);

  const helpRequestsOptions = useMemo(() => ({
    storageKey: "mijn-graaf-van-schuyt:help-requests",
    enabled: useDatabase,
    fetchItems: async () => {
      const client = requireSupabase();
      const [{ data: requests, error: requestsError }, { data: offers, error: offersError }, { data: messages, error: messagesError }] = await Promise.all([
        client.from("help_requests").select("*").order("created_at", { ascending: false }),
        client.from("help_offers").select("*"),
        client.from("help_messages").select("*").order("created_at", { ascending: true }),
      ]);
      if (requestsError) throw requestsError;
      if (offersError) throw offersError;
      if (messagesError) throw messagesError;
      return (requests ?? []).map((request) =>
        mapHelpRequest(
          request,
          (offers ?? []).filter((offer) => offer.help_request_id === request.id).map(mapHelpOffer),
          (messages ?? []).filter((message) => message.help_request_id === request.id).map(mapHelpMessage),
        ),
      );
    },
    insertItem: async (item: HelpRequest) => {
      const { error } = await requireSupabase().from("help_requests").upsert(helpRequestToRow(item));
      if (error) throw error;
    },
    updateItem: async (id: string, changes: Partial<HelpRequest>, nextItem: HelpRequest, previousItem?: HelpRequest) => {
      const baseKeys = Object.keys(changes).filter((key) => key !== "offers" && key !== "messages");
      if (baseKeys.length > 0) {
        const { error } = await requireSupabase().from("help_requests").update(helpRequestToRow(nextItem)).eq("id", id);
        if (error) throw error;
      }
      if (changes.offers) await syncHelpOffers(id, previousItem?.offers, nextItem.offers);
      if (changes.messages) await syncHelpMessages(id, previousItem?.messages, nextItem.messages);
    },
    deleteItem: async (id: string) => {
      const { error } = await requireSupabase().from("help_requests").delete().eq("id", id);
      if (error) throw error;
    },
  }), [useDatabase]);
  const helpRequests = useSupabaseCollection(mock.helpRequests, helpRequestsOptions);

  const bulletinPostsOptions = useMemo(() => ({
    storageKey: "mijn-graaf-van-schuyt:bulletin-posts",
    enabled: useDatabase,
    fetchItems: async () => {
      const client = requireSupabase();
      const [{ data: posts, error: postsError }, { data: messages, error: messagesError }] = await Promise.all([
        client.from("bulletin_posts").select("*").order("created_at", { ascending: false }),
        client.from("bulletin_messages").select("*").order("created_at", { ascending: true }),
      ]);
      if (postsError) throw postsError;
      if (messagesError) throw messagesError;
      return (posts ?? []).map((post) =>
        mapBulletinPost(post, (messages ?? []).filter((message) => message.bulletin_post_id === post.id).map(mapBulletinMessage)),
      );
    },
    insertItem: async (item: BulletinPost) => {
      const row = bulletinPostToRow(item);
      const optionalColumns = ["contactpersoon", "image_url", "image_urls", "aangemaakt_door_naam", "aangemaakt_door_huisnummer"];
      const { error } = await requireSupabase().from("bulletin_posts").upsert(row);
      if (error && isMissingSchemaColumnError(error, optionalColumns)) {
        const { error: retryError } = await requireSupabase().from("bulletin_posts").upsert(omitColumns(row, optionalColumns));
        if (retryError) throw retryError;
      } else if (error) {
        throw error;
      }
    },
    updateItem: async (id: string, changes: Partial<BulletinPost>, nextItem: BulletinPost, previousItem?: BulletinPost) => {
      const baseKeys = Object.keys(changes).filter((key) => key !== "messages");
      if (baseKeys.length > 0) {
        const row = bulletinPostToRow(nextItem);
        const optionalColumns = ["contactpersoon", "image_url", "image_urls", "aangemaakt_door_naam", "aangemaakt_door_huisnummer"];
        const { error } = await requireSupabase().from("bulletin_posts").update(row).eq("id", id);
        if (error && isMissingSchemaColumnError(error, optionalColumns)) {
          const { error: retryError } = await requireSupabase().from("bulletin_posts").update(omitColumns(row, optionalColumns)).eq("id", id);
          if (retryError) throw retryError;
        } else if (error) {
          throw error;
        }
      }
      if (changes.messages) await syncBulletinMessages(id, previousItem?.messages, nextItem.messages);
    },
    deleteItem: async (id: string) => {
      const { error } = await requireSupabase().from("bulletin_posts").delete().eq("id", id);
      if (error) throw error;
    },
  }), [useDatabase]);
  const bulletinPosts = useSupabaseCollection(mock.bulletinPosts, bulletinPostsOptions);

  const buildingAnnouncementsOptions = useMemo(() => ({
    storageKey: "mijn-graaf-van-schuyt:building-announcements",
    enabled: useDatabase,
    fetchItems: async () => {
      const { data, error } = await requireSupabase().from("building_announcements").select("*").order("event_date", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapBuildingAnnouncement);
    },
    insertItem: async (item: BuildingAnnouncement) => {
      const { error } = await requireSupabase().from("building_announcements").upsert(buildingAnnouncementToRow(item));
      if (error) throw error;
    },
    updateItem: async (_id: string, _changes: Partial<BuildingAnnouncement>, nextItem: BuildingAnnouncement) => {
      const { error } = await requireSupabase().from("building_announcements").update(buildingAnnouncementToRow(nextItem)).eq("id", nextItem.id);
      if (error) throw error;
    },
    deleteItem: async (id: string) => {
      const { error } = await requireSupabase().from("building_announcements").delete().eq("id", id);
      if (error) throw error;
    },
  }), [useDatabase]);
  const buildingAnnouncements = useSupabaseCollection(mock.buildingAnnouncements, buildingAnnouncementsOptions);

  const notificationPreferencesOptions = useMemo(() => ({
    storageKey: "mijn-graaf-van-schuyt:notification-preferences",
    enabled: useDatabase,
    fetchItems: async () => {
      const { data, error } = await requireSupabase().from("notification_preferences").select("*");
      if (error) throw error;
      return (data ?? []).map(mapNotificationPreference);
    },
    insertItem: async (item: NotificationPreference) => {
      const { error } = await requireSupabase().from("notification_preferences").upsert(notificationPreferenceToRow(item), { onConflict: "user_id" });
      if (error) throw error;
    },
    updateItem: async (_id: string, _changes: Partial<NotificationPreference>, nextItem: NotificationPreference) => {
      const { error } = await requireSupabase().from("notification_preferences").upsert(notificationPreferenceToRow(nextItem), { onConflict: "user_id" });
      if (error) throw error;
    },
    deleteItem: async (id: string) => {
      const { error } = await requireSupabase().from("notification_preferences").delete().eq("user_id", id);
      if (error) throw error;
    },
  }), [useDatabase]);
  const notificationPreferences = useSupabaseCollection(mock.notificationPreferences, notificationPreferencesOptions);

  const feedbackOptions = useMemo(() => ({
    storageKey: "mijn-graaf-van-schuyt:feedback",
    enabled: useDatabase,
    fetchItems: async () => {
      const { data, error } = await requireSupabase().from("feedback_items").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapFeedbackItem);
    },
    insertItem: async (item: FeedbackItem) => {
      const { error } = await requireSupabase().from("feedback_items").upsert(feedbackItemToRow(item));
      if (error) throw error;
    },
    updateItem: async (_id: string, changes: Partial<FeedbackItem>, nextItem: FeedbackItem) => {
      const row: Record<string, string | null> = {};
      if ("onderwerp" in changes) row.onderwerp = nextItem.onderwerp;
      if ("bericht" in changes) row.bericht = nextItem.bericht;
      if ("status" in changes) row.status = nextItem.status;
      if ("beheer_reactie" in changes) row.beheer_reactie = nextItem.beheer_reactie ?? null;
      if ("opgelost_op" in changes) row.opgelost_op = nextItem.opgelost_op ?? null;
      const { error } = await requireSupabase().from("feedback_items").update(row).eq("id", nextItem.id);
      if (error) throw error;
    },
    deleteItem: async (id: string) => {
      const { error } = await requireSupabase().from("feedback_items").delete().eq("id", id);
      if (error) throw error;
    },
  }), [useDatabase]);
  const feedbackItems = useSupabaseCollection(mock.feedbackItems, feedbackOptions);

  if (configured && loading) {
    return <LoadingState />;
  }

  if (configured && passwordRecovery) {
    return <UpdatePasswordPage />;
  }

  if (configured && !user) {
    return <AuthPage />;
  }

  if (configured && user && !profile) {
    return <LoadingState />;
  }

  const value: AppDataContextValue = {
    profile: profile ?? mock.activeProfile,
    accessRequests,
    profiles,
    contacts,
    reports,
    documents,
    helpRequests,
    bulletinPosts,
    buildingAnnouncements,
    notificationPreferences,
    feedbackItems,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

const router = createBrowserRouter([
  {
    path: paths.home,
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: paths.contacts, element: <ContactsPage /> },
      { path: paths.reports, element: <ReportsPage /> },
      { path: paths.knowledge, element: <KnowledgePage /> },
      { path: paths.help, element: <HelpPage /> },
      { path: paths.bulletin, element: <BulletinPage /> },
      { path: paths.profile, element: <ProfilePage /> },
      { path: paths.admin, element: <AdminPage /> },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <AppDataProvider>
          <RouterProvider router={router} />
        </AppDataProvider>
      </ConfirmProvider>
    </AuthProvider>
  );
}
