import type { BulletinCategory, ContactCategory, HelpCategory, KnowledgeCategory, ReportCategory } from "../types";

export const contactCategories: ContactCategory[] = ["Verhuur", "Spoed", "Gemeente", "Veiligheid", "Leveranciers", "Onderhoud", "Overig"];

export const reportCategories: ReportCategory[] = [
  "Lift",
  "Mechanische ventilatie",
  "Afzuigkap / afzuiging",
  "Verwarming / temperatuur",
  "Water / lekkage",
  "Verlichting",
  "Schoonmaak",
  "Parkeren",
  "Veiligheid",
  "Geluid",
  "Intercom / toegang",
  "Garage / berging",
  "Overig",
];

export const knowledgeCategories: KnowledgeCategory[] = [
  "Draaikiepramen",
  "Buitendeuren",
  "Intercom",
  "Mechanische ventilatie",
  "Vloerverwarming",
  "Rookmelders",
  "Douchewanden",
  "Keuken",
  "Aluminium kozijnen",
];

export const helpCategories: HelpCategory[] = [
  "Pakketje aannemen",
  "Iets lenen",
  "Kleine klus",
  "Computer / telefoonhulp",
  "Planten verzorgen",
  "Boodschap meenemen",
  "Oppas / speelafspraak",
  "Samen eten",
  "Koffie / thee",
  "Spelletjesavond",
  "Filmavond",
  "Wandelen",
  "Overig",
];

export const bulletinCategories: BulletinCategory[] = ["Gratis af te halen", "Gezocht", "Gevonden voorwerp", "Mededeling", "Activiteit", "Tip", "Overig"];
