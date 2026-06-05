import type { Profile } from "../types";
import { residentName } from "../lib/residentDisplay";

interface ResidentIdentityProps {
  name?: string;
  houseNumber?: string;
  profile?: Profile;
  compact?: boolean;
}

export function ResidentIdentity({ compact, houseNumber, name, profile }: ResidentIdentityProps) {
  const displayName = residentName(
    profile?.naam_of_bijnaam ?? name,
    profile?.achternaam,
  );
  const displayHouseNumber = profile?.huisnummer ?? houseNumber;

  if (!profile?.profielfoto_url) {
    return (
      <span className="resident-identity resident-identity--text">
        <span className="resident-identity__name">{displayName}</span>
        {displayHouseNumber ? <small>huisnummer {displayHouseNumber}</small> : null}
      </span>
    );
  }

  return (
    <span className={compact ? "resident-identity resident-identity--compact" : "resident-identity"}>
      <img alt="" className="resident-avatar" src={profile.profielfoto_url} />
      <span className="resident-identity__copy">
        <span className="resident-identity__name">{displayName}</span>
        {displayHouseNumber ? <small>huisnummer {displayHouseNumber}</small> : null}
      </span>
    </span>
  );
}
