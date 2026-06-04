import { MessageCircle, Pencil, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import type { BulletinPost } from "../types";
import { LinkifiedText } from "./LinkifiedText";
import { PhotoGrid } from "./PhotoGrid";
import { residentLabel } from "../lib/residentDisplay";
import { StatusBadge } from "./StatusBadge";

interface BulletinPostCardProps {
  post: BulletinPost;
  isOwner?: boolean;
  isAdmin?: boolean;
  currentUserId: string;
  onComplete?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (post: BulletinPost) => void;
  onSendMessage?: (postId: string, message: string) => void;
  onUpdateMessage?: (postId: string, messageId: string, message: string) => void;
  onDeleteMessage?: (postId: string, messageId: string) => void;
}

export function BulletinPostCard({ post, isOwner, isAdmin, currentUserId, onComplete, onDelete, onEdit, onSendMessage, onUpdateMessage, onDeleteMessage }: BulletinPostCardProps) {
  const [message, setMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedMessage, setEditedMessage] = useState("");
  const messages = post.messages ?? [];

  function sendMessage() {
    const trimmed = message.trim();
    if (!trimmed) return;
    onSendMessage?.(post.id, trimmed);
    setMessage("");
  }

  return (
    <details className="item-card collapsible-card" id={`prikbord-${post.id}`}>
      <summary className="item-card__header collapsible-card__summary">
        <div>
          <p className="chip">{post.categorie}</p>
          <h2>{post.titel}</h2>
          <p className="muted">Geplaatst door {residentLabel(post.aangemaakt_door_naam, post.aangemaakt_door_huisnummer)}</p>
        </div>
        <StatusBadge tone={post.status === "Actief" ? "soft" : "good"}>{post.status}</StatusBadge>
      </summary>
      <div className="collapsible-card__body">
      <PhotoGrid images={post.image_urls?.length ? post.image_urls : post.image_url ? [post.image_url] : []} alt={post.titel} />
      <p><LinkifiedText text={post.omschrijving} /></p>
      {post.contactpersoon && <p className="muted">Contactpersoon: {post.contactpersoon}</p>}
      {(isOwner || isAdmin) && (
        <div className="action-row">
          <button className="button button--soft" onClick={() => onEdit?.(post)} type="button">
            <Pencil aria-hidden="true" size={18} /> Bewerken
          </button>
          <button
            className="button button--danger"
            onClick={() => {
              const confirmed = window.confirm("Weet je zeker dat je dit prikbordbericht wilt verwijderen?");
              if (confirmed) onDelete?.(post.id);
            }}
            type="button"
          >
            <Trash2 aria-hidden="true" size={18} /> Verwijderen
          </button>
          <button className="button button--soft" onClick={() => onComplete?.(post.id)} type="button">
            Afronden
          </button>
        </div>
      )}
      <div className="chat-box">
        <strong>
          <MessageCircle aria-hidden="true" size={18} /> Berichtjes over dit bericht
        </strong>
        {messages.length === 0 ? (
          <p className="muted">Nog geen bericht. Houd het kort en praktisch.</p>
        ) : (
          messages.map((item) => (
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
                        onUpdateMessage?.(post.id, item.id, trimmed);
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
                  <button className="button button--danger" onClick={() => onDeleteMessage?.(post.id, item.id)} type="button">
                    <Trash2 aria-hidden="true" size={15} /> Verwijderen
                  </button>
                </div>
              )}
            </div>
          ))
        )}
        <div className="chat-input">
          <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Typ hier je bericht..." />
          <button className="button button--soft" onClick={sendMessage} type="button">
            <Send aria-hidden="true" size={18} /> Verstuur
          </button>
        </div>
      </div>
      </div>
    </details>
  );
}
