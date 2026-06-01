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
    image_url: "",
    image_name: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const filteredPosts = useMemo(() => {
    return bulletinPosts.items.filter((post) => category === "Alle" || post.categorie === category);
  }, [bulletinPosts.items, category]);

  const canAddImage = draft.categorie === "Gratis af te halen" || draft.categorie === "Gevonden voorwerp";

  function resetDraft() {
    setDraft({ titel: "", omschrijving: "", categorie: "Mededeling", contactpersoon: "", image_url: "", image_name: "" });
    setEditingId(null);
  }

  function savePost() {
    if (editingId) {
      bulletinPosts.update(editingId, {
        titel: draft.titel,
        omschrijving: draft.omschrijving,
        categorie: draft.categorie,
        contactpersoon: draft.contactpersoon,
        image_url: draft.image_url,
        image_name: draft.image_name,
      });
    } else {
      const post: BulletinPost = {
        id: crypto.randomUUID(),
        ...draft,
        aangemaakt_door: profile.user_id,
        status: "Actief",
        aangemaakt_op: new Date().toISOString(),
      };
      bulletinPosts.add(post);
    }
    resetDraft();
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <h2>Prikbord</h2>
        <p>Deel iets handigs met je buren, zoals een gevonden voorwerp, een tip, iets dat weg mag of een kleine mededeling voor het gebouw.</p>
      </div>
      <form className="form-panel" onSubmit={(event) => { event.preventDefault(); savePost(); }}>
        <h3>{editingId ? "Bericht bewerken" : "Bericht plaatsen"}</h3>
        <input value={draft.titel} onChange={(event) => setDraft({ ...draft, titel: event.target.value })} placeholder="Titel" required />
        <textarea value={draft.omschrijving} onChange={(event) => setDraft({ ...draft, omschrijving: event.target.value })} placeholder="Omschrijving" required />
        <select value={draft.categorie} onChange={(event) => setDraft({ ...draft, categorie: event.target.value as BulletinCategory })}>
          {bulletinCategories.map((item) => <option key={item}>{item}</option>)}
        </select>
        <input value={draft.contactpersoon} onChange={(event) => setDraft({ ...draft, contactpersoon: event.target.value })} placeholder="Contactpersoon optioneel" />
        {canAddImage && (
          <label className="upload-field">
            <span>Foto toevoegen</span>
            <input
              accept="image/*"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setDraft({ ...draft, image_url: URL.createObjectURL(file), image_name: file.name });
              }}
            />
            {draft.image_url && <img className="post-image post-image--preview" src={draft.image_url} alt="Voorbeeld van gekozen foto" />}
            {draft.image_name && <small>Gekozen foto: {draft.image_name}</small>}
          </label>
        )}
        <button className="button" type="submit">{editingId ? "Wijzigingen opslaan" : "Plaatsen"}</button>
        {editingId && (
          <button className="button button--soft" onClick={resetDraft} type="button">
            Annuleren
          </button>
        )}
      </form>
      <CategoryFilter label="Categorie" value={category} options={bulletinCategories} onChange={setCategory} />
      <div className="card-list">
        {filteredPosts.map((post) => (
          <BulletinPostCard
            key={post.id}
            post={post}
            isOwner={post.aangemaakt_door === profile.user_id}
            isAdmin={profile.rol === "admin"}
            onComplete={bulletinPosts.remove}
            onEdit={(item) => {
              setEditingId(item.id);
              setDraft({
                titel: item.titel,
                omschrijving: item.omschrijving,
                categorie: item.categorie,
                contactpersoon: item.contactpersoon ?? "",
                image_url: item.image_url ?? "",
                image_name: item.image_name ?? "",
              });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        ))}
      </div>
      {filteredPosts.length === 0 && <EmptyState title="Geen berichten" description="Er staat nu niets op het prikbord in deze categorie." />}
    </section>
  );
}
