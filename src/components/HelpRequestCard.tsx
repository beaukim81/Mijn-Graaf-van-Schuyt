import { HandHeart, Home, MessageCircle, Pencil, Send, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { HelpCategory, HelpRequest, Profile } from "../types";
import { LinkifiedText } from "./LinkifiedText";
import { ResidentIdentity } from "./ResidentIdentity";
import { StatusBadge } from "./StatusBadge";
import { useConfirm } from "../lib/ConfirmContext";

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
  profiles?: Profile[];
  onOffer?: (id: string) => void;
  onWithdrawOffer?: (id: string) => void;
  onComplete?: (id: string) => void;
  onSendMessage?: (id: string, message: string) => void;
  onUpdateMessage?: (requestId: string, messageId: string, message: string) => void;
  onDeleteMessage?: (requestId: string, messageId: string) => void;
}

export function HelpRequestCard({ request, isOwner, currentUserId, isAdmin, profiles = [], onOffer, onWithdrawOffer, onComplete, onSendMessage, onUpdateMessage, onDeleteMessage }: HelpRequestCardProps) {
  const [message, setMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedMessage, setEditedMessage] = useState("");
  const confirm = useConfirm();
  const profilesByUserId = useMemo(() => new Map(profiles.map((item) => [item.user_id, item])), [profiles]);
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
          <div className="resident-byline">
            <span>Geplaatst door</span>
            <ResidentIdentity compact houseNumber={request.aanmaker_huisnummer} name={request.aanmaker_naam} profile={profilesByUserId.get(request.aangemaakt_door)} />
          </div>
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
          <button
            className="button button--soft"
            onClick={async () => {
              const confirmed = await confirm({ confirmLabel: "Afronden", message: "Weet je zeker dat je deze oproep wilt afronden en verwijderen?" });
              if (confirmed) onComplete?.(request.id);
            }}
            type="button"
          >
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
              <ResidentIdentity compact houseNumber={offer.helper_house_number} name={offer.helper_name} profile={profilesByUserId.get(offer.helper_id)} />
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
              <ResidentIdentity compact houseNumber={item.author_house_number} name={item.author_name} profile={profilesByUserId.get(item.author_id)} />
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
                  <button
                    className="button button--danger"
                    onClick={async () => {
                      const confirmed = await confirm({ message: "Weet je zeker dat je dit bericht wilt verwijderen?" });
                      if (confirmed) onDeleteMessage?.(request.id, item.id);
                    }}
                    type="button"
                  >
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
