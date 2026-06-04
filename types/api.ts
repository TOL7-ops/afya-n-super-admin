/**
 * TypeScript interfaces mirroring the Afya super-admin API response schemas.
 * All paths under /api/v1/super-admin/*
 */

// ─── Facilities / Institutions ────────────────────────────────────────────────
export interface FacilityResponse {
  id: number;
  name: string;
  type: string | null;
  address: string | null;
  region: string | null;
  contact_name: string | null;
  contact_number: string | null;
  email: string | null;
  // License fields — API returns both names, handle both
  plan: string | null;
  license_plan: string | null;
  license_expiry: string | null;       // from /super-admin/institutions
  license_expires_at: string | null;   // legacy alias
  is_active: boolean;
  status: string | null;               // "Active" | "Suspended" | etc from API
  created_at: string;
  // Seat / worker fields
  seats: number | null;
  max_seats: number | null;
  active_seats: number | null;
  field_workers_count: number | null;  // from /super-admin/institutions
  seat_utilization_percent: number | null;
  // Screening
  total_screened: number | null;       // from /super-admin/institutions
  notes: string | null;
}

/** Payload for POST /api/v1/super-admin/institutions */
export interface InstitutionCreatePayload {
  name: string;
  type?: string | null;
  region?: string | null;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  license_plan?: string | null;
  seats?: number | null;
  notes?: string | null;
}

/**
 * Extended response from POST /api/v1/super-admin/institutions.
 * The backend includes `setup_token` in the creation response so the super admin
 * can display (and log) the real token that was emailed to the institution.
 */
export interface InstitutionCreateResponse extends FacilityResponse {
  /** One-time setup token emailed to the institution admin, e.g. "AFYA-AB12-CD34-EF56" */
  setup_token?: string | null;
  /** URL the admin should visit to complete onboarding (may be returned by backend) */
  setup_url?: string | null;
}

/** Keep old alias for compatibility */
export type FacilityCreateWithoutUser = InstitutionCreatePayload & {
  /** Legacy alias — maps to contact_name on the API */
  admin_name?: string;
  /** Legacy alias — maps to email on the API */
  admin_email?: string;
  address?: string | null;
  contact_number?: string | null;
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardSummaryResponse {
  active_institutions: number;
  institutions_increment: number;
  total_screened: number;
  on_active_treatment: number;
}

export interface ScreeningsTrendResponse {
  months: string[];
  screenings: number[];
}

export interface BpDistributionResponse {
  normal_pct: number;
  elevated_pct: number;
  stage_1_2_pct: number;
  crisis_pct: number;
}

export interface PendingApprovalItem {
  id: string | number;          // API returns string token e.g. "token-2"
  name: string;
  type: string | null;
  region: string | null;
  contact_person: string | null;  // API field name
  contact_name?: string | null;   // legacy alias
  requested_date: string | null;  // API field name
  created_at?: string | null;     // legacy alias
  requested_plan: string | null;  // API field name
  license_plan?: string | null;   // legacy alias
  [key: string]: unknown;
}

export interface TopInstitutionItem {
  id: number;
  name: string;
  type: string | null;
  field_workers: number;
  screened: number;
  on_treatment: number;
  adherence_rate: number;
  license_status: string | null;
  status: string | null;
  [key: string]: unknown;
}

// ─── Licenses ─────────────────────────────────────────────────────────────────
export interface LicenseSummaryResponse {
  active_licenses: number;
  expiring_licenses: number;
  seat_utilization_pct: number;
  seats_active: number;
}

export interface LicenseItem {
  id: number;
  institution_name: string;
  institution_id?: number;
  plan: string;
  seats: number | null;
  start_date: string | null;
  expires_at: string | null;
  expiry_date?: string | null;   // legacy alias
  amount: number | null;
  is_active: boolean;
  status?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  [key: string]: unknown;
}

/** Payload for POST /api/v1/super-admin/licenses */
export interface IssueLicensePayload {
  institution_name: string;
  plan: string;
  start_date: string;
  seats?: number | null;
  payment_method?: string | null;
  notes?: string | null;
  amount?: number | null;
}

/** Payload for POST /api/v1/super-admin/licenses/{id}/convert-trial */
export interface ConvertTrialPayload {
  plan: string;
  payment_method?: string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export interface AnalyticsSummaryResponse {
  total_screened: number;
  high_bp_detections: number;
  referrals: number;
  follow_up_completions: number;
  // Legacy fields — kept for any downstream compatibility
  total_referred?: number;
  referral_rate?: number;
  active_adherence_patients?: number;
  bp_distribution_counts?: Record<string, number>;
  bp_distribution_percentages?: Record<string, number>;
  [key: string]: unknown;
}

export interface AnalyticsBreakdownsResponse {
  // API returns these exact keys
  regional: Array<{
    region: string;
    screenings: number;
    high_bp?: number;
    [key: string]: unknown;
  }> | null;
  age: Array<{
    age_range: string;
    count: number;
    [key: string]: unknown;
  }> | null;
  gender: Array<{
    gender: string;
    count: number;
    [key: string]: unknown;
  }> | null;
  risk_trends: Array<{
    month: string;
    normal: number;
    elevated: number;
    high: number;      // API uses "high" not "stage12"
    crisis: number;
    [key: string]: unknown;
  }> | null;
  detection_rate: Array<{
    month: string;
    rate: number;
    [key: string]: unknown;
  }> | null;
  [key: string]: unknown;
}

export interface InstitutionPerformanceItem {
  // API may use either field name
  institution_name: string | null;
  name?: string | null;
  // Numeric fields — all nullable
  screened: number | null;
  total_screened?: number | null;
  high_bp: number | null;
  high_bp_count?: number | null;
  referred: number | null;
  referrals?: number | null;
  followed_up: number | null;
  follow_up_completions?: number | null;
  on_treatment: number | null;
  on_active_treatment?: number | null;
  adherence_rate: number | null;
  avg_adherence?: number | null;
  [key: string]: unknown;
}

// Legacy types — kept for compatibility
export interface AnalyticsTimelineEntry {
  date: string;
  count: number;
}
export interface AnalyticsTimelineResponse {
  period: string;
  from_date: string;
  timeline: AnalyticsTimelineEntry[];
  total_in_period: number;
  [key: string]: unknown;
}
export interface AnalyticsAdherenceResponse {
  enrolled_patients: number;
  total_logs_all_time: number;
  logs_last_7_days: number;
  adherence_rate_7d_percent: number;
  daily_breakdown: number[];
  [key: string]: unknown;
}
export interface AnalyticsReferralsResponse {
  total_screened: number;
  total_referred: number;
  converted_to_intake: number;
  conversion_rate_percent: number;
  lost_to_followup: number;
  opted_out: number;
  [key: string]: unknown;
}

// ─── Revenue ──────────────────────────────────────────────────────────────────
export interface RevenueSummaryResponse {
  ARR: number;
  MRR: number;
  renewals_due_30_days: number;
  total_revenue: number;
}

export interface RevenueMonthlyTrendResponse {
  months: string[];
  revenue: number[];
}

export interface RevenueByTypeResponse {
  Government: number;
  NGO: number;
  Hospital: number;
  Pharmacy: number;
  Employer: number;
  [key: string]: number;
}

export interface RevenueTransactionItem {
  id: number;
  institution_name: string | null;
  amount: number | null;
  paid_at: string | null;            // actual field name
  payment_date?: string | null;      // alias
  payment_method: string | null;
  status: string | null;
  invoice_number: string | null;
  // These are NOT in the API response — enriched client-side from licenses list
  type?: string | null;
  plan?: string | null;
  period?: string | null;
  start_date?: string | null;
  expires_at?: string | null;
  [key: string]: unknown;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export interface UserResponse {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  facility_id: number | null;
  facility_name: string | null;
  // Last login — API may use any of these field names
  last_login: string | null;
  last_login_at?: string | null;
  last_seen?: string | null;
  last_active?: string | null;
  created_at: string;
  [key: string]: unknown;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────
export interface AuditLogEntry {
  id: number;
  agent_name: string | null;
  action: string;
  details: string | null;
  timestamp: string;
  [key: string]: unknown;
}

/** Legacy alias used by old hooks */
export type AgentActivityLogResponse = AuditLogEntry & {
  agent_id?: number;
  patient_id?: number | null;
};

// ─── Settings ─────────────────────────────────────────────────────────────────
export interface WhatsAppSettingsResponse {
  provider: string;
  api_key: string | null;
  webhook_url: string | null;
  status: string;
}

export interface ComplianceSettingsResponse {
  consent_required: boolean;
  data_retention_days: number;
  compliance_standard: string;
}

export interface PermissionRoleItem {
  role: string;
  permissions: string[];
  [key: string]: unknown;
}
