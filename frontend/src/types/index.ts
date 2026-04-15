export type UserRole = "admin" | "manager" | "user";
export type OrgType = "individual" | "corporate";

export interface Organization {
  id: number;
  name: string;
  type: OrgType;
  webhook_token: string;
  is_active: boolean;
  created_at: string;
}

export interface User {
  id: number;
  organization_id: number | null;
  email: string;
  name: string;
  mobile: string | null;
  role: UserRole;
  is_active: boolean;
  is_owner: boolean;
  is_superadmin: boolean;
  last_login: string | null;
  created_at: string;
}

export interface OrgSummary {
  id: number;
  name: string;
  type: OrgType;
  is_active: boolean;
  created_at: string;
  owner_email: string | null;
  owner_name: string | null;
  user_count: number;
  lead_count: number;
  active_lead_count: number;
  converted_count: number;
}

export interface OrgDetail extends OrgSummary {
  webhook_token: string;
  users: Array<{
    id: number;
    name: string;
    email: string;
    role: UserRole;
    is_active: boolean;
    is_owner: boolean;
    last_login: string | null;
    created_at: string;
  }>;
}

export interface PlatformStats {
  total_orgs: number;
  individual_orgs: number;
  corporate_orgs: number;
  total_users: number;
  total_leads: number;
  active_leads: number;
  converted_today: number;
  new_orgs_today: number;
}

export interface UserSummary {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export type LeadStatus = "new" | "call_back" | "interested_call_back" | "busy" | "not_reachable" | "not_interested" | "converted";
export type LeadPriority = "hot" | "warm" | "cold";
export type LeadSource = "manual" | "import" | "website" | "reference" | "cold_call" | "facebook" | "instagram" | "linkedin" | "google_ads" | "other";

export interface Lead {
  id: number;
  web_id: string | null;
  name: string;
  email: string | null;
  mobile: string | null;
  whatsapp: string | null;
  company: string | null;
  notes: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  source: LeadSource;
  campaign_name: string | null;
  tags: string | null;
  assigned_to: UserSummary | null;
  created_by: UserSummary;
  next_followup_at: string | null;
  last_comment: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: number;
  activity_type: string;
  old_status: string | null;
  new_status: string | null;
  comment: string | null;
  followup_date: string | null;
  meta: string | null;
  user: UserSummary;
  created_at: string;
}

export interface Notification {
  id: number;
  message: string;
  is_read: boolean;
  due_at: string | null;
  lead_id: number | null;
  created_at: string;
}

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  is_global: boolean;
  user_id: number | null;
  created_at: string;
}

export interface UserStats {
  user_id: number;
  user_name: string;
  total_leads: number;
  new: number;
  call_back: number;
  interested_call_back: number;
  busy: number;
  not_reachable: number;
  not_interested: number;
  converted: number;
  overdue_followups: number;
}

export interface SourceCount { source: string; count: number; }
export interface StatusCount { status: string; label: string; count: number; }

export interface DashboardStats {
  total_leads: number;
  active_leads: number;
  converted_today: number;
  converted_this_week: number;
  overdue_followups: number;
  new_leads_today: number;
  new_leads_this_week: number;
  not_interested_today: number;
  followups_due_today: number;
  followups_overdue: number;
  followups_done_today: number;
  activities_today: number;
  leads_by_source_today: SourceCount[];
  leads_by_source_all: SourceCount[];
  status_breakdown: StatusCount[];
  conversion_rate: number;
  user_stats: UserStats[];
  due_followups: Lead[];
}

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  call_back: "Call Back",
  interested_call_back: "Interested - Call Back",
  busy: "Busy",
  not_reachable: "Not Reachable",
  not_interested: "Not Interested",
  converted: "Converted",
};

export const STATUS_COLORS: Record<LeadStatus, string> = {
  new:                  "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  call_back:            "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  interested_call_back: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  busy:                 "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  not_reachable:        "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  not_interested:       "bg-red-500/10 text-red-600 dark:text-red-400",
  converted:            "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

export const PRIORITY_COLORS: Record<LeadPriority, string> = {
  hot:  "bg-red-500/10 text-red-600 dark:text-red-400",
  warm: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  cold: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

export const FOLLOWUP_REQUIRED_STATUSES: LeadStatus[] = ["call_back", "interested_call_back", "busy", "not_reachable"];
export const TERMINAL_STATUSES: LeadStatus[] = ["not_interested", "converted"];
