import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { EditablePhotoGrid } from "../components/EditablePhotoGrid";
import { EmptyState } from "../components/EmptyState";
import { LinkifiedText } from "../components/LinkifiedText";
import { StatusBadge } from "../components/StatusBadge";
import { UrlPreview } from "../components/UrlPreview";
import { contactCategories, knowledgeCategories, reportCategories } from "../data/categories";
import { useAppData } from "../lib/AppDataContext";
import { uploadBulletinImages, uploadKnowledgePdf } from "../lib/fileUploads";
import { friendlyErrorMessage } from "../lib/friendlyErrors";
import { notifyBuildingAnnouncement, notifyUser } from "../lib/pushNotifications";
import { residentLabel } from "../lib/residentDisplay";
import { supabase } from "../lib/supabase";
import type {
  AccessRequest,
  AnnouncementImportance,
  BuildingAnnouncement,
  BulletinPost,
  Contact,
  ContactCategory,
  FeedbackStatus,
  KnowledgeCategory,
  KnowledgeDocument,
  KnowledgeDocumentStatus,
  KnowledgeDocumentType,
  Role,
  ReportCategory,
  ReportStatus,
} from "../types";

type AdminTab = "algemeen" | "aanvragen" | "feedback" | "kennisbank" | "contacten" | "meldingen" | "prikbord" | "bewoners";

const documentTypes: KnowledgeDocumentType[] = ["Officiële handleiding", "Bewonerstip", "Onderdeleninformatie", "Veelgestelde vraag"];
const documentStatuses: KnowledgeDocumentStatus[] = ["Concept", "Gepubliceerd", "Te controleren"];
const reportStatuses: ReportStatus[] = ["Nieuw", "Herkend door meerdere bewoners", "Doorgezet naar REBO", "In behandeling", "Opgelost"];
const announcementImportance: AnnouncementImportance[] = ["normaal", "belangrijk", "urgent"];
const maxDocumentImages = 10;

const blankContact: Contact = {
  id: "",
  naam: "",
  categorie: "Verhuur",
  beschrijving: "",
  telefoonnummer: "",
  emailadres: "",
  website: "",
  whatsapp_url: "",
  zichtbaar: true,
  aangemaakt_op: "",
  bijgewerkt_op: "",
};

const blankDocument = {
  id: "",
  titel: "",
  categorie: "Mechanische ventilatie" as KnowledgeCategory,
  documenttype: "Bewonerstip" as KnowledgeDocumentType,
  korte_samenvatting: "",
  uitgebreide_uitleg: "",
  pdf_url: "",
  pdf_bestandsnaam: "",
  pdf_file: undefined as File | undefined,
  image_urls: [] as string[],
  image_files: [] as File[],
  tags: "",
  leverancier_of_fabrikant: "",
  status: "Concept" as KnowledgeDocumentStatus,
};

const blankAnnouncement = {
  id: "",
  titel: "",
  inhoud: "",
  importance: "normaal" as AnnouncementImportance,
  notify_all: false,
  event_date: "",
};

export function AdminPage() {
  const { accessRequests, buildingAnnouncements, bulletinPosts, contacts, documents, feedbackItems, profile, profiles, reports } = useAppData();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<AdminTab>("algemeen");
  const [contactDraft, setContactDraft] = useState<Contact>(blankContact);
  const [documentDraft, setDocumentDraft] = useState(blankDocument);
  const [announcementDraft, setAnnouncementDraft] = useState(blankAnnouncement);
  const [feedbackReplies, setFeedbackReplies] = useState<Record<string, string>>({});
  const [accessRequestBusyId, setAccessRequestBusyId] = useState("");
  const [accessRequestError, setAccessRequestError] = useState("");
  const [documentFormError, setDocumentFormError] = useState("");
  const [documentSaving, setDocumentSaving] = useState(false);

  const documentCount = useMemo(() => documents.items.length, [documents.items]);
  const openReports = useMemo(() => reports.items.filter((report) => report.status !== "Opgelost").length, [reports.items]);
  const activePosts = useMemo(() => bulletinPosts.items.filter((post) => post.status === "Actief").length, [bulletinPosts.items]);
  const contactsCount = useMemo(() => contacts.items.length, [contacts.items]);
  const importantAnnouncements = useMemo(
    () => buildingAnnouncements.items.filter((item) => item.importance !== "normaal").length,
    [buildingAnnouncements.items],
  );
  const residentsCount = useMemo(() => profiles.items.length, [profiles.items]);
  const activeBulletinPosts = useMemo(() => bulletinPosts.items.filter((post) => post.status === "Actief"), [bulletinPosts.items]);
  const openFeedback = useMemo(() => feedbackItems.items.filter((item) => item.status !== "Opgelost").length, [feedbackItems.items]);
  const pendingAccessRequests = useMemo(() => accessRequests.items.filter((item) => item.status === "Nieuw").length, [accessRequests.items]);

  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (!hash) return;
    if (hash.startsWith("feedback-")) setActiveTab("feedback");
    if (hash.startsWith("kennisbank-")) setActiveTab("kennisbank");
    if (hash.startsWith("melding-")) setActiveTab("meldingen");
    if (hash.startsWith("aanvraag-")) setActiveTab("aanvragen");

    window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 120);
  }, [location.hash]);

  if (profile.rol !== "admin") {
    return <EmptyState title="Geen toegang" description="Deze pagina is alleen bedoeld voor beheerders." />;
  }

  function resetContact() {
    setContactDraft(blankContact);
  }

  function saveContact() {
    const timestamp = new Date().toISOString();
    if (contactDraft.id) {
      contacts.update(contactDraft.id, { ...contactDraft, bijgewerkt_op: timestamp });
    } else {
      contacts.add({ ...contactDraft, id: crypto.randomUUID(), aangemaakt_op: timestamp, bijgewerkt_op: timestamp });
    }
    resetContact();
  }

  function editDocument(document: KnowledgeDocument) {
    setDocumentDraft({
      id: document.id,
      titel: document.titel,
      categorie: document.categorie,
      documenttype: document.documenttype,
      korte_samenvatting: document.korte_samenvatting,
      uitgebreide_uitleg: document.uitgebreide_uitleg ?? "",
      pdf_url: document.pdf_url,
      pdf_bestandsnaam: "",
      pdf_file: undefined,
      image_urls: document.image_urls ?? [],
      image_files: [],
      tags: document.tags.join(", "),
      leverancier_of_fabrikant: document.leverancier_of_fabrikant ?? "",
      status: document.status,
    });
    setActiveTab("kennisbank");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetDocument() {
    setDocumentDraft(blankDocument);
    setDocumentFormError("");
  }

  async function saveDocument() {
    try {
      setDocumentSaving(true);
      setDocumentFormError("");
      const timestamp = new Date().toISOString();
      const uploadedImageUrls = documentDraft.image_files.length > 0 ? await uploadBulletinImages(documentDraft.image_files, profile.user_id) : [];
      const imageUrls = [...documentDraft.image_urls.filter((url) => !url.startsWith("blob:")), ...uploadedImageUrls].slice(0, maxDocumentImages);
      const pdfUrl = documentDraft.pdf_file ? await uploadKnowledgePdf(documentDraft.pdf_file, profile.user_id) : documentDraft.pdf_url;

      if (documentDraft.documenttype === "Officiële handleiding" && !pdfUrl) {
        setDocumentFormError("Voeg een PDF-bestand toe voor een officiële handleiding.");
        return;
      }

      const changes = {
        titel: documentDraft.titel,
        categorie: documentDraft.categorie,
        documenttype: documentDraft.documenttype,
        korte_samenvatting: documentDraft.korte_samenvatting,
        uitgebreide_uitleg: documentDraft.uitgebreide_uitleg,
        pdf_url: pdfUrl,
        image_urls: imageUrls,
        tags: documentDraft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        leverancier_of_fabrikant: documentDraft.leverancier_of_fabrikant,
        status: documentDraft.status,
        bijgewerkt_op: timestamp,
      };

      if (documentDraft.id) {
        await documents.updateAsync(documentDraft.id, changes);
      } else {
        await documents.addAsync({
          ...changes,
          id: crypto.randomUUID(),
          faq: [],
          toegevoegd_door: profile.user_id,
          aangemaakt_op: timestamp,
        });
      }
      resetDocument();
    } catch (error) {
      setDocumentFormError(friendlyErrorMessage(error, "Document opslaan lukt nu niet. Controleer de bestanden en probeer het opnieuw."));
    } finally {
      setDocumentSaving(false);
    }
  }

  function editAnnouncement(announcement: BuildingAnnouncement) {
    setAnnouncementDraft({
      id: announcement.id,
      titel: announcement.titel,
      inhoud: announcement.inhoud,
      importance: announcement.importance,
      notify_all: announcement.notify_all,
      event_date: announcement.event_date ? announcement.event_date.slice(0, 10) : "",
    });
    setActiveTab("algemeen");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveAnnouncement() {
    const timestamp = new Date().toISOString();
    const isUpdate = Boolean(announcementDraft.id);
    const announcement: BuildingAnnouncement = {
      id: announcementDraft.id || crypto.randomUUID(),
      titel: announcementDraft.titel,
      inhoud: announcementDraft.inhoud,
      importance: announcementDraft.importance,
      notify_all: announcementDraft.notify_all,
      event_date: announcementDraft.event_date || undefined,
      created_at: isUpdate ? (buildingAnnouncements.items.find((item) => item.id === announcementDraft.id)?.created_at ?? timestamp) : timestamp,
      updated_at: timestamp,
      created_by: profile.user_id,
    };

    if (isUpdate) {
      buildingAnnouncements.update(announcement.id, announcement);
    } else {
      buildingAnnouncements.add(announcement);
    }
    await notifyBuildingAnnouncement(announcement, isUpdate);
    setAnnouncementDraft(blankAnnouncement);
  }

  function publishDocument(document: KnowledgeDocument) {
    documents.update(document.id, { status: "Gepubliceerd", bijgewerkt_op: new Date().toISOString() });
    if (document.toegevoegd_door) {
      void notifyUser(document.toegevoegd_door, {
        title: "Kennisbankartikel goedgekeurd",
        body: `Je bijdrage is gepubliceerd: ${document.titel}`,
        url: "/kennisbank",
        category: "knowledge",
      });
    }
  }

  function updateReportStatus(reportId: string, status: ReportStatus) {
    const report = reports.items.find((item) => item.id === reportId);
    reports.update(reportId, { status, bijgewerkt_op: new Date().toISOString() });
    if (report?.aangemaakt_door) {
      void notifyUser(report.aangemaakt_door, {
        title: "Status van je melding bijgewerkt",
        body: `${report.titel} staat nu op: ${status}`,
        url: "/meldingen",
        category: "report",
      });
    }
  }

  async function approveAccessRequest(request: AccessRequest) {
    if (!supabase) {
      setAccessRequestError("Supabase is nog niet gekoppeld.");
      return;
    }

    try {
      setAccessRequestBusyId(request.id);
      setAccessRequestError("");
      const { data, error } = await supabase.functions.invoke("approve-access-request", {
        body: { request_id: request.id },
      });
      if (error) throw error;
      await accessRequests.updateAsync(request.id, {
        status: "Goedgekeurd",
        approved_by: profile.user_id,
        approved_at: new Date().toISOString(),
        invited_user_id: data?.user_id,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      setAccessRequestError(friendlyErrorMessage(error, "Goedkeuren lukt nu niet. Controleer de Supabase-functie en probeer het opnieuw."));
    } finally {
      setAccessRequestBusyId("");
    }
  }

  async function rejectAccessRequest(request: AccessRequest) {
    try {
      setAccessRequestBusyId(request.id);
      setAccessRequestError("");
      await accessRequests.updateAsync(request.id, {
        status: "Geweigerd",
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      setAccessRequestError(friendlyErrorMessage(error, "Weigeren lukt nu niet. Probeer het later opnieuw."));
    } finally {
      setAccessRequestBusyId("");
    }
  }

  return (
    <section className="page-stack admin-page">
      <div className="page-heading">
        <h2>Beheer</h2>
      </div>

      <div className="admin-overview" aria-label="Beheeronderdelen">
        <AdminMetric active={activeTab === "algemeen"} label="Algemeen" onClick={() => setActiveTab("algemeen")} value={importantAnnouncements} />
        <AdminMetric active={activeTab === "aanvragen"} label="Aanvragen" onClick={() => setActiveTab("aanvragen")} value={pendingAccessRequests} />
        <AdminMetric active={activeTab === "feedback"} label="Feedback" onClick={() => setActiveTab("feedback")} value={openFeedback} />
        <AdminMetric active={activeTab === "kennisbank"} label="Kennisbank" onClick={() => setActiveTab("kennisbank")} value={documentCount} />
        <AdminMetric active={activeTab === "contacten"} label="Contacten" onClick={() => setActiveTab("contacten")} value={contactsCount} />
        <AdminMetric active={activeTab === "meldingen"} label="Meldingen" onClick={() => setActiveTab("meldingen")} value={openReports} />
        <AdminMetric active={activeTab === "prikbord"} label="Prikbord" onClick={() => setActiveTab("prikbord")} value={activePosts} />
        <AdminMetric active={activeTab === "bewoners"} label="Bewoners" onClick={() => setActiveTab("bewoners")} value={residentsCount} />
      </div>

      {activeTab === "aanvragen" && (
        <section className="admin-section card-list compact-list">
          {accessRequests.syncError && (
            <div className="notice notice--warning">
              <p>{accessRequests.syncError}</p>
              <button className="text-button" onClick={accessRequests.clearSyncError} type="button">Melding sluiten</button>
            </div>
          )}
          {accessRequestError && (
            <div className="notice notice--warning">
              <p>{accessRequestError}</p>
              <button className="text-button" onClick={() => setAccessRequestError("")} type="button">Melding sluiten</button>
            </div>
          )}
          {accessRequests.items.map((request) => (
            <details className="item-card collapsible-card admin-list-card" id={`aanvraag-${request.id}`} key={request.id}>
              <summary className="item-card__header collapsible-card__summary">
                <div>
                  <p className="chip">{request.huisnummer ? `Huisnummer ${request.huisnummer}` : "Aanvraag"}</p>
                  <h3>{residentLabel(request.naam_of_bijnaam, request.huisnummer)}</h3>
                </div>
                <StatusBadge tone={request.status === "Nieuw" ? "warning" : request.status === "Goedgekeurd" ? "good" : "soft"}>{request.status}</StatusBadge>
              </summary>
              <div className="collapsible-card__body">
                <dl className="meta-list">
                  <div>
                    <dt>E-mailadres</dt>
                    <dd>{request.email}</dd>
                  </div>
                  {request.achternaam && (
                    <div>
                      <dt>Achternaam</dt>
                      <dd>{request.achternaam}</dd>
                    </div>
                  )}
                  {request.verdieping_of_gebouwdeel && (
                    <div>
                      <dt>Etage</dt>
                      <dd>{request.verdieping_of_gebouwdeel}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Aangevraagd op</dt>
                    <dd>{new Date(request.created_at).toLocaleDateString("nl-NL")}</dd>
                  </div>
                </dl>
                {request.status === "Nieuw" ? (
                  <div className="admin-row">
                    <button className="button" disabled={accessRequestBusyId === request.id} onClick={() => void approveAccessRequest(request)} type="button">
                      {accessRequestBusyId === request.id ? "Even geduld" : "Goedkeuren en mail sturen"}
                    </button>
                    <button className="button button--soft" disabled={accessRequestBusyId === request.id} onClick={() => void rejectAccessRequest(request)} type="button">
                      Weigeren
                    </button>
                    <button
                      className="button button--danger"
                      disabled={accessRequestBusyId === request.id}
                      onClick={() => {
                        const confirmed = window.confirm(`Weet je zeker dat je de aanvraag van ${residentLabel(request.naam_of_bijnaam, request.huisnummer)} wilt verwijderen?`);
                        if (confirmed) accessRequests.remove(request.id);
                      }}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={18} /> Verwijderen
                    </button>
                  </div>
                ) : (
                  <div className="admin-row">
                    <button
                      className="button button--danger"
                      onClick={() => {
                        const confirmed = window.confirm(`Weet je zeker dat je de aanvraag van ${residentLabel(request.naam_of_bijnaam, request.huisnummer)} wilt verwijderen?`);
                        if (confirmed) accessRequests.remove(request.id);
                      }}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={18} /> Verwijderen
                    </button>
                  </div>
                )}
              </div>
            </details>
          ))}
          {accessRequests.items.length === 0 && <EmptyState title="Geen toegangsaanvragen" description="Nieuwe bewonersaanvragen verschijnen hier. Na goedkeuring krijgt de bewoner een activatiemail." />}
        </section>
      )}

      {activeTab === "feedback" && (
        <section className="admin-section card-list compact-list">
          {feedbackItems.syncError && (
            <div className="notice notice--warning">
              <p>{feedbackItems.syncError}</p>
              <button className="text-button" onClick={feedbackItems.clearSyncError} type="button">Melding sluiten</button>
            </div>
          )}
          {feedbackItems.items.map((item) => (
            <details className="item-card collapsible-card admin-list-card" id={`feedback-${item.id}`} key={item.id}>
              <summary className="item-card__header collapsible-card__summary">
                <div>
                  <p className="chip">{residentLabel(item.aangemaakt_door_naam, item.aangemaakt_door_huisnummer)}</p>
                  <h3>{item.onderwerp}</h3>
                  <p className="muted">{new Date(item.created_at).toLocaleDateString("nl-NL")}</p>
                </div>
                <StatusBadge tone={item.status === "Opgelost" ? "good" : "soft"}>{item.status}</StatusBadge>
              </summary>
              <div className="collapsible-card__body">
                <p><LinkifiedText text={item.bericht} /></p>
                {item.beheer_reactie && (
                  <aside className="related-box">
                    <strong>Reactie van beheer</strong>
                    <span><LinkifiedText text={item.beheer_reactie} /></span>
                  </aside>
                )}
                <label className="field">
                  <span>Reactie richting bewoner</span>
                  <textarea
                    onChange={(event) => setFeedbackReplies({ ...feedbackReplies, [item.id]: event.target.value })}
                    placeholder="Typ hier een korte reactie..."
                    value={feedbackReplies[item.id] ?? ""}
                  />
                </label>
                <div className="admin-row">
                  <button
                    className="button button--soft"
                    onClick={async () => {
                      const reply = (feedbackReplies[item.id] ?? "").trim();
                      await feedbackItems.updateAsync(item.id, {
                        beheer_reactie: reply || undefined,
                        status: reply ? "In behandeling" as FeedbackStatus : item.status,
                        updated_at: new Date().toISOString(),
                      });
                      setFeedbackReplies((current) => ({ ...current, [item.id]: "" }));
                      if (reply) {
                        void notifyUser(item.aangemaakt_door, {
                          title: "Reactie op je feedback",
                          body: reply,
                          url: `/profiel#feedback-${item.id}`,
                          category: "personal",
                        });
                      }
                    }}
                    type="button"
                  >
                    Reactie opslaan
                  </button>
                  <button
                    className="button button--soft"
                    onClick={async () => {
                      const reply = (feedbackReplies[item.id] ?? "").trim();
                      await feedbackItems.updateAsync(item.id, {
                        status: "Opgelost",
                        beheer_reactie: reply || item.beheer_reactie,
                        opgelost_op: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      });
                      setFeedbackReplies((current) => ({ ...current, [item.id]: "" }));
                      void notifyUser(item.aangemaakt_door, {
                        title: "Feedback opgelost",
                        body: reply || `Je feedback is gemarkeerd als opgelost: ${item.onderwerp}`,
                        url: `/profiel#feedback-${item.id}`,
                        category: "personal",
                      });
                    }}
                    type="button"
                  >
                    Markeer als opgelost
                  </button>
                  <button
                    className="button button--danger"
                    onClick={() => {
                      const confirmed = window.confirm(`Weet je zeker dat je feedback "${item.onderwerp}" wilt verwijderen?`);
                      if (confirmed) feedbackItems.remove(item.id);
                    }}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={18} /> Verwijderen
                  </button>
                </div>
              </div>
            </details>
          ))}
          {feedbackItems.items.length === 0 && <EmptyState title="Nog geen feedback" description="Feedback van bewoners verschijnt hier zodra zij iets doorgeven via de homepage." />}
        </section>
      )}

      {activeTab === "algemeen" && (
        <section className="admin-section">
          <form className="form-panel" onSubmit={(event) => { event.preventDefault(); void saveAnnouncement(); }}>
            <h3>{announcementDraft.id ? "Algemene melding aanpassen" : "Algemene melding plaatsen"}</h3>
            <input value={announcementDraft.titel} onChange={(event) => setAnnouncementDraft({ ...announcementDraft, titel: event.target.value })} placeholder="Titel" required />
            <textarea value={announcementDraft.inhoud} onChange={(event) => setAnnouncementDraft({ ...announcementDraft, inhoud: event.target.value })} placeholder="Praktische uitleg of tip" required />
            <UrlPreview text={announcementDraft.inhoud} />
            <label className="field">
              <span>Datum</span>
              <input value={announcementDraft.event_date} onChange={(event) => setAnnouncementDraft({ ...announcementDraft, event_date: event.target.value })} type="date" />
            </label>
            <select value={announcementDraft.importance} onChange={(event) => setAnnouncementDraft({ ...announcementDraft, importance: event.target.value as AnnouncementImportance })}>
              {announcementImportance.map((item) => <option key={item}>{item}</option>)}
            </select>
            <label className="toggle-row">
              <span>Bewoners notificeren bij belangrijk of urgent</span>
              <input checked={announcementDraft.notify_all} onChange={(event) => setAnnouncementDraft({ ...announcementDraft, notify_all: event.target.checked })} type="checkbox" />
            </label>
            <p className="muted">Anti-spam: er wordt alleen een pushmelding verstuurd wanneer deze melding belangrijk of urgent is en notificeren aan staat.</p>
            <button className="button" type="submit">{announcementDraft.id ? "Wijzigingen opslaan" : "Plaatsen"}</button>
            {announcementDraft.id && <button className="button button--soft" onClick={() => setAnnouncementDraft(blankAnnouncement)} type="button">Annuleren</button>}
          </form>

          <div className="card-list compact-list">
            {buildingAnnouncements.items.map((announcement) => (
              <details className="item-card collapsible-card admin-list-card" key={announcement.id}>
                <summary className="item-card__header collapsible-card__summary">
                  <div>
                    <p className="chip">{announcement.importance}</p>
                    <h3>{announcement.titel}</h3>
                  </div>
                  <StatusBadge tone={announcement.importance === "urgent" ? "warning" : "soft"}>
                    {announcement.notify_all ? "notificatie aan" : "geen push"}
                  </StatusBadge>
                </summary>
                <div className="collapsible-card__body">
                  <p><LinkifiedText text={announcement.inhoud} /></p>
                  {announcement.event_date && (
                    <dl className="meta-list">
                      <div>
                        <dt>Datum</dt>
                        <dd>{new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(new Date(announcement.event_date))}</dd>
                      </div>
                    </dl>
                  )}
                  <div className="admin-row">
                    <button className="button button--soft" onClick={() => editAnnouncement(announcement)} type="button"><Pencil aria-hidden="true" size={18} /> Bewerken</button>
                    <button
                      className="button button--danger"
                      onClick={() => {
                        const confirmed = window.confirm(`Weet je zeker dat je algemene melding "${announcement.titel}" wilt verwijderen?`);
                        if (confirmed) buildingAnnouncements.remove(announcement.id);
                      }}
                      type="button"
                    ><Trash2 aria-hidden="true" size={18} /> Verwijderen</button>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {activeTab === "kennisbank" && (
        <section className="admin-section">
          <form className="form-panel" onSubmit={(event) => { event.preventDefault(); void saveDocument(); }}>
            <h3>{documentDraft.id ? "Document aanpassen" : "Document toevoegen"}</h3>
            <input value={documentDraft.titel} onChange={(event) => setDocumentDraft({ ...documentDraft, titel: event.target.value })} placeholder="Titel" required />
            <select value={documentDraft.categorie} onChange={(event) => setDocumentDraft({ ...documentDraft, categorie: event.target.value as KnowledgeCategory })}>
              {knowledgeCategories.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={documentDraft.documenttype} onChange={(event) => setDocumentDraft({ ...documentDraft, documenttype: event.target.value as KnowledgeDocumentType })}>
              {documentTypes.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={documentDraft.status} onChange={(event) => setDocumentDraft({ ...documentDraft, status: event.target.value as KnowledgeDocumentStatus })}>
              {documentStatuses.map((item) => <option key={item}>{item}</option>)}
            </select>
            <textarea value={documentDraft.korte_samenvatting} onChange={(event) => setDocumentDraft({ ...documentDraft, korte_samenvatting: event.target.value })} placeholder="Korte samenvatting" required />
            <UrlPreview text={documentDraft.korte_samenvatting} />
            <textarea value={documentDraft.uitgebreide_uitleg} onChange={(event) => setDocumentDraft({ ...documentDraft, uitgebreide_uitleg: event.target.value })} placeholder="Vrije uitleg of bewonerstip" />
            <UrlPreview text={documentDraft.uitgebreide_uitleg} />
            <label className="upload-field">
              <span>{documentDraft.documenttype === "Officiële handleiding" ? "PDF-bestand uploaden" : "PDF-bestand optioneel uploaden"}</span>
              <input
                accept="application/pdf"
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setDocumentDraft({ ...documentDraft, pdf_bestandsnaam: file.name, pdf_file: file });
                }}
              />
              {documentDraft.pdf_bestandsnaam && <small>Gekozen bestand: {documentDraft.pdf_bestandsnaam}</small>}
              {!documentDraft.pdf_bestandsnaam && documentDraft.pdf_url && <small>Er is al een PDF gekoppeld. Upload een nieuw bestand als je deze wilt vervangen.</small>}
            </label>
            <div className="upload-field">
              <label className="field">
                <span>Afbeeldingen uploaden</span>
                <input
                  accept="image/*"
                  multiple
                  type="file"
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []).slice(0, Math.max(0, maxDocumentImages - documentDraft.image_urls.length));
                    if (files.length === 0) return;
                    const previewUrls = files.map((file) => URL.createObjectURL(file));
                    setDocumentDraft({
                      ...documentDraft,
                      image_urls: [...documentDraft.image_urls, ...previewUrls].slice(0, maxDocumentImages),
                      image_files: [...documentDraft.image_files, ...files].slice(0, maxDocumentImages),
                    });
                  }}
                />
              </label>
              <EditablePhotoGrid
                images={documentDraft.image_urls}
                alt="Voorbeeld van gekozen afbeeldingen"
                onRemove={(index) => {
                  const removedUrl = documentDraft.image_urls[index];
                  const blobIndex = documentDraft.image_urls.slice(0, index).filter((url) => url.startsWith("blob:")).length;
                  setDocumentDraft({
                    ...documentDraft,
                    image_urls: documentDraft.image_urls.filter((_, itemIndex) => itemIndex !== index),
                    image_files: removedUrl?.startsWith("blob:")
                      ? documentDraft.image_files.filter((_, itemIndex) => itemIndex !== blobIndex)
                      : documentDraft.image_files,
                  });
                }}
              />
              <small>Maximaal {maxDocumentImages} afbeeldingen. Handig bij bewonerstips of onderdeleninformatie.</small>
            </div>
            <input value={documentDraft.tags} onChange={(event) => setDocumentDraft({ ...documentDraft, tags: event.target.value })} placeholder="Tags, gescheiden door komma's" />
            <input value={documentDraft.leverancier_of_fabrikant} onChange={(event) => setDocumentDraft({ ...documentDraft, leverancier_of_fabrikant: event.target.value })} placeholder="Leverancier of fabrikant optioneel" />
            <UrlPreview text={documentDraft.leverancier_of_fabrikant} />
            {documentFormError && <p className="form-message form-message--error">{documentFormError}</p>}
            <button className="button" disabled={documentSaving} type="submit">{documentSaving ? "Bezig met opslaan" : documentDraft.id ? "Wijzigingen opslaan" : "Toevoegen"}</button>
            {documentDraft.id && <button className="button button--soft" disabled={documentSaving} onClick={resetDocument} type="button">Annuleren</button>}
          </form>

          <div className="card-list compact-list">
            {documents.items.map((document) => (
              <details className="item-card collapsible-card admin-list-card" id={`kennisbank-${document.id}`} key={document.id}>
                <summary className="item-card__header collapsible-card__summary">
                  <div>
                    <p className="chip">{document.categorie}</p>
                    <h3>{document.titel}</h3>
                  </div>
                  <StatusBadge tone={document.status === "Gepubliceerd" ? "good" : "warning"}>{document.status}</StatusBadge>
                </summary>
                <div className="collapsible-card__body">
                  <dl className="meta-list">
                    <div>
                      <dt>Type</dt>
                      <dd>{document.documenttype}</dd>
                    </div>
                    {document.leverancier_of_fabrikant && (
                      <div>
                        <dt>Leverancier</dt>
                        <dd>{document.leverancier_of_fabrikant}</dd>
                      </div>
                    )}
                  </dl>
                  <p><LinkifiedText text={document.korte_samenvatting} /></p>
                  {document.uitgebreide_uitleg && <p className="muted"><LinkifiedText text={document.uitgebreide_uitleg} /></p>}
                  <div className="admin-row">
                    {document.status !== "Gepubliceerd" && (
                      <button className="text-button" onClick={() => publishDocument(document)} type="button">
                        Publiceren
                      </button>
                    )}
                    <button className="button button--soft" onClick={() => editDocument(document)} type="button"><Pencil aria-hidden="true" size={18} /> Bewerken</button>
                    <button
                      className="button button--danger"
                      onClick={() => {
                        const confirmed = window.confirm(`Weet je zeker dat je document "${document.titel}" wilt verwijderen?`);
                        if (confirmed) documents.remove(document.id);
                      }}
                      type="button"
                    ><Trash2 aria-hidden="true" size={18} /> Verwijderen</button>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {activeTab === "contacten" && (
        <section className="admin-section">
          <form className="form-panel" onSubmit={(event) => { event.preventDefault(); saveContact(); }}>
            <h3>{contactDraft.id ? "Contact aanpassen" : "Contact toevoegen"}</h3>
            <input value={contactDraft.naam} onChange={(event) => setContactDraft({ ...contactDraft, naam: event.target.value })} placeholder="Naam" required />
            <select value={contactDraft.categorie} onChange={(event) => setContactDraft({ ...contactDraft, categorie: event.target.value as ContactCategory })}>
              {contactCategories.map((item) => <option key={item}>{item}</option>)}
            </select>
            <textarea value={contactDraft.beschrijving} onChange={(event) => setContactDraft({ ...contactDraft, beschrijving: event.target.value })} placeholder="Korte beschrijving" required />
            <UrlPreview text={contactDraft.beschrijving} />
            <input value={contactDraft.telefoonnummer} onChange={(event) => setContactDraft({ ...contactDraft, telefoonnummer: event.target.value })} placeholder="Telefoonnummer" />
            <input value={contactDraft.emailadres} onChange={(event) => setContactDraft({ ...contactDraft, emailadres: event.target.value })} placeholder="E-mailadres" />
            <input value={contactDraft.website} onChange={(event) => setContactDraft({ ...contactDraft, website: event.target.value })} placeholder="Website" />
            <UrlPreview text={contactDraft.website} />
            <input value={contactDraft.whatsapp_url} onChange={(event) => setContactDraft({ ...contactDraft, whatsapp_url: event.target.value })} placeholder="WhatsApp-link" />
            <UrlPreview text={contactDraft.whatsapp_url} />
            <button className="button" type="submit">Opslaan</button>
            {contactDraft.id && <button className="button button--soft" onClick={resetContact} type="button">Annuleren</button>}
          </form>

          <div className="card-list compact-list">
            {contacts.items.map((contact) => (
              <details className="item-card collapsible-card admin-list-card" key={contact.id}>
                <summary className="item-card__header collapsible-card__summary">
                  <div>
                    <p className="chip">{contact.categorie}</p>
                    <h3>{contact.naam}</h3>
                  </div>
                </summary>
                <div className="collapsible-card__body">
                  <p><LinkifiedText text={contact.beschrijving} /></p>
                  <dl className="meta-list">
                    {contact.telefoonnummer && (
                      <div>
                        <dt>Telefoon</dt>
                        <dd>{contact.telefoonnummer}</dd>
                      </div>
                    )}
                    {contact.emailadres && (
                      <div>
                        <dt>E-mail</dt>
                        <dd>{contact.emailadres}</dd>
                      </div>
                    )}
                    {contact.website && (
                      <div>
                        <dt>Website</dt>
                        <dd>{contact.website}</dd>
                      </div>
                    )}
                    {contact.whatsapp_url && (
                      <div>
                        <dt>WhatsApp</dt>
                        <dd>{contact.whatsapp_url}</dd>
                      </div>
                    )}
                  </dl>
                  <div className="admin-row">
                    <button className="button button--soft" onClick={() => setContactDraft(contact)} type="button"><Pencil aria-hidden="true" size={18} /> Bewerken</button>
                    <button
                      className="button button--danger"
                      onClick={() => {
                        const confirmed = window.confirm(`Weet je zeker dat je contact "${contact.naam}" wilt verwijderen?`);
                        if (confirmed) contacts.remove(contact.id);
                      }}
                      type="button"
                    ><Trash2 aria-hidden="true" size={18} /> Verwijderen</button>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {activeTab === "meldingen" && (
        <section className="admin-section card-list compact-list">
          {reports.items.map((report) => (
            <details className="item-card collapsible-card admin-list-card" id={`melding-${report.id}`} key={report.id}>
              <summary className="item-card__header collapsible-card__summary">
                <div>
                  <p className="chip">{report.categorie}</p>
                  <h3>{report.titel}</h3>
                </div>
                <StatusBadge tone={report.status === "Opgelost" ? "good" : "soft"}>{report.status}</StatusBadge>
              </summary>
              <div className="collapsible-card__body">
                <p><LinkifiedText text={report.omschrijving} /></p>
                <dl className="meta-list">
                  <div>
                    <dt>Geplaatst door</dt>
                    <dd>{residentLabel(report.aangemaakt_door_naam, report.aangemaakt_door_huisnummer)}</dd>
                  </div>
                  {report.locatie_in_gebouw && (
                    <div>
                      <dt>Locatie</dt>
                      <dd>{report.locatie_in_gebouw}</dd>
                    </div>
                  )}
                </dl>
                <div className="filter-row">
                  <label className="field">
                    <span>Status</span>
                    <select value={report.status} onChange={(event) => updateReportStatus(report.id, event.target.value as ReportStatus)}>
                      {reportStatuses.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>Categorie</span>
                    <select value={report.categorie} onChange={(event) => reports.update(report.id, { categorie: event.target.value as ReportCategory, bijgewerkt_op: new Date().toISOString() })}>
                      {reportCategories.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                </div>
                <div className="admin-row">
                  <button
                    className="button button--danger"
                    onClick={() => {
                      const confirmed = window.confirm(`Weet je zeker dat je melding "${report.titel}" wilt verwijderen?`);
                      if (confirmed) reports.remove(report.id);
                    }}
                    type="button"
                  ><Trash2 aria-hidden="true" size={18} /> Verwijderen</button>
                </div>
              </div>
            </details>
          ))}
        </section>
      )}

      {activeTab === "prikbord" && (
        <section className="admin-section card-list compact-list">
          {activeBulletinPosts.map((post: BulletinPost) => (
            <details className="item-card collapsible-card admin-list-card" key={post.id}>
              <summary className="item-card__header collapsible-card__summary">
                <div>
                  <p className="chip">{post.categorie}</p>
                  <h3>{post.titel}</h3>
                </div>
                <StatusBadge tone={post.status === "Actief" ? "soft" : "good"}>{post.status}</StatusBadge>
              </summary>
              <div className="collapsible-card__body">
                <p><LinkifiedText text={post.omschrijving} /></p>
                <dl className="meta-list">
                  <div>
                    <dt>Geplaatst door</dt>
                    <dd>{residentLabel(post.aangemaakt_door_naam, post.aangemaakt_door_huisnummer)}</dd>
                  </div>
                  {post.contactpersoon && (
                    <div>
                      <dt>Contactpersoon</dt>
                      <dd>{post.contactpersoon}</dd>
                    </div>
                  )}
                </dl>
                <div className="admin-row">
                  <button
                    className="button button--soft"
                    onClick={() => {
                      const confirmed = window.confirm(`Weet je zeker dat je bericht "${post.titel}" wilt afronden en verwijderen?`);
                      if (confirmed) bulletinPosts.remove(post.id);
                    }}
                    type="button"
                  >Afronden</button>
                  <button
                    className="button button--danger"
                    onClick={() => {
                      const confirmed = window.confirm(`Weet je zeker dat je prikbordbericht "${post.titel}" wilt verwijderen?`);
                      if (confirmed) bulletinPosts.remove(post.id);
                    }}
                    type="button"
                  ><Trash2 aria-hidden="true" size={18} /> Verwijderen</button>
                </div>
              </div>
            </details>
          ))}
          {activeBulletinPosts.length === 0 && <EmptyState title="Geen actieve prikbordberichten" description="Wanneer bewoners iets plaatsen op het prikbord, kun je het hier beheren of verwijderen." />}
        </section>
      )}

      {activeTab === "bewoners" && (
        <section className="admin-section card-list compact-list">
          {profiles.syncError && (
            <div className="notice notice--warning">
              <p>{profiles.syncError}</p>
              <button className="text-button" onClick={profiles.clearSyncError} type="button">Melding sluiten</button>
            </div>
          )}
          {profiles.items.map((resident) => (
            <details className="item-card collapsible-card admin-list-card admin-resident-card" key={resident.id}>
              <summary className="item-card__header collapsible-card__summary">
                <div>
                  <p className="chip">{resident.huisnummer ? `Huisnummer ${resident.huisnummer}` : "Bewoner"}</p>
                  <h3>{residentLabel(resident.naam_of_bijnaam, resident.huisnummer)}</h3>
                </div>
                <StatusBadge tone={resident.rol === "admin" ? "good" : "soft"}>{resident.rol}</StatusBadge>
              </summary>
              <div className="collapsible-card__body">
                <dl className="meta-list">
                  <div>
                    <dt>E-mailadres</dt>
                    <dd>{resident.email ?? "Geen e-mailadres in profiel opgeslagen."}</dd>
                  </div>
                  <div>
                    <dt>Huisnummer</dt>
                    <dd>{resident.huisnummer ?? "Niet ingevuld"}</dd>
                  </div>
                </dl>
                <label className="field">
                  <span>Rol</span>
                  <select value={resident.rol} onChange={(event) => profiles.update(resident.id, { rol: event.target.value as Role })}>
                    <option value="bewoner">bewoner</option>
                    <option value="admin">admin</option>
                  </select>
                </label>
                {resident.user_id !== profile.user_id && (
                  <button
                    className="button button--danger"
                    onClick={() => {
                      const confirmed = window.confirm(`Weet je zeker dat je ${residentLabel(resident.naam_of_bijnaam, resident.huisnummer)} volledig wilt verwijderen? Het account en gekoppelde gegevens worden verwijderd.`);
                      if (confirmed) profiles.remove(resident.id);
                    }}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={18} /> Bewoner verwijderen
                  </button>
                )}
              </div>
            </details>
          ))}
          {profiles.items.length === 0 && <EmptyState title="Nog geen bewonersprofielen" description="Zodra bewoners hun account bevestigen of inloggen, verschijnt hun profiel hier." />}
        </section>
      )}
    </section>
  );
}

function AdminMetric({ active, label, onClick, value }: { active?: boolean; label: string; onClick: () => void; value: number }) {
  return (
    <button className={active ? "active" : ""} onClick={onClick} type="button">
      <strong>{value}</strong>
      <span>{label}</span>
    </button>
  );
}
