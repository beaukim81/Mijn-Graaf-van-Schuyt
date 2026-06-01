import { BookOpen, ClipboardList, HandHeart, Home, Megaphone, Phone, UserRound } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { paths } from "../routes/paths";

const navItems = [
  { to: paths.home, label: "Home", icon: Home },
  { to: paths.contacts, label: "Contact", icon: Phone },
  { to: paths.reports, label: "Meldingen", icon: ClipboardList },
  { to: paths.knowledge, label: "Kennis", icon: BookOpen },
  { to: paths.help, label: "Hulp", icon: HandHeart },
  { to: paths.bulletin, label: "Prikbord", icon: Megaphone },
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === paths.home;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Appartementencomplex</p>
          <h1>Mijn Graaf van Schuyt</h1>
        </div>
        <NavLink aria-label="Profiel" className="icon-button" to={paths.profile}>
          <UserRound aria-hidden="true" />
        </NavLink>
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
