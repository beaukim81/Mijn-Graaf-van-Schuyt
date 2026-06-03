import { useMemo, useState } from "react";
import { BulletinPostCard } from "../components/BulletinPostCard";
import { CategoryFilter } from "../components/CategoryFilter";
import { EditablePhotoGrid } from "../components/EditablePhotoGrid";
import { EmptyState } from "../components/EmptyState";
import { UrlPreview } from "../components/UrlPreview";
import { bulletinCategories } from "../data/categories";
import { useAppData } from "../lib/AppDataContext";
import { uploadBulletinImages } from "../lib/fileUploads";
import { friendlyErrorMessage } from "../lib/friendlyErrors";
import type { BulletinCategory, BulletinPost } from "../types";

interface BulletinDraft {
  titel: string;
  omschrijving: string;
  categorie: BulletinCategory;
  contactpersoon: string;
  image_url: string;
  image_urls: string[];
  image_name: string;
  image_files: File[];
}

const maxImages = 10;

export function BulletinPage() {
  const { bulletinPosts, profile } = useAppData();
  const [category, setCategory] = useState<BulletinCategory | "Alle">("Alle");
  const [draft, setDraft] = useState<BulletinDraft>({
    titel: "",
    omschrijving: "",
    categorie: "Mededeling" as BulletinCategory,
    contactpersoon: "",
    image_url: "",
    image_urls: [],
    image_name: "",
    image_files: [],
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredPosts = useMemo(() => {
    return bulletinPosts.items.filter((post) => category === "Alle" || post.categorie === category);
  }, [bulletinPosts.items, category]);

  const canAddImage = draft.categorie === "Gratis af te halen" || draft.categorie === "Gevonden voorwerp";

  function resetDraft() {
    setDraft({ titel: "", omschrijving: "", categorie: "Mededeling", contactpersoon: "", image_url: "", image_urls: [], image_name: "", image_files: [] });
    setEditingId(null);
    setShowForm(false);
  }

  async function savePost() {
    try {
      setSaving(true);
      setFormError("");
      const uploadedImageUrls = draft.image_files.length > 0 ? await uploadBulletinImages(draft.image_files, profile.user_id) : [];
      const existingImageUrls = draft.image_urls.filter((url) => !url.startsWith("blob:"));
      const imageUrls = canAddImage ? [...existingImageUrls, ...uploadedImageUrls].slice(0, maxImages) : [];

      if (editingId) {
        await bulletinPosts.updateAsync(editingId, {
          titel: draft.titel,
          omschrijving: draft.omschrijving,
          categorie: draft.categorie,
          contactpersoon: draft.contactpersoon,
          image_url: imageUrls[0] ?? "",
          image_urls: imageUrls,
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
          image_url: imageUrls[0] ?? "",
          image_urls: imageUrls,
          aangemaakt_door: profile.user_id,
          aangemaakt_door_naam: profile.naam_of_bijnaam,
          aangemaakt_door_huisnummer: profile.huisnummer,
          status: "Actief",
          aangemaakt_op: new Date().toISOString(),
          messages: [],
        };
        await bulletinPosts.addAsync(post);
      }
      setCategory(draft.categorie);
      resetDraft();
    } catch (error) {
      setFormError(friendlyErrorMessage(error, "Bericht opslaan lukt nu niet. Controleer je foto's en probeer het opnieuw."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <h2>Prikbord</h2>
        <p>Plaats een kort bericht voor het gebouw, bijvoorbeeld iets dat weg mag, iets dat gevonden is of een praktische mededeling.</p>
      </div>
      {bulletinPosts.syncError && (
        <div className="notice notice--warning">
          <p>{bulletinPosts.syncError}</p>
          <button className="text-button" onClick={bulletinPosts.clearSyncError} type="button">Melding sluiten</button>
        </div>
      )}
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
          <UrlPreview text={draft.omschrijving} />
          <select value={draft.categorie} onChange={(event) => setDraft({ ...draft, categorie: event.target.value as BulletinCategory })}>
            {bulletinCategories.map((item) => <option key={item}>{item}</option>)}
          </select>
          <input value={draft.contactpersoon} onChange={(event) => setDraft({ ...draft, contactpersoon: event.target.value })} placeholder="Contactpersoon optioneel" />
          {canAddImage && (
            <div className="upload-field">
              <label className="field">
                <span>Foto's toevoegen</span>
              <input
                accept="image/*"
                multiple
                type="file"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []).slice(0, Math.max(0, maxImages - draft.image_urls.length));
                  if (files.length === 0) return;
                  const previewUrls = files.map((file) => URL.createObjectURL(file));
                  setDraft({
                    ...draft,
                    image_url: previewUrls[0] ?? draft.image_url,
                    image_urls: [...draft.image_urls, ...previewUrls].slice(0, maxImages),
                    image_name: files.map((file) => file.name).join(", "),
                    image_files: [...draft.image_files, ...files].slice(0, maxImages),
                  });
                }}
              />
              </label>
              <EditablePhotoGrid
                images={draft.image_urls}
                alt="Voorbeeld van gekozen foto's"
                onRemove={(index) => {
                  const removedUrl = draft.image_urls[index];
                  const blobIndex = draft.image_urls.slice(0, index).filter((url) => url.startsWith("blob:")).length;
                  const nextUrls = draft.image_urls.filter((_, itemIndex) => itemIndex !== index);
                  setDraft({
                    ...draft,
                    image_url: nextUrls[0] ?? "",
                    image_urls: nextUrls,
                    image_files: removedUrl?.startsWith("blob:")
                      ? draft.image_files.filter((_, itemIndex) => itemIndex !== blobIndex)
                      : draft.image_files,
                  });
                }}
              />
              <small>Maximaal {maxImages} foto's. Tik later op een foto om die groter te bekijken.</small>
            </div>
          )}
          {formError && <p className="form-message form-message--error">{formError}</p>}
          <button className="button" disabled={saving} type="submit">{saving ? "Bezig met opslaan" : editingId ? "Wijzigingen opslaan" : "Plaatsen"}</button>
          <button className="button button--soft" disabled={saving} onClick={resetDraft} type="button">
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
            onDelete={bulletinPosts.remove}
            onEdit={(item) => {
              setEditingId(item.id);
              setDraft({
                titel: item.titel,
                omschrijving: item.omschrijving,
                categorie: item.categorie,
                contactpersoon: item.contactpersoon ?? "",
                image_url: item.image_url ?? "",
                image_urls: item.image_urls?.length ? item.image_urls : item.image_url ? [item.image_url] : [],
                image_name: item.image_name ?? "",
                image_files: [],
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
