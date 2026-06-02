import { useMemo, useState } from "react";
import { BulletinPostCard } from "../components/BulletinPostCard";
import { CategoryFilter } from "../components/CategoryFilter";
import { EmptyState } from "../components/EmptyState";
import { bulletinCategories } from "../data/categories";
import { useAppData } from "../lib/AppDataContext";
import { uploadBulletinImage } from "../lib/fileUploads";
import type { BulletinCategory, BulletinPost } from "../types";

interface BulletinDraft {
  titel: string;
  omschrijving: string;
  categorie: BulletinCategory;
  contactpersoon: string;
  image_url: string;
  image_name: string;
  image_file?: File;
}

export function BulletinPage() {
  const { bulletinPosts, profile } = useAppData();
  const [category, setCategory] = useState<BulletinCategory | "Alle">("Alle");
  const [draft, setDraft] = useState<BulletinDraft>({
    titel: "",
    omschrijving: "",
    categorie: "Mededeling" as BulletinCategory,
    contactpersoon: "",
    image_url: "",
    image_name: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const filteredPosts = useMemo(() => {
    return bulletinPosts.items.filter((post) => category === "Alle" || post.categorie === category);
  }, [bulletinPosts.items, category]);

  const canAddImage = draft.categorie === "Gratis af te halen" || draft.categorie === "Gevonden voorwerp";

  function resetDraft() {
    setDraft({ titel: "", omschrijving: "", categorie: "Mededeling", contactpersoon: "", image_url: "", image_name: "" });
    setEditingId(null);
    setShowForm(false);
  }

  async function savePost() {
    const imageUrl = draft.image_file ? await uploadBulletinImage(draft.image_file, profile.user_id) : draft.image_url;

    if (editingId) {
      bulletinPosts.update(editingId, {
        titel: draft.titel,
        omschrijving: draft.omschrijving,
        categorie: draft.categorie,
        contactpersoon: draft.contactpersoon,
        image_url: canAddImage ? imageUrl : "",
        image_name: draft.image_name,
      });
    } else {
      const post: BulletinPost = {
        id: crypto.randomUUID(),
        titel: draft.titel,
        omschrijving: draft.omschrijving,
        categorie: draft.categorie,
        contactpersoon: draft.contactpersoon,
        image_name: draft.image_name,
        image_url: canAddImage ? imageUrl : "",
        aangemaakt_door: profile.user_id,
        status: "Actief",
        aangemaakt_op: new Date().toISOString(),
        messages: [],
      };
      bulletinPosts.add(post);
    }
    setCategory(draft.categorie);
    resetDraft();
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <h2>Prikbord</h2>
        <p>Plaats een kort bericht voor het gebouw, bijvoorbeeld iets dat weg mag, iets dat gevonden is of een praktische mededeling.</p>
      </div>
      {!showForm && (
        <button className="button button--full" onClick={() => setShowForm(true)} type="button">
          Bericht plaatsen
        </button>
      )}
      {showForm && (
        <form className="form-panel" onSubmit={(event) => { event.preventDefault(); void savePost(); }}>
          <h3>{editingId ? "Bericht bewerken" : "Bericht plaatsen"}</h3>
          <input value={draft.titel} onChange={(event) => setDraft({ ...draft, titel: event.target.value })} placeholder="Titel" required />
          <textarea value={draft.omschrijving} onChange={(event) => setDraft({ ...draft, omschrijving: event.target.value })} placeholder="Typ hier je bericht..." required />
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
                  setDraft({ ...draft, image_url: URL.createObjectURL(file), image_name: file.name, image_file: file });
                }}
              />
              {draft.image_url && <img className="post-image post-image--preview" src={draft.image_url} alt="Voorbeeld van gekozen foto" />}
              {draft.image_name && <small>Gekozen foto: {draft.image_name}</small>}
            </label>
          )}
          <button className="button" type="submit">{editingId ? "Wijzigingen opslaan" : "Plaatsen"}</button>
          <button className="button button--soft" onClick={resetDraft} type="button">
            Annuleren
          </button>
        </form>
      )}
      <CategoryFilter label="Categorie" value={category} options={bulletinCategories} onChange={setCategory} />
      <div className="card-list">
        {filteredPosts.map((post) => (
          <BulletinPostCard
            key={post.id}
            post={post}
            isOwner={post.aangemaakt_door === profile.user_id}
            isAdmin={profile.rol === "admin"}
            currentUserId={profile.user_id}
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
                image_file: undefined,
              });
              setShowForm(true);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onSendMessage={(id, message) => {
              const post = bulletinPosts.items.find((item) => item.id === id);
              if (!post) return;
              bulletinPosts.update(id, {
                messages: [
                  ...(post.messages ?? []),
                  {
                    id: crypto.randomUUID(),
                    author_id: profile.user_id,
                    author_name: profile.naam_of_bijnaam,
                    author_house_number: profile.huisnummer,
                    message,
                    aangemaakt_op: new Date().toISOString(),
                  },
                ],
              });
            }}
            onUpdateMessage={(id, messageId, message) => {
              const post = bulletinPosts.items.find((item) => item.id === id);
              if (!post) return;
              bulletinPosts.update(id, {
                messages: (post.messages ?? []).map((item) => (item.id === messageId && item.author_id === profile.user_id ? { ...item, message } : item)),
              });
            }}
            onDeleteMessage={(id, messageId) => {
              const post = bulletinPosts.items.find((item) => item.id === id);
              if (!post) return;
              bulletinPosts.update(id, {
                messages: (post.messages ?? []).filter((item) => item.id !== messageId || (item.author_id !== profile.user_id && profile.rol !== "admin")),
              });
            }}
          />
        ))}
      </div>
      {filteredPosts.length === 0 && <EmptyState title="Geen berichten" description="Er staat nu niets op het prikbord in deze categorie." />}
    </section>
  );
}
