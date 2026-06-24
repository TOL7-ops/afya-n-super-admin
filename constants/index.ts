import type {
  Institution,
  License,
  User,
  AuditEntry,
  Transaction,
  TopInstitution,
  PendingInstitution,
  RegionStat,
  AdherenceRow,
} from '@/types';

// ─── Platform Stats ───────────────────────────────────────────────────────────
export const PLATFORM_STATS = {
  totalInstitutions: 14,
  activeLicenses: 11,
  totalScreened: 4712,
  onTreatment: 387,
  pendingApproval: 2,
};

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────
export const DASHBOARD_KPIS = {
  activeInstitutions: 11,
  totalScreened: 4712,
  onActiveTreatment: 387,
  pendingApproval: 2,
};

// ─── Screening Trend ──────────────────────────────────────────────────────────
export const SCREENING_TREND = [
  { month: 'Dec', value: 312 },
  { month: 'Jan', value: 448 },
  { month: 'Feb', value: 621 },
  { month: 'Mar', value: 734 },
  { month: 'Apr', value: 891 },
  { month: 'May', value: 847 },
];

// ─── BP Distribution ──────────────────────────────────────────────────────────
export const BP_DISTRIBUTION = [
  { label: 'Normal', percent: 54, colorVar: 'var(--green)' },
  { label: 'Elevated', percent: 21, colorVar: 'var(--amber)' },
  { label: 'Stage 1/2', percent: 21, colorVar: 'var(--red-soft)' },
  { label: 'Crisis', percent: 4, colorVar: 'var(--red)' },
];

// ─── Pending Approvals ────────────────────────────────────────────────────────
export const PENDING_APPROVALS: PendingInstitution[] = [
  {
    id: 'pa-1',
    name: 'Hohoe District Health Directorate',
    type: 'Government',
    region: 'Volta Region',
    contact: 'Dr. Kwame Asare',
    requestedDate: '14 May 2026',
    plan: 'Annual',
    facilityId: null,
  },
  {
    id: 'pa-2',
    name: 'Hearts of Gold Health Foundation',
    type: 'NGO',
    region: 'Greater Accra',
    contact: 'Ms. Ama Dankwah',
    requestedDate: '16 May 2026',
    plan: 'Trial',
    facilityId: null,
  },
];

// ─── Top Institutions ─────────────────────────────────────────────────────────
export const TOP_INSTITUTIONS: TopInstitution[] = [
  {
    name: 'Ho Municipal Health Directorate',
    type: 'Government',
    fieldWorkers: 12,
    screened: 1847,
    onTreatment: 203,
    adherence: 78,
    licenseStatus: 'Active',
    status: 'Active',
  },
  {
    name: 'Kpando Community Health NGO',
    type: 'NGO',
    fieldWorkers: 7,
    screened: 912,
    onTreatment: 88,
    adherence: 64,
    licenseStatus: 'Active',
    status: 'Active',
  },
  {
    name: 'Volta Regional Hospital',
    type: 'Hospital',
    fieldWorkers: 5,
    screened: 641,
    onTreatment: 71,
    adherence: 82,
    licenseStatus: 'Active',
    status: 'Active',
  },
];

// ─── All Institutions ─────────────────────────────────────────────────────────
export const ALL_INSTITUTIONS: Institution[] = [
  {
    id: 'inst-1',
    name: 'Ho Municipal Health Directorate',
    type: 'Government',
    region: 'Volta Region',
    contact: '',
    fieldWorkers: 12,
    totalScreened: 1847,
    licenseExpires: '31 Dec 2026',
    status: 'Active',
  },
  {
    id: 'inst-2',
    name: 'Kpando Community Health NGO',
    type: 'NGO',
    region: 'Volta Region',
    contact: '',
    fieldWorkers: 7,
    totalScreened: 912,
    licenseExpires: '30 Jun 2026',
    status: 'Active',
  },
  {
    id: 'inst-3',
    name: 'Volta Regional Hospital',
    type: 'Hospital',
    region: 'Volta Region',
    contact: '',
    fieldWorkers: 5,
    totalScreened: 641,
    licenseExpires: '31 Dec 2026',
    status: 'Active',
  },
  {
    id: 'inst-4',
    name: 'Accra North Community Health',
    type: 'NGO',
    region: 'Greater Accra',
    contact: '',
    fieldWorkers: 9,
    totalScreened: 503,
    licenseExpires: '15 Sep 2026',
    status: 'Active',
  },
  {
    id: 'inst-5',
    name: 'Hohoe District Health Directorate',
    type: 'Government',
    region: 'Volta Region',
    contact: '',
    fieldWorkers: null,
    totalScreened: null,
    licenseExpires: 'Pending',
    status: 'Pending',
  },
  {
    id: 'inst-6',
    name: 'Hearts of Gold Health Foundation',
    type: 'NGO',
    region: 'Greater Accra',
    contact: '',
    fieldWorkers: null,
    totalScreened: null,
    licenseExpires: 'Trial',
    status: 'Trial',
  },
  {
    id: 'inst-7',
    name: 'Korlekope Pharmacy & Wellness',
    type: 'Pharmacy',
    region: 'Volta Region',
    contact: '',
    fieldWorkers: 3,
    totalScreened: 188,
    licenseExpires: '31 Dec 2026',
    status: 'Active',
  },
];

// ─── Licenses ─────────────────────────────────────────────────────────────────
export const LICENSES: License[] = [
  {
    id: 'lic-1',
    institution: 'Ho Municipal Health Directorate',
    plan: 'Annual · Enterprise',
    seats: 15,
    startDate: '1 Jan 2026',
    expiry: '31 Dec 2026',
    amount: 12000,
    status: 'Active',
  },
  {
    id: 'lic-2',
    institution: 'Kpando Community Health NGO',
    plan: 'Annual · Standard',
    seats: 10,
    startDate: '1 Jul 2025',
    expiry: '30 Jun 2026',
    amount: 6000,
    status: 'Expiring',
  },
  {
    id: 'lic-3',
    institution: 'Volta Regional Hospital',
    plan: 'Annual · Standard',
    seats: 8,
    startDate: '1 Jan 2026',
    expiry: '31 Dec 2026',
    amount: 6000,
    status: 'Active',
  },
  {
    id: 'lic-4',
    institution: 'Korlekope Pharmacy & Wellness',
    plan: 'Annual · Standard',
    seats: 3,
    startDate: '1 Jan 2026',
    expiry: '31 Dec 2026',
    amount: 3600,
    status: 'Active',
  },
  {
    id: 'lic-5',
    institution: 'Hearts of Gold Foundation',
    plan: '30-day Trial',
    seats: 5,
    startDate: '16 May 2026',
    expiry: '15 Jun 2026',
    amount: 0,
    status: 'Trial',
  },
];

// ─── Users ────────────────────────────────────────────────────────────────────
export const USERS: User[] = [
  {
    id: 'usr-1',
    name: 'Ama Osei',
    role: 'Admin',
    institution: 'Ho Municipal',
    email: 'ama.osei@ho.health.gov.gh',
    lastLogin: 'Today 08:14',
    status: 'Active',
  },
  {
    id: 'usr-2',
    name: 'Kofi Darko',
    role: 'Field Worker',
    institution: 'Ho Municipal',
    email: 'k.darko@ho.health.gov.gh',
    lastLogin: 'Yesterday',
    status: 'Active',
  },
  {
    id: 'usr-3',
    name: 'Dr. Esi Asante',
    role: 'Clinician',
    institution: 'Ho Municipal Hospital',
    email: 'e.asante@homuhospital.gh',
    lastLogin: 'Today 09:22',
    status: 'Active',
  },
  {
    id: 'usr-4',
    name: 'Yaa Mensah',
    role: 'Admin',
    institution: 'Kpando NGO',
    email: 'yaa@kpandohealth.org',
    lastLogin: '16 May',
    status: 'Active',
  },
  {
    id: 'usr-5',
    name: 'Fiifi Boateng',
    role: 'Field Worker',
    institution: 'Kpando NGO',
    email: 'f.boateng@kpandohealth.org',
    lastLogin: '18 May',
    status: 'Suspended',
  },
];

// ─── Audit Log ────────────────────────────────────────────────────────────────
export const AUDIT_ENTRIES: AuditEntry[] = [
  {
    id: 'aud-1',
    type: 'login',
    text: '<strong>Dr. Esi Asante</strong> logged in to Facility Portal from Ho Municipal Hospital',
    time: '09:22',
  },
  {
    id: 'aud-2',
    type: 'create',
    text: 'Treatment started for <strong>Abena Tetteh (AF-046)</strong> — Amlodipine 5mg prescribed by Dr. Asante. WhatsApp reminder activated.',
    time: '09:18',
  },
  {
    id: 'aud-3',
    type: 'create',
    text: 'Patient <strong>Kwame Ofori (AF-047)</strong> registered at Kpando Market Screening by field worker Kofi Darko. BP: 178/106 — Crisis.',
    time: '08:52',
  },
  {
    id: 'aud-4',
    type: 'update',
    text: 'Follow-up status updated for <strong>Esi Boateng (AF-031)</strong> — marked attended by CHW.',
    time: '08:41',
  },
  {
    id: 'aud-5',
    type: 'login',
    text: '<strong>Ama Osei</strong> (Institutional Admin, Ho Municipal) logged in.',
    time: '08:14',
  },
  {
    id: 'aud-6',
    type: 'create',
    text: 'New institution account created: <strong>Hearts of Gold Health Foundation</strong> (Trial, Greater Accra).',
    time: 'Yesterday 16:30',
  },
  {
    id: 'aud-7',
    type: 'suspend',
    text: 'Field worker account <strong>Fiifi Boateng</strong> suspended by Institutional Admin Yaa Mensah (Kpando NGO).',
    time: 'Yesterday 14:12',
  },
  {
    id: 'aud-8',
    type: 'update',
    text: 'License renewed for <strong>Volta Regional Hospital</strong> — Annual Standard, 8 seats, GHS 6,000.',
    time: 'Yesterday 11:05',
  },
  {
    id: 'aud-9',
    type: 'create',
    text: '48 patients screened at Kpando Market Screening event — 8 high BP referrals generated.',
    time: 'Yesterday 10:00',
  },
  {
    id: 'aud-10',
    type: 'update',
    text: 'Medication updated for <strong>Mawuli Agbenu</strong> — Amlodipine dose increased to 10mg by Dr. Asante.',
    time: '12 May · 14:02',
  },
];

// ─── Analytics ────────────────────────────────────────────────────────────────
export const REGION_STATS: RegionStat[] = [
  { name: 'Volta Region', screened: 2847, highBP: 712, fillPercent: 82 },
  { name: 'Greater Accra', screened: 1203, highBP: 311, fillPercent: 58 },
  { name: 'Ashanti', screened: 662, highBP: 157, fillPercent: 34 },
];

export const AGE_DISTRIBUTION = [
  { label: '18–30', percent: 12 },
  { label: '31–45', percent: 28 },
  { label: '46–60', percent: 38 },
  { label: '60+', percent: 22 },
];

export const RISK_TREND_DATA = [
  { month: 'Dec', normal: 62, elevated: 21, stage12: 15, crisis: 2 },
  { month: 'Jan', normal: 60, elevated: 22, stage12: 16, crisis: 2 },
  { month: 'Feb', normal: 58, elevated: 21, stage12: 18, crisis: 3 },
  { month: 'Mar', normal: 55, elevated: 22, stage12: 19, crisis: 4 },
  { month: 'Apr', normal: 54, elevated: 21, stage12: 21, crisis: 4 },
  { month: 'May', normal: 54, elevated: 21, stage12: 21, crisis: 4 },
];

export const GENDER_STATS = {
  female: {
    percent: 52,
    normal: 49,
    elevated: 24,
    highCrisis: 27,
  },
  male: {
    percent: 48,
    normal: 44,
    elevated: 19,
    highCrisis: 37,
  },
};

export const DETECTION_RATE_TREND = [
  { month: 'Dec', rate: 19.2, width: 19, color: 'var(--blue)' },
  { month: 'Jan', rate: 21.4, width: 21, color: 'var(--blue)' },
  { month: 'Feb', rate: 24.1, width: 24, color: 'var(--amber)' },
  { month: 'Mar', rate: 26.3, width: 26, color: 'var(--amber)' },
  { month: 'Apr', rate: 28.0, width: 28, color: 'var(--red-soft)' },
  { month: 'May', rate: 30.1, width: 30, color: 'var(--red)', highlight: true },
];

export const ADHERENCE_ROWS: AdherenceRow[] = [
  {
    institution: 'Ho Municipal Health Directorate',
    screened: 1847,
    highBP: 462,
    referred: 421,
    followedUp: 289,
    onTreatment: 203,
    adherence: 78,
    adherenceColor: 'green',
  },
  {
    institution: 'Kpando Community Health NGO',
    screened: 912,
    highBP: 228,
    referred: 201,
    followedUp: 122,
    onTreatment: 88,
    adherence: 64,
    adherenceColor: 'amber',
  },
  {
    institution: 'Volta Regional Hospital',
    screened: 641,
    highBP: 160,
    referred: 148,
    followedUp: 104,
    onTreatment: 71,
    adherence: 82,
    adherenceColor: 'green',
  },
];

// ─── Revenue ──────────────────────────────────────────────────────────────────
export const REVENUE_TREND = [
  { month: 'Dec', value: 5200 },
  { month: 'Jan', value: 6400 },
  { month: 'Feb', value: 7100 },
  { month: 'Mar', value: 7800 },
  { month: 'Apr', value: 7100 },
  { month: 'May', value: 8400 },
];

export const REVENUE_BY_TYPE = [
  { label: 'Government', amount: 'GHS 36k', fillPercent: 72, color: 'var(--purple)' },
  { label: 'Hospital', amount: 'GHS 18k', fillPercent: 36, color: 'var(--blue)' },
  { label: 'NGO', amount: 'GHS 12k', fillPercent: 24, color: 'var(--green)' },
  { label: 'Pharmacy', amount: 'GHS 5.2k', fillPercent: 10, color: 'var(--purple)' },
];

export const TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    institution: 'Ho Municipal Health Directorate',
    type: 'Government',
    plan: 'Annual Enterprise',
    amount: 12000,
    paymentDate: '1 Jan 2026',
    method: 'Bank transfer',
    period: 'Jan–Dec 2026',
    status: 'Paid',
  },
  {
    id: 'tx-2',
    institution: 'Volta Regional Hospital',
    type: 'Hospital',
    plan: 'Annual Standard',
    amount: 6000,
    paymentDate: '1 Jan 2026',
    method: 'Bank transfer',
    period: 'Jan–Dec 2026',
    status: 'Paid',
  },
  {
    id: 'tx-3',
    institution: 'Korlekope Pharmacy & Wellness',
    type: 'Pharmacy',
    plan: 'Annual Standard',
    amount: 3600,
    paymentDate: '1 Jan 2026',
    method: 'Mobile money',
    period: 'Jan–Dec 2026',
    status: 'Paid',
  },
  {
    id: 'tx-4',
    institution: 'Kpando Community Health NGO',
    type: 'NGO',
    plan: 'Annual Standard',
    amount: 6000,
    paymentDate: '1 Jul 2025',
    method: 'Bank transfer',
    period: 'Jul 2025–Jun 2026',
    status: 'Due soon',
  },
  {
    id: 'tx-5',
    institution: 'Accra North Community Health',
    type: 'NGO',
    plan: 'Annual Standard',
    amount: 6000,
    paymentDate: '15 Sep 2025',
    method: 'Bank transfer',
    period: 'Sep 2025–Sep 2026',
    status: 'Paid',
  },
  {
    id: 'tx-6',
    institution: 'Hearts of Gold Foundation',
    type: 'NGO',
    plan: '30-day Trial',
    amount: 0,
    paymentDate: '16 May 2026',
    method: '—',
    period: 'May–Jun 2026',
    status: 'Trial',
  },
];

// ─── Form Options ─────────────────────────────────────────────────────────────
export const INSTITUTION_TYPES = [
  'Government Health Directorate',
  'NGO',
  'Hospital / Clinic',
  'Pharmacy / Pharmacy Chain',
  'Employer Health Programme',
  'Research Institution',
];

export const REGIONS = [
  'Volta Region',
  'Greater Accra',
  'Ashanti',
  'Western',
  'Central',
  'Northern',
  'Eastern',
  'Other',
];

export const LICENSE_PLANS = [
  '30-day Free Trial',
  'Annual Standard (10 seats)',
  'Annual Enterprise (unlimited)',
];

export const LICENSE_PLANS_WITH_PRICE = [
  'Annual Standard (10 seats) — GHS 6,000',
  'Annual Enterprise (unlimited) — GHS 12,000',
];

export const PAYMENT_METHODS = ['Bank Transfer', 'Mobile Money', 'Invoice'];
export const PAYMENT_METHODS_WITH_WAIVED = ['Bank Transfer', 'Mobile Money', 'Invoice', 'Waived (trial/partner)'];
