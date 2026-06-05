import type {
  AccessRequest,
  AccessRequestStatus,
  AnnouncementImportance,
  BuildingAnnouncement,
  BulletinCategory,
  BulletinMessage,
  BulletinPost,
  BulletinStatus,
  Contact,
  ContactCategory,
  FeedbackItem,
  FeedbackStatus,
  HelpCategory,
  HelpMessage,
  HelpOffer,
  HelpRequest,
  HelpStatus,
  KnowledgeCategory,
  KnowledgeDocument,
  KnowledgeDocumentStatus,
  KnowledgeDocumentType,
  NotificationPreference,
  Profile,
  Report,
  ReportCategory,
  ReportStatus,
  ReportType,
} from "../types";

type Row = Record<string, unknown>;

function text(value: unknown, fallback = "") {
  return value == null ? fallback : String(value);
}

function optionalText(value: unknown) {
  return value == null || value === "" ? undefined : String(value);
}

function optionalField(key: string, value: unknown) {
  return value == null || value === "" ? {} : { [key]: value };
}

function textArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter(Boolean);
}

export function mapProfile(row: Row): Profile {
  return {
    id: text(row.id),
    user_id: text(row.user_id),
    naam_of_bijnaam: text(row.naam_of_bijnaam),
    achternaam: optionalText(row.achternaam),
    huisnummer: optionalText(row.huisnummer),
    verdieping_of_gebouwdeel: optionalText(row.verdieping_of_gebouwdeel),
    profielfoto_url: optionalText(row.profielfoto_url),
    rol: row.rol === "admin" ? "admin" : "bewoner",
    email: optionalText(row.email),
    telefoon: optionalText(row.telefoon),
  };
}

export function profileToRow(profile: Profile) {
  return {
    id: profile.id,
    user_id: profile.user_id,
    naam_of_bijnaam: profile.naam_of_bijnaam,
    achternaam: profile.achternaam ?? null,
    huisnummer: profile.huisnummer ?? null,
    verdieping_of_gebouwdeel: profile.verdieping_of_gebouwdeel ?? null,
    profielfoto_url: profile.profielfoto_url ?? null,
    rol: profile.rol,
    email: profile.email ?? null,
    telefoon: profile.telefoon ?? null,
  };
}

export function mapAccessRequest(row: Row): AccessRequest {
  return {
    id: text(row.id),
    email: text(row.email),
    naam_of_bijnaam: text(row.naam_of_bijnaam),
    achternaam: optionalText(row.achternaam),
    huisnummer: text(row.huisnummer),
    verdieping_of_gebouwdeel: optionalText(row.verdieping_of_gebouwdeel),
    status: text(row.status, "Nieuw") as AccessRequestStatus,
    beheer_notitie: optionalText(row.beheer_notitie),
    approved_by: optionalText(row.approved_by),
    approved_at: optionalText(row.approved_at),
    invited_user_id: optionalText(row.invited_user_id),
    created_at: text(row.created_at),
    updated_at: text(row.updated_at ?? row.created_at),
  };
}

export function accessRequestToRow(request: AccessRequest) {
  return {
    id: request.id,
    email: request.email,
    naam_of_bijnaam: request.naam_of_bijnaam,
    achternaam: request.achternaam ?? null,
    huisnummer: request.huisnummer,
    verdieping_of_gebouwdeel: request.verdieping_of_gebouwdeel ?? null,
    status: request.status,
    beheer_notitie: request.beheer_notitie ?? null,
    approved_by: request.approved_by ?? null,
    approved_at: request.approved_at ?? null,
    invited_user_id: request.invited_user_id ?? null,
  };
}

export function mapContact(row: Row): Contact {
  return {
    id: text(row.id),
    naam: text(row.naam),
    categorie: text(row.categorie) as ContactCategory,
    beschrijving: text(row.beschrijving),
    telefoonnummer: optionalText(row.telefoonnummer),
    emailadres: optionalText(row.emailadres),
    website: optionalText(row.website),
    whatsapp_url: optionalText(row.whatsapp_url),
    zichtbaar: row.zichtbaar !== false,
    aangemaakt_op: text(row.created_at ?? row.aangemaakt_op),
    bijgewerkt_op: text(row.updated_at ?? row.bijgewerkt_op ?? row.created_at),
  };
}

export function contactToRow(contact: Contact) {
  return {
    id: contact.id,
    naam: contact.naam,
    categorie: contact.categorie,
    beschrijving: contact.beschrijving,
    telefoonnummer: contact.telefoonnummer ?? null,
    emailadres: contact.emailadres ?? null,
    website: contact.website ?? null,
    whatsapp_url: contact.whatsapp_url ?? null,
    zichtbaar: contact.zichtbaar,
  };
}

export function mapReport(row: Row, confirmations = 0, declined = 0, currentUserResponse?: Report["current_user_response"]): Report {
  return {
    id: text(row.id),
    titel: text(row.titel),
    omschrijving: text(row.omschrijving),
    categorie: text(row.categorie) as ReportCategory,
    locatie_in_gebouw: text(row.locatie_in_gebouw),
    type_melding: text(row.type_melding) as ReportType,
    status: text(row.status, "Nieuw") as ReportStatus,
    aangemaakt_door: text(row.aangemaakt_door),
    aangemaakt_door_naam: optionalText(row.aangemaakt_door_naam),
    aangemaakt_door_huisnummer: optionalText(row.aangemaakt_door_huisnummer),
    aangemaakt_op: text(row.created_at ?? row.aangemaakt_op),
    bijgewerkt_op: text(row.updated_at ?? row.bijgewerkt_op ?? row.created_at),
    confirmations,
    declined,
    current_user_response: currentUserResponse,
    image_urls: textArray(row.image_urls),
    opgelost_op: optionalText(row.opgelost_op),
    opgelost_door: optionalText(row.opgelost_door),
    opgelost_door_naam: optionalText(row.opgelost_door_naam),
    oplossing_omschrijving: optionalText(row.oplossing_omschrijving),
    rebo_melding_op: optionalText(row.rebo_melding_op),
    rebo_melding_door: optionalText(row.rebo_melding_door),
    rebo_melding_door_naam: optionalText(row.rebo_melding_door_naam),
  };
}

export function reportToRow(report: Report) {
  return {
    id: report.id,
    titel: report.titel,
    omschrijving: report.omschrijving,
    categorie: report.categorie,
    locatie_in_gebouw: report.locatie_in_gebouw,
    type_melding: report.type_melding,
    status: report.status,
    ...optionalField("aangemaakt_door_naam", report.aangemaakt_door_naam),
    ...optionalField("aangemaakt_door_huisnummer", report.aangemaakt_door_huisnummer),
    ...(report.image_urls && report.image_urls.length > 0 ? { image_urls: report.image_urls } : {}),
    ...optionalField("opgelost_op", report.opgelost_op),
    ...optionalField("opgelost_door", report.opgelost_door),
    ...optionalField("opgelost_door_naam", report.opgelost_door_naam),
    ...optionalField("oplossing_omschrijving", report.oplossing_omschrijving),
    ...optionalField("rebo_melding_op", report.rebo_melding_op),
    ...optionalField("rebo_melding_door", report.rebo_melding_door),
    ...optionalField("rebo_melding_door_naam", report.rebo_melding_door_naam),
    aangemaakt_door: report.aangemaakt_door,
  };
}

export function mapKnowledgeDocument(row: Row): KnowledgeDocument {
  return {
    id: text(row.id),
    titel: text(row.titel),
    categorie: text(row.categorie) as KnowledgeCategory,
    documenttype: text(row.documenttype) as KnowledgeDocumentType,
    korte_samenvatting: text(row.korte_samenvatting),
    pdf_url: text(row.pdf_url),
    uitgebreide_uitleg: optionalText(row.uitgebreide_uitleg),
    image_urls: textArray(row.image_urls),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    leverancier_of_fabrikant: optionalText(row.leverancier_of_fabrikant),
    faq: Array.isArray(row.faq) ? row.faq as KnowledgeDocument["faq"] : [],
    toegevoegd_door: text(row.toegevoegd_door),
    status: text(row.status, "Concept") as KnowledgeDocumentStatus,
    aangemaakt_op: text(row.created_at ?? row.aangemaakt_op),
    bijgewerkt_op: text(row.updated_at ?? row.bijgewerkt_op ?? row.created_at),
  };
}

export function knowledgeDocumentToRow(document: KnowledgeDocument) {
  return {
    id: document.id,
    titel: document.titel,
    categorie: document.categorie,
    documenttype: document.documenttype,
    korte_samenvatting: document.korte_samenvatting,
    pdf_url: document.pdf_url,
    ...optionalField("uitgebreide_uitleg", document.uitgebreide_uitleg),
    ...(document.image_urls && document.image_urls.length > 0 ? { image_urls: document.image_urls } : {}),
    tags: document.tags,
    leverancier_of_fabrikant: document.leverancier_of_fabrikant ?? null,
    faq: document.faq,
    toegevoegd_door: document.toegevoegd_door || null,
    status: document.status,
  };
}

export function mapHelpOffer(row: Row): HelpOffer {
  return {
    id: text(row.id),
    help_request_id: text(row.help_request_id),
    helper_id: text(row.helper_id),
    helper_name: text(row.helper_naam ?? row.helper_name),
    helper_house_number: optionalText(row.helper_huisnummer ?? row.helper_house_number),
    contact_allowed: Boolean(row.contact_info_delen ?? row.contact_allowed),
    contact_info: optionalText(row.contact_info),
    aangemaakt_op: text(row.created_at ?? row.aangemaakt_op),
  };
}

export function mapHelpMessage(row: Row): HelpMessage {
  return {
    id: text(row.id),
    author_id: text(row.author_id),
    author_name: text(row.author_name),
    author_house_number: optionalText(row.author_house_number),
    message: text(row.message),
    aangemaakt_op: text(row.created_at ?? row.aangemaakt_op),
  };
}

export function mapHelpRequest(row: Row, offers: HelpOffer[], messages: HelpMessage[]): HelpRequest {
  return {
    id: text(row.id),
    titel: text(row.titel),
    omschrijving: text(row.omschrijving),
    categorie: text(row.categorie) as HelpCategory,
    aangemaakt_door: text(row.aangemaakt_door),
    aanmaker_naam: text(row.aanmaker_naam),
    aanmaker_huisnummer: optionalText(row.aanmaker_huisnummer),
    status: text(row.status, "Open") as HelpStatus,
    aangemaakt_op: text(row.created_at ?? row.aangemaakt_op),
    offers,
    messages,
  };
}

export function helpRequestToRow(request: HelpRequest) {
  return {
    id: request.id,
    titel: request.titel,
    omschrijving: request.omschrijving,
    categorie: request.categorie,
    aangemaakt_door: request.aangemaakt_door,
    aanmaker_naam: request.aanmaker_naam,
    aanmaker_huisnummer: request.aanmaker_huisnummer ?? null,
    status: request.status,
  };
}

export function helpOfferToRow(offer: HelpOffer) {
  return {
    id: offer.id,
    help_request_id: offer.help_request_id,
    helper_id: offer.helper_id,
    helper_naam: offer.helper_name,
    helper_huisnummer: offer.helper_house_number ?? null,
    contact_info_delen: offer.contact_allowed,
  };
}

export function helpMessageToRow(message: HelpMessage, helpRequestId: string) {
  return {
    id: message.id,
    help_request_id: helpRequestId,
    author_id: message.author_id,
    author_name: message.author_name,
    author_house_number: message.author_house_number ?? null,
    message: message.message,
  };
}

export function mapBulletinMessage(row: Row): BulletinMessage {
  return {
    id: text(row.id),
    author_id: text(row.author_id),
    author_name: text(row.author_name),
    author_house_number: optionalText(row.author_house_number),
    message: text(row.message),
    aangemaakt_op: text(row.created_at ?? row.aangemaakt_op),
  };
}

export function mapBulletinPost(row: Row, messages: BulletinMessage[]): BulletinPost {
  return {
    id: text(row.id),
    titel: text(row.titel),
    omschrijving: text(row.omschrijving),
    categorie: text(row.categorie) as BulletinCategory,
    contactpersoon: optionalText(row.contactpersoon),
    image_url: optionalText(row.image_url),
    image_urls: textArray(row.image_urls),
    image_name: optionalText(row.image_name),
    aangemaakt_door: text(row.aangemaakt_door),
    aangemaakt_door_naam: optionalText(row.aangemaakt_door_naam),
    aangemaakt_door_huisnummer: optionalText(row.aangemaakt_door_huisnummer),
    status: text(row.status, "Actief") as BulletinStatus,
    aangemaakt_op: text(row.created_at ?? row.aangemaakt_op),
    messages,
  };
}

export function bulletinPostToRow(post: BulletinPost) {
  return {
    id: post.id,
    titel: post.titel,
    omschrijving: post.omschrijving,
    categorie: post.categorie,
    contactpersoon: post.contactpersoon ?? null,
    ...optionalField("image_url", post.image_url),
    ...(post.image_urls && post.image_urls.length > 0 ? { image_urls: post.image_urls } : {}),
    aangemaakt_door: post.aangemaakt_door,
    ...optionalField("aangemaakt_door_naam", post.aangemaakt_door_naam),
    ...optionalField("aangemaakt_door_huisnummer", post.aangemaakt_door_huisnummer),
    status: post.status,
  };
}

export function bulletinMessageToRow(message: BulletinMessage, bulletinPostId: string) {
  return {
    id: message.id,
    bulletin_post_id: bulletinPostId,
    author_id: message.author_id,
    author_name: message.author_name,
    author_house_number: message.author_house_number ?? null,
    message: message.message,
  };
}

export function mapBuildingAnnouncement(row: Row): BuildingAnnouncement {
  return {
    id: text(row.id),
    titel: text(row.titel),
    inhoud: text(row.inhoud),
    importance: text(row.importance, "normaal") as AnnouncementImportance,
    notify_all: Boolean(row.notify_all),
    event_date: optionalText(row.event_date),
    created_at: text(row.created_at),
    updated_at: text(row.updated_at ?? row.created_at),
    created_by: text(row.created_by),
  };
}

export function buildingAnnouncementToRow(announcement: BuildingAnnouncement) {
  return {
    id: announcement.id,
    titel: announcement.titel,
    inhoud: announcement.inhoud,
    importance: announcement.importance,
    notify_all: announcement.notify_all,
    event_date: announcement.event_date ?? null,
    created_by: announcement.created_by || null,
  };
}

export function mapNotificationPreference(row: Row): NotificationPreference {
  return {
    id: text(row.user_id),
    user_id: text(row.user_id),
    personal_notifications: row.personal_notifications !== false,
    building_notifications: row.building_notifications !== false,
    neighbor_notifications: Boolean(row.neighbor_notifications),
    updated_at: text(row.updated_at),
  };
}

export function notificationPreferenceToRow(preference: NotificationPreference) {
  return {
    user_id: preference.user_id,
    personal_notifications: preference.personal_notifications,
    building_notifications: preference.building_notifications,
    neighbor_notifications: preference.neighbor_notifications,
  };
}

export function mapFeedbackItem(row: Row): FeedbackItem {
  return {
    id: text(row.id),
    onderwerp: text(row.onderwerp),
    bericht: text(row.bericht),
    status: text(row.status, "Nieuw") as FeedbackStatus,
    aangemaakt_door: text(row.aangemaakt_door),
    aangemaakt_door_naam: optionalText(row.aangemaakt_door_naam),
    aangemaakt_door_huisnummer: optionalText(row.aangemaakt_door_huisnummer),
    beheer_reactie: optionalText(row.beheer_reactie),
    opgelost_op: optionalText(row.opgelost_op),
    created_at: text(row.created_at),
    updated_at: text(row.updated_at ?? row.created_at),
  };
}

export function feedbackItemToRow(item: FeedbackItem) {
  return {
    id: item.id,
    onderwerp: item.onderwerp,
    bericht: item.bericht,
    status: item.status,
    aangemaakt_door: item.aangemaakt_door,
    aangemaakt_door_naam: item.aangemaakt_door_naam ?? null,
    aangemaakt_door_huisnummer: item.aangemaakt_door_huisnummer ?? null,
    beheer_reactie: item.beheer_reactie ?? null,
    opgelost_op: item.opgelost_op ?? null,
  };
}
