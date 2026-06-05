export function residentLabel(name?: string, houseNumber?: string, lastName?: string) {
  const fullName = residentName(name, lastName);
  const cleanHouseNumber = houseNumber?.trim();
  return cleanHouseNumber ? `${fullName} - nr. ${cleanHouseNumber}` : fullName;
}

export function residentName(name?: string, lastName?: string) {
  const cleanName = name?.trim() || "Bewoner";
  const cleanLastName = lastName?.trim();
  return cleanLastName ? `${cleanName} ${cleanLastName}` : cleanName;
}
