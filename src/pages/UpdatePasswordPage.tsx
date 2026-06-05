import { FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { friendlyErrorMessage } from "../lib/friendlyErrors";

export function UpdatePasswordPage() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (password.length < 8) {
        setError("Kies een wachtwoord van minimaal 8 tekens.");
        return;
      }
      if (password !== repeatPassword) {
        setError("De twee wachtwoorden zijn niet gelijk. Controleer je invoer.");
        return;
      }
      await updatePassword(password);
      setMessage("Je wachtwoord is aangepast. Je kunt de app nu weer gebruiken.");
      setPassword("");
      setRepeatPassword("");
    } catch (caught) {
      setError(friendlyErrorMessage(caught, "Het wachtwoord kon niet worden aangepast. Probeer de link uit de mail opnieuw."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-card__header">
          <p className="eyebrow">Graaf van Schuyt</p>
          <h1>Nieuw wachtwoord instellen</h1>
          <p>Kies een nieuw wachtwoord van minimaal 8 tekens.</p>
        </div>
        <form className="form-panel auth-form" onSubmit={submit}>
          <label className="field">
            <span>Nieuw wachtwoord</span>
            <input autoComplete="new-password" minLength={8} onChange={(event) => setPassword(event.target.value)} placeholder="Nieuw wachtwoord" required type="password" value={password} />
          </label>
          <label className="field">
            <span>Herhaal nieuw wachtwoord</span>
            <input autoComplete="new-password" minLength={8} onChange={(event) => setRepeatPassword(event.target.value)} placeholder="Herhaal nieuw wachtwoord" required type="password" value={repeatPassword} />
          </label>
          {error && <p className="form-message form-message--error">{error}</p>}
          {message && <p className="form-message">{message}</p>}
          <button className="button button--full" disabled={busy} type="submit">
            <KeyRound aria-hidden="true" size={18} /> {busy ? "Even geduld" : "Wachtwoord opslaan"}
          </button>
        </form>
      </section>
    </main>
  );
}
