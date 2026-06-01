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
  whatsapp_url: "",
  zichtbaar: true,
  aangemaakt_op: "",
  bijgewerkt_op: "",
};

const contactGroups = [
  { label: "Alles", value: "Alle" },
  { label: "Spoed", value: "Spoed" },
  { label: "REBO", value: "REBO" },
  { label: "Gemeente", value: "Gemeente" },
  { label: "Leveranciers", value: "Leveranciers" },
] as const;

export function ContactsPage() {
  const { contacts, profile } = useAppData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ContactCategory | "Alle">("Alle");
  const [group, setGroup] = useState<(typeof contactGroups)[number]["value"]>("Alle");
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Contact>(blankContact);
  const isAdmin = profile.rol === "admin";

  const visibleContacts = useMemo(() => {
    return contacts.items.filter((contact) => {
      const matchesQuery = `${contact.naam} ${contact.categorie} ${contact.beschrijving}`.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === "Alle" || contact.categorie === category;
      const matchesGroup =
        group === "Alle" ||
        contact.categorie === group ||
        (group === "REBO" && contact.naam.toLowerCase().includes("rebo"));
      return contact.zichtbaar && matchesQuery && matchesCategory && matchesGroup;
    });
  }, [contacts.items, query, category, group]);

  function saveContact() {
    const timestamp = new Date().toISOString();
    if (draft.id) {
      contacts.update(draft.id, { ...draft, bijgewerkt_op: timestamp });
    } else {
      contacts.add({ ...draft, id: crypto.randomUUID(), aangemaakt_op: timestamp, bijgewerkt_op: timestamp });
    }
    setDraft(blankContact);
    setShowForm(false);
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <h2>Contacten</h2>
        <p>Belangrijke nummers en websites voor huur, storing, gemeente en leveranciers.</p>
      </div>
      <div className="suggestion-strip" aria-label="Contactgroepen">
        {contactGroups.map((item) => (
          <button className={group === item.value ? "active" : ""} key={item.value} onClick={() => setGroup(item.value)} type="button">
            {item.label}
          </button>
        ))}
      </div>
      <div className="filter-row filter-row--equal">
        <SearchBar value={query} onChange={setQuery} placeholder="Zoek contact" />
        <CategoryFilter label="Categorie" value={category} options={contactCategories} onChange={setCategory} />
      </div>
      {isAdmin && !showForm && (
        <button className="button button--full" onClick={() => setShowForm(true)} type="button">
          Contact toevoegen
        </button>
      )}
      {isAdmin && showForm && (
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
          <input value={draft.whatsapp_url} onChange={(event) => setDraft({ ...draft, whatsapp_url: event.target.value })} placeholder="WhatsApp-link" />
          <button className="button" type="submit">Opslaan</button>
          <button className="button button--soft" onClick={() => { setDraft(blankContact); setShowForm(false); }} type="button">Annuleren</button>
        </form>
      )}
      <div className="card-list">
        {visibleContacts.map((contact) => (
          <ContactCard key={contact.id} contact={contact} isAdmin={isAdmin} onEdit={(item) => { setDraft(item); setShowForm(true); }} onDelete={contacts.remove} />
        ))}
      </div>
      {visibleContacts.length === 0 && <EmptyState title="Geen contacten gevonden" description="Pas de zoekterm of categorie aan." />}
    </section>
  );
}
