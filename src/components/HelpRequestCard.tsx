import { HandHeart } from "lucide-react";
import type { HelpRequest } from "../types";
import { StatusBadge } from "./StatusBadge";

interface HelpRequestCardProps {
  request: HelpRequest;
  isOwner?: boolean;
  onOffer?: (id: string) => void;
  onComplete?: (id: string) => void;
}

export function HelpRequestCard({ request, isOwner, onOffer, onComplete }: HelpRequestCardProps) {
  return (
    <article className="item-card">
      <div className="item-card__header">
        <div>
          <p className="chip">{request.categorie}</p>
          <h2>{request.titel}</h2>
        </div>
        <StatusBadge tone={request.status === "Afgerond" ? "good" : "soft"}>{request.status}</StatusBadge>
      </div>
      <p>{request.omschrijving}</p>
      <div className="action-row">
        <button className="button button--soft" onClick={() => onOffer?.(request.id)} type="button">
          <HandHeart aria-hidden="true" size={18} /> Ik kan helpen
        </button>
        {isOwner && (
          <button className="button button--soft" onClick={() => onComplete?.(request.id)} type="button">
            Markeer als afgerond
          </button>
        )}
      </div>
      {request.offers.length > 0 && (
        <div className="related-box">
          <strong>Hulp aangeboden</strong>
          {request.offers.map((offer) => (
            <span key={offer.id}>
              {offer.helper_name}:{" "}
              {offer.contact_allowed && offer.contact_info
                ? offer.contact_info
                : "Neem contact op via de bestaande bewonersgroep of spreek elkaar aan in het gebouw."}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
