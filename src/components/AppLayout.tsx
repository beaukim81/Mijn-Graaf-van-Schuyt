import { Bell, BookOpen, ClipboardList, HandHeart, Home, Megaphone, Phone, Settings, Trash2, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAppData } from "../lib/AppDataContext";
import { paths } from "../routes/paths";

const navItems = [
  { to: paths.home, label: "Home", icon: Home },
  { to: paths.contacts, label: "Contacten", icon: Phone },
  { to: paths.reports, label: "Meldingen", icon: ClipboardList },
  { to: paths.knowledge, label: "Kennisbank", icon: BookOpen },
  { to: paths.help, label: "Hulp", icon: HandHeart },
  { to: paths.bulletin, label: "Prikbord", icon: Megaphone },
];

type TextSize = "normal" | "large" | "xlarge";

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

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { bulletinPosts, helpRequests, profile } = useAppData();
  const isHome = location.pathname === paths.home;
  const isAdmin = profile.rol === "admin";
  const helpSeenKey = `mijn-graaf-van-schuyt:${profile.user_id}:seen-help`;
  const bulletinSeenKey = `mijn-graaf-van-schuyt:${profile.user_id}:seen-bulletin`;
  const dismissedKey = `mijn-graaf-van-schuyt:${profile.user_id}:dismissed-notifications`;
  const textSizeKey = `mijn-graaf-van-schuyt:${profile.user_id}:text-size`;
  const [lastSeenHelp, setLastSeenHelp] = useState(() => readNumber(helpSeenKey));
  const [lastSeenBulletin, setLastSeenBulletin] = useState(() => readNumber(bulletinSeenKey));
  const [dismissedNotifications, setDismissedNotifications] = useState(() => readDismissed(dismissedKey));
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [textSize, setTextSize] = useState<TextSize>(() => readTextSize(textSizeKey));

  useEffect(() => {
    document.documentElement.dataset.textSize = textSize;
    window.localStorage.setItem(textSizeKey, textSize);
  }, [textSize, textSizeKey]);

  useEffect(() => {
    const currentHash = location.hash.replace("#", "");
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

  const navNotifications = useMemo(
    () => ({
      [paths.help]: helpRequests.items.filter((request) => Date.parse(request.aangemaakt_op) > lastSeenHelp).length,
      [paths.bulletin]: bulletinPosts.items.filter((post) => Date.parse(post.aangemaakt_op) > lastSeenBulletin).length,
    }),
    [bulletinPosts.items, helpRequests.items, lastSeenBulletin, lastSeenHelp],
  );

  const personalNotifications = useMemo(() => {
    const helpNotifications = helpRequests.items.flatMap((request) => {
      if (request.aangemaakt_door !== profile.user_id) return [];
      return request.messages
        .filter((message) => message.author_id !== profile.user_id)
        .map((message) => ({
          id: `help-${request.id}-${message.id}`,
          date: Date.parse(message.aangemaakt_op) || 0,
          title: `Reactie op ${request.titel}`,
          description: `${message.author_name}${message.author_house_number ? `, huisnummer ${message.author_house_number}` : ""}: ${message.message}`,
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
          description: `${message.author_name}${message.author_house_number ? `, huisnummer ${message.author_house_number}` : ""}: ${message.message}`,
          to: `${paths.bulletin}#prikbord-${post.id}`,
        }));
    });

    return [...helpNotifications, ...bulletinNotifications]
      .filter((notification) => !dismissedNotifications.has(notification.id))
      .sort((a, b) => b.date - a.date);
  }, [bulletinPosts.items, dismissedNotifications, helpRequests.items, profile.user_id]);

  function dismissNotification(id: string) {
    setDismissedNotifications((current) => {
      const next = new Set(current);
      next.add(id);
      window.localStorage.setItem(dismissedKey, JSON.stringify([...next]));
      return next;
    });
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Graaf van Schuyt</p>
        </div>
        <div className="header-actions">
          <div className="accessibility-menu">
            <button
              className={textSize === "normal" ? "reading-mode-button" : "reading-mode-button active"}
              onClick={() => {
                setShowNotifications(false);
                setShowAccessibility((current) => !current);
              }}
              type="button"
            >
              <span aria-hidden="true">👓</span> Leesmodus
            </button>
            {showAccessibility && (
              <div className="accessibility-panel">
                <strong>Leesmodus</strong>
                <p className="muted">Maak tekst en knoppen groter voor comfortabeler lezen.</p>
                <label className="field">
                  <span>Tekstgrootte</span>
                  <select value={textSize} onChange={(event) => setTextSize(event.target.value as TextSize)}>
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
          <div className="notification-menu">
            <button
              aria-label="Notificaties"
              className={personalNotifications.length > 0 ? "icon-button notification-button has-notifications" : "icon-button notification-button"}
              onClick={() => {
                setShowAccessibility(false);
                setShowNotifications((current) => !current);
              }}
              type="button"
            >
              <Bell aria-hidden="true" />
              {personalNotifications.length > 0 && <span className="notification-dot" />}
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
                      <button aria-label="Notificatie verwijderen" className="text-button danger" onClick={() => dismissNotification(notification.id)} type="button">
                        <Trash2 aria-hidden="true" size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          {isAdmin && (
            <NavLink aria-label="Beheer" className="icon-button" to={paths.admin}>
              <Settings aria-hidden="true" />
            </NavLink>
          )}
          <NavLink aria-label="Profiel" className="icon-button" to={paths.profile}>
            <UserRound aria-hidden="true" />
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
