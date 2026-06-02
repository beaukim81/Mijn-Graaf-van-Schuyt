import { useEffect, useMemo } from "react";
import { StatusBadge } from "../components/StatusBadge";
import { useAppData } from "../lib/AppDataContext";
import type { BuildingAnnouncement } from "../types";

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
  const { buildingAnnouncements } = useAppData();
  const expiredAnnouncementIds = useMemo(
    () => buildingAnnouncements.items.filter(isExpired).map((announcement) => announcement.id),
    [buildingAnnouncements.items],
  );
  const visibleAnnouncements = useMemo(
    () =>
      [...buildingAnnouncements.items]
        .filter((announcement) => !isExpired(announcement))
        .sort((first, second) => dateSortValue(first) - dateSortValue(second)),
    [buildingAnnouncements.items],
  );

  useEffect(() => {
    expiredAnnouncementIds.forEach((id) => buildingAnnouncements.remove(id));
  }, [buildingAnnouncements, expiredAnnouncementIds]);

  return (
    <section className="page-stack">
      <section className="home-welcome" aria-label="Welkom">
        <figure className="home-hero">
          <img src="/images/graaf-van-schuyt-hero.png" alt="Appartementencomplex Graaf van Schuyt" />
        </figure>
        <div className="home-welcome__text">
          <p className="eyebrow">Bewonersapp</p>
          <h2>Welkom</h2>
          <p>Een praktische plek voor contactgegevens, meldingen, handleidingen, hulpvragen en korte berichten in het gebouw.</p>
          <p>Gebruik de navigatie onderin om direct naar het onderdeel te gaan dat je nodig hebt.</p>
        </div>
      </section>

      <section className="home-updates" aria-label="Belangrijke meldingen">
        <div className="section-heading">
          <p className="eyebrow">Binnenkort belangrijk</p>
          <h2>Praktische meldingen</h2>
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
                <p>{announcement.inhoud}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
