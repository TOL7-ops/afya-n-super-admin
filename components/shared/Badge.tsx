import type { InstitutionType, InstitutionStatus, LicenseStatus, UserStatus } from '@/types';

type ChipVariant =
  | 'active'
  | 'suspended'
  | 'pending'
  | 'trial'
  | 'gov'
  | 'ngo'
  | 'hosp'
  | 'pharm'
  | 'expiring';

interface BadgeProps {
  variant: ChipVariant;
  children: React.ReactNode;
  small?: boolean;
}

const VARIANT_CLASSES: Record<ChipVariant, string> = {
  active: 'chip-active',
  suspended: 'chip-suspended',
  pending: 'chip-pending',
  trial: 'chip-trial',
  gov: 'chip-gov',
  ngo: 'chip-ngo',
  hosp: 'chip-hosp',
  pharm: 'chip-pharm',
  expiring: 'chip-pending',
};

export default function Badge({ variant, children, small }: BadgeProps) {
  return (
    <span
      className={`chip ${VARIANT_CLASSES[variant]}`}
      style={small ? { fontSize: '.62rem' } : undefined}
    >
      {children}
    </span>
  );
}

// ─── Helper mappers ───────────────────────────────────────────────────────────
export function institutionTypeVariant(type: InstitutionType | string): ChipVariant {
  const map: Record<string, ChipVariant> = {
    Government: 'gov',
    'Government Health Directorate': 'gov',
    NGO: 'ngo',
    Hospital: 'hosp',
    'Hospital / Clinic': 'hosp',
    Pharmacy: 'pharm',
    'Pharmacy / Pharmacy Chain': 'pharm',
    Employer: 'gov',
    Research: 'ngo',
  };
  return map[type] ?? 'ngo';
}

export function institutionStatusVariant(status: InstitutionStatus | string): ChipVariant {
  const map: Record<string, ChipVariant> = {
    Active: 'active',
    Pending: 'pending',
    Suspended: 'suspended',
    Trial: 'trial',
  };
  return map[status] ?? 'pending';
}

export function licenseStatusVariant(status: LicenseStatus | string): ChipVariant {
  const map: Record<string, ChipVariant> = {
    Active: 'active',
    Expiring: 'expiring',
    Trial: 'trial',
    Expired: 'suspended',
  };
  return map[status] ?? 'pending';
}

export function userStatusVariant(status: UserStatus | string): ChipVariant {
  return status === 'Active' ? 'active' : 'suspended';
}
