import { FormEvent, useEffect, useMemo, useState } from "react";
import { Camera, LogOut, Trash2 } from "lucide-react";
import { useAppData } from "../lib/AppDataContext";
import { StatusBadge } from "../components/StatusBadge";
import { LinkifiedText } from "../components/LinkifiedText";
import { ResidentIdentity } from "../components/ResidentIdentity";
import { useAuth } from "../lib/AuthContext";
import { isPreviewUrl, revokePreviewUrl, uploadBulletinImages } from "../lib/fileUploads";
import { floorForHouseNumber, isValidHouseNumber } from "../lib/floorForHouseNumber";
import { disablePushNotifications, enablePushNotifications, getPushStatus, mergeNotificationPreference, notifyUser, pushSupported, saveNotificationPreference } from "../lib/pushNotifications";
import { useSignedUrl } from "../lib/storageUrls";
import type { NotificationPreference } from "../types";
import { friendlyErrorMessage } from "../lib/friendlyErrors";
import { useConfirm } from "../lib/ConfirmContext";

export function ProfilePage() {
  const { feedbackItems, notificationPreferences, profile, profiles } = useAppData();
  const { configured, deleteAccount, refreshProfile, signOut, updateEmail, updatePassword } = useAuth();
  const confirm = useConfirm();
  const [pushMessage, setPushMessage] = useState("");
  const [pushStatus, setPushStatus] = useState<"checking" | "enabled" | "not_enabled" | "denied" | "unsupported">("checking");
  const [accountMessage, setAccountMessage] = useState("");
  const [email, setEmail] = useState(profile.email ?? "");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [profileDraft, setProfileDraft] = useState({
    naam_of_bijnaam: profile.naam_of_bijnaam ?? "",
    achternaam: profile.achternaam ?? "",
    huisnummer: profile.huisnummer ?? "",
    verdieping_of_gebouwdeel: profile.verdieping_of_gebouwdeel ?? "",
    profielfoto_url: profile.profielfoto_url ?? "",
  });
  const [passwordDraft, setPasswordDraft] = useState({ password: "", repeatPassword: "" });
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const inferredFloor = floorForHouseNumber(profileDraft.huisnummer);

  useEffect(() => {
    setEmail(profile.email ?? "");
    setPhotoFile(null);
    setProfileDraft({
      naam_of_bijnaam: profile.naam_of_bijnaam ?? "",
      achternaam: profile.achternaam ?? "",
      huisnummer: profile.huisnummer ?? "",
      verdieping_of_gebouwdeel: profile.verdieping_of_gebouwdeel ?? "",
      profielfoto_url: profile.profielfoto_url ?? "",
    });
  }, [profile.achternaam, profile.email, profile.huisnummer, profile.naam_of_bijnaam, profile.profielfoto_url, profile.verdieping_of_gebouwdeel]);

  const storedPreference = useMemo(
    () => notificationPreferences.items.find((item) => item.user_id === profile.user_id),
    [notificationPreferences.items, profile.user_id],
  );
  const preference = mergeNotificationPreference(profile.user_id, storedPreference);
  const myFeedback = useMemo(
    () => feedbackItems.items.filter((item) => item.aangemaakt_door === profile.user_id),
    [feedbackItems.items, profile.user_id],
  );
  const photoPreview = useMemo(() => (photoFile ? URL.createObjectURL(photoFile) : profileDraft.profielfoto_url), [photoFile, profileDraft.profielfoto_url]);
  const resolvedPhotoPreview = useSignedUrl(photoPreview);

  async function refreshPushStatus() {
    setPushStatus("checking");
    setPushStatus(await getPushStatus());
  }

  useEffect(() => {
    return () => {
      revokePreviewUrl(photoPreview);
    };
  }, [photoPreview]);

  useEffect(() => {
    void refreshPushStatus();
  }, []);

  async function updatePreference(changes: Partial<NotificationPreference>) {
    const next = { ...preference, ...changes, updated_at: new Date().toISOString() };
    if (storedPreference) {
      notificationPreferences.update(profile.user_id, next);
    } else {
      notificationPreferences.add(next);
    }
    await saveNotificationPreference(next);
  }

  async function handleProfileUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const firstName = profileDraft.naam_of_bijnaam.trim();
    const houseNumber = profileDraft.huisnummer.trim();
    if (!firstName || !houseNumber) {
      setProfileMessage("Vul minimaal je voornaam en huisnummer in.");
      return;
    }
    if (!isValidHouseNumber(houseNumber)) {
      setProfileMessage("Dit huisnummer bestaat niet in Graaf van Schuyt. Vul een bestaand oneven huisnummer in.");
      return;
    }

    try {
      setProfileBusy(true);
      setProfileMessage("");
      const uploadedPhoto = photoFile ? (await uploadBulletinImages([photoFile], profile.user_id))[0] : undefined;
      const nextPhotoUrl = uploadedPhoto ?? profileDraft.profielfoto_url.trim();
      await profiles.updateAsync(profile.id, {
        naam_of_bijnaam: firstName,
        achternaam: profileDraft.achternaam.trim() || undefined,
        huisnummer: houseNumber,
        verdieping_of_gebouwdeel: floorForHouseNumber(houseNumber) || undefined,
        profielfoto_url: nextPhotoUrl || undefined,
      });
      await refreshProfile();
      setPhotoFile(null);
      setProfileDraft((current) => ({ ...current, profielfoto_url: nextPhotoUrl }));
      setProfileMessage("Je profiel is opgeslagen.");
    } catch (error) {
      setProfileMessage(friendlyErrorMessage(error, "Profiel opslaan lukt nu niet. Controleer je gegevens en probeer het opnieuw."));
    } finally {
      setProfileBusy(false);
    }
  }

  async function enablePush() {
    try {
      setPushMessage("");
      await enablePushNotifications(profile, preference);
      await refreshPushStatus();
      setPushMessage("Pushmeldingen zijn ingeschakeld.");
    } catch (error) {
      setPushMessage(friendlyErrorMessage(error, "Pushmeldingen inschakelen lukt nu niet. Controleer of meldingen in je browser zijn toegestaan."));
    }
  }

  async function disablePush() {
    await disablePushNotifications(profile);
    await refreshPushStatus();
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
    const confirmed = await confirm({
      confirmLabel: "Account verwijderen",
      message: "Weet je zeker dat je je account volledig wilt verwijderen? Je naam, huisnummer en profielfoto worden niet meer getoond. Berichten die handig zijn voor bewoners kunnen blijven staan onder de naam Bewoner.",
    });
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
        "We hebben een bevestigingsmail gestuurd naar je nieuwe e-mailadres. Alleen via die mail bevestig je de wijziging. Tot die tijd log je nog in met je oude e-mailadres. Kijk ook in spam of ongewenste mail.",
      );
    } catch (error) {
      setEmailMessage(friendlyErrorMessage(error, "E-mailadres wijzigen lukt nu niet. Controleer het adres en probeer het opnieuw."));
    } finally {
      setEmailBusy(false);
    }
  }

  async function handlePasswordUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordDraft.password.length < 8) {
      setPasswordMessage("Kies een wachtwoord van minimaal 8 tekens.");
      return;
    }
    if (passwordDraft.password !== passwordDraft.repeatPassword) {
      setPasswordMessage("De twee wachtwoorden zijn niet gelijk.");
      return;
    }

    try {
      setPasswordBusy(true);
      setPasswordMessage("");
      await updatePassword(passwordDraft.password);
      setPasswordDraft({ password: "", repeatPassword: "" });
      setPasswordMessage("Je wachtwoord is gewijzigd. Log opnieuw in met je nieuwe wachtwoord.");
      await signOut();
    } catch (error) {
      setPasswordMessage(friendlyErrorMessage(error, "Wachtwoord wijzigen lukt nu niet. Probeer het later opnieuw."));
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <section className="page-stack profile-page">
      <div className="page-heading">
        <h2>Bewonersprofiel</h2>
        <p>Beheer hier je naam, huisnummer, foto en accountgegevens.</p>
      </div>

      <article className="item-card profile-summary-card">
        <div className="profile-summary">
          {photoPreview ? <img alt="" className="profile-avatar" src={resolvedPhotoPreview} /> : null}
          <div>
            <p className="chip">{profile.rol}</p>
            <h2>
              <ResidentIdentity profile={{ ...profile, ...profileDraft, profielfoto_url: "" }} />
            </h2>
            <p className="muted">{profile.email ?? "Nog geen e-mailadres gekoppeld"}</p>
          </div>
        </div>
      </article>

      {configured ? (
        <article className="item-card profile-signout-card">
          <button className="button button--soft button--full" onClick={() => void signOut()} type="button">
            <LogOut aria-hidden="true" size={18} /> Uitloggen
          </button>
        </article>
      ) : null}

      <article className="item-card">
        <div className="item-card__header">
          <div>
            <p className="chip">Profiel</p>
            <h2>Gegevens aanpassen</h2>
          </div>
        </div>
        <form className="form-panel form-panel--nested" onSubmit={handleProfileUpdate}>
          <label className="field">
            <span>Voornaam of bijnaam</span>
            <input value={profileDraft.naam_of_bijnaam} onChange={(event) => setProfileDraft({ ...profileDraft, naam_of_bijnaam: event.target.value })} required />
          </label>
          <label className="field">
            <span>Achternaam optioneel</span>
            <input value={profileDraft.achternaam} onChange={(event) => setProfileDraft({ ...profileDraft, achternaam: event.target.value })} />
          </label>
          <label className="field">
            <span>Huisnummer</span>
            <input inputMode="numeric" value={profileDraft.huisnummer} onChange={(event) => setProfileDraft({ ...profileDraft, huisnummer: event.target.value })} required />
            <small>Alleen bestaande oneven huisnummers zijn mogelijk.</small>
          </label>
          <label className="field">
            <span>Etage</span>
            <input readOnly value={inferredFloor || "Wordt bepaald op basis van je huisnummer"} />
          </label>
          <div className="profile-photo-editor">
            {photoPreview ? <img alt="Gekozen profielfoto" className="profile-avatar profile-avatar--large" src={resolvedPhotoPreview} /> : <div className="profile-photo-placeholder">Geen foto</div>}
            <div className="action-row">
              <label className="button button--soft file-button">
                <Camera aria-hidden="true" size={18} /> Foto kiezen
                <input
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) setPhotoFile(file);
                    event.currentTarget.value = "";
                  }}
                  type="file"
                />
              </label>
              {photoPreview && (
                <button
                  className="button button--danger"
                  onClick={async () => {
                    const confirmed = await confirm({ confirmLabel: "Foto verwijderen", message: "Weet je zeker dat je je profielfoto wilt verwijderen?" });
                    if (!confirmed) return;
                    if (isPreviewUrl(photoPreview)) revokePreviewUrl(photoPreview);
                    setPhotoFile(null);
                    setProfileDraft({ ...profileDraft, profielfoto_url: "" });
                  }}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={18} /> Foto verwijderen
                </button>
              )}
            </div>
          </div>
          <button className="button" disabled={profileBusy} type="submit">
            {profileBusy ? "Bezig met opslaan" : "Profiel opslaan"}
          </button>
        </form>
        {profileMessage && <p className="muted">{profileMessage}</p>}
      </article>

      <article className="item-card">
        <div className="item-card__header">
          <div>
            <p className="chip">Privacy</p>
            <h2>Wat zien andere bewoners?</h2>
          </div>
        </div>
        <p>Je naam, huisnummer, profielfoto en geplaatste berichten zijn zichtbaar voor ingelogde bewoners zolang je account actief is.</p>
        <p className="muted">Je e-mailadres is niet openbaar zichtbaar. Dat gebruiken we alleen voor je account, inloggen en belangrijke accountmails.</p>
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
          <p className="muted">Na het wijzigen krijg je op je nieuwe e-mailadres een bevestigingsmail. Alleen via die mail bevestig je de wijziging. Tot die tijd log je nog in met je oude e-mailadres. Een e-mailadres dat al bij een andere bewoner hoort, kan niet worden gebruikt.</p>
          <form className="form-panel form-panel--nested" onSubmit={handleEmailUpdate}>
            <input autoComplete="email" inputMode="email" onChange={(event) => setEmail(event.target.value)} placeholder="Nieuw e-mailadres" type="email" value={email} />
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
              <h2>Wachtwoord wijzigen</h2>
            </div>
          </div>
          <p>Kies een nieuw wachtwoord. Na het opslaan log je opnieuw in met je nieuwe wachtwoord.</p>
          <form className="form-panel form-panel--nested" onSubmit={handlePasswordUpdate}>
            <input autoComplete="new-password" onChange={(event) => setPasswordDraft({ ...passwordDraft, password: event.target.value })} placeholder="Nieuw wachtwoord" type="password" value={passwordDraft.password} />
            <input autoComplete="new-password" onChange={(event) => setPasswordDraft({ ...passwordDraft, repeatPassword: event.target.value })} placeholder="Herhaal nieuw wachtwoord" type="password" value={passwordDraft.repeatPassword} />
            <button className="button button--soft" disabled={passwordBusy} type="submit">
              {passwordBusy ? "Even geduld" : "Wachtwoord wijzigen"}
            </button>
          </form>
          {passwordMessage && <p className="muted">{passwordMessage}</p>}
        </article>
      )}

      <article className="item-card">
        <div className="item-card__header">
          <div>
            <p className="chip">Testfase</p>
            <h2>Mijn feedback</h2>
          </div>
        </div>
        {myFeedback.length === 0 ? (
          <p className="muted">Heb je feedback doorgegeven via de homepage, dan kun je hier later de status en reactie van beheer terugvinden.</p>
        ) : (
          <div className="card-list compact-list">
            {myFeedback.map((item) => (
              <details className="item-card collapsible-card" id={`feedback-${item.id}`} key={item.id}>
                <summary className="item-card__header collapsible-card__summary">
                  <div>
                    <p className="chip">{new Date(item.created_at).toLocaleDateString("nl-NL")}</p>
                    <h3>{item.onderwerp}</h3>
                  </div>
                  <StatusBadge tone={item.status === "Opgelost" ? "good" : "soft"}>{item.status}</StatusBadge>
                </summary>
                <div className="collapsible-card__body">
                  <p><LinkifiedText text={item.bericht} /></p>
                  {item.beheer_reactie ? (
                    <aside className="related-box">
                      <strong>Reactie van beheer</strong>
                      <span><LinkifiedText text={item.beheer_reactie} /></span>
                    </aside>
                  ) : (
                    <p className="muted">Er is nog geen reactie geplaatst.</p>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </article>

      <article className="item-card">
        <div className="item-card__header">
          <div>
            <p className="chip">Notificaties</p>
            <h2>Pushmeldingen</h2>
          </div>
          <StatusBadge tone={pushStatus === "enabled" ? "good" : pushStatus === "denied" || pushStatus === "unsupported" ? "warning" : "soft"}>
            {pushStatus === "checking"
              ? "Controleren"
              : pushStatus === "enabled"
                ? "Aan op dit apparaat"
                : pushStatus === "denied"
                  ? "Niet toegestaan"
                  : pushStatus === "unsupported"
                    ? "Niet beschikbaar"
                    : "Niet ingesteld"}
          </StatusBadge>
        </div>
        <p>Kies welke pushmeldingen je wilt ontvangen. Standaard staan alleen persoonlijke meldingen en belangrijke gebouwmeldingen aan.</p>
        <p className="muted">
          {pushStatus === "denied"
            ? "Meldingen zijn geweigerd in je browser of telefooninstellingen. Zet ze daar eerst weer aan."
            : "Op iPhone werken pushmeldingen alleen wanneer je Mijn Graaf van Schuyt toevoegt aan je beginscherm en meldingen toestaat."}
        </p>
        <div className="settings-list">
          <PreferenceToggle
            label="Persoonlijke meldingen"
            description="Voor terugkoppeling die direct voor jou bedoeld is, zoals een reactie op jouw oproep of prikbordbericht, een statuswijziging van jouw melding, feedback van beheer of een goedgekeurde kennisbanktip."
            checked={preference.personal_notifications}
            onChange={(checked) => updatePreference({ personal_notifications: checked })}
          />
          <PreferenceToggle
            label="Belangrijke gebouwmeldingen"
            description="Voor mededelingen van beheer die belangrijk of urgent zijn voor het gebouw, zoals glazenwasser, garageschoonmaak, fietsencontrole of een urgente situatie."
            checked={preference.building_notifications}
            onChange={(checked) => updatePreference({ building_notifications: checked })}
          />
          <PreferenceToggle
            label="Nieuwe berichten van buren"
            description="Voor nieuwe oproepen en prikbordberichten van buren. Deze staat standaard uit, zodat de app rustig blijft."
            checked={preference.neighbor_notifications}
            onChange={(checked) => updatePreference({ neighbor_notifications: checked })}
          />
        </div>
        <div className="action-row">
          <button className="button button--soft" disabled={!pushSupported() || pushStatus === "denied"} onClick={enablePush} type="button">Pushmeldingen toestaan</button>
          <button className="button button--soft" disabled={pushStatus !== "enabled"} onClick={disablePush} type="button">Uitzetten op dit apparaat</button>
          <button className="button button--soft" onClick={sendTestPush} type="button">Testmelding sturen</button>
        </div>
        {pushMessage && <p className="muted">{pushMessage}</p>}
      </article>

      {configured && (
        <article className="item-card account-delete-card">
          <div className="item-card__header">
            <div>
              <p className="chip">Account</p>
              <h2>Account verwijderen</h2>
            </div>
            <StatusBadge tone="warning">Let op</StatusBadge>
          </div>
          <p>Wil je de app niet meer gebruiken, dan kun je je account volledig verwijderen.</p>
          <p className="muted">Je naam, huisnummer en profielfoto worden dan niet meer getoond. Berichten die handig zijn voor bewoners kunnen blijven staan onder de naam Bewoner.</p>
          <button className="button button--danger" onClick={handleDeleteAccount} type="button">
            <Trash2 aria-hidden="true" size={18} /> Account verwijderen
          </button>
          {accountMessage && <p className="muted">{accountMessage}</p>}
        </article>
      )}
    </section>
  );
}

function PreferenceToggle({ checked, description, label, onChange }: { checked: boolean; description: string; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="toggle-row">
      <span className="toggle-row__copy">
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
    </label>
  );
}
