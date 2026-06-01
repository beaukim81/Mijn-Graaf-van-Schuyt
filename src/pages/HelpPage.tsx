import { useMemo, useState } from "react";
import { CategoryFilter } from "../components/CategoryFilter";
import { EmptyState } from "../components/EmptyState";
import { HelpRequestCard } from "../components/HelpRequestCard";
import { helpCategories } from "../data/categories";
import { useAppData } from "../lib/AppDataContext";
import type { HelpCategory, HelpRequest } from "../types";

const socialCategories: HelpCategory[] = ["Samen eten", "Koffie / thee", "Spelletjesavond", "Filmavond", "Wandelen"];

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

  const openCategoryFilters = useMemo(() => {
    const counts = new Map<HelpCategory, number>();
    helpRequests.items
      .filter((request) => request.status !== "Afgerond")
      .forEach((request) => counts.set(request.categorie, (counts.get(request.categorie) ?? 0) + 1));

    return helpCategories
      .filter((item) => counts.has(item))
      .map((item) => ({ category: item, count: counts.get(item) ?? 0 }));
  }, [helpRequests.items]);

  function createRequest() {
    const request: HelpRequest = {
      id: crypto.randomUUID(),
      ...draft,
      aangemaakt_door: profile.user_id,
      aanmaker_naam: profile.naam_of_bijnaam,
      aanmaker_huisnummer: profile.huisnummer,
      status: "Open",
      aangemaakt_op: new Date().toISOString(),
      offers: [],
      messages: [],
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
          helper_house_number: profile.huisnummer,
          contact_allowed: profile.contact_info_zichtbaar_voor_helpers,
          contact_info: profile.huisnummer ? `Huisnummer ${profile.huisnummer}` : profile.email,
          aangemaakt_op: new Date().toISOString(),
        },
      ],
    });
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <h2>Hulp & Buren</h2>
        <p>Vraag hulp, bied hulp aan of organiseer iets met buren.</p>
      </div>
      {openCategoryFilters.length > 0 && (
        <div className="suggestion-strip" aria-label="Snelle filters voor open hulpvragen">
          <button className={category === "Alle" ? "active" : ""} onClick={() => setCategory("Alle")} type="button">
            Alles
            <span>{helpRequests.items.filter((request) => request.status !== "Afgerond").length}</span>
          </button>
          {openCategoryFilters.map((item) => (
            <button className={category === item.category ? "active" : ""} key={item.category} onClick={() => setCategory(item.category)} type="button">
              {item.category}
              <span>{item.count}</span>
            </button>
          ))}
        </div>
      )}
      <form className="form-panel" onSubmit={(event) => { event.preventDefault(); createRequest(); }}>
        <h3>{socialCategories.includes(draft.categorie) ? "Uitnodiging plaatsen" : "Hulpvraag plaatsen"}</h3>
        <input
          value={draft.titel}
          onChange={(event) => setDraft({ ...draft, titel: event.target.value })}
          placeholder={socialCategories.includes(draft.categorie) ? "Bijvoorbeeld: samen soep eten op zondag" : "Waar heb je hulp bij nodig?"}
          required
        />
        <textarea
          value={draft.omschrijving}
          onChange={(event) => setDraft({ ...draft, omschrijving: event.target.value })}
          placeholder={socialCategories.includes(draft.categorie) ? "Wat organiseer je, wanneer en hoeveel plek is er?" : "Korte uitleg"}
          required
        />
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
            isOwner={request.aangemaakt_door === profile.user_id || profile.rol === "admin"}
            onOffer={offerHelp}
            onComplete={(id) => helpRequests.update(id, { status: "Afgerond" })}
            onSendMessage={(id, message) => {
              const request = helpRequests.items.find((item) => item.id === id);
              if (!request) return;
              helpRequests.update(id, {
                messages: [
                  ...request.messages,
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
          />
        ))}
      </div>
      {filteredRequests.length === 0 && <EmptyState title="Geen hulpvragen" description="Er staat nu geen hulpvraag in deze categorie." />}
    </section>
  );
}
