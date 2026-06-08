import type { Profile } from "../types";
import { residentName } from "../lib/residentDisplay";
import { useSignedUrl } from "../lib/storageUrls";

interface ResidentIdentityProps {
  name?: string;
  houseNumber?: string;
  profile?: Profile;
  compact?: boolean;
  anonymizeWhenProfileMissing?: boolean;
}

export function ResidentIdentity({ anonymizeWhenProfileMissing, compact, houseNumber, name, profile }: ResidentIdentityProps) {
  const profilePhotoUrl = useSignedUrl(profile?.profielfoto_url);
  const shouldAnonymize = anonymizeWhenProfileMissing && !profile;
  const displayName = residentName(
    shouldAnonymize ? "Bewoner" : profile?.naam_of_bijnaam ?? name,
    shouldAnonymize ? undefined : profile?.achternaam,
  );
  const displayHouseNumber = shouldAnonymize ? undefined : profile?.huisnummer ?? houseNumber;

  if (shouldAnonymize || !profile?.profielfoto_url) {
    return (
      <span className="resident-identity resident-identity--text">
        <span className="resident-identity__name">{displayName}</span>
        {displayHouseNumber ? <small>huisnummer {displayHouseNumber}</small> : null}
      </span>
    );
  }

  return (
    <span className={compact ? "resident-identity resident-identity--compact" : "resident-identity"}>
      <img alt="" className="resident-avatar" src={profilePhotoUrl} />
      <span className="resident-identity__copy">
        <span className="resident-identity__name">{displayName}</span>
        {displayHouseNumber ? <small>huisnummer {displayHouseNumber}</small> : null}
      </span>
    </span>
  );
}
