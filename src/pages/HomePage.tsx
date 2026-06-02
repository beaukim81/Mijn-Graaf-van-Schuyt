import { StatusBadge } from "../components/StatusBadge";
import { useAppData } from "../lib/AppDataContext";

function announcementDate(value: string) {
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(new Date(value));
}

export function HomePage() {
  const { buildingAnnouncements } = useAppData();

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
          {buildingAnnouncements.items.map((announcement) => (
            <article className={`home-update home-update--${announcement.importance}`} key={announcement.id}>
              <time>{announcementDate(announcement.updated_at)}</time>
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
