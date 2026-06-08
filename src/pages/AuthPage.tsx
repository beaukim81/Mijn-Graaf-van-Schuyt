import { FormEvent, useState } from "react";
import { KeyRound, LogIn, ShieldAlert, UserPlus } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { friendlyErrorMessage } from "../lib/friendlyErrors";
import { isValidHouseNumber } from "../lib/floorForHouseNumber";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

const blockedLoginMessageKey = "mijn-graaf-van-schuyt:blocked-login-message";

function readBlockedLoginMessage() {
  if (typeof window === "undefined") return "";
  const message = window.sessionStorage.getItem(blockedLoginMessageKey) ?? "";
  if (message) window.sessionStorage.removeItem(blockedLoginMessageKey);
  return message;
}

export function AuthPage() {
  const { requestAccess, resetPassword, signIn } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(() => readBlockedLoginMessage());
  const [busy, setBusy] = useState(false);
  const [accessRequested, setAccessRequested] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState("");
  const [blockedSupportEmail, setBlockedSupportEmail] = useState("");
  const [blockedSupportOpen, setBlockedSupportOpen] = useState(false);
  const [blockedSupportSent, setBlockedSupportSent] = useState(false);

  const isBlockedLogin = error.toLowerCase().includes("tijdelijk geblokkeerd");

  function switchMode(nextMode: "login" | "signup" | "forgot") {
    setMode(nextMode);
    setError("");
    setMessage("");
    setAccessRequested(false);
    setBlockedMessage("");
    setBlockedSupportEmail("");
    setBlockedSupportOpen(false);
    setBlockedSupportSent(false);
    if (nextMode === "forgot" && !resetEmail) setResetEmail(email);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (mode === "login") {
        await signIn(email, password);
        window.location.replace("/");
      } else {
        if (!isValidHouseNumber(houseNumber)) {
          setError("Dit huisnummer bestaat niet in Graaf van Schuyt. Vul een bestaand oneven huisnummer in.");
          return;
        }
        const response = await requestAccess({ email, firstName, lastName, houseNumber });
        setMessage(response);
        setAccessRequested(true);
      }
    } catch (caught) {
      const friendlyMessage = friendlyErrorMessage(caught, "Inloggen of account maken lukt nu niet. Controleer je gegevens en probeer het opnieuw.");
      setError(friendlyMessage);
      setBlockedSupportSent(false);
      if (friendlyMessage.includes("staat nog in behandeling")) setAccessRequested(true);
    } finally {
      setBusy(false);
    }
  }

  async function sendBlockedAccountMessage() {
    const supportEmail = blockedSupportEmail.trim().toLowerCase();
    if (!supportEmail) {
      setError("Vul je e-mailadres in bij het bericht aan beheer.");
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setError("Je bericht kan nu niet worden verstuurd. Neem contact op met beheer.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error: insertError } = await supabase.from("security_events").insert({
        type: "email_wijziging_niet_herkend",
        status: "Nieuw",
        email: supportEmail,
        bericht: `Geblokkeerde bewoner vraagt om contact met beheer. E-mailadres: ${supportEmail}. Bericht: ${blockedMessage.trim() || "Geen extra toelichting ingevuld."}`,
      });
      if (insertError) throw insertError;
      setBlockedSupportSent(true);
      setBlockedSupportOpen(false);
      setBlockedMessage("");
      setBlockedSupportEmail("");
      setMessage("Je bericht is verstuurd naar beheer. Beheer kan je account controleren.");
    } catch (caught) {
      setError(friendlyErrorMessage(caught, "Je bericht versturen lukt nu niet. Probeer het later opnieuw of neem contact op met beheer."));
    } finally {
      setBusy(false);
    }
  }

  async function requestPasswordReset() {
    if (!resetEmail) {
      setError("Vul eerst je e-mailadres in.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");

    try {
      await resetPassword(resetEmail);
      setMessage(
        "We hebben een e-mail gestuurd waarmee je een nieuw wachtwoord kunt instellen. Kijk ook in spam of ongewenste mail als je niets ziet.",
      );
    } catch (caught) {
      setError(friendlyErrorMessage(caught, "De herstelmail versturen lukt nu niet. Controleer je e-mailadres en probeer het opnieuw."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-card__header">
          <p className="eyebrow">Graaf van Schuyt</p>
          <h1>{mode === "forgot" ? "Wachtwoord vergeten" : "Inloggen of toegang aanvragen"}</h1>
        </div>

        {mode !== "forgot" ? (
          <div className="auth-tabs" role="tablist" aria-label="Account">
          <button className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")} type="button">
            <LogIn aria-hidden="true" size={18} /> Inloggen
          </button>
          <button className={mode === "signup" ? "active" : ""} onClick={() => switchMode("signup")} type="button">
            <UserPlus aria-hidden="true" size={18} /> Toegang aanvragen
          </button>
          </div>
        ) : null}

        {mode === "forgot" ? (
          <form className="form-panel auth-form" onSubmit={(event) => { event.preventDefault(); void requestPasswordReset(); }}>
            <p className="muted">
              Vul het e-mailadres van je account in. Je ontvangt een mail waarmee je een nieuw wachtwoord kunt instellen.
              Kijk ook in spam of ongewenste mail.
            </p>
            <label className="field">
              <span>E-mailadres</span>
              <input autoComplete="email" inputMode="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} placeholder="naam@voorbeeld.nl" required type="email" />
            </label>
            {error && <p className="form-message form-message--error">{error}</p>}
            {message && <p className="form-message">{message}</p>}
            <button className="button button--full" disabled={busy} type="submit">
              <KeyRound aria-hidden="true" size={18} /> {busy ? "Even geduld" : "Herstelmail versturen"}
            </button>
            <button className="button button--soft button--full" disabled={busy} onClick={() => switchMode("login")} type="button">
              Terug naar inloggen
            </button>
          </form>
        ) : (
          <form className="form-panel auth-form" onSubmit={submit}>
          {mode === "signup" && (
            <>
              <label className="field">
                <span>Voornaam</span>
                <input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Voornaam" required />
              </label>
              <label className="field">
                <span>Achternaam optioneel</span>
                <input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Achternaam" />
              </label>
              <label className="field">
                <span>Huisnummer</span>
                <input inputMode="numeric" value={houseNumber} onChange={(event) => setHouseNumber(event.target.value)} placeholder="Huisnummer" required />
              </label>
            </>
          )}
          <label className="field">
            <span>E-mailadres</span>
            <input autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="naam@voorbeeld.nl" required type="email" />
          </label>
          {mode === "login" && (
            <label className="field">
              <span>Wachtwoord</span>
              <input
                autoComplete="current-password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Wachtwoord"
                required
                type="password"
              />
            </label>
          )}
          {mode === "signup" ? (
            <p className="muted">
              Na je aanvraag controleert beheer of je bewoner bent. Daarna krijg je een e-mail van Graaf van Schuyt om
              je account te activeren en zelf een wachtwoord in te stellen. Kijk ook in spam of ongewenste mail.
            </p>
          ) : (
            <p className="muted">Log in met je e-mailadres en wachtwoord.</p>
          )}
          {error && <p className="form-message form-message--error">{error}</p>}
          {mode === "login" && isBlockedLogin && !blockedSupportSent && (
            <div className="notice notice--warning">
              <ShieldAlert aria-hidden="true" size={22} />
              <div>
                <p>Wil je beheer hierover een bericht sturen?</p>
                {!blockedSupportOpen ? (
                  <button
                    className="button button--soft button--full"
                    disabled={busy}
                    onClick={() => {
                      setBlockedSupportEmail(email);
                      setBlockedSupportOpen(true);
                    }}
                    type="button"
                  >
                    Bericht aan beheer sturen
                  </button>
                ) : (
                  <div className="page-stack page-stack--small">
                    <label className="field">
                      <span>E-mailadres</span>
                      <input
                        autoComplete="email"
                        inputMode="email"
                        onChange={(event) => setBlockedSupportEmail(event.target.value)}
                        placeholder="naam@voorbeeld.nl"
                        required
                        type="email"
                        value={blockedSupportEmail}
                      />
                    </label>
                    <label className="field">
                      <span>Bericht aan beheer optioneel</span>
                      <textarea
                        onChange={(event) => setBlockedMessage(event.target.value)}
                        placeholder="Typ hier kort wat er aan de hand is..."
                        value={blockedMessage}
                      />
                    </label>
                    <button className="button button--full" disabled={busy || !blockedSupportEmail.trim()} onClick={() => void sendBlockedAccountMessage()} type="button">
                      {busy ? "Bezig met versturen" : "Verstuur naar beheer"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          {message && <p className="form-message">{message}</p>}
          <button className="button button--full" disabled={busy || (mode === "signup" && accessRequested)} type="submit">
            <KeyRound aria-hidden="true" size={18} />{" "}
            {busy
              ? "Even geduld"
              : mode === "login"
                ? "Inloggen"
                : accessRequested
                  ? "Aanvraag verstuurd"
                  : "Toegang aanvragen"}
          </button>
          {mode === "login" && (
            <button className="button button--soft button--full" disabled={busy} onClick={() => switchMode("forgot")} type="button">
              Wachtwoord vergeten?
            </button>
          )}
          </form>
        )}
      </section>
    </main>
  );
}
