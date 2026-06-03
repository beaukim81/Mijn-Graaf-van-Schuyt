import { useMemo, useState } from "react";
import { CategoryFilter } from "../components/CategoryFilter";
import { EditablePhotoGrid } from "../components/EditablePhotoGrid";
import { EmptyState } from "../components/EmptyState";
import { KnowledgeDocumentCard } from "../components/KnowledgeDocumentCard";
import { SearchBar } from "../components/SearchBar";
import { knowledgeCategories } from "../data/categories";
import { useAppData } from "../lib/AppDataContext";
import { uploadBulletinImages, uploadKnowledgePdf } from "../lib/fileUploads";
import { friendlyErrorMessage } from "../lib/friendlyErrors";
import type { KnowledgeCategory, KnowledgeDocument, KnowledgeDocumentType } from "../types";

const documentTypes: KnowledgeDocumentType[] = ["Officiële handleiding", "Bewonerstip", "Onderdeleninformatie", "Veelgestelde vraag"];
const maxImages = 10;

export function KnowledgePage() {
  const { documents, profile } = useAppData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<KnowledgeCategory | "Alle">("Alle");
  const [type, setType] = useState<KnowledgeDocumentType | "Alle">("Alle");
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({
    titel: "",
    categorie: "Mechanische ventilatie" as KnowledgeCategory,
    documenttype: "Bewonerstip" as KnowledgeDocumentType,
    korte_samenvatting: "",
    uitgebreide_uitleg: "",
    pdf_url: "",
    pdf_bestandsnaam: "",
    pdf_file: undefined as File | undefined,
    image_urls: [] as string[],
    image_files: [] as File[],
    tags: "",
    leverancier_of_fabrikant: "",
    faq_vraag: "",
  });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredDocuments = useMemo(() => {
    return documents.items.filter((document) => {
      const canView = document.status === "Gepubliceerd" || document.toegevoegd_door === profile.user_id || profile.rol === "admin";
      const searchableText = [
        document.titel,
        document.categorie,
        document.korte_samenvatting,
        document.uitgebreide_uitleg,
        document.documenttype,
        document.leverancier_of_fabrikant,
        document.tags.join(" "),
        document.faq.map((item) => `${item.vraag} ${item.antwoord ?? ""}`).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = searchableText.includes(query.toLowerCase());
      const matchesCategory = category === "Alle" || document.categorie === category;
      const matchesType = type === "Alle" || document.documenttype === type;
      return canView && matchesQuery && matchesCategory && matchesType;
    });
  }, [category, documents.items, profile.rol, profile.user_id, query, type]);

  async function proposeDocument() {
    try {
      setSaving(true);
      setFormError("");
      const timestamp = new Date().toISOString();
      const uploadedImageUrls = draft.image_files.length > 0 ? await uploadBulletinImages(draft.image_files, profile.user_id) : [];
      const imageUrls = [...draft.image_urls.filter((url) => !url.startsWith("blob:")), ...uploadedImageUrls].slice(0, maxImages);
      const pdfUrl = draft.pdf_file ? await uploadKnowledgePdf(draft.pdf_file, profile.user_id) : draft.pdf_url;
      if (draft.documenttype === "Officiële handleiding" && !pdfUrl) {
        setFormError("Voeg een PDF-bestand of PDF-link toe voor een officiële handleiding.");
        return;
      }

      const document: KnowledgeDocument = {
        id: crypto.randomUUID(),
        titel: draft.titel,
        categorie: draft.categorie,
        documenttype: draft.documenttype,
        korte_samenvatting: draft.korte_samenvatting,
        uitgebreide_uitleg: draft.uitgebreide_uitleg,
        pdf_url: pdfUrl,
        image_urls: imageUrls,
        tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        leverancier_of_fabrikant: draft.leverancier_of_fabrikant,
        faq: draft.faq_vraag ? [{ id: crypto.randomUUID(), vraag: draft.faq_vraag }] : [],
        toegevoegd_door: profile.user_id,
        status: profile.rol === "admin" ? "Gepubliceerd" : "Concept",
        aangemaakt_op: timestamp,
        bijgewerkt_op: timestamp,
      };
      await documents.addAsync(document);
      setCategory(draft.categorie);
      setType(draft.documenttype);
      setQuery("");
      setDraft({
        titel: "",
        categorie: "Mechanische ventilatie",
        documenttype: "Bewonerstip",
        korte_samenvatting: "",
        uitgebreide_uitleg: "",
        pdf_url: "",
        pdf_bestandsnaam: "",
        pdf_file: undefined,
        image_urls: [],
        image_files: [],
        tags: "",
        leverancier_of_fabrikant: "",
        faq_vraag: "",
      });
      setShowForm(false);
    } catch (error) {
      setFormError(friendlyErrorMessage(error, "Document insturen lukt nu niet. Controleer het bestand en probeer het opnieuw."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-stack">
      <div className="page-heading page-heading--search">
        <h2>Kennisbank</h2>
        <p>Zoek rustig in handleidingen, onderdeleninformatie en praktische tips.</p>
        <SearchBar value={query} onChange={setQuery} placeholder="Zoek op onderwerp, trefwoord, leverancier of onderdeel" />
      </div>
      <div className="suggestion-strip" aria-label="Kennisbankcategorieen">
        <button className={category === "Alle" ? "active" : ""} onClick={() => setCategory("Alle")} type="button">Alles</button>
        {knowledgeCategories.map((item) => (
          <button className={category === item ? "active" : ""} key={item} onClick={() => setCategory(item)} type="button">
            {item}
          </button>
        ))}
      </div>
      {!showForm && (
        <button className="button button--full" onClick={() => setShowForm(true)} type="button">
          Tip of handleiding delen
        </button>
      )}
      {showForm && (
      <form className="form-panel" onSubmit={(event) => { event.preventDefault(); void proposeDocument(); }}>
        <h3>Handleiding of tip delen</h3>
        <input value={draft.titel} onChange={(event) => setDraft({ ...draft, titel: event.target.value })} placeholder="Titel" required />
        <select value={draft.categorie} onChange={(event) => setDraft({ ...draft, categorie: event.target.value as KnowledgeCategory })}>
          {knowledgeCategories.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={draft.documenttype} onChange={(event) => setDraft({ ...draft, documenttype: event.target.value as KnowledgeDocumentType })}>
          {documentTypes.map((item) => <option key={item}>{item}</option>)}
        </select>
        <input value={draft.korte_samenvatting} onChange={(event) => setDraft({ ...draft, korte_samenvatting: event.target.value })} placeholder="Korte samenvatting" required />
        <textarea
          value={draft.uitgebreide_uitleg}
          onChange={(event) => setDraft({ ...draft, uitgebreide_uitleg: event.target.value })}
          placeholder={draft.documenttype === "Bewonerstip" ? "Typ hier je praktische tip, stappenplan of uitleg..." : "Extra uitleg optioneel"}
          required={draft.documenttype === "Bewonerstip" || draft.documenttype === "Veelgestelde vraag"}
        />
        <input
          value={draft.pdf_url}
          onChange={(event) => setDraft({ ...draft, pdf_url: event.target.value, pdf_bestandsnaam: "", pdf_file: undefined })}
          placeholder={draft.documenttype === "Officiële handleiding" ? "Link naar PDF" : "Link naar PDF optioneel"}
          required={draft.documenttype === "Officiële handleiding"}
        />
        <label className="upload-field">
          <span>{draft.documenttype === "Officiële handleiding" ? "Of kies een PDF-bestand" : "PDF-bestand optioneel"}</span>
          <input
            accept="application/pdf"
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setDraft({ ...draft, pdf_url: "", pdf_bestandsnaam: file.name, pdf_file: file });
            }}
          />
          {draft.pdf_bestandsnaam && <small>Gekozen bestand: {draft.pdf_bestandsnaam}</small>}
        </label>
        <div className="upload-field">
          <label className="field">
            <span>Foto's toevoegen optioneel</span>
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
                  image_urls: [...draft.image_urls, ...previewUrls].slice(0, maxImages),
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
              setDraft({
                ...draft,
                image_urls: draft.image_urls.filter((_, itemIndex) => itemIndex !== index),
                image_files: removedUrl?.startsWith("blob:")
                  ? draft.image_files.filter((_, itemIndex) => itemIndex !== blobIndex)
                  : draft.image_files,
              });
            }}
          />
          <small>Maximaal {maxImages} foto's. Handig voor een bewonerstip zonder PDF.</small>
        </div>
        <p className="muted">Deel een handleiding of praktische tip. Beheer kijkt mee voordat het zichtbaar wordt voor iedereen.</p>
        <input value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} placeholder="Zoekwoorden, gescheiden door komma's" />
        <input value={draft.leverancier_of_fabrikant} onChange={(event) => setDraft({ ...draft, leverancier_of_fabrikant: event.target.value })} placeholder="Leverancier of fabrikant optioneel" />
        <input value={draft.faq_vraag} onChange={(event) => setDraft({ ...draft, faq_vraag: event.target.value })} placeholder="Eerste veelgestelde vraag optioneel" />
        {formError && <p className="form-message form-message--error">{formError}</p>}
        <button className="button" disabled={saving} type="submit">{saving ? "Bezig met insturen" : "Insturen"}</button>
        <button className="button button--soft" disabled={saving} onClick={() => setShowForm(false)} type="button">Annuleren</button>
      </form>
      )}
      <div className="filter-row">
        <CategoryFilter label="Documenttype" value={type} options={documentTypes} onChange={setType} />
      </div>
      <div className="card-list library-list">
        {filteredDocuments.map((document) => (
          <KnowledgeDocumentCard
            key={document.id}
            document={document}
          />
        ))}
      </div>
      {filteredDocuments.length === 0 && <EmptyState title="Geen documenten gevonden" description="Probeer een ander trefwoord, onderdeel of categorie." />}
    </section>
  );
}
