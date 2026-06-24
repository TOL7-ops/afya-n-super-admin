/**
 * @deprecated All functions delegate to institutions.service.ts
 * This file is kept only for any remaining import sites.
 * Prefer importing directly from '@/services/institutions.service'.
 */
export {
  listInstitutions as listFacilities,
  getInstitution as getFacility,
  createInstitution as createFacility,
  updateInstitution as updateFacility,
  updateInstitutionStatus as suspendFacility,
  approveInstitution,
  rejectInstitution as rejectFacility,
  extendTrial,
  resendOnboarding,
} from './institutions.service';

// Legacy signatures that old callers expect
import { updateInstitutionStatus } from './institutions.service';
import type { FacilityResponse } from '@/types/api';

/**
 * @deprecated Use updateInstitutionStatus(id, active)
 * Old signature: suspendFacility(id, active) — kept for AdminShell compatibility.
 */
export async function suspendFacilityLegacy(
  facilityId: string,
  active: boolean,
): Promise<FacilityResponse> {
  return updateInstitutionStatus(facilityId, active);
}

// License helpers now in licenses.service.ts — re-export for old callers
export { renewLicense, sendLicenseReminder as sendRenewalReminder } from './licenses.service';

import { renewLicense as _rl, sendLicenseReminder as _srl } from './licenses.service';
void _rl;
void _srl;
