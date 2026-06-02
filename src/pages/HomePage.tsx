const importantUpdates = [
  {
    date: "12 juni",
    title: "Glazenwasser komt langs",
    tip: "Doe ramen en deuren op tijd dicht en haal spullen van de vensterbank waar nodig.",
  },
  {
    date: "16 juni",
    title: "Schoonmaak parkeergarage",
    tip: "Zet de auto bij voorkeur de avond ervoor al buiten de garage.",
  },
  {
    date: "22 juni",
    title: "Fietsencontrole fietsenhok",
    tip: "Controleer of je fiets herkenbaar is en haal oude of ongebruikte fietsen op tijd weg.",
  },
];

export function HomePage() {
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
          {importantUpdates.map((update) => (
            <article className="home-update" key={update.title}>
              <time>{update.date}</time>
              <div>
                <h3>{update.title}</h3>
                <p>{update.tip}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
