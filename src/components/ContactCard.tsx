import { ExternalLink, Mail, MessageCircle, Phone } from "lucide-react";
import type { Contact } from "../types";

interface ContactCardProps {
  contact: Contact;
  isAdmin?: boolean;
  onEdit?: (contact: Contact) => void;
  onDelete?: (id: string) => void;
}

export function ContactCard({ contact, isAdmin, onEdit, onDelete }: ContactCardProps) {
  return (
    <article className="item-card">
      <div className="item-card__header">
        <div>
          <p className="chip">{contact.categorie}</p>
          <h2>{contact.naam}</h2>
        </div>
      </div>
      <p>{contact.beschrijving}</p>
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
        <div className="admin-row">
          <button className="text-button" onClick={() => onEdit?.(contact)} type="button">
            Wijzigen
          </button>
          <button className="text-button danger" onClick={() => onDelete?.(contact.id)} type="button">
            Verwijderen
          </button>
        </div>
      )}
    </article>
  );
}
