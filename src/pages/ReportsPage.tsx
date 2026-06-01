import { useMemo, useState } from "react";
import { CategoryFilter } from "../components/CategoryFilter";
import { EmptyState } from "../components/EmptyState";
import { ReportCard } from "../components/ReportCard";
import { SearchBar } from "../components/SearchBar";
import { reportCategories } from "../data/categories";
import { useAppData } from "../lib/AppDataContext";
import type { Report, ReportCategory, ReportType } from "../types";
import { relevantDocuments } from "../lib/reportLogic";

const reportTypes: ReportType[] = ["Alleen mijn woning", "Mogelijk meerdere woningen", "Zeker meerdere woningen"];

export function ReportsPage() {
  const { reports, documents, profile } = useAppData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ReportCategory | "Alle">("Alle");
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
      return matchesQuery && matchesCategory;
    });
  }, [reports.items, query, category]);

  function createReport() {
    const timestamp = new Date().toISOString();
    const report: Report = {
      id: crypto.randomUUID(),
      ...draft,
      status: "Nieuw",
      aangemaakt_door: profile.user_id,
      aangemaakt_op: timestamp,
      bijgewerkt_op: timestamp,
      confirmations: 1,
      declined: 0,
    };
    reports.add(report);
    setDraft({ titel: "", omschrijving: "", categorie: "Mechanische ventilatie", locatie_in_gebouw: "", type_melding: "Alleen mijn woning" });
  }

  function confirmReport(id: string) {
    const report = reports.items.find((item) => item.id === id);
    if (!report) return;
    const confirmations = report.confirmations + 1;
    reports.update(id, {
      confirmations,
      status: confirmations >= 3 && report.status === "Nieuw" ? "Herkend door meerdere bewoners" : report.status,
      bijgewerkt_op: new Date().toISOString(),
    });
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <h2>Meldingen</h2>
        <p>Meld wat je ziet of ervaart, zodat gedeelde problemen sneller herkenbaar worden.</p>
      </div>
      <form className="form-panel" onSubmit={(event) => { event.preventDefault(); createReport(); }}>
        <h3>Melding maken</h3>
        <input value={draft.titel} onChange={(event) => setDraft({ ...draft, titel: event.target.value })} placeholder="Korte titel" required />
        <textarea value={draft.omschrijving} onChange={(event) => setDraft({ ...draft, omschrijving: event.target.value })} placeholder="Wat merk je?" required />
        <select value={draft.categorie} onChange={(event) => setDraft({ ...draft, categorie: event.target.value as ReportCategory })}>
          {reportCategories.map((item) => <option key={item}>{item}</option>)}
        </select>
        <input value={draft.locatie_in_gebouw} onChange={(event) => setDraft({ ...draft, locatie_in_gebouw: event.target.value })} placeholder="Locatie in het gebouw" required />
        <select value={draft.type_melding} onChange={(event) => setDraft({ ...draft, type_melding: event.target.value as ReportType })}>
          {reportTypes.map((item) => <option key={item}>{item}</option>)}
        </select>
        <div className="related-box">
          <strong>Bekijk eerst deze kennisbankdocumenten</strong>
          <span>Misschien vind je hier al een antwoord voordat je de melding verstuurt.</span>
          {relevantDocuments(draft.categorie, documents.items).map((document) => (
            <a href={document.pdf_url} key={document.id} target="_blank" rel="noreferrer">
              {document.titel} · {document.documenttype}
            </a>
          ))}
        </div>
        <button className="button" type="submit">Melding opslaan</button>
      </form>
      <div className="filter-row">
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
            onDecline={(id) => {
              const report = reports.items.find((item) => item.id === id);
              if (report) reports.update(id, { declined: report.declined + 1 });
            }}
            onResolve={(id) => reports.update(id, { status: "Opgelost", bijgewerkt_op: new Date().toISOString() })}
          />
        ))}
      </div>
      {filteredReports.length === 0 && <EmptyState title="Geen meldingen gevonden" description="Er is op dit moment niets dat past bij je filter." />}
    </section>
  );
}
