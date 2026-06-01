import { useMemo, useState } from "react";
import { CategoryFilter } from "../components/CategoryFilter";
import { EmptyState } from "../components/EmptyState";
import { KnowledgeDocumentCard } from "../components/KnowledgeDocumentCard";
import { SearchBar } from "../components/SearchBar";
import { knowledgeCategories } from "../data/categories";
import { useAppData } from "../lib/AppDataContext";
import type { KnowledgeCategory, KnowledgeDocument, KnowledgeDocumentType } from "../types";

const documentTypes: KnowledgeDocumentType[] = ["Officiële handleiding", "Bewonerstip", "Onderdeleninformatie", "Veelgestelde vraag"];

export function KnowledgePage() {
  const { documents, profile } = useAppData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<KnowledgeCategory | "Alle">("Alle");
  const [type, setType] = useState<KnowledgeDocumentType | "Alle">("Alle");
  const [draft, setDraft] = useState({
    titel: "",
    categorie: "Mechanische ventilatie" as KnowledgeCategory,
    documenttype: "Bewonerstip" as KnowledgeDocumentType,
    korte_samenvatting: "",
    pdf_url: "",
    pdf_bestandsnaam: "",
    tags: "",
    leverancier_of_fabrikant: "",
    faq_vraag: "",
  });

  const filteredDocuments = useMemo(() => {
    return documents.items.filter((document) => {
      const canView = document.status === "Gepubliceerd" || document.toegevoegd_door === profile.user_id || profile.rol === "admin";
      const searchableText = [
        document.titel,
        document.categorie,
        document.korte_samenvatting,
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

  function proposeDocument() {
    const timestamp = new Date().toISOString();
    const document: KnowledgeDocument = {
      id: crypto.randomUUID(),
      titel: draft.titel,
      categorie: draft.categorie,
      documenttype: draft.documenttype,
      korte_samenvatting: draft.korte_samenvatting,
      pdf_url: draft.pdf_url,
      tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      leverancier_of_fabrikant: draft.leverancier_of_fabrikant,
      faq: draft.faq_vraag ? [{ id: crypto.randomUUID(), vraag: draft.faq_vraag }] : [],
      toegevoegd_door: profile.user_id,
      status: profile.rol === "admin" ? "Gepubliceerd" : "Concept",
      aangemaakt_op: timestamp,
      bijgewerkt_op: timestamp,
    };
    documents.add(document);
    setDraft({
      titel: "",
      categorie: "Mechanische ventilatie",
      documenttype: "Bewonerstip",
      korte_samenvatting: "",
      pdf_url: "",
      pdf_bestandsnaam: "",
      tags: "",
      leverancier_of_fabrikant: "",
      faq_vraag: "",
    });
  }

  return (
    <section className="page-stack">
      <div className="page-heading page-heading--search">
        <h2>Kennisbank</h2>
        <p>Vind handleidingen, onderdeleninformatie en praktische tips voor je woning en het gebouw.</p>
        <SearchBar value={query} onChange={setQuery} placeholder="Zoek op onderwerp, trefwoord, leverancier of onderdeel" />
      </div>
      <form className="form-panel" onSubmit={(event) => { event.preventDefault(); proposeDocument(); }}>
        <h3>Handleiding of tip delen</h3>
        <input value={draft.titel} onChange={(event) => setDraft({ ...draft, titel: event.target.value })} placeholder="Titel" required />
        <select value={draft.categorie} onChange={(event) => setDraft({ ...draft, categorie: event.target.value as KnowledgeCategory })}>
          {knowledgeCategories.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={draft.documenttype} onChange={(event) => setDraft({ ...draft, documenttype: event.target.value as KnowledgeDocumentType })}>
          {documentTypes.map((item) => <option key={item}>{item}</option>)}
        </select>
        <input value={draft.korte_samenvatting} onChange={(event) => setDraft({ ...draft, korte_samenvatting: event.target.value })} placeholder="Korte samenvatting" required />
        <input value={draft.pdf_url} onChange={(event) => setDraft({ ...draft, pdf_url: event.target.value, pdf_bestandsnaam: "" })} placeholder="Link naar PDF" required />
        <label className="upload-field">
          <span>Of kies een PDF-bestand</span>
          <input
            accept="application/pdf"
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setDraft({ ...draft, pdf_url: URL.createObjectURL(file), pdf_bestandsnaam: file.name });
            }}
          />
          {draft.pdf_bestandsnaam && <small>Gekozen bestand: {draft.pdf_bestandsnaam}</small>}
        </label>
        <p className="muted">Deel een handleiding of praktische tip. Beheer kijkt mee voordat het zichtbaar wordt voor iedereen.</p>
        <input value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} placeholder="Zoekwoorden, gescheiden door komma's" />
        <input value={draft.leverancier_of_fabrikant} onChange={(event) => setDraft({ ...draft, leverancier_of_fabrikant: event.target.value })} placeholder="Leverancier of fabrikant optioneel" />
        <input value={draft.faq_vraag} onChange={(event) => setDraft({ ...draft, faq_vraag: event.target.value })} placeholder="Eerste veelgestelde vraag optioneel" />
        <button className="button" type="submit">Insturen</button>
      </form>
      <div className="filter-row">
        <CategoryFilter label="Categorie" value={category} options={knowledgeCategories} onChange={setCategory} />
        <CategoryFilter label="Documenttype" value={type} options={documentTypes} onChange={setType} />
      </div>
      <div className="card-list">
        {filteredDocuments.map((document) => (
          <KnowledgeDocumentCard
            key={document.id}
            document={document}
            isAdmin={profile.rol === "admin"}
            onFlag={(id) => documents.update(id, { status: "Te controleren", bijgewerkt_op: new Date().toISOString() })}
            onPublish={(id) => documents.update(id, { status: "Gepubliceerd", bijgewerkt_op: new Date().toISOString() })}
            onDelete={documents.remove}
          />
        ))}
      </div>
      {filteredDocuments.length === 0 && <EmptyState title="Geen documenten gevonden" description="Probeer een ander trefwoord, onderdeel of categorie." />}
    </section>
  );
}
