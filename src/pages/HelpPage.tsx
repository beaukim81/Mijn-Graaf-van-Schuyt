import { useMemo, useState } from "react";
import { CategoryFilter } from "../components/CategoryFilter";
import { EmptyState } from "../components/EmptyState";
import { HelpRequestCard } from "../components/HelpRequestCard";
import { helpCategories } from "../data/categories";
import { useAppData } from "../lib/AppDataContext";
import { notifyUser } from "../lib/pushNotifications";
import type { HelpCategory, HelpRequest } from "../types";

const socialCategories: HelpCategory[] = ["Samen eten", "Koffie / thee", "Spelletjesavond", "Filmavond", "Wandelen"];

export function HelpPage() {
  const { helpRequests, profile } = useAppData();
  const [category, setCategory] = useState<HelpCategory | "Alle">("Alle");
  const [showForm, setShowForm] = useState(false);
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
    setCategory(draft.categorie);
    setDraft({ titel: "", omschrijving: "", categorie: "Pakketje aannemen" });
    setShowForm(false);
  }

  function offerHelp(id: string) {
    const request = helpRequests.items.find((item) => item.id === id);
    if (!request) return;
    if (request.aangemaakt_door === profile.user_id) return;
    if (request.offers.some((offer) => offer.helper_id === profile.user_id)) return;

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
          contact_allowed: false,
          contact_info: "",
          aangemaakt_op: new Date().toISOString(),
        },
      ],
    });
    void notifyUser(request.aangemaakt_door, {
      title: "Nieuwe reactie op je hulpvraag",
      body: `${profile.naam_of_bijnaam}${profile.huisnummer ? `, huisnummer ${profile.huisnummer}` : ""} wil ${socialCategories.includes(request.categorie) ? "meedoen" : "helpen"}.`,
      url: `/hulp#hulp-${request.id}`,
      category: "help",
    });
  }

  function withdrawOffer(id: string) {
    const request = helpRequests.items.find((item) => item.id === id);
    if (!request) return;
    const ownOffer = request.offers.find((offer) => offer.helper_id === profile.user_id);
    if (!ownOffer) return;
    const remainingOffers = request.offers.filter((offer) => offer.helper_id !== profile.user_id);

    helpRequests.update(id, {
      status: remainingOffers.length > 0 ? "Iemand helpt" : "Open",
      offers: remainingOffers,
      messages: [
        ...request.messages,
        {
          id: crypto.randomUUID(),
          author_id: profile.user_id,
          author_name: profile.naam_of_bijnaam,
          author_house_number: profile.huisnummer,
          message: "Ik ben helaas niet meer beschikbaar.",
          aangemaakt_op: new Date().toISOString(),
        },
      ],
    });
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <h2>Hulp & Buren</h2>
        <p>Vraag iets kleins, bied hulp aan of organiseer iets gezelligs met buren.</p>
      </div>
      {helpRequests.syncError && (
        <div className="notice notice--warning">
          <p>{helpRequests.syncError}</p>
          <button className="text-button" onClick={helpRequests.clearSyncError} type="button">Melding sluiten</button>
        </div>
      )}
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
      {!showForm && (
        <button className="button button--full" onClick={() => setShowForm(true)} type="button">
          Hulpvraag of uitnodiging plaatsen
        </button>
      )}
      {showForm && (
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
        <button className="button button--soft" onClick={() => setShowForm(false)} type="button">Annuleren</button>
      </form>
      )}
      <CategoryFilter label="Categorie" value={category} options={helpCategories} onChange={setCategory} />
      <div className="card-list">
        {filteredRequests.map((request) => (
          <HelpRequestCard
            key={request.id}
            request={request}
            isOwner={request.aangemaakt_door === profile.user_id || profile.rol === "admin"}
            currentUserId={profile.user_id}
            isAdmin={profile.rol === "admin"}
            onOffer={offerHelp}
            onWithdrawOffer={withdrawOffer}
            onComplete={helpRequests.remove}
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
            onUpdateMessage={(id, messageId, message) => {
              const request = helpRequests.items.find((item) => item.id === id);
              if (!request) return;
              helpRequests.update(id, {
                messages: request.messages.map((item) => (item.id === messageId && item.author_id === profile.user_id ? { ...item, message } : item)),
              });
            }}
            onDeleteMessage={(id, messageId) => {
              const request = helpRequests.items.find((item) => item.id === id);
              if (!request) return;
              helpRequests.update(id, {
                messages: request.messages.filter((item) => item.id !== messageId || (item.author_id !== profile.user_id && profile.rol !== "admin")),
              });
            }}
          />
        ))}
      </div>
      {filteredRequests.length === 0 && <EmptyState title="Geen hulpvragen" description="Er staat nu geen hulpvraag in deze categorie." />}
    </section>
  );
}
