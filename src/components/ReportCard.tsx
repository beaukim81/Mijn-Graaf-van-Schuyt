import { Check, ClipboardCopy, Send } from "lucide-react";
import { useState } from "react";
import type { KnowledgeDocument, Report } from "../types";
import { PhotoGrid } from "./PhotoGrid";
import { adviceForReport, collectiveMessage, isLikelyRentalMaintenance, reboSummary, relevantDocuments, rentalMaintenancePdfUrl } from "../lib/reportLogic";
import { residentLabel } from "../lib/residentDisplay";
import { StatusBadge } from "./StatusBadge";

interface ReportCardProps {
  report: Report;
  documents: KnowledgeDocument[];
  canResolve?: boolean;
  onConfirm?: (id: string) => void;
  onForwardToRebo?: (id: string) => void;
  onResolve?: (id: string, resolution: string) => void;
}

export function ReportCard({ report, documents, canResolve, onConfirm, onForwardToRebo, onResolve }: ReportCardProps) {
  const relatedDocuments = relevantDocuments(report.categorie, documents);
  const [resolution, setResolution] = useState("");
  const forwardedToRebo = report.status === "Doorgezet naar REBO";
  const showRentalMaintenanceLink = isLikelyRentalMaintenance(report);

  async function copySummary() {
    await navigator.clipboard.writeText(reboSummary(report));
  }

  return (
    <article className="item-card">
      <div className="item-card__header">
        <div>
          <p className="chip">{report.categorie}</p>
          <h2>{report.titel}</h2>
          <p className="muted">Geplaatst door {residentLabel(report.aangemaakt_door_naam, report.aangemaakt_door_huisnummer)}</p>
        </div>
        <StatusBadge tone={report.status === "Opgelost" ? "good" : "soft"}>{report.status}</StatusBadge>
      </div>
      <PhotoGrid images={report.image_urls ?? []} alt={report.titel} />
      <p>{report.omschrijving}</p>
      <dl className="meta-list">
        <div>
          <dt>Locatie</dt>
          <dd>{report.locatie_in_gebouw}</dd>
        </div>
        <div>
          <dt>Herkennen</dt>
          <dd>{report.confirmations} bewoners</dd>
        </div>
      </dl>
      <div className="guidance">
        <strong>{collectiveMessage(report.confirmations)}</strong>
        <p>{adviceForReport(report)}</p>
        {showRentalMaintenanceLink && (
          <a href={rentalMaintenancePdfUrl} target="_blank" rel="noreferrer">
            Bekijk het REBO-document over onderhoud aan huurwoningen
          </a>
        )}
      </div>
      {forwardedToRebo && (
        <aside className="related-box">
          <strong>Al doorgegeven aan REBO</strong>
          <span>
            {report.rebo_melding_door_naam ? `${residentLabel(report.rebo_melding_door_naam)} heeft aangegeven dat deze melding is doorgegeven aan REBO.` : "Een bewoner heeft aangegeven dat deze melding is doorgegeven aan REBO."}
            {" "}Herken je dit ook? Dan kun je eventueel zelf ook een melding doen met dezelfde samenvatting.
          </span>
        </aside>
      )}
      {report.status !== "Opgelost" && (
        <div className="action-row report-actions">
          <button className={report.current_user_response === "confirmed" ? "button" : "button button--soft"} onClick={() => onConfirm?.(report.id)} type="button">
            <Check aria-hidden="true" size={18} /> Ik heb dit ook
          </button>
          <a className="button button--soft" href="https://www.thuisbijrebo.nl/mijn-rebo/inloggen" target="_blank" rel="noreferrer">
            <Send aria-hidden="true" size={18} /> {forwardedToRebo ? "Zelf ook melden bij REBO" : "Melding bij REBO doen"}
          </a>
          {!forwardedToRebo && (
            <button className="button button--soft" onClick={() => onForwardToRebo?.(report.id)} type="button">
              <Check aria-hidden="true" size={18} /> Doorgegeven aan REBO
            </button>
          )}
          <button className="button button--soft" onClick={copySummary} type="button">
            <ClipboardCopy aria-hidden="true" size={18} /> Kopieer samenvatting
          </button>
        </div>
      )}
      {canResolve && (
        <div className="resolution-box">
          <label className="field">
            <span>Hoe is dit opgelost?</span>
            <textarea value={resolution} onChange={(event) => setResolution(event.target.value)} placeholder="Bijvoorbeeld: zelf opgelost, REBO heeft dit opgepakt of een monteur is geweest." />
          </label>
          <button
            className="button button--soft"
            onClick={() => {
              onResolve?.(report.id, resolution.trim());
              setResolution("");
            }}
            type="button"
          >
            Markeer als opgelost
          </button>
        </div>
      )}
      {report.status === "Opgelost" && report.oplossing_omschrijving && (
        <aside className="related-box">
          <strong>Oplossing</strong>
          <span>{report.oplossing_omschrijving}</span>
          {report.opgelost_door_naam && <span>Toegevoegd door {residentLabel(report.opgelost_door_naam)}</span>}
        </aside>
      )}
      {relatedDocuments.length > 0 && (
        <aside className="related-box">
          <strong>Bekijk eerst deze documenten</strong>
          {relatedDocuments.map((document) => (
            <a href={document.pdf_url} key={document.id} target="_blank" rel="noreferrer">
              {document.titel} · {document.documenttype}
            </a>
          ))}
        </aside>
      )}
    </article>
  );
}
