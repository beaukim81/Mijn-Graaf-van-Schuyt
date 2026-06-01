import { FormEvent, useState } from "react";
import { KeyRound, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "../lib/AuthContext";

export function AuthPage() {
  const { resetPassword, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        const response = await signUp({ email, password, firstName, lastName, houseNumber });
        setMessage(response);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Er ging iets mis. Probeer het nog een keer.");
    } finally {
      setBusy(false);
    }
  }

  async function requestPasswordReset() {
    if (!email) {
      setError("Vul eerst je e-mailadres in.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");

    try {
      await resetPassword(email);
      setMessage("We hebben een e-mail gestuurd waarmee je een nieuw wachtwoord kunt instellen.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Er ging iets mis. Probeer het nog een keer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-card__header">
          <p className="eyebrow">Appartementencomplex</p>
          <h1>Mijn Graaf van Schuyt</h1>
          <p>Log in om meldingen, hulpvragen en berichten veilig aan bewoners te koppelen.</p>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Account">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">
            <LogIn aria-hidden="true" size={18} /> Inloggen
          </button>
          <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")} type="button">
            <UserPlus aria-hidden="true" size={18} /> Account maken
          </button>
        </div>

        <form className="form-panel auth-form" onSubmit={submit}>
          {mode === "signup" && (
            <>
              <input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Voornaam" required />
              <input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Achternaam optioneel" />
              <input value={houseNumber} onChange={(event) => setHouseNumber(event.target.value)} placeholder="Huisnummer" required />
            </>
          )}
          <input autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-mailadres" required type="email" />
          <input
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Wachtwoord"
            required
            type="password"
          />
          {mode === "signup" && <p className="muted">Kies een wachtwoord van minimaal 8 tekens.</p>}
          {error && <p className="form-message form-message--error">{error}</p>}
          {message && <p className="form-message">{message}</p>}
          <button className="button button--full" disabled={busy} type="submit">
            <KeyRound aria-hidden="true" size={18} /> {busy ? "Even geduld" : mode === "login" ? "Inloggen" : "Account maken"}
          </button>
          {mode === "login" && (
            <button className="button button--soft button--full" disabled={busy} onClick={requestPasswordReset} type="button">
              Wachtwoord vergeten?
            </button>
          )}
        </form>
      </section>
    </main>
  );
}
