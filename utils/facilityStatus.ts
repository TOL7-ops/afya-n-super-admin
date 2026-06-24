/**
 * facilityStatus.ts — re-exports from the shared licenseStatus utility.
 *
 * All status derivation is now centralised in utils/licenseStatus.ts.
 * This file is kept for backwards-compatibility with any remaining importers.
 */
export { deriveLicenseStatus as getFacilityStatus } from '@/utils/licenseStatus';
export type { DerivedStatus as FacilityStatus } from '@/utils/licenseStatus';

import { deriveLicenseStatus } from '@/utils/licenseStatus';
import type { FacilityResponse } from '@/types/api';

export function isPendingAction(f: FacilityResponse): boolean {
  const s = deriveLicenseStatus(f);
  return s === 'Pending' || s === 'Trial';
}

export function isActiveInstitution(f: FacilityResponse): boolean {
  const s = deriveLicenseStatus(f);
  return s === 'Active' || s === 'Expiring';
}
