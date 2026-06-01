import { useMemo, useState } from "react";
import { BulletinPostCard } from "../components/BulletinPostCard";
import { CategoryFilter } from "../components/CategoryFilter";
import { EmptyState } from "../components/EmptyState";
import { bulletinCategories } from "../data/categories";
import { useAppData } from "../lib/AppDataContext";
import type { BulletinCategory, BulletinPost } from "../types";

export function BulletinPage() {
  const { bulletinPosts, profile } = useAppData();
  const [category, setCategory] = useState<BulletinCategory | "Alle">("Alle");
  const [draft, setDraft] = useState({
    titel: "",
    omschrijving: "",
    categorie: "Mededeling" as BulletinCategory,
    contactpersoon: "",
  });

  const filteredPosts = useMemo(() => {
    return bulletinPosts.items.filter((post) => category === "Alle" || post.categorie === category);
  }, [bulletinPosts.items, category]);

  function createPost() {
    const post: BulletinPost = {
      id: crypto.randomUUID(),
      ...draft,
      aangemaakt_door: profile.user_id,
      status: "Actief",
      aangemaakt_op: new Date().toISOString(),
    };
    bulletinPosts.add(post);
    setDraft({ titel: "", omschrijving: "", categorie: "Mededeling", contactpersoon: "" });
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <h2>Prikbord</h2>
        <p>Praktische berichten zonder reacties of social feed.</p>
      </div>
      <form className="form-panel" onSubmit={(event) => { event.preventDefault(); createPost(); }}>
        <h3>Bericht plaatsen</h3>
        <input value={draft.titel} onChange={(event) => setDraft({ ...draft, titel: event.target.value })} placeholder="Titel" required />
        <textarea value={draft.omschrijving} onChange={(event) => setDraft({ ...draft, omschrijving: event.target.value })} placeholder="Omschrijving" required />
        <select value={draft.categorie} onChange={(event) => setDraft({ ...draft, categorie: event.target.value as BulletinCategory })}>
          {bulletinCategories.map((item) => <option key={item}>{item}</option>)}
        </select>
        <input value={draft.contactpersoon} onChange={(event) => setDraft({ ...draft, contactpersoon: event.target.value })} placeholder="Contactpersoon optioneel" />
        <button className="button" type="submit">Plaatsen</button>
      </form>
      <CategoryFilter label="Categorie" value={category} options={bulletinCategories} onChange={setCategory} />
      <div className="card-list">
        {filteredPosts.map((post) => (
          <BulletinPostCard
            key={post.id}
            post={post}
            isOwner={post.aangemaakt_door === profile.user_id}
            isAdmin={profile.rol === "admin"}
            onComplete={(id) => bulletinPosts.update(id, { status: "Afgerond" })}
            onDelete={bulletinPosts.remove}
          />
        ))}
      </div>
      {filteredPosts.length === 0 && <EmptyState title="Geen berichten" description="Er staat nu niets op het prikbord in deze categorie." />}
    </section>
  );
}
