import { useMemo, useState } from "react";
import { ContactCard } from "../components/ContactCard";
import { CategoryFilter } from "../components/CategoryFilter";
import { EmptyState } from "../components/EmptyState";
import { SearchBar } from "../components/SearchBar";
import { contactCategories } from "../data/categories";
import { useAppData } from "../lib/AppDataContext";
import type { Contact, ContactCategory } from "../types";

const contactGroups = [
  { label: "Alles", value: "Alle" },
  { label: "Spoed", value: "Spoed" },
  { label: "REBO", value: "REBO" },
  { label: "Leveranciers", value: "Leveranciers" },
  { label: "Gemeente", value: "Gemeente" },
] as const;

function contactPriority(contact: Contact) {
  const name = contact.naam.toLowerCase();
  if (contact.categorie === "Spoed") return 0;
  if (name.includes("rebo") || contact.categorie === "Verhuur") return 1;
  if (contact.categorie === "Leveranciers") return 2;
  if (contact.categorie === "Gemeente") return 3;
  if (contact.categorie === "Veiligheid") return 4;
  return 5;
}

function contactSecondaryPriority(contact: Contact) {
  const name = contact.naam.toLowerCase();
  if (name.includes("huurvragen")) return 0;
  if (name.includes("portal")) return 1;
  if (name.includes("schade")) return 2;
  if (name.includes("storing")) return 3;
  if (name.includes("klantenservice")) return 4;
  return 5;
}

export function ContactsPage() {
  const { contacts } = useAppData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ContactCategory | "Alle">("Alle");
  const [group, setGroup] = useState<(typeof contactGroups)[number]["value"]>("Alle");

  const visibleContacts = useMemo(() => {
    return contacts.items
      .filter((contact) => {
        const matchesQuery = `${contact.naam} ${contact.categorie} ${contact.beschrijving}`.toLowerCase().includes(query.toLowerCase());
        const matchesCategory = category === "Alle" || contact.categorie === category;
        const matchesGroup =
          group === "Alle" ||
          contact.categorie === group ||
          (group === "REBO" && (contact.naam.toLowerCase().includes("rebo") || contact.categorie === "Verhuur"));
        return contact.zichtbaar && matchesQuery && matchesCategory && matchesGroup;
      })
      .sort((first, second) => {
        const priorityDifference = contactPriority(first) - contactPriority(second);
        if (priorityDifference !== 0) return priorityDifference;
        const secondaryDifference = contactSecondaryPriority(first) - contactSecondaryPriority(second);
        if (secondaryDifference !== 0) return secondaryDifference;
        return first.naam.localeCompare(second.naam, "nl");
      });
  }, [contacts.items, query, category, group]);

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
      <div className="card-list">
        {visibleContacts.map((contact) => (
          <ContactCard key={contact.id} contact={contact} />
        ))}
      </div>
      {visibleContacts.length === 0 && <EmptyState title="Geen contacten gevonden" description="Probeer een andere zoekterm of categorie. Mist er een belangrijk contact, geef dit door via feedback." />}
    </section>
  );
}
