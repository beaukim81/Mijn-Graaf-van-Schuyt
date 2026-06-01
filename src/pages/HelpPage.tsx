import { useMemo, useState } from "react";
import { CategoryFilter } from "../components/CategoryFilter";
import { EmptyState } from "../components/EmptyState";
import { HelpRequestCard } from "../components/HelpRequestCard";
import { helpCategories } from "../data/categories";
import { useAppData } from "../lib/AppDataContext";
import type { HelpCategory, HelpRequest } from "../types";

export function HelpPage() {
  const { helpRequests, profile } = useAppData();
  const [category, setCategory] = useState<HelpCategory | "Alle">("Alle");
  const [draft, setDraft] = useState({
    titel: "",
    omschrijving: "",
    categorie: "Pakketje aannemen" as HelpCategory,
  });

  const filteredRequests = useMemo(() => {
    return helpRequests.items.filter((request) => category === "Alle" || request.categorie === category);
  }, [category, helpRequests.items]);

  function createRequest() {
    const request: HelpRequest = {
      id: crypto.randomUUID(),
      ...draft,
      aangemaakt_door: profile.user_id,
      status: "Open",
      aangemaakt_op: new Date().toISOString(),
      offers: [],
    };
    helpRequests.add(request);
    setDraft({ titel: "", omschrijving: "", categorie: "Pakketje aannemen" });
  }

  function offerHelp(id: string) {
    const request = helpRequests.items.find((item) => item.id === id);
    if (!request) return;

    helpRequests.update(id, {
      status: "Iemand helpt",
      offers: [
        ...request.offers,
        {
          id: crypto.randomUUID(),
          help_request_id: id,
          helper_id: profile.user_id,
          helper_name: profile.naam_of_bijnaam,
          contact_allowed: profile.contact_info_zichtbaar_voor_helpers,
          contact_info: profile.email,
          aangemaakt_op: new Date().toISOString(),
        },
      ],
    });
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <h2>Hulp & Buren</h2>
        <p>Kleine hulpvragen zonder groepsdruk. Contact loopt via een eenvoudig hulpaanbod.</p>
      </div>
      <form className="form-panel" onSubmit={(event) => { event.preventDefault(); createRequest(); }}>
        <h3>Hulpvraag plaatsen</h3>
        <input value={draft.titel} onChange={(event) => setDraft({ ...draft, titel: event.target.value })} placeholder="Waar heb je hulp bij nodig?" required />
        <textarea value={draft.omschrijving} onChange={(event) => setDraft({ ...draft, omschrijving: event.target.value })} placeholder="Korte uitleg" required />
        <select value={draft.categorie} onChange={(event) => setDraft({ ...draft, categorie: event.target.value as HelpCategory })}>
          {helpCategories.map((item) => <option key={item}>{item}</option>)}
        </select>
        <button className="button" type="submit">Plaatsen</button>
      </form>
      <CategoryFilter label="Categorie" value={category} options={helpCategories} onChange={setCategory} />
      <div className="card-list">
        {filteredRequests.map((request) => (
          <HelpRequestCard
            key={request.id}
            request={request}
            isOwner={request.aangemaakt_door === profile.user_id}
            onOffer={offerHelp}
            onComplete={(id) => helpRequests.update(id, { status: "Afgerond" })}
          />
        ))}
      </div>
      {filteredRequests.length === 0 && <EmptyState title="Geen hulpvragen" description="Er staat nu geen hulpvraag in deze categorie." />}
    </section>
  );
}
