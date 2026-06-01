import type { BulletinPost } from "../types";
import { StatusBadge } from "./StatusBadge";

interface BulletinPostCardProps {
  post: BulletinPost;
  isOwner?: boolean;
  isAdmin?: boolean;
  onComplete?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function BulletinPostCard({ post, isOwner, isAdmin, onComplete, onDelete }: BulletinPostCardProps) {
  return (
    <article className="item-card">
      <div className="item-card__header">
        <div>
          <p className="chip">{post.categorie}</p>
          <h2>{post.titel}</h2>
        </div>
        <StatusBadge tone={post.status === "Actief" ? "soft" : "good"}>{post.status}</StatusBadge>
      </div>
      <p>{post.omschrijving}</p>
      {post.contactpersoon && <p className="muted">Contactpersoon: {post.contactpersoon}</p>}
      {(isOwner || isAdmin) && (
        <div className="admin-row">
          <button className="text-button" onClick={() => onComplete?.(post.id)} type="button">
            Afronden
          </button>
          <button className="text-button danger" onClick={() => onDelete?.(post.id)} type="button">
            Verwijderen
          </button>
        </div>
      )}
    </article>
  );
}
