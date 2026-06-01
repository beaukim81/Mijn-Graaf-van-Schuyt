import { CheckCircle2, FileText, Tag } from "lucide-react";
import type { KnowledgeDocument } from "../types";
import { StatusBadge } from "./StatusBadge";

interface KnowledgeDocumentCardProps {
  document: KnowledgeDocument;
  isAdmin?: boolean;
  onFlag?: (id: string) => void;
  onPublish?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function KnowledgeDocumentCard({ document, isAdmin, onFlag, onPublish, onDelete }: KnowledgeDocumentCardProps) {
  return (
    <article className="item-card">
      <div className="item-card__header">
        <div>
          <p className="chip">{document.categorie}</p>
          <h2>{document.titel}</h2>
        </div>
        <StatusBadge tone={document.status === "Gepubliceerd" ? "good" : "warning"}>{document.status}</StatusBadge>
      </div>
      <p className="muted">{document.documenttype}</p>
      <p>{document.korte_samenvatting}</p>
      {document.leverancier_of_fabrikant && <p className="muted">Leverancier of fabrikant: {document.leverancier_of_fabrikant}</p>}
      <div className="tag-row" aria-label="Zoekwoorden">
        {document.tags.map((tag) => (
          <span key={tag}>
            <Tag aria-hidden="true" size={14} /> {tag}
          </span>
        ))}
      </div>
      <details>
        <summary>Veelgestelde vragen</summary>
        <div className="faq-list">
          {document.faq.map((item) => (
            <div key={item.id}>
              <strong>{item.vraag}</strong>
              <p>{item.antwoord ?? "Praktische tip kan later worden toegevoegd door bewoners of beheer."}</p>
            </div>
          ))}
        </div>
      </details>
      <p className="muted">Laatst bijgewerkt: {new Date(document.bijgewerkt_op).toLocaleDateString("nl-NL")}</p>
      <div className="action-row">
        <a className="button button--soft" href={document.pdf_url} target="_blank" rel="noreferrer">
          <FileText aria-hidden="true" size={18} /> Open PDF
        </a>
        <button className="button button--soft" onClick={() => onFlag?.(document.id)} type="button">
          <CheckCircle2 aria-hidden="true" size={18} /> Klopt dit nog?
        </button>
      </div>
      {isAdmin && (
        <div className="admin-row">
          <button className="text-button" onClick={() => onPublish?.(document.id)} type="button">
            Publiceren
          </button>
          <button className="text-button danger" onClick={() => onDelete?.(document.id)} type="button">
            Verwijderen
          </button>
        </div>
      )}
    </article>
  );
}
