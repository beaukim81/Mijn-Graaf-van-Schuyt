import { useMemo, type ReactNode } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { LoadingState } from "./components/LoadingState";
import * as mock from "./data/mockData";
import { useSupabaseCollection } from "./hooks/useSupabaseCollection";
import { AppDataContext, type AppDataContextValue } from "./lib/AppDataContext";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import {
  buildingAnnouncementToRow,
  bulletinMessageToRow,
  bulletinPostToRow,
  contactToRow,
  helpMessageToRow,
  helpOfferToRow,
  helpRequestToRow,
  knowledgeDocumentToRow,
  mapBuildingAnnouncement,
  mapBulletinMessage,
  mapBulletinPost,
  mapContact,
  mapHelpMessage,
  mapHelpOffer,
  mapHelpRequest,
  mapKnowledgeDocument,
  mapNotificationPreference,
  mapReport,
  notificationPreferenceToRow,
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
import type { BuildingAnnouncement, BulletinMessage, BulletinPost, Contact, HelpMessage, HelpOffer, HelpRequest, KnowledgeDocument, NotificationPreference, Report } from "./types";

function requireSupabase() {
  if (!supabase) throw new Error("Supabase is nog niet gekoppeld.");
  return supabase;
}

async function syncHelpOffers(helpRequestId: string, previousOffers: HelpOffer[] = [], nextOffers: HelpOffer[] = []) {
  const client = requireSupabase();
  const previousIds = new Set(previousOffers.map((offer) => offer.id));
  const nextIds = new Set(nextOffers.map((offer) => offer.id));
  const added = nextOffers.filter((offer) => !previousIds.has(offer.id));
  const removed = previousOffers.filter((offer) => !nextIds.has(offer.id));

  if (added.length > 0) {
    const { error } = await client.from("help_offers").upsert(added.map(helpOfferToRow));
    if (error) throw error;
  }
  if (removed.length > 0) {
    const { error } = await client.from("help_offers").delete().in("id", removed.map((offer) => offer.id));
    if (error) throw error;
  }
  if (nextOffers.length === 0) {
    const { error } = await client.from("help_offers").delete().eq("help_request_id", helpRequestId);
    if (error) throw error;
  }
}

async function syncHelpMessages(helpRequestId: string, previousMessages: HelpMessage[] = [], nextMessages: HelpMessage[] = []) {
  const client = requireSupabase();
  const previousById = new Map(previousMessages.map((message) => [message.id, message]));
  const nextIds = new Set(nextMessages.map((message) => message.id));
  const added = nextMessages.filter((message) => !previousById.has(message.id));
  const changed = nextMessages.filter((message) => previousById.has(message.id) && previousById.get(message.id)?.message !== message.message);
  const removed = previousMessages.filter((message) => !nextIds.has(message.id));

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
  const previousById = new Map(previousMessages.map((message) => [message.id, message]));
  const nextIds = new Set(nextMessages.map((message) => message.id));
  const added = nextMessages.filter((message) => !previousById.has(message.id));
  const changed = nextMessages.filter((message) => previousById.has(message.id) && previousById.get(message.id)?.message !== message.message);
  const removed = previousMessages.filter((message) => !nextIds.has(message.id));

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
  const useDatabase = configured && Boolean(user) && isSupabaseConfigured;

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
      const { error } = await client.from("reports").upsert(reportToRow(item));
      if (error) throw error;
      if (item.current_user_response === "confirmed") {
        await client.from("report_confirmations").upsert({ report_id: item.id, user_id: item.aangemaakt_door, herkent_probleem: true }, { onConflict: "report_id,user_id" });
      }
    },
    updateItem: async (_id: string, changes: Partial<Report>, nextItem: Report) => {
      const client = requireSupabase();
      const { error } = await client.from("reports").update(reportToRow(nextItem)).eq("id", nextItem.id);
      if (error) throw error;
      if (changes.current_user_response && user?.id) {
        const { error: confirmationError } = await client
          .from("report_confirmations")
          .upsert({ report_id: nextItem.id, user_id: user.id, herkent_probleem: changes.current_user_response === "confirmed" }, { onConflict: "report_id,user_id" });
        if (confirmationError) throw confirmationError;
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
      const { error } = await requireSupabase().from("knowledge_documents").upsert(knowledgeDocumentToRow(item));
      if (error) throw error;
    },
    updateItem: async (_id: string, _changes: Partial<KnowledgeDocument>, nextItem: KnowledgeDocument) => {
      const { error } = await requireSupabase().from("knowledge_documents").update(knowledgeDocumentToRow(nextItem)).eq("id", nextItem.id);
      if (error) throw error;
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
      const { error } = await requireSupabase().from("help_requests").update(helpRequestToRow(nextItem)).eq("id", id);
      if (error) throw error;
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
      const { error } = await requireSupabase().from("bulletin_posts").upsert(bulletinPostToRow(item));
      if (error) throw error;
    },
    updateItem: async (id: string, changes: Partial<BulletinPost>, nextItem: BulletinPost, previousItem?: BulletinPost) => {
      const { error } = await requireSupabase().from("bulletin_posts").update(bulletinPostToRow(nextItem)).eq("id", id);
      if (error) throw error;
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

  if (configured && loading) {
    return <LoadingState />;
  }

  if (configured && !user) {
    return <AuthPage />;
  }

  if (configured && passwordRecovery) {
    return <UpdatePasswordPage />;
  }

  const value: AppDataContextValue = {
    profile: profile ?? mock.activeProfile,
    contacts,
    reports,
    documents,
    helpRequests,
    bulletinPosts,
    buildingAnnouncements,
    notificationPreferences,
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
      <AppDataProvider>
        <RouterProvider router={router} />
      </AppDataProvider>
    </AuthProvider>
  );
}
