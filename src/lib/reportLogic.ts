import type { KnowledgeDocument, Report } from "../types";
import { reboRentalMaintenancePdfUrl } from "../data/reboRentalMaintenanceDocument";

export const rentalMaintenancePdfUrl = reboRentalMaintenancePdfUrl;

export type RentalMaintenanceInput = Pick<Report, "categorie" | "titel" | "omschrijving" | "locatie_in_gebouw" | "type_melding">;

export function collectiveMessage(count: number) {
  if (count >= 10) return "Groot gedeeld probleem binnen het gebouw.";
  if (count >= 5) return "Dit lijkt mogelijk een collectief gebouwprobleem.";
  if (count >= 3) return "Meerdere bewoners herkennen dit probleem.";
  if (count >= 2) return "Een andere bewoner herkent dit ook.";
  return "Dit lijkt nog een individuele melding.";
}

export function adviceForReport(report: Report) {
  if (report.type_melding === "Alleen mijn woning" && report.confirmations <= 1) {
    return "Dit lijkt een individuele melding. Meld dit rechtstreeks bij REBO als het onder verhuuronderhoud valt.";
  }

  if (report.confirmations >= 2) {
    return "Omdat andere bewoners dit ook herkennen, kan dit mogelijk een gezamenlijke melding worden. Bewoners kunnen daarnaast zelf ook een individuele melding bij REBO doen.";
  }

  if (report.type_melding !== "Alleen mijn woning") {
    return "Dit is gemeld als een probleem dat mogelijk meerdere woningen of het appartementencomplex raakt. Herken je dit ook, dan kan dit helpen om te bepalen of een gezamenlijke melding passend is.";
  }

  return "Er is een probleem gemeld. Herken je dit ook?";
}

export function isLikelyRentalMaintenance(input: RentalMaintenanceInput) {
  const categoryMatches = [
    "Afzuigkap / afzuiging",
    "Verwarming / temperatuur",
    "Water / lekkage",
    "Verlichting",
    "Intercom / toegang",
    "Garage / berging",
  ].includes(input.categorie);

  const text = `${input.titel} ${input.omschrijving} ${input.locatie_in_gebouw}`.toLowerCase();
  const keywordMatches = [
    "lekkage",
    "water",
    "kraan",
    "afvoer",
    "riool",
    "verwarming",
    "temperatuur",
    "thermostaat",
    "intercom",
    "deur",
    "slot",
    "raam",
    "kozijn",
    "keuken",
    "douche",
    "rookmelder",
    "verlichting",
    "storing",
    "kapot",
    "defect",
  ].some((keyword) => text.includes(keyword));

  return input.type_melding === "Alleen mijn woning" && (categoryMatches || keywordMatches);
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
