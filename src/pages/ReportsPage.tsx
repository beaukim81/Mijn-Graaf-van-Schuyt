import { useMemo, useState } from "react";
import { CategoryFilter } from "../components/CategoryFilter";
import { EmptyState } from "../components/EmptyState";
import { ReportCard } from "../components/ReportCard";
import { SearchBar } from "../components/SearchBar";
import { StatusBadge } from "../components/StatusBadge";
import { EditablePhotoGrid } from "../components/EditablePhotoGrid";
import { LinkifiedText } from "../components/LinkifiedText";
import { PhotoGrid } from "../components/PhotoGrid";
import { ResidentIdentity } from "../components/ResidentIdentity";
import { UrlPreview } from "../components/UrlPreview";
import { StorageLink } from "../components/StorageLink";
import { reportCategories } from "../data/categories";
import { useAppData } from "../lib/AppDataContext";
import { isPreviewUrl, revokePreviewUrl, revokePreviewUrls, uploadBulletinImages } from "../lib/fileUploads";
import { friendlyErrorMessage } from "../lib/friendlyErrors";
import { residentLabel } from "../lib/residentDisplay";
import type { KnowledgeDocument, Profile, Report, ReportCategory, ReportType } from "../types";
import { isLikelyRentalMaintenance, relevantDocuments, rentalMaintenancePdfUrl } from "../lib/reportLogic";

const reportTypes: ReportType[] = ["Alleen mijn woning", "Mogelijk meerdere woningen", "Appartementencomplex"];
const maxImages = 10;

export function ReportsPage() {
  const { reports, documents, profile, profiles } = useAppData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ReportCategory | "Alle">("Alle");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    titel: "",
    omschrijving: "",
    categorie: "Mechanische ventilatie" as ReportCategory,
    locatie_in_gebouw: "",
    type_melding: "Alleen mijn woning" as ReportType,
    image_urls: [] as string[],
    image_files: [] as File[],
  });

  const filteredReports = useMemo(() => {
    return reports.items.filter((report) => {
      const matchesQuery = `${report.titel} ${report.omschrijving} ${report.locatie_in_gebouw}`.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === "Alle" || report.categorie === category;
      return report.status !== "Opgelost" && matchesQuery && matchesCategory;
    });
  }, [reports.items, query, category]);

  const draftLooksLikeRentalMaintenance = isLikelyRentalMaintenance(draft);
  const draftRelevantDocuments =
    draft.type_melding === "Appartementencomplex" ? [] : relevantDocuments(draft.categorie, documents.items);

  function resetDraft() {
    revokePreviewUrls(draft.image_urls);
    setEditingId(null);
    setDraft({ titel: "", omschrijving: "", categorie: "Mechanische ventilatie", locatie_in_gebouw: "", type_melding: "Alleen mijn woning", image_urls: [], image_files: [] });
    setShowForm(false);
  }

  const resolvedReports = useMemo(() => {
    return reports.items.filter((report) => {
      const matchesQuery = `${report.titel} ${report.omschrijving} ${report.locatie_in_gebouw}`.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === "Alle" || report.categorie === category;
      return report.status === "Opgelost" && matchesQuery && matchesCategory;
    });
  }, [reports.items, query, category]);

  async function createReport() {
    try {
      setSaving(true);
      setFormError("");
      const timestamp = new Date().toISOString();
      const uploadedImageUrls = draft.image_files.length > 0 ? await uploadBulletinImages(draft.image_files, profile.user_id) : [];
      const imageUrls = [...draft.image_urls.filter((url) => !url.startsWith("blob:")), ...uploadedImageUrls].slice(0, maxImages);
      const locatie_in_gebouw =
        draft.type_melding === "Appartementencomplex"
          ? draft.locatie_in_gebouw
          : draft.type_melding === "Mogelijk meerdere woningen"
            ? "Meerdere woningen"
            : "Eigen woning";
      if (editingId) {
        await reports.updateAsync(editingId, {
          titel: draft.titel,
          omschrijving: draft.omschrijving,
          categorie: draft.categorie,
          locatie_in_gebouw,
          type_melding: draft.type_melding,
          image_urls: imageUrls,
          bijgewerkt_op: timestamp,
        });
        setEditingId(null);
        setCategory(draft.categorie);
        setQuery("");
        resetDraft();
        return;
      }

      const report: Report = {
        id: crypto.randomUUID(),
        ...draft,
        locatie_in_gebouw,
        status: "Nieuw",
        aangemaakt_door: profile.user_id,
        aangemaakt_door_naam: profile.naam_of_bijnaam,
        aangemaakt_door_huisnummer: profile.huisnummer,
        aangemaakt_op: timestamp,
        bijgewerkt_op: timestamp,
        confirmations: 1,
        declined: 0,
        current_user_response: undefined,
        image_urls: imageUrls,
      };
      await reports.addAsync(report);
      setCategory(draft.categorie);
      setQuery("");
      resetDraft();
    } catch (error) {
      setFormError(friendlyErrorMessage(error, "Melding opslaan lukt nu niet. Controleer je foto's en probeer het opnieuw."));
    } finally {
      setSaving(false);
    }
  }

  function confirmReport(id: string) {
    const report = reports.items.find((item) => item.id === id);
    if (!report) return;
    if (report.aangemaakt_door === profile.user_id) return;
    if (report.current_user_response === "confirmed") {
      reports.update(id, {
        confirmations: Math.max(0, report.confirmations - 1),
        current_user_response: undefined,
      });
      return;
    }
    const confirmations = report.confirmations + 1;
    const declined = report.current_user_response === "declined" ? Math.max(0, report.declined - 1) : report.declined;
    reports.update(id, {
      confirmations,
      declined,
      current_user_response: "confirmed",
    });
  }

  function forwardToRebo(id: string) {
    const report = reports.items.find((item) => item.id === id);
    if (!report) return;
    reports.update(id, {
      status: "Doorgezet naar REBO",
      rebo_melding_op: new Date().toISOString(),
      rebo_melding_door: profile.user_id,
      rebo_melding_door_naam: residentLabel(profile.naam_of_bijnaam, profile.huisnummer),
      bijgewerkt_op: new Date().toISOString(),
    });
  }

  function retractRebo(id: string) {
    const report = reports.items.find((item) => item.id === id);
    if (!report) return;
    const nextStatus = report.confirmations >= 3 ? "Herkend door meerdere bewoners" : "Nieuw";
    reports.update(id, {
      status: nextStatus,
      rebo_melding_op: undefined,
      rebo_melding_door: undefined,
      rebo_melding_door_naam: undefined,
      bijgewerkt_op: new Date().toISOString(),
    });
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <h2>Meldingen</h2>
        <p>Bekijk meldingen in het gebouw of geef rustig een nieuw probleem door.</p>
      </div>
      {reports.syncError && (
        <div className="notice notice--warning">
          <p>{reports.syncError}</p>
          <button className="text-button" onClick={reports.clearSyncError} type="button">Melding sluiten</button>
        </div>
      )}
      {!showForm && (
        <button className="button button--full" onClick={() => setShowForm(true)} type="button">
          Nieuwe melding
        </button>
      )}
      {showForm && (
      <form className="form-panel" onSubmit={(event) => { event.preventDefault(); void createReport(); }}>
        <h3>{editingId ? "Melding bewerken" : "Melding maken"}</h3>
        <input value={draft.titel} onChange={(event) => setDraft({ ...draft, titel: event.target.value })} placeholder="Korte titel" required />
        <textarea value={draft.omschrijving} onChange={(event) => setDraft({ ...draft, omschrijving: event.target.value })} placeholder="Wat merk je?" required />
        <UrlPreview text={draft.omschrijving} />
        <select value={draft.categorie} onChange={(event) => setDraft({ ...draft, categorie: event.target.value as ReportCategory })}>
          {reportCategories.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select
          value={draft.type_melding}
          onChange={(event) => {
            const type_melding = event.target.value as ReportType;
            setDraft({ ...draft, type_melding, locatie_in_gebouw: type_melding === "Appartementencomplex" ? draft.locatie_in_gebouw : "" });
          }}
        >
          {reportTypes.map((item) => <option key={item}>{item}</option>)}
        </select>
        {draft.type_melding === "Appartementencomplex" && (
          <input value={draft.locatie_in_gebouw} onChange={(event) => setDraft({ ...draft, locatie_in_gebouw: event.target.value })} placeholder="Locatie in het appartementencomplex" required />
        )}
        <div className="upload-field">
          <label className="field">
            <span>Foto's toevoegen</span>
          <input
            accept="image/*"
            multiple
            type="file"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []).slice(0, Math.max(0, maxImages - draft.image_urls.length));
              if (files.length === 0) return;
              const previewUrls = files.map((file) => URL.createObjectURL(file));
              setDraft({
                ...draft,
                image_urls: [...draft.image_urls, ...previewUrls].slice(0, maxImages),
                image_files: [...draft.image_files, ...files].slice(0, maxImages),
              });
              event.currentTarget.value = "";
            }}
          />
          </label>
          <EditablePhotoGrid
            images={draft.image_urls}
            alt="Voorbeeld van gekozen foto's"
            onRemove={(index) => {
              const removedUrl = draft.image_urls[index];
              const blobIndex = draft.image_urls.slice(0, index).filter(isPreviewUrl).length;
              revokePreviewUrl(removedUrl);
              setDraft({
                ...draft,
                image_urls: draft.image_urls.filter((_, itemIndex) => itemIndex !== index),
                image_files: isPreviewUrl(removedUrl)
                  ? draft.image_files.filter((_, itemIndex) => itemIndex !== blobIndex)
                  : draft.image_files,
              });
            }}
          />
          <small>Maximaal {maxImages} foto's. Voeg alleen foto's toe die helpen om het probleem duidelijk te maken.</small>
        </div>
        {draftRelevantDocuments.length > 0 && (
          <div className="related-box">
            <strong>Bekijk eerst deze kennisbankdocumenten</strong>
            <span>Misschien vind je hier al een antwoord voordat je de melding verstuurt.</span>
            {draftRelevantDocuments.map((document) => (
              <StorageLink href={document.pdf_url} key={document.id}>
                {document.titel} · {document.documenttype}
              </StorageLink>
            ))}
          </div>
        )}
        {draftLooksLikeRentalMaintenance && (
          <div className="related-box">
            <strong>Dit lijkt mogelijk verhuuronderhoud</strong>
            <span>Bekijk eerst het REBO-document om te zien of dit rechtstreeks bij REBO hoort.</span>
            <a href={rentalMaintenancePdfUrl} target="_blank" rel="noreferrer">
              REBO-document onderhoud aan huurwoningen openen
            </a>
          </div>
        )}
        {formError && <p className="form-message form-message--error">{formError}</p>}
        <button className="button" disabled={saving} type="submit">{saving ? "Bezig met opslaan" : editingId ? "Wijzigingen opslaan" : "Melding opslaan"}</button>
        <button
          className="button button--soft"
          disabled={saving}
          onClick={resetDraft}
          type="button"
        >
          Annuleren
        </button>
      </form>
      )}
      <div className="filter-row filter-row--equal">
        <SearchBar value={query} onChange={setQuery} placeholder="Zoek in meldingen" />
        <CategoryFilter label="Categorie" value={category} options={reportCategories} onChange={setCategory} />
      </div>
      <div className="card-list">
        {filteredReports.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            documents={documents.items}
            profiles={profiles.items}
            canConfirm={report.aangemaakt_door !== profile.user_id}
            canResolve={report.aangemaakt_door === profile.user_id}
            canRetractRebo={report.rebo_melding_door === profile.user_id}
            onConfirm={confirmReport}
            onForwardToRebo={forwardToRebo}
            onRetractRebo={retractRebo}
            onEdit={(item) => {
              setEditingId(item.id);
              setDraft({
                titel: item.titel,
                omschrijving: item.omschrijving,
                categorie: item.categorie,
                locatie_in_gebouw: item.type_melding === "Appartementencomplex" ? item.locatie_in_gebouw : "",
                type_melding: item.type_melding,
                image_urls: item.image_urls ?? [],
                image_files: [],
              });
              setShowForm(true);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onDelete={reports.remove}
            onResolve={(id, resolution) => reports.update(id, {
              status: "Opgelost",
              opgelost_op: new Date().toISOString(),
              opgelost_door: profile.user_id,
              opgelost_door_naam: residentLabel(profile.naam_of_bijnaam, profile.huisnummer),
              oplossing_omschrijving: resolution || "Opgelost. Er is geen extra toelichting toegevoegd.",
              bijgewerkt_op: new Date().toISOString(),
            })}
          />
        ))}
      </div>
      {filteredReports.length === 0 && <EmptyState title="Geen open meldingen" description="Zie je een probleem in je woning of in het gebouw, maak dan een nieuwe melding. Spoed en persoonlijke reparaties blijven via REBO." />}
      {resolvedReports.length > 0 && (
        <section className="page-stack">
          <div className="page-heading">
            <h2>Opgeloste meldingen</h2>
            <p>Deze meldingen zijn afgerond, maar blijven terug te vinden met de oplossing erbij.</p>
          </div>
          <div className="resolved-report-list">
            {resolvedReports.map((report) => (
              <ResolvedReportItem key={report.id} report={report} documents={documents.items} profiles={profiles.items} />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

function ResolvedReportItem({ report, documents, profiles }: { report: Report; documents: KnowledgeDocument[]; profiles: Profile[] }) {
  const solution = report.oplossing_omschrijving || "Er is geen extra toelichting toegevoegd.";
  const profilesByUserId = useMemo(() => new Map(profiles.map((item) => [item.user_id, item])), [profiles]);
  const relatedDocuments =
    report.type_melding === "Appartementencomplex" ? [] : relevantDocuments(report.categorie, documents);
  const resolver = report.opgelost_door ? profilesByUserId.get(report.opgelost_door) : undefined;
  const solvedBy = report.opgelost_door
    ? `Opgelost door ${resolver ? residentLabel(resolver.naam_of_bijnaam, resolver.huisnummer, resolver.achternaam) : "Bewoner"}`
    : "Opgelost";

  return (
    <details className="resolved-report">
      <summary>
        <span className="resolved-report__main">
          <span className="chip">{report.categorie}</span>
          <strong>{report.titel}</strong>
          <small>{solution}</small>
        </span>
        <span className="resolved-report__meta">
          <StatusBadge tone="good">Opgelost</StatusBadge>
          <small>{solvedBy}</small>
        </span>
      </summary>
      <div className="resolved-report__body">
        <div className="resident-byline">
          <span>Geplaatst door</span>
          <ResidentIdentity anonymizeWhenProfileMissing compact houseNumber={report.aangemaakt_door_huisnummer} name={report.aangemaakt_door_naam} profile={profilesByUserId.get(report.aangemaakt_door)} />
        </div>
        <PhotoGrid images={report.image_urls ?? []} alt={report.titel} />
        <p><LinkifiedText text={report.omschrijving} /></p>
        <dl className="meta-list">
          <div>
            <dt>Locatie</dt>
            <dd>{report.locatie_in_gebouw}</dd>
          </div>
          <div>
            <dt>Herkenningen</dt>
            <dd>{report.confirmations} bewoners</dd>
          </div>
        </dl>
        <aside className="related-box">
          <strong>Oplossing</strong>
          <span><LinkifiedText text={solution} /></span>
          {report.opgelost_door_naam && <span>{solvedBy}</span>}
        </aside>
        {relatedDocuments.length > 0 && (
          <aside className="related-box">
            <strong>Bijbehorende documenten</strong>
            {relatedDocuments.map((document) => (
              <StorageLink href={document.pdf_url} key={document.id}>
                {document.titel} · {document.documenttype}
              </StorageLink>
            ))}
          </aside>
        )}
      </div>
    </details>
  );
}
