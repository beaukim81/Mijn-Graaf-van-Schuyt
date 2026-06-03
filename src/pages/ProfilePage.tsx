import { FormEvent, useMemo, useState } from "react";
import { useAppData } from "../lib/AppDataContext";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../lib/AuthContext";
import { disablePushNotifications, enablePushNotifications, mergeNotificationPreference, notifyUser, pushSupported, saveNotificationPreference } from "../lib/pushNotifications";
import type { NotificationPreference } from "../types";
import { friendlyErrorMessage } from "../lib/friendlyErrors";

export function ProfilePage() {
  const { notificationPreferences, profile } = useAppData();
  const { configured, deleteAccount, signOut, updateEmail } = useAuth();
  const [pushMessage, setPushMessage] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [email, setEmail] = useState(profile.email ?? "");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
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
      setPushMessage(friendlyErrorMessage(error, "Pushmeldingen inschakelen lukt nu niet. Controleer of meldingen in je browser zijn toegestaan."));
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
      setPushMessage(friendlyErrorMessage(error, "Testmelding versturen lukt nu niet. Controleer je internet en probeer het opnieuw."));
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm("Weet je zeker dat je je account volledig wilt verwijderen? Je profiel en gekoppelde gegevens worden verwijderd. Dit kun je niet terugdraaien.");
    if (!confirmed) return;
    try {
      setAccountMessage("");
      await deleteAccount();
    } catch (error) {
      setAccountMessage(friendlyErrorMessage(error, "Account verwijderen lukt nu niet. Log opnieuw in en probeer het nog een keer."));
    }
  }

  async function handleEmailUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail) {
      setEmailMessage("Vul eerst een e-mailadres in.");
      return;
    }
    if (nextEmail === profile.email?.toLowerCase()) {
      setEmailMessage("Dit e-mailadres staat al bij je account.");
      return;
    }

    try {
      setEmailBusy(true);
      setEmailMessage("");
      await updateEmail(nextEmail);
      setEmailMessage(
        "We hebben een bevestigingsmail gestuurd naar je nieuwe e-mailadres. Tot je die mail bevestigt, log je nog in met je oude e-mailadres. Kijk ook in spam of ongewenste mail.",
      );
    } catch (error) {
      setEmailMessage(friendlyErrorMessage(error, "E-mailadres wijzigen lukt nu niet. Controleer het adres en probeer het opnieuw."));
    } finally {
      setEmailBusy(false);
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

      {configured && (
        <article className="item-card">
          <div className="item-card__header">
            <div>
              <p className="chip">Account</p>
              <h2>E-mailadres wijzigen</h2>
            </div>
          </div>
          <p>Gebruik hier het e-mailadres waarmee je wilt inloggen en berichten wilt ontvangen.</p>
          <p className="muted">
            Na het wijzigen krijg je een bevestigingsmail. Tot je de wijziging bevestigt, log je nog in met je oude
            e-mailadres. Kijk ook in spam of ongewenste mail.
          </p>
          <form className="form-panel" onSubmit={handleEmailUpdate}>
            <input
              autoComplete="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Nieuw e-mailadres"
              type="email"
              value={email}
            />
            <button className="button button--soft" disabled={emailBusy} type="submit">
              {emailBusy ? "Even geduld" : "E-mailadres wijzigen"}
            </button>
          </form>
          {emailMessage && <p className="muted">{emailMessage}</p>}
        </article>
      )}

      {configured && (
        <article className="item-card">
          <div className="item-card__header">
            <div>
              <p className="chip">Account</p>
              <h2>Account verwijderen</h2>
            </div>
            <StatusBadge tone="warning">Let op</StatusBadge>
          </div>
          <p>Wil je de app niet meer gebruiken, dan kun je je account volledig verwijderen.</p>
          <p className="muted">Je profiel en gekoppelde gegevens worden verwijderd. Dit kan niet ongedaan worden gemaakt.</p>
          <button className="button button--soft" onClick={handleDeleteAccount} type="button">
            Account verwijderen
          </button>
          {accountMessage && <p className="muted">{accountMessage}</p>}
        </article>
      )}

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
