import { Bell, BookOpen, ClipboardList, HandHeart, Home, Megaphone, MessageSquareText, Phone, Settings, Trash2, UserRound, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAppData } from "../lib/AppDataContext";
import { residentLabel } from "../lib/residentDisplay";
import { useSignedUrl } from "../lib/storageUrls";
import { paths } from "../routes/paths";
import type { FeedbackItem } from "../types";

const navItems = [
  { to: paths.home, label: "Home", icon: Home },
  { to: paths.contacts, label: "Contacten", icon: Phone },
  { to: paths.reports, label: "Meldingen", icon: ClipboardList },
  { to: paths.knowledge, label: "Kennisbank", icon: BookOpen },
  { to: paths.help, label: "Oproepen", icon: HandHeart },
  { to: paths.bulletin, label: "Prikbord", icon: Megaphone },
];

type TextSize = "normal" | "large" | "xlarge";
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};
type InstallPromptState = { dismissedForever?: boolean; lastShown?: number };

const textSizeOptions: { value: TextSize; label: string }[] = [
  { value: "normal", label: "Normaal" },
  { value: "large", label: "Groot" },
  { value: "xlarge", label: "Extra groot" },
];

function readNumber(key: string) {
  const stored = window.localStorage.getItem(key);
  return stored ? Number(stored) : 0;
}

function readTextSize(key: string): TextSize {
  const stored = window.localStorage.getItem(key);
  return stored === "large" || stored === "xlarge" ? stored : "normal";
}

function readDismissed(key: string) {
  const stored = window.localStorage.getItem(key);
  return new Set(stored ? (JSON.parse(stored) as string[]) : []);
}

function readStringSet(key: string) {
  const stored = window.localStorage.getItem(key);
  return new Set(stored ? (JSON.parse(stored) as string[]) : []);
}

function isStandaloneApp() {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

function isIOSDevice() {
  const platform = window.navigator.platform.toLowerCase();
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent) || (platform === "macintel" && window.navigator.maxTouchPoints > 1);
}

function isFormElementActive() {
  const activeElement = document.activeElement;
  if (!activeElement) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(activeElement.tagName);
}

function readInstallPromptState(key: string) {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as InstallPromptState) : {};
  } catch {
    return {};
  }
}

function writeInstallPromptState(key: string, state: InstallPromptState) {
  window.localStorage.setItem(key, JSON.stringify(state));
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { accessRequests, buildingAnnouncements, bulletinPosts, documents, feedbackItems, helpRequests, profile, profiles, reports, securityEvents } = useAppData();
  const isHome = location.pathname === paths.home;
  const isAdmin = profile.rol === "admin";
  const helpSeenKey = `mijn-graaf-van-schuyt:${profile.user_id}:seen-help`;
  const bulletinSeenKey = `mijn-graaf-van-schuyt:${profile.user_id}:seen-bulletin`;
  const dismissedKey = `mijn-graaf-van-schuyt:${profile.user_id}:dismissed-notifications`;
  const readNotificationsKey = `mijn-graaf-van-schuyt:${profile.user_id}:read-notifications`;
  const textSizeKey = `mijn-graaf-van-schuyt:${profile.user_id}:text-size`;
  const installPromptKey = `mijn-graaf-van-schuyt:${profile.user_id}:install-prompt`;
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const accessibilityMenuRef = useRef<HTMLDivElement>(null);
  const [lastSeenHelp, setLastSeenHelp] = useState(() => readNumber(helpSeenKey));
  const [lastSeenBulletin, setLastSeenBulletin] = useState(() => readNumber(bulletinSeenKey));
  const [dismissedNotifications, setDismissedNotifications] = useState(() => readDismissed(dismissedKey));
  const [readNotifications, setReadNotifications] = useState(() => readStringSet(readNotificationsKey));
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState({ onderwerp: "", bericht: "" });
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [textSize, setTextSize] = useState<TextSize>(() => readTextSize(textSizeKey));
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const isIOS = useMemo(isIOSDevice, []);
  const hasNativeInstallPrompt = Boolean(installPromptEvent);
  const profilePhotoUrl = useSignedUrl(profile.profielfoto_url);
  const profilesByUserId = useMemo(() => new Map(profiles.items.map((item) => [item.user_id, item])), [profiles.items]);
  const residentNotificationLabel = useCallback((userId: string, name?: string, houseNumber?: string) => {
    const linkedProfile = profilesByUserId.get(userId);
    if (!linkedProfile) return userId ? residentLabel(name, houseNumber) : "Bewoner";
    return residentLabel(linkedProfile.naam_of_bijnaam ?? name, linkedProfile.huisnummer ?? houseNumber, linkedProfile.achternaam);
  }, [profilesByUserId]);

  useEffect(() => {
    document.documentElement.dataset.textSize = textSize;
    window.localStorage.setItem(textSizeKey, textSize);
  }, [textSize, textSizeKey]);

  useEffect(() => {
    const currentHash = location.hash.replace("#", "");
    setShowNotifications(false);
    setShowAccessibility(false);
    setShowFeedback(false);
    if (!currentHash) return;
    window.setTimeout(() => {
      document.getElementById(currentHash)?.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 80);
  }, [location]);

  useEffect(() => {
    const now = Date.now();
    if (location.pathname === paths.help) {
      window.localStorage.setItem(helpSeenKey, String(now));
      setLastSeenHelp(now);
    }
    if (location.pathname === paths.bulletin) {
      window.localStorage.setItem(bulletinSeenKey, String(now));
      setLastSeenBulletin(now);
    }
  }, [bulletinPosts.items.length, helpRequests.items.length, bulletinSeenKey, helpSeenKey, location.pathname]);

  useEffect(() => {
    function closeMenusOnOutsideClick(event: PointerEvent) {
      const target = event.target as Node;
      if (notificationMenuRef.current?.contains(target) || accessibilityMenuRef.current?.contains(target)) return;
      setShowNotifications(false);
      setShowAccessibility(false);
    }

    document.addEventListener("pointerdown", closeMenusOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeMenusOnOutsideClick);
  }, []);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (isStandaloneApp()) return;
    const state = readInstallPromptState(installPromptKey);
    if (state.dismissedForever) return;
    if (state.lastShown && Date.now() - state.lastShown < 24 * 60 * 60 * 1000) return;

    const timer = window.setTimeout(() => {
      if (isFormElementActive()) return;
      setShowInstallPrompt(true);
      writeInstallPromptState(installPromptKey, { ...state, lastShown: Date.now() });
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [installPromptEvent, installPromptKey, isIOS, location.pathname]);

  useEffect(() => {
    if (!showInstallPrompt) return;
    if (isFormElementActive()) setShowInstallPrompt(false);
  }, [location.pathname, showInstallPrompt]);

  const navNotifications = useMemo(
    () => ({
      [paths.help]: helpRequests.items.filter((request) => Date.parse(request.aangemaakt_op) > lastSeenHelp).length,
      [paths.bulletin]: bulletinPosts.items.filter((post) => Date.parse(post.aangemaakt_op) > lastSeenBulletin).length,
    }),
    [bulletinPosts.items, helpRequests.items, lastSeenBulletin, lastSeenHelp],
  );

  const personalNotifications = useMemo(() => {
    const buildingNotifications = buildingAnnouncements.items
      .filter((announcement) => announcement.importance !== "normaal")
      .map((announcement) => ({
        id: `building-${announcement.id}-${announcement.updated_at}`,
        date: Date.parse(announcement.updated_at) || Date.parse(announcement.event_date ?? "") || 0,
        title: `Algemene mededeling: ${announcement.titel}`,
        description: announcement.inhoud,
        to: paths.home,
      }));

    const helpNotifications = helpRequests.items.flatMap((request) => {
      if (request.aangemaakt_door !== profile.user_id) return [];
      return request.messages
        .filter((message) => message.author_id !== profile.user_id)
        .map((message) => ({
          id: `help-${request.id}-${message.id}`,
          date: Date.parse(message.aangemaakt_op) || 0,
          title: `Reactie op ${request.titel}`,
          description: `${residentNotificationLabel(message.author_id, message.author_name, message.author_house_number)}: ${message.message}`,
          to: `${paths.help}#hulp-${request.id}`,
        }));
    });

    const bulletinNotifications = bulletinPosts.items.flatMap((post) => {
      if (post.aangemaakt_door !== profile.user_id) return [];
      return (post.messages ?? [])
        .filter((message) => message.author_id !== profile.user_id)
        .map((message) => ({
          id: `bulletin-${post.id}-${message.id}`,
          date: Date.parse(message.aangemaakt_op) || 0,
          title: `Reactie op ${post.titel}`,
          description: `${residentNotificationLabel(message.author_id, message.author_name, message.author_house_number)}: ${message.message}`,
          to: `${paths.bulletin}#prikbord-${post.id}`,
        }));
    });

    const feedbackNotifications = feedbackItems.items
      .filter((item) => item.aangemaakt_door === profile.user_id && (item.beheer_reactie || item.status === "Opgelost"))
      .map((item) => ({
        id: `feedback-${item.id}-${item.updated_at}`,
        date: Date.parse(item.updated_at) || Date.parse(item.created_at) || 0,
        title: item.status === "Opgelost" ? `Feedback opgelost: ${item.onderwerp}` : `Reactie op je feedback: ${item.onderwerp}`,
        description: item.beheer_reactie || "Beheer heeft je feedback gemarkeerd als opgelost.",
        to: `${paths.profile}#feedback-${item.id}`,
      }));

    const adminNotifications = isAdmin
      ? [
          ...feedbackItems.items
            .filter((item) => item.status !== "Opgelost")
            .map((item) => ({
              id: `admin-feedback-${item.id}-${item.created_at}`,
              date: Date.parse(item.created_at) || 0,
              title: `Nieuwe feedback: ${item.onderwerp}`,
              description: item.bericht,
              to: `${paths.admin}#feedback-${item.id}`,
            })),
          ...documents.items
            .filter((document) => document.status !== "Gepubliceerd")
            .map((document) => ({
              id: `admin-knowledge-${document.id}-${document.aangemaakt_op}`,
              date: Date.parse(document.aangemaakt_op) || Date.parse(document.bijgewerkt_op) || 0,
              title: `Nieuw kennisbankitem: ${document.titel}`,
              description: `${document.documenttype} in ${document.categorie}`,
              to: `${paths.admin}#kennisbank-${document.id}`,
            })),
          ...reports.items
            .filter((report) => report.type_melding === "Appartementencomplex" && report.status !== "Opgelost")
            .map((report) => ({
              id: `admin-report-${report.id}-${report.aangemaakt_op}`,
              date: Date.parse(report.aangemaakt_op) || 0,
              title: `Nieuwe complexmelding: ${report.titel}`,
              description: `${report.categorie}${report.locatie_in_gebouw ? ` - ${report.locatie_in_gebouw}` : ""}`,
              to: `${paths.admin}#melding-${report.id}`,
            })),
          ...accessRequests.items
            .filter((request) => request.status === "Nieuw")
            .map((request) => ({
              id: `admin-access-${request.id}-${request.created_at}`,
              date: Date.parse(request.created_at) || 0,
              title: `Nieuwe toegangsaanvraag: ${residentLabel(request.naam_of_bijnaam, request.huisnummer)}`,
              description: request.email,
              to: `${paths.admin}#aanvraag-${request.id}`,
            })),
          ...securityEvents.items
            .filter((event) => event.status !== "Opgelost")
            .map((event) => ({
              id: `admin-security-${event.id}-${event.created_at}-${event.status}`,
              date: Date.parse(event.created_at) || 0,
              title: "Nieuwe veiligheidsmelding",
              description: event.bericht,
              to: `${paths.admin}#veiligheid-${event.id}`,
            })),
        ]
      : [];

    return [...buildingNotifications, ...helpNotifications, ...bulletinNotifications, ...feedbackNotifications, ...adminNotifications]
      .filter((notification) => !dismissedNotifications.has(notification.id))
      .sort((a, b) => b.date - a.date);
  }, [accessRequests.items, buildingAnnouncements.items, bulletinPosts.items, dismissedNotifications, documents.items, feedbackItems.items, helpRequests.items, isAdmin, profile.user_id, reports.items, residentNotificationLabel, securityEvents.items]);

  const unreadNotifications = useMemo(
    () => personalNotifications.filter((notification) => !readNotifications.has(notification.id)),
    [personalNotifications, readNotifications],
  );
  const unreadAdminNotifications = useMemo(
    () => unreadNotifications.filter((notification) => notification.id.startsWith("admin-")),
    [unreadNotifications],
  );

  const markNotificationsAsRead = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setReadNotifications((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.add(id));
      window.localStorage.setItem(readNotificationsKey, JSON.stringify([...next]));
      return next;
    });
  }, [readNotificationsKey]);

  function dismissNotification(id: string) {
    setDismissedNotifications((current) => {
      const next = new Set(current);
      next.add(id);
      window.localStorage.setItem(dismissedKey, JSON.stringify([...next]));
      return next;
    });
    markNotificationsAsRead([id]);
    setShowNotifications(false);
  }

  function sendFeedback() {
    const onderwerp = feedbackDraft.onderwerp.trim();
    const bericht = feedbackDraft.bericht.trim();
    if (!onderwerp || !bericht) {
      setFeedbackMessage("Vul een onderwerp en bericht in.");
      return;
    }

    const timestamp = new Date().toISOString();
    const item: FeedbackItem = {
      id: crypto.randomUUID(),
      onderwerp,
      bericht,
      status: "Nieuw",
      aangemaakt_door: profile.user_id,
      aangemaakt_door_naam: profile.naam_of_bijnaam,
      aangemaakt_door_huisnummer: profile.huisnummer,
      created_at: timestamp,
      updated_at: timestamp,
    };
    feedbackItems.add(item);
    setFeedbackDraft({ onderwerp: "", bericht: "" });
    setFeedbackMessage("Dank je, je feedback is verstuurd naar beheer.");
  }

  useEffect(() => {
    if (location.pathname !== paths.admin || unreadAdminNotifications.length === 0) return;
    markNotificationsAsRead(unreadAdminNotifications.map((notification) => notification.id));
  }, [location.pathname, markNotificationsAsRead, unreadAdminNotifications]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Graaf van Schuyt</p>
        </div>
        <div className="header-actions">
          <div className="accessibility-menu" ref={accessibilityMenuRef}>
            <button
              aria-label="Leesmodus"
              className={textSize === "normal" ? "icon-button reading-mode-button" : "icon-button reading-mode-button active"}
              onClick={() => {
                setShowNotifications(false);
                setShowAccessibility((current) => !current);
              }}
              title="Leesmodus"
              type="button"
            >
              <span aria-hidden="true" className="reading-mode-glyph">
                <small>A</small>
                <strong>A</strong>
              </span>
            </button>
            {showAccessibility && (
              <div className="accessibility-panel">
                <strong>Leesmodus</strong>
                <p className="muted">Maak tekst en knoppen groter voor comfortabeler lezen.</p>
                <label className="field">
                  <span>Tekstgrootte</span>
                  <select
                    value={textSize}
                    onChange={(event) => {
                      setTextSize(event.target.value as TextSize);
                      setShowAccessibility(false);
                    }}
                  >
                    {textSizeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>
          <button
            aria-label="Feedback doorgeven"
            className="icon-button feedback-button"
            onClick={() => {
              setShowAccessibility(false);
              setShowNotifications(false);
              setFeedbackMessage("");
              setShowFeedback(true);
            }}
            title="Feedback"
            type="button"
          >
            <MessageSquareText aria-hidden="true" />
          </button>
          <div className="notification-menu" ref={notificationMenuRef}>
            <button
              aria-label="Notificaties"
              className={unreadNotifications.length > 0 ? "icon-button notification-button has-notifications" : "icon-button notification-button"}
              onClick={() => {
                setShowAccessibility(false);
                setShowNotifications((current) => {
                  const next = !current;
                  if (next) markNotificationsAsRead(personalNotifications.map((notification) => notification.id));
                  return next;
                });
              }}
              type="button"
            >
              <Bell aria-hidden="true" />
              {unreadNotifications.length > 0 && <span className="notification-dot" />}
            </button>
            {showNotifications && (
              <div className="notification-panel">
                <strong>Notificaties</strong>
                {personalNotifications.length === 0 ? (
                  <p className="muted">Geen nieuwe persoonlijke meldingen.</p>
                ) : (
                  personalNotifications.map((notification) => (
                    <div className="notification-item" key={notification.id}>
                      <button
                        className="notification-link"
                        onClick={() => {
                          setShowNotifications(false);
                          navigate(notification.to);
                        }}
                        type="button"
                      >
                        <span>{notification.title}</span>
                        <small>{notification.description}</small>
                      </button>
                      <button
                        aria-label="Notificatie verwijderen"
                        className="text-button danger"
                        onClick={() => dismissNotification(notification.id)}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          {isAdmin && (
            <NavLink
              aria-label="Beheer"
              className={unreadAdminNotifications.length > 0 ? "icon-button admin-button has-notifications" : "icon-button admin-button"}
              onClick={() => {
                markNotificationsAsRead(unreadAdminNotifications.map((notification) => notification.id));
                setShowNotifications(false);
                setShowAccessibility(false);
              }}
              to={paths.admin}
            >
              <Settings aria-hidden="true" />
              {unreadAdminNotifications.length > 0 && <span className="notification-dot" />}
            </NavLink>
          )}
          <NavLink aria-label="Profiel" className="icon-button profile-button" onClick={() => { setShowNotifications(false); setShowAccessibility(false); }} to={paths.profile}>
            {profile.profielfoto_url ? <img alt="" className="header-profile-photo" src={profilePhotoUrl} /> : <UserRound aria-hidden="true" />}
          </NavLink>
        </div>
      </header>

      {!isHome && (
        <button className="back-button" onClick={() => navigate(-1)} type="button">
          Terug
        </button>
      )}

      <main className="app-main">
        <Outlet />
      </main>

      {showFeedback && (
        <div className="confirm-overlay" role="presentation">
          <section aria-modal="true" className="confirm-dialog feedback-dialog" role="dialog">
            <button aria-label="Feedback sluiten" className="dialog-close-button" onClick={() => setShowFeedback(false)} type="button">
              <X aria-hidden="true" size={18} />
            </button>
            <p className="eyebrow">Feedback</p>
            <h2>Feedback doorgeven</h2>
            <p>Geef door wat beter kan of wat niet prettig werkt. Beheer ziet je bericht in het beheerscherm.</p>
            <form className="page-stack page-stack--small" onSubmit={(event) => { event.preventDefault(); sendFeedback(); }}>
              <label className="field">
                <span>Onderwerp</span>
                <input
                  onChange={(event) => setFeedbackDraft({ ...feedbackDraft, onderwerp: event.target.value })}
                  placeholder="Waar gaat je feedback over?"
                  required
                  value={feedbackDraft.onderwerp}
                />
              </label>
              <label className="field">
                <span>Bericht</span>
                <textarea
                  onChange={(event) => setFeedbackDraft({ ...feedbackDraft, bericht: event.target.value })}
                  placeholder="Wat wil je meegeven?"
                  required
                  value={feedbackDraft.bericht}
                />
              </label>
              {feedbackMessage && <p className="form-message">{feedbackMessage}</p>}
              <button className="button button--full" type="submit">Versturen</button>
            </form>
          </section>
        </div>
      )}

      {showInstallPrompt && (
        <section className="install-prompt" aria-live="polite">
          <div>
            <strong>Gebruik deze app makkelijker vanaf je beginscherm</strong>
            <p>
              {isIOS
                ? "Tik onderaan op Delen en kies daarna 'Zet op beginscherm'."
                : hasNativeInstallPrompt
                  ? "Zet Mijn Graaf van Schuyt op je telefoon, zodat je de app sneller opent en meldingen beter werken."
                  : "Open het browsermenu en kies 'App installeren' of 'Toevoegen aan beginscherm'."}
            </p>
          </div>
          <div className="install-prompt__actions">
            {!isIOS && installPromptEvent && (
              <button
                className="button"
                onClick={async () => {
                  await installPromptEvent.prompt();
                  const choice = await installPromptEvent.userChoice;
                  setInstallPromptEvent(null);
                  setShowInstallPrompt(false);
                  writeInstallPromptState(installPromptKey, { dismissedForever: choice.outcome === "accepted", lastShown: Date.now() });
                }}
                type="button"
              >
                App installeren
              </button>
            )}
            <button
              className="button button--soft"
              onClick={() => {
                setShowInstallPrompt(false);
                writeInstallPromptState(installPromptKey, { lastShown: Date.now() });
              }}
              type="button"
            >
              Later
            </button>
            <button
              className="text-button"
              onClick={() => {
                setShowInstallPrompt(false);
                writeInstallPromptState(installPromptKey, { dismissedForever: true, lastShown: Date.now() });
              }}
              type="button"
            >
              Niet meer tonen
            </button>
          </div>
        </section>
      )}

      <nav className="bottom-nav" aria-label="Hoofdnavigatie">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink to={to} key={to} className={({ isActive }) => (isActive ? "bottom-nav__item active" : "bottom-nav__item")} end={to === paths.home}>
            <span className="bottom-nav__icon">
              <Icon aria-hidden="true" size={20} />
              {(navNotifications[to] ?? 0) > 0 && <span className="nav-dot" />}
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

