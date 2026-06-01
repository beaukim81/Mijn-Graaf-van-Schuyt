import type { BulletinPost } from "../types";
import { StatusBadge } from "./StatusBadge";

interface BulletinPostCardProps {
  post: BulletinPost;
  isOwner?: boolean;
  isAdmin?: boolean;
  onComplete?: (id: string) => void;
  onEdit?: (post: BulletinPost) => void;
}

export function BulletinPostCard({ post, isOwner, isAdmin, onComplete, onEdit }: BulletinPostCardProps) {
  return (
    <article className="item-card">
      <div className="item-card__header">
        <div>
          <p className="chip">{post.categorie}</p>
          <h2>{post.titel}</h2>
        </div>
        <StatusBadge tone={post.status === "Actief" ? "soft" : "good"}>{post.status}</StatusBadge>
      </div>
      {post.image_url && <img className="post-image" src={post.image_url} alt={post.titel} />}
      <p>{post.omschrijving}</p>
      {post.contactpersoon && <p className="muted">Contactpersoon: {post.contactpersoon}</p>}
      {(isOwner || isAdmin) && (
        <div className="admin-row">
          <button className="text-button" onClick={() => onComplete?.(post.id)} type="button">
            Afronden en verwijderen
          </button>
          <button className="text-button" onClick={() => onEdit?.(post)} type="button">
            Bewerken
          </button>
        </div>
      )}
    </article>
  );
}
