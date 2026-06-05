import { ExternalLink, Mail, MessageCircle, Pencil, Phone, Trash2 } from "lucide-react";
import type { Contact } from "../types";
import { LinkifiedText } from "./LinkifiedText";
import { useConfirm } from "../lib/ConfirmContext";

interface ContactCardProps {
  contact: Contact;
  isAdmin?: boolean;
  onEdit?: (contact: Contact) => void;
  onDelete?: (id: string) => void;
}

function cleanContactDescription(description: string) {
  return description
    .replace(/\b(?:bel|whatsapp(?: kan)?(?: via)?|telefoon(?:nummer)?|tel\.?)\s*(?:kan\s*)?(?:via\s*)?(?:\+31|0)\s?(?:\d[\d\s-]{6,}\d)\.?/gi, "")
    .replace(/\b(?:\+31|0)\s?(?:\d[\d\s-]{6,}\d)\b/g, "")
    .replace(/\s+([,.])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/\.\s*\./g, ".")
    .trim();
}

export function ContactCard({ contact, isAdmin, onEdit, onDelete }: ContactCardProps) {
  const confirm = useConfirm();
  const description = cleanContactDescription(contact.beschrijving);
  return (
    <article className="item-card contact-card">
      <div className="item-card__header">
        <div>
          <p className="chip">{contact.categorie}</p>
          <h2>{contact.naam}</h2>
        </div>
      </div>
      {description && <p className="contact-card__description"><LinkifiedText text={description} /></p>}
      <div className="action-row">
        {contact.telefoonnummer && (
          <a className="button button--soft" href={`tel:${contact.telefoonnummer.replace(/\s/g, "")}`}>
            <Phone aria-hidden="true" size={18} /> Bel direct
          </a>
        )}
        {contact.emailadres && (
          <a className="button button--soft" href={`mailto:${contact.emailadres}`}>
            <Mail aria-hidden="true" size={18} /> Mail
          </a>
        )}
        {contact.whatsapp_url && (
          <a className="button button--soft" href={contact.whatsapp_url} target="_blank" rel="noreferrer">
            <MessageCircle aria-hidden="true" size={18} /> WhatsApp
          </a>
        )}
        {contact.website && (
          <a className="button button--soft" href={contact.website} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden="true" size={18} /> Website
          </a>
        )}
      </div>
      {isAdmin && (
        <div className="action-row">
          <button className="button button--soft" onClick={() => onEdit?.(contact)} type="button">
            <Pencil aria-hidden="true" size={18} /> Bewerken
          </button>
          <button
            className="button button--danger"
            onClick={async () => {
              const confirmed = await confirm({ message: `Weet je zeker dat je ${contact.naam} wilt verwijderen?` });
              if (confirmed) onDelete?.(contact.id);
            }}
            type="button"
          >
            <Trash2 aria-hidden="true" size={18} /> Verwijderen
          </button>
        </div>
      )}
    </article>
  );
}
