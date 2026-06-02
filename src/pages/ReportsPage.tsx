import { useMemo, useState } from "react";
import { CategoryFilter } from "../components/CategoryFilter";
import { EmptyState } from "../components/EmptyState";
import { ReportCard } from "../components/ReportCard";
import { SearchBar } from "../components/SearchBar";
import { StatusBadge } from "../components/StatusBadge";
import { reportCategories } from "../data/categories";
import { useAppData } from "../lib/AppDataContext";
import type { KnowledgeDocument, Report, ReportCategory, ReportType } from "../types";
import { isLikelyRentalMaintenance, relevantDocuments, rentalMaintenancePdfUrl } from "../lib/reportLogic";

const reportTypes: ReportType[] = ["Alleen mijn woning", "Mogelijk meerdere woningen", "Appartementencomplex"];

export function ReportsPage() {
  const { reports, documents, profile } = useAppData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ReportCategory | "Alle">("Alle");
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({
    titel: "",
    omschrijving: "",
    categorie: "Mechanische ventilatie" as ReportCategory,
    locatie_in_gebouw: "",
    type_melding: "Alleen mijn woning" as ReportType,
  });

  const filteredReports = useMemo(() => {
    return reports.items.filter((report) => {
      const matchesQuery = `${report.titel} ${report.omschrijving} ${report.locatie_in_gebouw}`.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === "Alle" || report.categorie === category;
      return report.status !== "Opgelost" && matchesQuery && matchesCategory;
    });
  }, [reports.items, query, category]);

  const draftLooksLikeRentalMaintenance = isLikelyRentalMaintenance(draft);
  const draftRelevantDocuments = relevantDocuments(draft.categorie, documents.items);

  const resolvedReports = useMemo(() => {
    return reports.items.filter((report) => {
      const matchesQuery = `${report.titel} ${report.omschrijving} ${report.locatie_in_gebouw}`.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === "Alle" || report.categorie === category;
      return report.status === "Opgelost" && matchesQuery && matchesCategory;
    });
  }, [reports.items, query, category]);

  function createReport() {
    const timestamp = new Date().toISOString();
    const locatie_in_gebouw =
      draft.type_melding === "Appartementencomplex"
        ? draft.locatie_in_gebouw
        : draft.type_melding === "Mogelijk meerdere woningen"
          ? "Meerdere woningen"
          : "Eigen woning";
    const report: Report = {
      id: crypto.randomUUID(),
      ...draft,
      locatie_in_gebouw,
      status: "Nieuw",
      aangemaakt_door: profile.user_id,
      aangemaakt_op: timestamp,
      bijgewerkt_op: timestamp,
      confirmations: 1,
      declined: 0,
      current_user_response: "confirmed",
    };
    reports.add(report);
    setCategory(draft.categorie);
    setQuery("");
    setDraft({ titel: "", omschrijving: "", categorie: "Mechanische ventilatie", locatie_in_gebouw: "", type_melding: "Alleen mijn woning" });
    setShowForm(false);
  }

  function confirmReport(id: string) {
    const report = reports.items.find((item) => item.id === id);
    if (!report) return;
    if (report.current_user_response === "confirmed") return;
    const confirmations = report.confirmations + 1;
    const declined = report.current_user_response === "declined" ? Math.max(0, report.declined - 1) : report.declined;
    reports.update(id, {
      confirmations,
      declined,
      current_user_response: "confirmed",
      status: confirmations >= 3 && report.status === "Nieuw" ? "Herkend door meerdere bewoners" : report.status,
      bijgewerkt_op: new Date().toISOString(),
    });
  }

  function forwardToRebo(id: string) {
    const report = reports.items.find((item) => item.id === id);
    if (!report) return;
    reports.update(id, {
      status: "Doorgezet naar REBO",
      rebo_melding_op: new Date().toISOString(),
      rebo_melding_door: profile.user_id,
      rebo_melding_door_naam: profile.naam_of_bijnaam,
      bijgewerkt_op: new Date().toISOString(),
    });
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <h2>Meldingen</h2>
        <p>Bekijk meldingen in het gebouw of geef rustig een nieuw probleem door.</p>
      </div>
      {!showForm && (
        <button className="button button--full" onClick={() => setShowForm(true)} type="button">
          Nieuwe melding
        </button>
      )}
      {showForm && (
      <form className="form-panel" onSubmit={(event) => { event.preventDefault(); createReport(); }}>
        <h3>Melding maken</h3>
        <input value={draft.titel} onChange={(event) => setDraft({ ...draft, titel: event.target.value })} placeholder="Korte titel" required />
        <textarea value={draft.omschrijving} onChange={(event) => setDraft({ ...draft, omschrijving: event.target.value })} placeholder="Wat merk je?" required />
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
        {draftRelevantDocuments.length > 0 && (
          <div className="related-box">
            <strong>Bekijk eerst deze kennisbankdocumenten</strong>
            <span>Misschien vind je hier al een antwoord voordat je de melding verstuurt.</span>
            {draftRelevantDocuments.map((document) => (
              <a href={document.pdf_url} key={document.id} target="_blank" rel="noreferrer">
                {document.titel} · {document.documenttype}
              </a>
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
        <button className="button" type="submit">Melding opslaan</button>
        <button className="button button--soft" onClick={() => setShowForm(false)} type="button">Annuleren</button>
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
            canResolve={profile.rol === "admin" || report.aangemaakt_door === profile.user_id}
            onConfirm={confirmReport}
            onForwardToRebo={forwardToRebo}
            onResolve={(id, resolution) => reports.update(id, {
              status: "Opgelost",
              opgelost_op: new Date().toISOString(),
              opgelost_door: profile.user_id,
              opgelost_door_naam: profile.naam_of_bijnaam,
              oplossing_omschrijving: resolution || "Opgelost. Er is geen extra toelichting toegevoegd.",
              bijgewerkt_op: new Date().toISOString(),
            })}
          />
        ))}
      </div>
      {filteredReports.length === 0 && <EmptyState title="Geen meldingen gevonden" description="Er is op dit moment niets dat past bij je filter." />}
      {resolvedReports.length > 0 && (
        <section className="page-stack">
          <div className="page-heading">
            <h2>Opgeloste meldingen</h2>
            <p>Deze meldingen zijn afgerond, maar blijven terug te vinden met de oplossing erbij.</p>
          </div>
          <div className="resolved-report-list">
            {resolvedReports.map((report) => (
              <ResolvedReportItem key={report.id} report={report} documents={documents.items} />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

function ResolvedReportItem({ report, documents }: { report: Report; documents: KnowledgeDocument[] }) {
  const solvedBy = report.opgelost_door_naam ? `Opgelost door ${report.opgelost_door_naam}` : "Opgelost";
  const solution = report.oplossing_omschrijving || "Er is geen extra toelichting toegevoegd.";

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
      <ReportCard report={report} documents={documents} />
    </details>
  );
}
