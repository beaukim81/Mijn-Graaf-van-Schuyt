import { useMemo, useState } from "react";
import { useAppData } from "../lib/AppDataContext";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../lib/AuthContext";
import { disablePushNotifications, enablePushNotifications, mergeNotificationPreference, notifyUser, pushSupported, saveNotificationPreference } from "../lib/pushNotifications";
import type { NotificationPreference } from "../types";

export function ProfilePage() {
  const { notificationPreferences, profile } = useAppData();
  const { configured, signOut } = useAuth();
  const [pushMessage, setPushMessage] = useState("");
  const storedPreference = useMemo(
    () => notificationPreferences.items.find((item) => item.user_id === profile.user_id),
    [notificationPreferences.items, profile.user_id],
  );
  const preference = mergeNotificationPreference(profile.user_id, storedPreference);

  async function updatePreference(changes: Partial<NotificationPreference>) {
    const next = { ...preference, ...changes, updated_at: new Date().toISOString() };
    if (storedPreference) {
      notificationPreferences.update(profile.user_id, next);
    } else {
      notificationPreferences.add(next);
    }
    await saveNotificationPreference(next);
  }

  async function enablePush() {
    try {
      setPushMessage("");
      await enablePushNotifications(profile, preference);
      setPushMessage("Pushmeldingen zijn ingeschakeld.");
    } catch (error) {
      setPushMessage(error instanceof Error ? error.message : "Pushmeldingen inschakelen is niet gelukt.");
    }
  }

  async function disablePush() {
    await disablePushNotifications(profile);
    setPushMessage("Pushmeldingen zijn uitgezet op dit apparaat.");
  }

  async function sendTestPush() {
    try {
      setPushMessage("");
      const result = await notifyUser(profile.user_id, {
        title: "Testmelding Graaf van Schuyt",
        body: "Deze testmelding werkt via Supabase en je telefoon.",
        url: "/profiel",
        category: "personal",
      });
      setPushMessage((result?.sent ?? 0) > 0 ? "Testmelding is verstuurd." : "Testmelding kon niet worden bezorgd. Zet pushmeldingen eerst aan op dit apparaat.");
    } catch (error) {
      setPushMessage(error instanceof Error ? error.message : "Testmelding versturen is niet gelukt.");
    }
  }

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
        </dl>
        {profile.achternaam && <p className="muted">Naam: {profile.naam_of_bijnaam} {profile.achternaam}</p>}
        {configured ? (
          <button className="button button--soft" onClick={() => void signOut()} type="button">
            Uitloggen
          </button>
        ) : (
          <p className="muted">Zodra Supabase is gekoppeld, beheer je dit profiel na inloggen met je eigen account.</p>
        )}
      </article>

      <article className="item-card">
        <div className="item-card__header">
          <div>
            <p className="chip">Notificaties</p>
            <h2>Pushmeldingen</h2>
          </div>
          <StatusBadge tone={pushSupported() ? "soft" : "warning"}>{pushSupported() ? "Beschikbaar" : "Niet beschikbaar"}</StatusBadge>
        </div>
        <p>Ontvang alleen relevante meldingen: persoonlijk voor jou, of belangrijke gebouwmeldingen van beheer.</p>
        <p className="muted">Op iPhone werken pushmeldingen alleen wanneer je Mijn Graaf van Schuyt toevoegt aan je beginscherm en meldingen toestaat.</p>
        <div className="settings-list">
          <PreferenceToggle label="Persoonlijke meldingen" checked={preference.personal_notifications} onChange={(checked) => updatePreference({ personal_notifications: checked })} />
          <PreferenceToggle label="Algemene mededelingen" checked={preference.building_notifications} onChange={(checked) => updatePreference({ building_notifications: checked })} />
          <PreferenceToggle label="Hulpvragen" checked={preference.help_notifications} onChange={(checked) => updatePreference({ help_notifications: checked })} />
          <PreferenceToggle label="Mijn meldingen" checked={preference.report_notifications} onChange={(checked) => updatePreference({ report_notifications: checked })} />
          <PreferenceToggle label="Kennisbank" checked={preference.knowledge_notifications} onChange={(checked) => updatePreference({ knowledge_notifications: checked })} />
          <PreferenceToggle label="Prikbord" checked={preference.bulletin_notifications} onChange={(checked) => updatePreference({ bulletin_notifications: checked })} />
        </div>
        <div className="action-row">
          <button className="button button--soft" onClick={enablePush} type="button">
            Pushmeldingen toestaan
          </button>
          <button className="button button--soft" onClick={disablePush} type="button">
            Uitzetten op dit apparaat
          </button>
          <button className="button button--soft" onClick={sendTestPush} type="button">
            Testmelding sturen
          </button>
        </div>
        {pushMessage && <p className="muted">{pushMessage}</p>}
      </article>
    </section>
  );
}

function PreferenceToggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
    </label>
  );
}
