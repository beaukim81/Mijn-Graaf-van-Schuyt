import { Link } from "react-router-dom";
import { paths } from "../routes/paths";

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
          <div className="home-summary" aria-label="Wat kun je hier doen?">
            <Link to={paths.contacts}>Contacten vinden</Link>
            <Link to={paths.reports}>Melding maken</Link>
            <Link to={paths.knowledge}>Handleiding zoeken</Link>
            <Link to={paths.help}>Buren helpen</Link>
          </div>
        </div>
      </section>
    </section>
  );
}
