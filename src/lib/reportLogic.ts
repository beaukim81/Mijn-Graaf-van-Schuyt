import type { KnowledgeDocument, Report } from "../types";

export function collectiveMessage(count: number) {
  if (count >= 10) return "Groot gedeeld probleem binnen het gebouw.";
  if (count >= 5) return "Dit lijkt mogelijk een collectief gebouwprobleem.";
  if (count >= 3) return "Meerdere bewoners herkennen dit probleem.";
  return "Dit lijkt nog een individuele melding.";
}

export function adviceForReport(report: Report) {
  if (report.type_melding === "Alleen mijn woning" && report.confirmations < 3) {
    return "Dit lijkt een individuele melding. Meld dit rechtstreeks bij REBO als het onder verhuuronderhoud valt.";
  }

  if (report.confirmations >= 3 || report.type_melding !== "Alleen mijn woning") {
    return "Meerdere bewoners herkennen dit probleem. Dit kan geschikt zijn voor een gezamenlijke melding of aanvullende individuele meldingen bij REBO.";
  }

  return "Er is een probleem gemeld. Herken je dit ook?";
}

export function reboSummary(report: Report) {
  return `Binnen appartementencomplex Graaf van Schuyt ervaren meerdere bewoners hetzelfde probleem: ${report.titel}.
Categorie: ${report.categorie}.
Locatie: ${report.locatie_in_gebouw}.
Aantal bewoners dat dit herkent: ${report.confirmations}.
Omschrijving: ${report.omschrijving}.
Status in bewonersapp: ${report.status}.`;
}

export function relevantDocuments(reportCategory: string, documents: KnowledgeDocument[]) {
  const categoryMap: Record<string, string[]> = {
    "Mechanische ventilatie": ["Mechanische ventilatie"],
    "Afzuigkap / afzuiging": ["Mechanische ventilatie", "Keuken"],
    "Verwarming / temperatuur": ["Vloerverwarming"],
    "Intercom / toegang": ["Intercom", "Buitendeuren"],
    Veiligheid: ["Rookmelders", "Buitendeuren"],
    "Water / lekkage": ["Douchewanden", "Keuken"],
    "Garage / berging": ["Buitendeuren"],
  };

  const matches = categoryMap[reportCategory] ?? [reportCategory];
  return documents
    .filter((document) => matches.includes(document.categorie))
    .sort((left, right) => {
      const order = ["Officiële handleiding", "Veelgestelde vraag", "Onderdeleninformatie", "Bewonerstip"];
      return order.indexOf(left.documenttype) - order.indexOf(right.documenttype);
    })
    .slice(0, 4);
}
