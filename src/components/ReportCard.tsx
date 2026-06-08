import { Check, ClipboardCopy, Pencil, Send, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { KnowledgeDocument, Profile, Report } from "../types";
import { PhotoGrid } from "./PhotoGrid";
import { adviceForReport, collectiveMessage, isLikelyRentalMaintenance, reboSummary, relevantDocuments, rentalMaintenancePdfUrl } from "../lib/reportLogic";
import { residentLabel } from "../lib/residentDisplay";
import { LinkifiedText } from "./LinkifiedText";
import { ResidentIdentity } from "./ResidentIdentity";
import { StatusBadge } from "./StatusBadge";
import { useConfirm } from "../lib/ConfirmContext";

interface ReportCardProps {
  report: Report;
  documents: KnowledgeDocument[];
  profiles?: Profile[];
  canConfirm?: boolean;
  canResolve?: boolean;
  canRetractRebo?: boolean;
  onConfirm?: (id: string) => void;
  onForwardToRebo?: (id: string) => void;
  onRetractRebo?: (id: string) => void;
  onEdit?: (report: Report) => void;
  onDelete?: (id: string) => void;
  onResolve?: (id: string, resolution: string) => void;
}

export function ReportCard({ report, documents, profiles = [], canConfirm = true, canResolve, canRetractRebo, onConfirm, onForwardToRebo, onRetractRebo, onEdit, onDelete, onResolve }: ReportCardProps) {
  const confirm = useConfirm();
  const relatedDocuments =
    report.type_melding === "Appartementencomplex" ? [] : relevantDocuments(report.categorie, documents);
  const profilesByUserId = useMemo(() => new Map(profiles.map((item) => [item.user_id, item])), [profiles]);
  const [resolution, setResolution] = useState("");
  const forwardedToRebo = report.status === "Doorgezet naar REBO";
  const showRentalMaintenanceLink = isLikelyRentalMaintenance(report);
  const reboReporter = report.rebo_melding_door ? profilesByUserId.get(report.rebo_melding_door) : undefined;
  const reboReporterLabel = reboReporter ? residentLabel(reboReporter.naam_of_bijnaam, reboReporter.huisnummer, reboReporter.achternaam) : "Een bewoner";
  const resolver = report.opgelost_door ? profilesByUserId.get(report.opgelost_door) : undefined;
  const resolverLabel = resolver ? residentLabel(resolver.naam_of_bijnaam, resolver.huisnummer, resolver.achternaam) : "Bewoner";

  async function copySummary() {
    await navigator.clipboard.writeText(reboSummary(report));
  }

  return (
    <details className="item-card collapsible-card">
      <summary className="item-card__header collapsible-card__summary">
        <div>
          <p className="chip">{report.categorie}</p>
          <h2>{report.titel}</h2>
          <div className="resident-byline">
            <span>Geplaatst door</span>
            <ResidentIdentity anonymizeWhenProfileMissing compact houseNumber={report.aangemaakt_door_huisnummer} name={report.aangemaakt_door_naam} profile={profilesByUserId.get(report.aangemaakt_door)} />
          </div>
        </div>
        <StatusBadge tone={report.status === "Opgelost" ? "good" : "soft"}>{report.status}</StatusBadge>
      </summary>
      <div className="collapsible-card__body">
      <PhotoGrid images={report.image_urls ?? []} alt={report.titel} />
      <p><LinkifiedText text={report.omschrijving} /></p>
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
            {reboReporterLabel} heeft aangegeven dat deze melding is doorgegeven aan REBO.
            {" "}Herken je dit ook? Dan kun je eventueel zelf ook een melding doen met dezelfde samenvatting.
          </span>
        </aside>
      )}
      {report.status !== "Opgelost" && (
        <div className="action-row report-actions">
          {canConfirm && (
            <button className={report.current_user_response === "confirmed" ? "button" : "button button--soft"} onClick={() => onConfirm?.(report.id)} type="button">
              <Check aria-hidden="true" size={18} /> {report.current_user_response === "confirmed" ? "Herkenning intrekken" : "Ik heb dit ook"}
            </button>
          )}
          <a className="button button--soft" href="https://www.thuisbijrebo.nl/mijn-rebo/inloggen" target="_blank" rel="noreferrer">
            <Send aria-hidden="true" size={18} /> {forwardedToRebo ? "Zelf ook melden bij REBO" : "Melding bij REBO doen"}
          </a>
          {forwardedToRebo && canRetractRebo ? (
            <button className="button button--soft" onClick={() => onRetractRebo?.(report.id)} type="button">
              Doorgeven aan REBO intrekken
            </button>
          ) : !forwardedToRebo && (
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
        <div className="action-row">
          <button className="button button--soft" onClick={() => onEdit?.(report)} type="button">
            <Pencil aria-hidden="true" size={18} /> Bewerken
          </button>
          <button
            className="button button--danger"
            onClick={async () => {
              const confirmed = await confirm({ message: "Weet je zeker dat je deze melding wilt verwijderen?" });
              if (confirmed) onDelete?.(report.id);
            }}
            type="button"
          >
            <Trash2 aria-hidden="true" size={18} /> Verwijderen
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
          <span><LinkifiedText text={report.oplossing_omschrijving} /></span>
          {report.opgelost_door && <span>Toegevoegd door {resolverLabel}</span>}
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
      </div>
    </details>
  );
}
