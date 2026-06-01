import { Check, ClipboardCopy, Send, X } from "lucide-react";
import type { KnowledgeDocument, Report } from "../types";
import { adviceForReport, collectiveMessage, reboSummary, relevantDocuments } from "../lib/reportLogic";
import { StatusBadge } from "./StatusBadge";

interface ReportCardProps {
  report: Report;
  documents: KnowledgeDocument[];
  canResolve?: boolean;
  onConfirm?: (id: string) => void;
  onDecline?: (id: string) => void;
  onResolve?: (id: string) => void;
}

export function ReportCard({ report, documents, canResolve, onConfirm, onDecline, onResolve }: ReportCardProps) {
  const relatedDocuments = relevantDocuments(report.categorie, documents);

  async function copySummary() {
    await navigator.clipboard.writeText(reboSummary(report));
  }

  return (
    <article className="item-card">
      <div className="item-card__header">
        <div>
          <p className="chip">{report.categorie}</p>
          <h2>{report.titel}</h2>
        </div>
        <StatusBadge tone={report.status === "Opgelost" ? "good" : "soft"}>{report.status}</StatusBadge>
      </div>
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
      </div>
      <div className="action-row">
        <button className="button button--soft" onClick={() => onConfirm?.(report.id)} type="button">
          <Check aria-hidden="true" size={18} /> Ik heb dit ook
        </button>
        <button className="button button--soft" onClick={() => onDecline?.(report.id)} type="button">
          <X aria-hidden="true" size={18} /> Ik heb dit niet
        </button>
        <a className="button button--soft" href="https://www.rebogroep.nl/" target="_blank" rel="noreferrer">
          <Send aria-hidden="true" size={18} /> Melding bij REBO doen
        </a>
        <button className="button button--soft" onClick={copySummary} type="button">
          <ClipboardCopy aria-hidden="true" size={18} /> Kopieer samenvatting
        </button>
      </div>
      {canResolve && (
        <button className="text-button" onClick={() => onResolve?.(report.id)} type="button">
          Markeer als opgelost
        </button>
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
