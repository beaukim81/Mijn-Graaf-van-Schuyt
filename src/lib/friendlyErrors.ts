export function friendlyErrorMessage(error: unknown, fallback = "Er ging iets mis. Probeer het nog een keer.") {
  const message = rawErrorMessage(error).toLowerCase();

  if (!message) return fallback;

  if (message.includes("invalid login credentials") || message.includes("invalid credentials")) {
    return "E-mailadres of wachtwoord klopt niet. Controleer je gegevens of kies Wachtwoord vergeten.";
  }

  if (message.includes("email not confirmed") || message.includes("not confirmed")) {
    return "Je account is nog niet bevestigd. Open de bevestigingsmail en kijk ook in spam of ongewenste mail.";
  }

  if (message.includes("user already registered") || message.includes("already registered") || message.includes("already exists")) {
    return "Er bestaat al een account met dit e-mailadres. Log in of kies Wachtwoord vergeten.";
  }

  if (message.includes("password") && (message.includes("weak") || message.includes("short") || message.includes("at least"))) {
    return "Kies een sterker wachtwoord van minimaal 8 tekens.";
  }

  if (message.includes("invalid email") || message.includes("email address is invalid")) {
    return "Vul een geldig e-mailadres in.";
  }

  if (message.includes("rate limit") || message.includes("too many") || message.includes("email rate limit")) {
    return "Er zijn te veel pogingen kort achter elkaar gedaan. Wacht even en probeer het daarna opnieuw.";
  }

  if (message.includes("refresh token") || message.includes("jwt") || message.includes("session")) {
    return "Je bent te lang niet actief geweest. Log opnieuw in en probeer het nog een keer.";
  }

  if (
    message.includes("row-level security") ||
    message.includes("violates row-level security") ||
    message.includes("permission denied") ||
    message.includes("not allowed") ||
    message.includes("unauthorized") ||
    message.includes("403")
  ) {
    return "Je hebt hiervoor geen toestemming. Log opnieuw in of vraag de beheerder om hulp.";
  }

  if (message.includes("schema cache") || message.includes("could not find") || message.includes("column")) {
    return "Deze functie is nog niet helemaal goed gekoppeld. Geef dit door aan de beheerder.";
  }

  if (message.includes("duplicate key")) {
    return "Dit lijkt al te bestaan. Vernieuw de pagina en controleer of het al is opgeslagen.";
  }

  if (message.includes("failed to fetch") || message.includes("network") || message.includes("failed to send a request")) {
    return "Er is geen goede verbinding met de app. Controleer je internet en probeer het opnieuw.";
  }

  if (message.includes("quotaexceeded") || message.includes("exceeded the quota")) {
    return "De app kan tijdelijk geen gegevens bewaren op dit apparaat. Vernieuw de pagina en probeer het opnieuw.";
  }

  if (message.includes("push") || message.includes("notification") || message.includes("melding")) {
    return "Meldingen instellen lukt nu niet. Controleer of meldingen in je browser zijn toegestaan en probeer het opnieuw.";
  }

  return fallback;
}

export function rawErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) return String(error.message);
  if (typeof error === "string") return error;
  return "";
}
