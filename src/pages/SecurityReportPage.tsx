import { useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { friendlyErrorMessage } from "../lib/friendlyErrors";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export function SecurityReportPage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const email = params.get("email") ?? "";
  const nieuweEmail = params.get("nieuwe_email") ?? params.get("new_email") ?? "";
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function reportNotMe() {
    if (!isSupabaseConfigured || !supabase) {
      setError("De melding kan nu niet worden verstuurd. Neem contact op met beheer.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      const { error: insertError } = await supabase.from("security_events").insert({
        type: "email_wijziging_niet_herkend",
        status: "Nieuw",
        email: email || null,
        nieuwe_email: nieuweEmail || null,
        bericht: `E-mailadreswijziging niet herkend. Oud e-mailadres: ${email || "onbekend"}. Nieuw e-mailadres: ${nieuweEmail || "onbekend"}.`,
      });
      if (insertError) throw insertError;
      setMessage("Dank je. Beheer heeft een veiligheidsmelding ontvangen en kan je account controleren.");
    } catch (caught) {
      setError(friendlyErrorMessage(caught, "De veiligheidsmelding versturen lukt nu niet. Probeer het later opnieuw of neem contact op met beheer."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-card__header">
          <p className="eyebrow">Graaf van Schuyt</p>
          <h1>E-mailadreswijziging controleren</h1>
          <p>Gebruik deze pagina alleen als jij geen wijziging van je e-mailadres hebt aangevraagd.</p>
        </div>
        <div className="notice notice--warning">
          <ShieldAlert aria-hidden="true" size={22} />
          <p>Als je dit meldt, krijgt beheer een seintje om je account te controleren. Beheer kan het account tijdelijk blokkeren als dat nodig is.</p>
        </div>
        {email && <p className="muted">Oud e-mailadres: {email}</p>}
        {nieuweEmail && <p className="muted">Nieuw e-mailadres: {nieuweEmail}</p>}
        {message ? (
          <p className="form-message">{message}</p>
        ) : (
          <button className="button button--full" disabled={busy} onClick={reportNotMe} type="button">
            {busy ? "Bezig met melden" : "Dit was ik niet"}
          </button>
        )}
        {error && <p className="form-message form-message--error">{error}</p>}
      </section>
    </main>
  );
}
