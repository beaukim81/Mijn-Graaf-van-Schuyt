import { useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { contactCategories, knowledgeCategories, reportCategories } from "../data/categories";
import { useAppData } from "../lib/AppDataContext";
import { notifyBuildingAnnouncement, notifyUser } from "../lib/pushNotifications";
import type {
  AnnouncementImportance,
  BuildingAnnouncement,
  BulletinPost,
  Contact,
  ContactCategory,
  KnowledgeCategory,
  KnowledgeDocument,
  KnowledgeDocumentStatus,
  KnowledgeDocumentType,
  ReportCategory,
  ReportStatus,
} from "../types";

type AdminTab = "algemeen" | "kennisbank" | "contacten" | "meldingen" | "prikbord" | "bewoners";

const tabs: { id: AdminTab; label: string }[] = [
  { id: "algemeen", label: "Algemeen" },
  { id: "kennisbank", label: "Kennisbank" },
  { id: "contacten", label: "Contacten" },
  { id: "meldingen", label: "Meldingen" },
  { id: "prikbord", label: "Prikbord" },
  { id: "bewoners", label: "Bewoners" },
];

const documentTypes: KnowledgeDocumentType[] = ["Officiële handleiding", "Bewonerstip", "Onderdeleninformatie", "Veelgestelde vraag"];
const documentStatuses: KnowledgeDocumentStatus[] = ["Concept", "Gepubliceerd", "Te controleren"];
const reportStatuses: ReportStatus[] = ["Nieuw", "Herkend door meerdere bewoners", "Doorgezet naar REBO", "In behandeling", "Opgelost"];
const announcementImportance: AnnouncementImportance[] = ["normaal", "belangrijk", "urgent"];

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
  pdf_url: "",
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
  const { buildingAnnouncements, bulletinPosts, contacts, documents, profile, reports } = useAppData();
  const [activeTab, setActiveTab] = useState<AdminTab>("algemeen");
  const [contactDraft, setContactDraft] = useState<Contact>(blankContact);
  const [documentDraft, setDocumentDraft] = useState(blankDocument);
  const [announcementDraft, setAnnouncementDraft] = useState(blankAnnouncement);

  const pendingDocuments = useMemo(
    () => documents.items.filter((document) => document.status !== "Gepubliceerd").length,
    [documents.items],
  );
  const openReports = useMemo(() => reports.items.filter((report) => report.status !== "Opgelost").length, [reports.items]);
  const activePosts = useMemo(() => bulletinPosts.items.filter((post) => post.status === "Actief").length, [bulletinPosts.items]);
  const importantAnnouncements = useMemo(
    () => buildingAnnouncements.items.filter((item) => item.importance !== "normaal").length,
    [buildingAnnouncements.items],
  );

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
      pdf_url: document.pdf_url,
      tags: document.tags.join(", "),
      leverancier_of_fabrikant: document.leverancier_of_fabrikant ?? "",
      status: document.status,
    });
    setActiveTab("kennisbank");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetDocument() {
    setDocumentDraft(blankDocument);
  }

  function saveDocument() {
    const timestamp = new Date().toISOString();
    const changes = {
      titel: documentDraft.titel,
      categorie: documentDraft.categorie,
      documenttype: documentDraft.documenttype,
      korte_samenvatting: documentDraft.korte_samenvatting,
      pdf_url: documentDraft.pdf_url,
      tags: documentDraft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      leverancier_of_fabrikant: documentDraft.leverancier_of_fabrikant,
      status: documentDraft.status,
      bijgewerkt_op: timestamp,
    };

    if (documentDraft.id) {
      documents.update(documentDraft.id, changes);
    } else {
      documents.add({
        ...changes,
        id: crypto.randomUUID(),
        faq: [],
        toegevoegd_door: profile.user_id,
        aangemaakt_op: timestamp,
      });
    }
    resetDocument();
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

  return (
    <section className="page-stack admin-page">
      <div className="page-heading">
        <p className="eyebrow">Alleen beheer</p>
        <h2>Beheer</h2>
        <p>Beheer inhoud op een aparte plek. De gewone bewonerspagina's blijven rustig en overzichtelijk.</p>
      </div>

      <div className="admin-overview" aria-label="Beheeroverzicht">
        <AdminMetric label="Kennis te controleren" value={pendingDocuments} />
        <AdminMetric label="Open meldingen" value={openReports} />
        <AdminMetric label="Prikbord actief" value={activePosts} />
        <AdminMetric label="Belangrijke mededelingen" value={importantAnnouncements} />
      </div>

      <div className="admin-tabs" role="tablist" aria-label="Beheeronderdelen">
        {tabs.map((tab) => (
          <button className={activeTab === tab.id ? "active" : ""} key={tab.id} onClick={() => setActiveTab(tab.id)} type="button">
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "algemeen" && (
        <section className="admin-section">
          <form className="form-panel" onSubmit={(event) => { event.preventDefault(); void saveAnnouncement(); }}>
            <h3>{announcementDraft.id ? "Algemene melding aanpassen" : "Algemene melding plaatsen"}</h3>
            <input value={announcementDraft.titel} onChange={(event) => setAnnouncementDraft({ ...announcementDraft, titel: event.target.value })} placeholder="Titel" required />
            <textarea value={announcementDraft.inhoud} onChange={(event) => setAnnouncementDraft({ ...announcementDraft, inhoud: event.target.value })} placeholder="Praktische uitleg of tip" required />
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
              <article className="item-card admin-list-card" key={announcement.id}>
                <div className="item-card__header">
                  <div>
                    <p className="chip">{announcement.importance}</p>
                    <h3>{announcement.titel}</h3>
                  </div>
                  <StatusBadge tone={announcement.importance === "urgent" ? "warning" : "soft"}>
                    {announcement.notify_all ? "notificatie aan" : "geen push"}
                  </StatusBadge>
                </div>
                <p>{announcement.inhoud}</p>
                {announcement.event_date && <p className="muted">Datum: {new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(new Date(announcement.event_date))}</p>}
                <div className="admin-row">
                  <button className="text-button" onClick={() => editAnnouncement(announcement)} type="button">Aanpassen</button>
                  <button className="text-button danger" onClick={() => buildingAnnouncements.remove(announcement.id)} type="button">Verwijderen</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === "kennisbank" && (
        <section className="admin-section">
          <form className="form-panel" onSubmit={(event) => { event.preventDefault(); saveDocument(); }}>
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
            <input value={documentDraft.pdf_url} onChange={(event) => setDocumentDraft({ ...documentDraft, pdf_url: event.target.value })} placeholder="PDF-link" required />
            <input value={documentDraft.tags} onChange={(event) => setDocumentDraft({ ...documentDraft, tags: event.target.value })} placeholder="Tags, gescheiden door komma's" />
            <input value={documentDraft.leverancier_of_fabrikant} onChange={(event) => setDocumentDraft({ ...documentDraft, leverancier_of_fabrikant: event.target.value })} placeholder="Leverancier of fabrikant optioneel" />
            <button className="button" type="submit">{documentDraft.id ? "Wijzigingen opslaan" : "Toevoegen"}</button>
            {documentDraft.id && <button className="button button--soft" onClick={resetDocument} type="button">Annuleren</button>}
          </form>

          <div className="card-list compact-list">
            {documents.items.map((document) => (
              <article className="item-card admin-list-card" key={document.id}>
                <div className="item-card__header">
                  <div>
                    <p className="chip">{document.categorie}</p>
                    <h3>{document.titel}</h3>
                  </div>
                  <StatusBadge tone={document.status === "Gepubliceerd" ? "good" : "warning"}>{document.status}</StatusBadge>
                </div>
                <p className="muted">{document.documenttype}</p>
                <p>{document.korte_samenvatting}</p>
                <div className="admin-row">
                  {document.status !== "Gepubliceerd" && (
                    <button className="text-button" onClick={() => publishDocument(document)} type="button">
                      Publiceren
                    </button>
                  )}
                  <button className="text-button" onClick={() => editDocument(document)} type="button">Aanpassen</button>
                  <button className="text-button danger" onClick={() => documents.remove(document.id)} type="button">Verwijderen</button>
                </div>
              </article>
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
            <input value={contactDraft.telefoonnummer} onChange={(event) => setContactDraft({ ...contactDraft, telefoonnummer: event.target.value })} placeholder="Telefoonnummer" />
            <input value={contactDraft.emailadres} onChange={(event) => setContactDraft({ ...contactDraft, emailadres: event.target.value })} placeholder="E-mailadres" />
            <input value={contactDraft.website} onChange={(event) => setContactDraft({ ...contactDraft, website: event.target.value })} placeholder="Website" />
            <input value={contactDraft.whatsapp_url} onChange={(event) => setContactDraft({ ...contactDraft, whatsapp_url: event.target.value })} placeholder="WhatsApp-link" />
            <button className="button" type="submit">Opslaan</button>
            {contactDraft.id && <button className="button button--soft" onClick={resetContact} type="button">Annuleren</button>}
          </form>

          <div className="card-list compact-list">
            {contacts.items.map((contact) => (
              <article className="item-card admin-list-card" key={contact.id}>
                <div className="item-card__header">
                  <div>
                    <p className="chip">{contact.categorie}</p>
                    <h3>{contact.naam}</h3>
                  </div>
                </div>
                <p>{contact.beschrijving}</p>
                <div className="admin-row">
                  <button className="text-button" onClick={() => setContactDraft(contact)} type="button">Aanpassen</button>
                  <button className="text-button danger" onClick={() => contacts.remove(contact.id)} type="button">Verwijderen</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === "meldingen" && (
        <section className="admin-section card-list compact-list">
          {reports.items.map((report) => (
            <article className="item-card admin-list-card" key={report.id}>
              <div className="item-card__header">
                <div>
                  <p className="chip">{report.categorie}</p>
                  <h3>{report.titel}</h3>
                </div>
                <StatusBadge tone={report.status === "Opgelost" ? "good" : "soft"}>{report.status}</StatusBadge>
              </div>
              <p>{report.omschrijving}</p>
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
                <button className="text-button danger" onClick={() => reports.remove(report.id)} type="button">Verwijderen</button>
              </div>
            </article>
          ))}
        </section>
      )}

      {activeTab === "prikbord" && (
        <section className="admin-section card-list compact-list">
          {bulletinPosts.items.map((post: BulletinPost) => (
            <article className="item-card admin-list-card" key={post.id}>
              <div className="item-card__header">
                <div>
                  <p className="chip">{post.categorie}</p>
                  <h3>{post.titel}</h3>
                </div>
                <StatusBadge tone={post.status === "Actief" ? "soft" : "good"}>{post.status}</StatusBadge>
              </div>
              <p>{post.omschrijving}</p>
              <div className="admin-row">
                <button className="text-button" onClick={() => bulletinPosts.update(post.id, { status: "Afgerond" })} type="button">Markeer afgerond</button>
                <button className="text-button danger" onClick={() => bulletinPosts.remove(post.id)} type="button">Verwijderen</button>
              </div>
            </article>
          ))}
        </section>
      )}

      {activeTab === "bewoners" && (
        <section className="admin-section">
          <article className="item-card admin-list-card">
            <div className="item-card__header">
              <div>
                <p className="chip">Ingelogde beheerder</p>
                <h3>{profile.naam_of_bijnaam}{profile.huisnummer ? `, huisnummer ${profile.huisnummer}` : ""}</h3>
              </div>
              <StatusBadge tone="good">{profile.rol}</StatusBadge>
            </div>
            <p className="muted">{profile.email ?? "E-mailadres nog niet beschikbaar in dit profiel."}</p>
            <p>Een volledige bewoners- en rollenlijst kan hier worden aangesloten zodra alle bewoners via Supabase inloggen.</p>
          </article>
        </section>
      )}
    </section>
  );
}

function AdminMetric({ label, value }: { label: string; value: number }) {
  return (
    <article>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}
