export type Role = "bewoner" | "admin";

export type ContactCategory =
  | "Verhuur"
  | "Spoed"
  | "Gemeente"
  | "Veiligheid"
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
  | "Binnentuin"
  | "Veiligheid"
  | "Geluid"
  | "Intercom / toegang"
  | "Garage / berging"
  | "Overig";

export type ReportType = "Alleen mijn woning" | "Mogelijk meerdere woningen" | "Appartementencomplex";
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

export type BulletinCategory = "Gratis af te halen" | "Gezocht" | "Gevonden voorwerp" | "Mededeling" | "Tip" | "Overig";
export type BulletinStatus = "Actief" | "Afgerond" | "Verlopen";
export type AnnouncementImportance = "normaal" | "belangrijk" | "urgent";

export interface Profile {
  id: string;
  user_id: string;
  naam_of_bijnaam: string;
  achternaam?: string;
  huisnummer?: string;
  verdieping_of_gebouwdeel?: string;
  profielfoto_url?: string;
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
  whatsapp_url?: string;
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
  aangemaakt_door_naam?: string;
  aangemaakt_door_huisnummer?: string;
  aangemaakt_op: string;
  bijgewerkt_op: string;
  confirmations: number;
  declined: number;
  current_user_response?: "confirmed" | "declined";
  image_urls?: string[];
  opgelost_op?: string;
  opgelost_door?: string;
  opgelost_door_naam?: string;
  oplossing_omschrijving?: string;
  rebo_melding_op?: string;
  rebo_melding_door?: string;
  rebo_melding_door_naam?: string;
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
  uitgebreide_uitleg?: string;
  image_urls?: string[];
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

export interface BulletinMessage {
  id: string;
  author_id: string;
  author_name: string;
  author_house_number?: string;
  message: string;
  aangemaakt_op: string;
}

export interface BulletinPost {
  id: string;
  titel: string;
  omschrijving: string;
  categorie: BulletinCategory;
  contactpersoon?: string;
  image_url?: string;
  image_urls?: string[];
  image_name?: string;
  aangemaakt_door: string;
  aangemaakt_door_naam?: string;
  aangemaakt_door_huisnummer?: string;
  status: BulletinStatus;
  aangemaakt_op: string;
  messages: BulletinMessage[];
}

export interface BuildingAnnouncement {
  id: string;
  titel: string;
  inhoud: string;
  importance: AnnouncementImportance;
  notify_all: boolean;
  event_date?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  personal_notifications: boolean;
  building_notifications: boolean;
  help_notifications: boolean;
  report_notifications: boolean;
  knowledge_notifications: boolean;
  bulletin_notifications: boolean;
  updated_at: string;
}

export type FeedbackStatus = "Nieuw" | "In behandeling" | "Opgelost";

export interface FeedbackItem {
  id: string;
  onderwerp: string;
  bericht: string;
  status: FeedbackStatus;
  aangemaakt_door: string;
  aangemaakt_door_naam?: string;
  aangemaakt_door_huisnummer?: string;
  beheer_reactie?: string;
  opgelost_op?: string;
  created_at: string;
  updated_at: string;
}
