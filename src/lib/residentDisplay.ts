export function residentLabel(name?: string, houseNumber?: string) {
  const cleanName = name?.trim() || "Bewoner";
  const cleanHouseNumber = houseNumber?.trim();
  return cleanHouseNumber ? `${cleanName} - nr. ${cleanHouseNumber}` : cleanName;
}
