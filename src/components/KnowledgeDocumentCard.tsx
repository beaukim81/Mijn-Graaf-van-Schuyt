import { Download, FileText, Tag } from "lucide-react";
import type { KnowledgeDocument } from "../types";
import { PhotoGrid } from "./PhotoGrid";
import { StatusBadge } from "./StatusBadge";

interface KnowledgeDocumentCardProps {
  document: KnowledgeDocument;
}

export function KnowledgeDocumentCard({ document }: KnowledgeDocumentCardProps) {
  return (
    <article className="item-card library-card">
      <div className="item-card__header">
        <div>
          <p className="chip">{document.categorie}</p>
          <h2>{document.titel}</h2>
        </div>
        <StatusBadge tone={document.status === "Gepubliceerd" ? "good" : "warning"}>{document.status}</StatusBadge>
      </div>
      <p className="muted library-card__type">
        <FileText aria-hidden="true" size={16} /> {document.documenttype}
      </p>
      <p>{document.korte_samenvatting}</p>
      {document.uitgebreide_uitleg && <p>{document.uitgebreide_uitleg}</p>}
      <PhotoGrid images={document.image_urls ?? []} alt={document.titel} />
      {document.leverancier_of_fabrikant && <p className="muted">Leverancier of fabrikant: {document.leverancier_of_fabrikant}</p>}
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
              <p>{item.antwoord ?? "Praktische tip kan later worden toegevoegd door bewoners of beheer."}</p>
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
    </article>
  );
}
