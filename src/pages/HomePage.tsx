export function HomePage() {
  return (
    <section className="page-stack">
      <section className="home-welcome" aria-label="Welkom">
        <figure className="home-hero">
          <img src="/images/graaf-van-schuyt-hero.png" alt="Appartementencomplex Graaf van Schuyt" />
        </figure>
        <div className="home-welcome__text">
          <h2>Welkom bij Mijn Graaf van Schuyt</h2>
          <p>Gebruik deze app voor praktische informatie over het gebouw, belangrijke contacten, meldingen, handleidingen, hulpvragen en berichten voor buren.</p>
          <p>Gebruik de knoppen onderin om naar Contacten, Meldingen, Kennisbank, Hulp & Buren of Prikbord te gaan.</p>
        </div>
      </section>
    </section>
  );
}
