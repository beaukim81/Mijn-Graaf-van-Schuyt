import { HandHeart, Home, MessageCircle, Pencil, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import type { HelpCategory, HelpRequest } from "../types";
import { LinkifiedText } from "./LinkifiedText";
import { residentLabel } from "../lib/residentDisplay";
import { StatusBadge } from "./StatusBadge";

const socialCategories: HelpCategory[] = ["Samen eten", "Koffie / thee", "Spelletjesavond", "Filmavond", "Wandelen"];
const neutralCategories: HelpCategory[] = ["Iets lenen", "Overig"];

function copyForCategory(category: HelpCategory) {
  if (socialCategories.includes(category)) {
    return {
      activeStatus: "Buren doen mee",
      offerButton: "Ik wil meedoen",
      offersTitle: "Buren die meedoen",
      chatTitle: "Berichtjes over deze uitnodiging",
      emptyMessage: "Nog geen bericht. Handig voor korte afstemming.",
    };
  }

  if (neutralCategories.includes(category)) {
    return {
      activeStatus: "Reactie ontvangen",
      offerButton: "Ik reageer",
      offersTitle: "Buren die reageren",
      chatTitle: "Berichtjes over deze vraag",
      emptyMessage: "Nog geen bericht. Houd het kort en praktisch.",
    };
  }

  return {
    activeStatus: "Iemand helpt",
    offerButton: "Ik kan helpen",
    offersTitle: "Hulp aangeboden",
    chatTitle: "Berichtjes over deze hulpvraag",
    emptyMessage: "Nog geen bericht. Houd het kort en praktisch.",
  };
}

interface HelpRequestCardProps {
  request: HelpRequest;
  isOwner?: boolean;
  currentUserId: string;
  isAdmin?: boolean;
  onOffer?: (id: string) => void;
  onWithdrawOffer?: (id: string) => void;
  onComplete?: (id: string) => void;
  onSendMessage?: (id: string, message: string) => void;
  onUpdateMessage?: (requestId: string, messageId: string, message: string) => void;
  onDeleteMessage?: (requestId: string, messageId: string) => void;
}

export function HelpRequestCard({ request, isOwner, currentUserId, isAdmin, onOffer, onWithdrawOffer, onComplete, onSendMessage, onUpdateMessage, onDeleteMessage }: HelpRequestCardProps) {
  const [message, setMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedMessage, setEditedMessage] = useState("");
  const copy = copyForCategory(request.categorie);
  const currentUserOffer = request.offers.find((offer) => offer.helper_id === currentUserId);
  const canOfferHelp = request.aangemaakt_door !== currentUserId && !currentUserOffer;
  const displayStatus = request.status === "Open" && request.offers.length > 0 ? copy.activeStatus : request.status;

  function sendMessage() {
    const trimmed = message.trim();
    if (!trimmed) return;
    onSendMessage?.(request.id, trimmed);
    setMessage("");
  }

  return (
    <details className="item-card collapsible-card" id={`hulp-${request.id}`}>
      <summary className="item-card__header collapsible-card__summary">
        <div>
          <p className="chip">{request.categorie}</p>
          <h2>{request.titel}</h2>
          <p className="muted">Geplaatst door {residentLabel(request.aanmaker_naam, request.aanmaker_huisnummer)}</p>
        </div>
        <StatusBadge tone={displayStatus === "Afgerond" ? "good" : "soft"}>{displayStatus}</StatusBadge>
      </summary>
      <div className="collapsible-card__body">
      <p><LinkifiedText text={request.omschrijving} /></p>
      <div className="action-row">
        {canOfferHelp && (
        <button className="button button--soft" onClick={() => onOffer?.(request.id)} type="button">
          <HandHeart aria-hidden="true" size={18} /> {copy.offerButton}
        </button>
        )}
        {currentUserOffer && (
          <button className="button button--soft" onClick={() => onWithdrawOffer?.(request.id)} type="button">
            Niet meer beschikbaar
          </button>
        )}
        {isOwner && (
          <button className="button button--soft" onClick={() => onComplete?.(request.id)} type="button">
            Afronden en verwijderen
          </button>
        )}
      </div>
      {request.offers.length > 0 && (
        <div className="neighbor-box">
          <strong>{copy.offersTitle}</strong>
          {request.offers.map((offer) => (
            <div className="neighbor-offer" key={offer.id}>
              <Home aria-hidden="true" size={18} />
              <span>
                {residentLabel(offer.helper_name, offer.helper_house_number)}
              </span>
              {offer.contact_allowed && offer.contact_info && offer.contact_info !== `Huisnummer ${offer.helper_house_number}` ? (
                <small>{offer.contact_info}</small>
              ) : null}
            </div>
          ))}
        </div>
      )}
      <div className="chat-box">
        <strong>
          <MessageCircle aria-hidden="true" size={18} /> {copy.chatTitle}
        </strong>
        {request.messages.length === 0 ? (
          <p className="muted">{copy.emptyMessage}</p>
        ) : (
          request.messages.map((item) => (
            <div className="chat-message" key={item.id}>
              <span>
                {residentLabel(item.author_name, item.author_house_number)}
              </span>
              {editingMessageId === item.id ? (
                <div className="chat-edit">
                  <input value={editedMessage} onChange={(event) => setEditedMessage(event.target.value)} />
                  <div className="admin-row">
                    <button
                      className="button button--soft"
                      onClick={() => {
                        const trimmed = editedMessage.trim();
                        if (!trimmed) return;
                        onUpdateMessage?.(request.id, item.id, trimmed);
                        setEditingMessageId(null);
                        setEditedMessage("");
                      }}
                      type="button"
                    >
                      Opslaan
                    </button>
                    <button
                      className="button button--soft"
                      onClick={() => {
                        setEditingMessageId(null);
                        setEditedMessage("");
                      }}
                      type="button"
                    >
                      Annuleren
                    </button>
                  </div>
                </div>
              ) : (
                <p><LinkifiedText text={item.message} /></p>
              )}
              {(item.author_id === currentUserId || isAdmin) && editingMessageId !== item.id && (
                <div className="message-actions">
                  {item.author_id === currentUserId && (
                    <button
                      className="button button--soft"
                      onClick={() => {
                        setEditingMessageId(item.id);
                        setEditedMessage(item.message);
                      }}
                      type="button"
                    >
                      <Pencil aria-hidden="true" size={15} /> Bewerken
                    </button>
                  )}
                  <button className="button button--danger" onClick={() => onDeleteMessage?.(request.id, item.id)} type="button">
                    <Trash2 aria-hidden="true" size={15} /> Verwijderen
                  </button>
                </div>
              )}
            </div>
          ))
        )}
        <div className="chat-input">
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Typ hier je bericht..."
          />
          <button className="button button--soft" onClick={sendMessage} type="button">
            <Send aria-hidden="true" size={18} /> Verstuur
          </button>
        </div>
      </div>
      </div>
    </details>
  );
}
