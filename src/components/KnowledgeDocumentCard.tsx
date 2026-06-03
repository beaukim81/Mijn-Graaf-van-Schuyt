import { Download, FileText, Pencil, Tag, Trash2 } from "lucide-react";
import type { KnowledgeDocument } from "../types";
import { LinkifiedText } from "./LinkifiedText";
import { PhotoGrid } from "./PhotoGrid";

interface KnowledgeDocumentCardProps {
  document: KnowledgeDocument;
  canManage?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (document: KnowledgeDocument) => void;
}

export function KnowledgeDocumentCard({ canManage, document, onDelete, onEdit }: KnowledgeDocumentCardProps) {
  return (
    <details className="item-card library-card collapsible-card">
      <summary className="item-card__header collapsible-card__summary">
        <div>
          <p className="chip">{document.categorie}</p>
          <h2>{document.titel}</h2>
          <p className="muted library-card__type">
            <FileText aria-hidden="true" size={16} /> {document.documenttype}
          </p>
        </div>
      </summary>
      <div className="collapsible-card__body">
      <p><LinkifiedText text={document.korte_samenvatting} /></p>
      {document.uitgebreide_uitleg && <p><LinkifiedText text={document.uitgebreide_uitleg} /></p>}
      <PhotoGrid images={document.image_urls ?? []} alt={document.titel} />
      {document.leverancier_of_fabrikant && <p className="muted">Leverancier of fabrikant: <LinkifiedText text={document.leverancier_of_fabrikant} /></p>}
      <div className="tag-row tag-row--preview" aria-label="Belangrijkste zoekwoorden">
        {document.tags.slice(0, 3).map((tag) => (
          <span key={tag}>
            <Tag aria-hidden="true" size={14} /> {tag}
          </span>
        ))}
      </div>
      <details>
        <summary>Details en veelgestelde vragen</summary>
        <div className="tag-row" aria-label="Alle zoekwoorden">
          {document.tags.map((tag) => (
            <span key={tag}>
              <Tag aria-hidden="true" size={14} /> {tag}
            </span>
          ))}
        </div>
        <div className="faq-list">
          {document.faq.map((item) => (
            <div key={item.id}>
              <strong>{item.vraag}</strong>
              {item.antwoord && <p><LinkifiedText text={item.antwoord} /></p>}
            </div>
          ))}
        </div>
      </details>
      <p className="muted">Laatst bijgewerkt: {new Date(document.bijgewerkt_op).toLocaleDateString("nl-NL")}</p>
      {document.pdf_url && (
        <div className="action-row">
          <a className="button button--soft" href={document.pdf_url} target="_blank" rel="noreferrer">
            <FileText aria-hidden="true" size={18} /> Open PDF
          </a>
          <a className="button button--soft" href={document.pdf_url} download>
            <Download aria-hidden="true" size={18} /> Download PDF
          </a>
        </div>
      )}
      {canManage && (
        <div className="action-row">
          <button className="button button--soft" onClick={() => onEdit?.(document)} type="button">
            <Pencil aria-hidden="true" size={18} /> Bewerken
          </button>
          <button
            className="button button--danger"
            onClick={() => {
              const confirmed = window.confirm("Weet je zeker dat je deze bewonerstip wilt verwijderen?");
              if (confirmed) onDelete?.(document.id);
            }}
            type="button"
          >
            <Trash2 aria-hidden="true" size={18} /> Verwijderen
          </button>
        </div>
      )}
      </div>
    </details>
  );
}
