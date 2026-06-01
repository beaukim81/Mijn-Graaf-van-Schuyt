import { HandHeart, Home, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import type { HelpRequest } from "../types";
import { StatusBadge } from "./StatusBadge";

const socialCategories = ["Samen eten", "Koffie / thee", "Spelletjesavond", "Filmavond", "Wandelen"];

interface HelpRequestCardProps {
  request: HelpRequest;
  isOwner?: boolean;
  onOffer?: (id: string) => void;
  onComplete?: (id: string) => void;
  onSendMessage?: (id: string, message: string) => void;
}

export function HelpRequestCard({ request, isOwner, onOffer, onComplete, onSendMessage }: HelpRequestCardProps) {
  const [message, setMessage] = useState("");
  const isSocial = socialCategories.includes(request.categorie);

  function sendMessage() {
    const trimmed = message.trim();
    if (!trimmed) return;
    onSendMessage?.(request.id, trimmed);
    setMessage("");
  }

  return (
    <article className="item-card">
      <div className="item-card__header">
        <div>
          <p className="chip">{request.categorie}</p>
          <h2>{request.titel}</h2>
          <p className="muted">
            Geplaatst door {request.aanmaker_naam}
            {request.aanmaker_huisnummer ? `, huisnummer ${request.aanmaker_huisnummer}` : ""}
          </p>
        </div>
        <StatusBadge tone={request.status === "Afgerond" ? "good" : "soft"}>{request.status}</StatusBadge>
      </div>
      <p>{request.omschrijving}</p>
      <div className="action-row">
        <button className="button button--soft" onClick={() => onOffer?.(request.id)} type="button">
          <HandHeart aria-hidden="true" size={18} /> {isSocial ? "Ik wil meedoen" : "Ik kan helpen"}
        </button>
        {isOwner && (
          <button className="button button--soft" onClick={() => onComplete?.(request.id)} type="button">
            Markeer als afgerond
          </button>
        )}
      </div>
      {request.offers.length > 0 && (
        <div className="neighbor-box">
          <strong>{isSocial ? "Buren die willen meedoen" : "Hulp aangeboden"}</strong>
          {request.offers.map((offer) => (
            <div className="neighbor-offer" key={offer.id}>
              <Home aria-hidden="true" size={18} />
              <span>
                {offer.helper_name}
                {offer.helper_house_number ? `, huisnummer ${offer.helper_house_number}` : ""}
              </span>
              <small>
                {offer.contact_allowed && offer.contact_info
                  ? offer.contact_info
                  : "Geen extra contactgegevens gedeeld. Langslopen of afstemmen via bericht hieronder kan wel."}
              </small>
            </div>
          ))}
        </div>
      )}
      <div className="chat-box">
        <strong>
          <MessageCircle aria-hidden="true" size={18} /> {isSocial ? "Berichtjes over deze uitnodiging" : "Berichtjes over deze hulpvraag"}
        </strong>
        {request.messages.length === 0 ? (
          <p className="muted">Nog geen bericht. Houd het kort en praktisch.</p>
        ) : (
          request.messages.map((item) => (
            <div className="chat-message" key={item.id}>
              <span>
                {item.author_name}
                {item.author_house_number ? `, ${item.author_house_number}` : ""}
              </span>
              <p>{item.message}</p>
            </div>
          ))
        )}
        <div className="chat-input">
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={isSocial ? "Kort bericht, bijvoorbeeld: ik neem iets te drinken mee" : "Kort bericht, bijvoorbeeld: bezorger mag bij 12 aanbellen"}
          />
          <button className="button button--soft" onClick={sendMessage} type="button">
            <Send aria-hidden="true" size={18} /> Verstuur
          </button>
        </div>
      </div>
    </article>
  );
}
