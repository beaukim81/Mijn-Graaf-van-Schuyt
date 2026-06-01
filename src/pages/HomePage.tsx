import { BookOpen, ClipboardList, HandHeart, Megaphone, Phone } from "lucide-react";
import { HomeCard } from "../components/HomeCard";
import { paths } from "../routes/paths";

const cards = [
  {
    icon: Phone,
    title: "Contacten",
    description: "Belangrijke telefoonnummers, e-mails en websites.",
    buttonText: "Bekijk contacten",
    to: paths.contacts,
  },
  {
    icon: ClipboardList,
    title: "Meldingen",
    description: "Meld problemen in je woning of in het gebouw.",
    buttonText: "Bekijk meldingen",
    to: paths.reports,
  },
  {
    icon: BookOpen,
    title: "Kennisbank",
    description: "Bekijk handleidingen, tips en onderdeleninformatie.",
    buttonText: "Open kennisbank",
    to: paths.knowledge,
  },
  {
    icon: HandHeart,
    title: "Hulp & Buren",
    description: "Vraag hulp, bied hulp aan of nodig buren uit.",
    buttonText: "Vraag of bied hulp",
    to: paths.help,
  },
  {
    icon: Megaphone,
    title: "Prikbord",
    description: "Plaats een tip, mededeling of gevonden voorwerp.",
    buttonText: "Bekijk prikbord",
    to: paths.bulletin,
  },
];

export function HomePage() {
  return (
    <section className="page-stack">
      <figure className="home-hero">
        <img src="/images/graaf-van-schuyt-hero.png" alt="Appartementencomplex Graaf van Schuyt" />
      </figure>
      <div className="intro">
        <p>Vind snel contacten, meldingen, handleidingen, hulpvragen en berichten voor het gebouw.</p>
      </div>
      <div className="home-grid">
        {cards.map((card) => (
          <HomeCard key={card.title} {...card} />
        ))}
      </div>
    </section>
  );
}
