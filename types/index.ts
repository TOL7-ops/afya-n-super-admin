// ─── Navigation ───────────────────────────────────────────────────────────────
export type ViewId =
  | 'dashboard'
  | 'institutions'
  | 'licenses'
  | 'analytics'
  | 'revenue'
  | 'users'
  | 'audit'
  | 'settings';

// ─── Shared ───────────────────────────────────────────────────────────────────
export type InstitutionType =
  | 'Government'
  | 'NGO'
  | 'Hospital'
  | 'Pharmacy'
  | 'Employer'
  | 'Research';

export type InstitutionStatus = 'Active' | 'Pending' | 'Suspended' | 'Trial';

export type LicensePlan =
  | '30-day Free Trial'
  | 'Annual Standard (10 seats)'
  | 'Annual Enterprise (unlimited)';

export type LicenseStatus = 'Active' | 'Expiring' | 'Trial' | 'Expired';

export type UserRole = 'Admin' | 'Field Worker' | 'Clinician';
export type UserStatus = 'Active' | 'Suspended';

export type AuditEventType = 'create' | 'update' | 'delete' | 'login' | 'suspend';

export type PaymentMethod = 'Bank transfer' | 'Mobile money' | 'Invoice' | 'Waived';

// ─── Institutions ─────────────────────────────────────────────────────────────
export interface Institution {
  id: string;
  name: string;
  type: InstitutionType;
  region: string;
  contact: string;
  email?: string;
  fieldWorkers: number | null;
  totalScreened: number | null;
  licenseExpires: string;
  status: InstitutionStatus;
  requestedDate?: string;
  plan?: string;
}

export interface PendingInstitution {
  id: string;
  name: string;
  type: InstitutionType;
  region: string;
  contact: string;
  requestedDate: string;
  plan: string;
  /** Real UUID facility ID for action endpoints — NOT the string token `id` above */
  facilityId: string | null;
}

export interface TopInstitution {
  name: string;
  type: InstitutionType;
  fieldWorkers: number | null;
  screened: number | null;
  onTreatment: number | null;
  adherence: number | null;
  licenseStatus: LicenseStatus;
  status: InstitutionStatus;
}

// ─── Licenses ─────────────────────────────────────────────────────────────────
export interface License {
  id: string;
  institution: string;
  plan: string;
  seats: number;
  startDate: string;
  expiry: string;
  amount: number;
  status: LicenseStatus;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  role: UserRole;
  institution: string;
  email: string;
  lastLogin: string;
  status: UserStatus;
}

// ─── Audit ────────────────────────────────────────────────────────────────────
export interface AuditEntry {
  id: string;
  type: AuditEventType;
  text: string;
  time: string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export interface RegionStat {
  name: string;
  screened: number;
  highBP: number;
  fillPercent: number;
}

export interface AdherenceRow {
  institution: string;
  screened: number;
  highBP: number;
  referred: number;
  followedUp: number;
  onTreatment: number;
  adherence: number;
  adherenceColor: 'green' | 'amber';
}

// ─── Revenue ──────────────────────────────────────────────────────────────────
export interface Transaction {
  id: string;
  institution: string;
  type: InstitutionType;
  plan: string;
  amount: number;
  paymentDate: string;
  method: string;
  period: string;
  status: 'Paid' | 'Due soon' | 'Trial';
}

// ─── Forms ────────────────────────────────────────────────────────────────────
export interface CreateInstitutionForm {
  name: string;
  type: string;
  region: string;
  contact: string;
  email: string;
  phone: string;
  plan: string;
  seats: string;
  notes: string;
}

export interface EditInstitutionForm {
  name: string;
  type: string;
  region: string;
  contact: string;
  email: string;
  plan: string;
  seats: string;
}

export interface IssueLicenseForm {
  facilityId: string;
  institution: string;
  plan: string;
  startDate: string;
  seats: string;
  paymentMethod: string;
  notes: string;
}

export interface ConvertTrialForm {
  plan: string;
  paymentMethod: string;
}

// ─── Email Preview ────────────────────────────────────────────────────────────
export interface EmailPreviewData {
  toField: string;
  dateField: string;
  subject: string;
  contactName: string;
  orgName: string;
  infoOrg: string;
  infoType: string;
  infoRegion: string;
  infoEmail: string;
  infoPlan: string;
  infoSeats: string;
  infoExpiry: string;
  token: string;
}

export interface PendingInstitutionData {
  name: string;
  email: string;
  contact: string;
  type: string;
  region: string;
  plan: string;
  seats: string;
  token: string;
  phone?: string;
  notes?: string;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
export type ToastType = '' | 'success' | 'warn';

export interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}
