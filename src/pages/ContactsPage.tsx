import { useMemo, useState } from "react";
import { ContactCard } from "../components/ContactCard";
import { CategoryFilter } from "../components/CategoryFilter";
import { EmptyState } from "../components/EmptyState";
import { SearchBar } from "../components/SearchBar";
import { contactCategories } from "../data/categories";
import { useAppData } from "../lib/AppDataContext";
import type { Contact, ContactCategory } from "../types";

const blankContact: Contact = {
  id: "",
  naam: "",
  categorie: "Verhuur",
  beschrijving: "",
  telefoonnummer: "",
  emailadres: "",
  website: "",
  zichtbaar: true,
  aangemaakt_op: "",
  bijgewerkt_op: "",
};

export function ContactsPage() {
  const { contacts, profile } = useAppData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ContactCategory | "Alle">("Alle");
  const [draft, setDraft] = useState<Contact>(blankContact);
  const isAdmin = profile.rol === "admin";

  const visibleContacts = useMemo(() => {
    return contacts.items.filter((contact) => {
      const matchesQuery = `${contact.naam} ${contact.categorie} ${contact.beschrijving}`.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === "Alle" || contact.categorie === category;
      return contact.zichtbaar && matchesQuery && matchesCategory;
    });
  }, [contacts.items, query, category]);

  function saveContact() {
    const timestamp = new Date().toISOString();
    if (draft.id) {
      contacts.update(draft.id, { ...draft, bijgewerkt_op: timestamp });
    } else {
      contacts.add({ ...draft, id: crypto.randomUUID(), aangemaakt_op: timestamp, bijgewerkt_op: timestamp });
    }
    setDraft(blankContact);
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <h2>Contacten</h2>
        <p>Telefoonnummers, websites en e-mailadressen voor het gebouw.</p>
      </div>
      <div className="filter-row filter-row--equal">
        <SearchBar value={query} onChange={setQuery} placeholder="Zoek contact" />
        <CategoryFilter label="Categorie" value={category} options={contactCategories} onChange={setCategory} />
      </div>
      {isAdmin && (
        <form className="form-panel" onSubmit={(event) => { event.preventDefault(); saveContact(); }}>
          <h3>{draft.id ? "Contact wijzigen" : "Contact toevoegen"}</h3>
          <input value={draft.naam} onChange={(event) => setDraft({ ...draft, naam: event.target.value })} placeholder="Naam" required />
          <select value={draft.categorie} onChange={(event) => setDraft({ ...draft, categorie: event.target.value as ContactCategory })}>
            {contactCategories.map((item) => <option key={item}>{item}</option>)}
          </select>
          <textarea value={draft.beschrijving} onChange={(event) => setDraft({ ...draft, beschrijving: event.target.value })} placeholder="Korte beschrijving" required />
          <input value={draft.telefoonnummer} onChange={(event) => setDraft({ ...draft, telefoonnummer: event.target.value })} placeholder="Telefoonnummer" />
          <input value={draft.emailadres} onChange={(event) => setDraft({ ...draft, emailadres: event.target.value })} placeholder="E-mailadres" />
          <input value={draft.website} onChange={(event) => setDraft({ ...draft, website: event.target.value })} placeholder="Website" />
          <button className="button" type="submit">Opslaan</button>
        </form>
      )}
      <div className="card-list">
        {visibleContacts.map((contact) => (
          <ContactCard key={contact.id} contact={contact} isAdmin={isAdmin} onEdit={setDraft} onDelete={contacts.remove} />
        ))}
      </div>
      {visibleContacts.length === 0 && <EmptyState title="Geen contacten gevonden" description="Pas de zoekterm of categorie aan." />}
    </section>
  );
}
