const floorRanges = [
  { from: 3, to: 41, label: "1e etage" },
  { from: 43, to: 81, label: "2e etage" },
  { from: 83, to: 121, label: "3e etage" },
  { from: 123, to: 161, label: "4e etage" },
  { from: 163, to: 181, label: "5e etage" },
  { from: 183, to: 201, label: "6e etage" },
];

export const validHouseNumbers = floorRanges.flatMap((range) => {
  const values: string[] = [];
  for (let number = range.from; number <= range.to; number += 2) {
    values.push(String(number));
  }
  return values;
});

export function isValidHouseNumber(houseNumber?: string) {
  const trimmed = houseNumber?.trim();
  if (!trimmed) return false;
  return validHouseNumbers.includes(trimmed);
}

export function floorForHouseNumber(houseNumber?: string) {
  if (!isValidHouseNumber(houseNumber)) return "";
  const number = Number.parseInt(houseNumber?.trim() ?? "", 10);
  if (!Number.isFinite(number)) return "";
  return floorRanges.find((range) => number >= range.from && number <= range.to)?.label ?? "";
}
