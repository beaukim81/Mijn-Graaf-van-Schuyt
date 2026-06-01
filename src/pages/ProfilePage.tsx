import { useAppData } from "../lib/AppDataContext";
import { StatusBadge } from "../components/StatusBadge";

export function ProfilePage() {
  const { profile } = useAppData();

  return (
    <section className="page-stack">
      <div className="page-heading">
        <h2>Bewonersprofiel</h2>
        <p>Een vrijwillig profiel voor herkenbaarheid en hulp. Huisnummer is niet verplicht.</p>
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
        <p className="muted">In de gekoppelde Supabase-versie beheer je dit profiel na inloggen met Supabase Auth.</p>
      </article>
    </section>
  );
}
