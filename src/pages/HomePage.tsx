import { useMemo, useState } from "react";
import { LinkifiedText } from "../components/LinkifiedText";
import { StatusBadge } from "../components/StatusBadge";
import { useAppData } from "../lib/AppDataContext";
import type { BuildingAnnouncement, FeedbackItem } from "../types";

function announcementDate(value: string) {
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(new Date(value));
}

function dateValue(announcement: BuildingAnnouncement) {
  return announcement.event_date ?? announcement.updated_at;
}

function dateSortValue(announcement: BuildingAnnouncement) {
  return announcement.event_date ? localDateStart(announcement.event_date).getTime() : new Date(announcement.updated_at).getTime();
}

function localDateStart(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return new Date(value);
  return new Date(year, month - 1, day);
}

function isExpired(announcement: BuildingAnnouncement) {
  if (!announcement.event_date) return false;

  const removeAfter = localDateStart(announcement.event_date);
  removeAfter.setDate(removeAfter.getDate() + 1);
  removeAfter.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return today >= removeAfter;
}

export function HomePage() {
  const { buildingAnnouncements, feedbackItems, profile } = useAppData();
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState({ onderwerp: "", bericht: "" });
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const visibleAnnouncements = useMemo(
    () =>
      [...buildingAnnouncements.items]
        .filter((announcement) => !isExpired(announcement))
        .sort((first, second) => dateSortValue(first) - dateSortValue(second)),
    [buildingAnnouncements.items],
  );

  function sendFeedback() {
    const onderwerp = feedbackDraft.onderwerp.trim();
    const bericht = feedbackDraft.bericht.trim();
    if (!onderwerp || !bericht) {
      setFeedbackMessage("Vul een onderwerp en bericht in.");
      return;
    }

    const timestamp = new Date().toISOString();
    const item: FeedbackItem = {
      id: crypto.randomUUID(),
      onderwerp,
      bericht,
      status: "Nieuw",
      aangemaakt_door: profile.user_id,
      aangemaakt_door_naam: profile.naam_of_bijnaam,
      aangemaakt_door_huisnummer: profile.huisnummer,
      created_at: timestamp,
      updated_at: timestamp,
    };
    feedbackItems.add(item);
    setFeedbackDraft({ onderwerp: "", bericht: "" });
    setShowFeedback(false);
    setFeedbackMessage("Dank je, je feedback is verstuurd naar beheer.");
  }

  return (
    <section className="page-stack">
      <section className="home-welcome" aria-label="Welkom">
        <figure className="home-hero">
          <img src="/images/graaf-van-schuyt-hero.png" alt="Appartementencomplex Graaf van Schuyt" />
        </figure>
        <div className="home-welcome__text">
          <p className="eyebrow">Bewonersapp</p>
          <h2>Welkom</h2>
          <div className="notice">
            Deze app is in test. Gebruik hem voor praktische meldingen, hulpvragen en informatie. Spoed of persoonlijke reparaties blijven via REBO.
          </div>
          <p>Alles wat handig is voor bewoners van Graaf van Schuyt: contacten, meldingen, handleidingen, hulpvragen en korte berichten.</p>
          <p>Onderaan vind je de vaste onderdelen van de app.</p>
          <button className="button button--soft" onClick={() => setShowFeedback((current) => !current)} type="button">
            Feedback doorgeven
          </button>
          {showFeedback && (
            <form className="form-panel feedback-form" onSubmit={(event) => { event.preventDefault(); sendFeedback(); }}>
              <h3>Feedback doorgeven</h3>
              <input value={feedbackDraft.onderwerp} onChange={(event) => setFeedbackDraft({ ...feedbackDraft, onderwerp: event.target.value })} placeholder="Waar gaat je feedback over?" required />
              <textarea value={feedbackDraft.bericht} onChange={(event) => setFeedbackDraft({ ...feedbackDraft, bericht: event.target.value })} placeholder="Wat wil je meegeven of wat werkt nog niet prettig?" required />
              <button className="button" type="submit">Versturen</button>
            </form>
          )}
          {feedbackMessage && <p className="muted">{feedbackMessage}</p>}
        </div>
      </section>

      <section className="home-updates" aria-label="Belangrijke meldingen">
        <div className="section-heading">
          <h2>Algemene meldingen</h2>
        </div>
        <div className="home-update-list">
          {visibleAnnouncements.map((announcement) => (
            <article className={`home-update home-update--${announcement.importance}`} key={announcement.id}>
              <time>{announcementDate(dateValue(announcement))}</time>
              <div>
                <div className="home-update__header">
                  <h3>{announcement.titel}</h3>
                  {announcement.importance !== "normaal" && (
                    <StatusBadge tone={announcement.importance === "urgent" ? "warning" : "soft"}>{announcement.importance}</StatusBadge>
                  )}
                </div>
                <p><LinkifiedText text={announcement.inhoud} /></p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
