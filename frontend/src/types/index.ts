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
  email: string;
  name: string;
  mobile: string | null;
  role: UserRole;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface UserSummary {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export type LeadStatus = "new" | "call_back" | "busy" | "not_reachable" | "not_interested" | "converted";
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
  assigned_to: UserSummary | null;
  created_by: UserSummary;
  next_followup_at: string | null;
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
  busy: number;
  not_reachable: number;
  not_interested: number;
  converted: number;
  overdue_followups: number;
}

export interface DashboardStats {
  total_leads: number;
  active_leads: number;
  converted_today: number;
  overdue_followups: number;
  new_leads_today: number;
  user_stats: UserStats[];
  due_followups: Lead[];
}

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  call_back: "Call Back",
  busy: "Busy",
  not_reachable: "Not Reachable",
  not_interested: "Not Interested",
  converted: "Converted",
};

export const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-700",
  call_back: "bg-yellow-100 text-yellow-700",
  busy: "bg-orange-100 text-orange-700",
  not_reachable: "bg-gray-100 text-gray-600",
  not_interested: "bg-red-100 text-red-700",
  converted: "bg-green-100 text-green-700",
};

export const PRIORITY_COLORS: Record<LeadPriority, string> = {
  hot: "bg-red-100 text-red-700",
  warm: "bg-amber-100 text-amber-700",
  cold: "bg-sky-100 text-sky-700",
};

export const FOLLOWUP_REQUIRED_STATUSES: LeadStatus[] = ["call_back", "busy", "not_reachable"];
export const TERMINAL_STATUSES: LeadStatus[] = ["not_interested", "converted"];
