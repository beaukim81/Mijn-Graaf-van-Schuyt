export type Role = "bewoner" | "admin";

export type ContactCategory =
  | "Verhuur"
  | "Spoed"
  | "VvE / beheer"
  | "Gemeente"
  | "Leveranciers"
  | "Onderhoud"
  | "Overig";

export type ReportCategory =
  | "Lift"
  | "Mechanische ventilatie"
  | "Afzuigkap / afzuiging"
  | "Verwarming / temperatuur"
  | "Water / lekkage"
  | "Verlichting"
  | "Schoonmaak"
  | "Parkeren"
  | "Veiligheid"
  | "Geluid"
  | "Intercom / toegang"
  | "Garage / berging"
  | "Overig";

export type ReportType = "Alleen mijn woning" | "Mogelijk meerdere woningen" | "Zeker meerdere woningen";
export type ReportStatus = "Nieuw" | "Herkend door meerdere bewoners" | "Doorgezet naar REBO" | "In behandeling" | "Opgelost";

export type KnowledgeCategory =
  | "Draaikiepramen"
  | "Buitendeuren"
  | "Intercom"
  | "Mechanische ventilatie"
  | "Vloerverwarming"
  | "Rookmelders"
  | "Douchewanden"
  | "Keuken"
  | "Aluminium kozijnen";

export type KnowledgeDocumentType = "Officiële handleiding" | "Bewonerstip" | "Onderdeleninformatie" | "Veelgestelde vraag";
export type KnowledgeDocumentStatus = "Concept" | "Gepubliceerd" | "Te controleren";

export type HelpCategory =
  | "Pakketje aannemen"
  | "Iets lenen"
  | "Kleine klus"
  | "Computer / telefoonhulp"
  | "Planten verzorgen"
  | "Boodschap meenemen"
  | "Oppas / speelafspraak"
  | "Samen eten"
  | "Koffie / thee"
  | "Spelletjesavond"
  | "Filmavond"
  | "Wandelen"
  | "Overig";

export type HelpStatus = "Open" | "Iemand helpt" | "Afgerond";

export type BulletinCategory = "Gratis af te halen" | "Gezocht" | "Gevonden voorwerp" | "Mededeling" | "Activiteit" | "Tip" | "Overig";
export type BulletinStatus = "Actief" | "Afgerond" | "Verlopen";

export interface Profile {
  id: string;
  user_id: string;
  naam_of_bijnaam: string;
  huisnummer?: string;
  verdieping_of_gebouwdeel?: string;
  profielfoto_url?: string;
  mag_benaderd_worden_voor_hulp: boolean;
  contact_info_zichtbaar_voor_helpers: boolean;
  kan_helpen_met: string[];
  rol: Role;
  email?: string;
  telefoon?: string;
}

export interface Contact {
  id: string;
  naam: string;
  categorie: ContactCategory;
  beschrijving: string;
  telefoonnummer?: string;
  emailadres?: string;
  website?: string;
  zichtbaar: boolean;
  aangemaakt_op: string;
  bijgewerkt_op: string;
}

export interface Report {
  id: string;
  titel: string;
  omschrijving: string;
  categorie: ReportCategory;
  locatie_in_gebouw: string;
  type_melding: ReportType;
  status: ReportStatus;
  aangemaakt_door: string;
  aangemaakt_op: string;
  bijgewerkt_op: string;
  confirmations: number;
  declined: number;
  current_user_has_confirmed?: boolean;
}

export interface KnowledgeFaq {
  id: string;
  vraag: string;
  antwoord?: string;
}

export interface KnowledgeDocument {
  id: string;
  titel: string;
  categorie: KnowledgeCategory;
  documenttype: KnowledgeDocumentType;
  korte_samenvatting: string;
  pdf_url: string;
  tags: string[];
  leverancier_of_fabrikant?: string;
  faq: KnowledgeFaq[];
  toegevoegd_door: string;
  status: KnowledgeDocumentStatus;
  aangemaakt_op: string;
  bijgewerkt_op: string;
}

export interface HelpOffer {
  id: string;
  help_request_id: string;
  helper_id: string;
  helper_name: string;
  helper_house_number?: string;
  contact_allowed: boolean;
  contact_info?: string;
  aangemaakt_op: string;
}

export interface HelpMessage {
  id: string;
  author_id: string;
  author_name: string;
  author_house_number?: string;
  message: string;
  aangemaakt_op: string;
}

export interface HelpRequest {
  id: string;
  titel: string;
  omschrijving: string;
  categorie: HelpCategory;
  aangemaakt_door: string;
  aanmaker_naam: string;
  aanmaker_huisnummer?: string;
  status: HelpStatus;
  aangemaakt_op: string;
  offers: HelpOffer[];
  messages: HelpMessage[];
}

export interface BulletinPost {
  id: string;
  titel: string;
  omschrijving: string;
  categorie: BulletinCategory;
  contactpersoon?: string;
  aangemaakt_door: string;
  status: BulletinStatus;
  aangemaakt_op: string;
}
