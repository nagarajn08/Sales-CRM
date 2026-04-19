export type UserRole = 'admin' | 'manager' | 'user';
export type OrgType = 'individual' | 'corporate';
export type LeadStatus =
  | 'new' | 'call_back' | 'interested_call_back' | 'busy'
  | 'not_reachable' | 'not_interested' | 'converted';
export type LeadPriority = 'hot' | 'warm' | 'cold';

export interface User {
  id: number; name: string; email: string; role: UserRole;
  is_superadmin: boolean; org_name: string | null; org_type: OrgType | null;
}

export interface Lead {
  id: number; name: string; mobile: string | null; email: string | null;
  whatsapp: string | null; company: string | null; status: LeadStatus;
  priority: LeadPriority; source: string; notes: string | null;
  tags: string | null; deal_value: number | null;
  next_followup_at: string | null; score: number;
  assigned_to: { id: number; name: string } | null;
  created_by: { id: number; name: string } | null;
  created_at: string; updated_at: string; is_active: boolean;
}

export interface Activity {
  id: number; activity_type: string; comment: string | null;
  old_status: string | null; new_status: string | null;
  followup_date: string | null;
  user: { id: number; name: string } | null;
  created_at: string;
}

export interface DashboardStats {
  total_leads: number; new_today: number; follow_ups_today: number;
  overdue_followups: number; converted_this_month: number;
  pipeline_value: number; converted_value: number;
  by_status: Record<string, number>;
}

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New', call_back: 'Call Back', interested_call_back: 'Interested',
  busy: 'Busy', not_reachable: 'Not Reachable',
  not_interested: 'Not Interested', converted: 'Converted',
};

export const STATUS_COLORS: Record<LeadStatus, string> = {
  new: '#6366f1', call_back: '#f59e0b', interested_call_back: '#10b981',
  busy: '#94a3b8', not_reachable: '#f97316', not_interested: '#ef4444',
  converted: '#059669',
};

export const PRIORITY_COLORS: Record<LeadPriority, string> = {
  hot: '#ef4444', warm: '#f59e0b', cold: '#3b82f6',
};
