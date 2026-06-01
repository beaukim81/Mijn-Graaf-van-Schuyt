import { BookOpen, ClipboardList, HandHeart, Megaphone, Phone } from "lucide-react";
import { HomeCard } from "../components/HomeCard";
import { paths } from "../routes/paths";

const cards = [
  {
    icon: Phone,
    title: "Contacten",
    description: "Belangrijke nummers, e-mails en websites rustig bij elkaar.",
    buttonText: "Bekijk contacten",
    to: paths.contacts,
  },
  {
    icon: ClipboardList,
    title: "Meldingen",
    description: "Meld praktische gebouwproblemen zonder openbare discussie.",
    buttonText: "Bekijk meldingen",
    to: paths.reports,
  },
  {
    icon: BookOpen,
    title: "Kennisbank",
    description: "Handleidingen, tips en oplossingen voor bewoners.",
    buttonText: "Open kennisbank",
    to: paths.knowledge,
  },
  {
    icon: HandHeart,
    title: "Hulp & Buren",
    description: "Kleine hulpvragen zonder groepsdruk of chat.",
    buttonText: "Vraag of bied hulp",
    to: paths.help,
  },
  {
    icon: Megaphone,
    title: "Prikbord",
    description: "Praktische berichten zoals gevonden spullen of tips.",
    buttonText: "Bekijk prikbord",
    to: paths.bulletin,
  },
];

export function HomePage() {
  return (
    <section className="page-stack">
      <div className="intro">
        <h2>Rustig overzicht voor bewoners</h2>
        <p>
          Een praktische plek naast de bestaande bewonersgroep. Geen likes, geen reacties, geen extra ruis.
        </p>
      </div>
      <div className="home-grid">
        {cards.map((card) => (
          <HomeCard key={card.title} {...card} />
        ))}
      </div>
    </section>
  );
}
