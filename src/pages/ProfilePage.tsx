import { useAppData } from "../lib/AppDataContext";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../lib/AuthContext";

export function ProfilePage() {
  const { profile } = useAppData();
  const { configured, signOut } = useAuth();

  return (
    <section className="page-stack">
      <div className="page-heading">
        <h2>Bewonersprofiel</h2>
        <p>Je profiel gebruikt straks je e-mailadres, naam en huisnummer. Achternaam mag, maar hoeft niet.</p>
      </div>
      <article className="item-card">
        <div className="item-card__header">
          <div>
            <p className="chip">{profile.verdieping_of_gebouwdeel}</p>
            <h2>{profile.naam_of_bijnaam}</h2>
          </div>
          <StatusBadge tone="soft">{profile.rol}</StatusBadge>
        </div>
        <dl className="meta-list">
          <div>
            <dt>E-mailadres</dt>
            <dd>{profile.email ?? "Nog niet gekoppeld"}</dd>
          </div>
          <div>
            <dt>Huisnummer</dt>
            <dd>{profile.huisnummer ?? "Nog niet ingevuld"}</dd>
          </div>
          <div>
            <dt>Benaderbaar voor hulp</dt>
            <dd>{profile.mag_benaderd_worden_voor_hulp ? "Ja" : "Nee"}</dd>
          </div>
          <div>
            <dt>Contact zichtbaar voor helpers</dt>
            <dd>{profile.contact_info_zichtbaar_voor_helpers ? "Ja" : "Nee"}</dd>
          </div>
        </dl>
        <div className="related-box">
          <strong>Kan helpen met</strong>
          {profile.kan_helpen_met.map((item) => <span key={item}>{item}</span>)}
        </div>
        {profile.achternaam && <p className="muted">Naam: {profile.naam_of_bijnaam} {profile.achternaam}</p>}
        {configured ? (
          <button className="button button--soft" onClick={() => void signOut()} type="button">
            Uitloggen
          </button>
        ) : (
          <p className="muted">Zodra Supabase is gekoppeld, beheer je dit profiel na inloggen met je eigen account.</p>
        )}
      </article>
    </section>
  );
}
