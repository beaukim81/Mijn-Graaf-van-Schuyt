import { BookOpen, ClipboardList, HandHeart, Home, Megaphone, Phone, Settings, UserRound } from "lucide-react";
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

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAppData();
  const isHome = location.pathname === paths.home;
  const isAdmin = profile.rol === "admin";

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Graaf van Schuyt</p>
        </div>
        <div className="header-actions">
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
            <Icon aria-hidden="true" size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
