import api from "./axiosInstance";
import type { Lead, User, EmailTemplate, DashboardStats, Activity, Notification, OrgSummary, OrgDetail, PlatformStats } from "../types";

// Auth
export const authApi = {
  login: (email: string, password: string) => api.post("/api/auth/login", { email, password }).then(r => r.data),
  logout: () => api.post("/api/auth/logout"),
  refresh: () => api.post("/api/auth/refresh").then(r => r.data),
  me: () => api.get<User>("/api/auth/me").then(r => r.data),
  otpRequest: (data: { email: string; mobile: string }) =>
    api.post<{ detail: string; email_sent: boolean; dev_email_otp: string | null; dev_mobile_otp: string | null }>("/api/auth/otp/request", data).then(r => r.data),
  otpVerify: (data: { email: string; mobile: string; email_otp: string; mobile_otp: string }) =>
    api.post<{ verification_token: string }>("/api/auth/otp/verify", data).then(r => r.data),
  signupIndividual: (data: { name: string; email: string; password: string; mobile: string; verification_token: string }) =>
    api.post("/api/auth/signup/individual", data).then(r => r.data),
  signupCorporate: (data: { company_name: string; admin_name: string; email: string; password: string; mobile: string; verification_token: string }) =>
    api.post("/api/auth/signup/corporate", data).then(r => r.data),
  forgotPassword: (email: string) =>
    api.post<{ detail: string; email_sent: boolean; dev_otp: string | null }>("/api/auth/forgot-password", { email }).then(r => r.data),
  resetPassword: (data: { email: string; otp: string; new_password: string }) =>
    api.post("/api/auth/reset-password", data).then(r => r.data),
};

// Users
export const usersApi = {
  list: () => api.get<User[]>("/api/users/").then(r => r.data),
  create: (data: object) => api.post<User>("/api/users/", data).then(r => r.data),
  update: (id: number, data: object) => api.put<User>(`/api/users/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/api/users/${id}`),
};

// Leads
export const leadsApi = {
  list: (params?: object) => api.get<Lead[]>("/api/leads/", { params }).then(r => r.data),
  create: (data: object) => api.post<Lead>("/api/leads/", data).then(r => r.data),
  get: (id: number) => api.get<Lead>(`/api/leads/${id}`).then(r => r.data),
  update: (id: number, data: object) => api.put<Lead>(`/api/leads/${id}`, data).then(r => r.data),
  updateStatus: (id: number, data: object) => api.post<Lead>(`/api/leads/${id}/status`, data).then(r => r.data),
  addComment: (id: number, comment: string) => api.post<Lead>(`/api/leads/${id}/comment`, null, { params: { comment } }).then(r => r.data),
  reassign: (id: number, assigned_to_id: number) => api.post<Lead>(`/api/leads/${id}/reassign`, { assigned_to_id }).then(r => r.data),
  timeline: (id: number) => api.get<Activity[]>(`/api/leads/${id}/timeline`).then(r => r.data),
  import: (file: File, assigned_to_id?: number) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/api/leads/import", form, { params: assigned_to_id ? { assigned_to_id } : {} }).then(r => r.data);
  },
  delete: (id: number) => api.delete(`/api/leads/${id}`),
  bulk: (data: { lead_ids: number[]; action: string; status?: string; assigned_to_id?: number }) =>
    api.post<{ ok: boolean; affected: number }>("/api/leads/bulk", data).then(r => r.data),
  export: (params?: object) => api.get("/api/leads/export", { params, responseType: "blob" }).then(r => r.data),
  logCall: (id: number, data: { call_type: string; duration_minutes?: number; outcome?: string; notes?: string }) =>
    api.post(`/api/leads/${id}/call`, data).then(r => r.data),
};

// Dashboard
export const dashboardApi = {
  stats: () => api.get<DashboardStats>("/api/dashboard/stats").then(r => r.data),
};

// Templates
export const templatesApi = {
  list: () => api.get<EmailTemplate[]>("/api/templates/").then(r => r.data),
  create: (data: object) => api.post<EmailTemplate>("/api/templates/", data).then(r => r.data),
  update: (id: number, data: object) => api.put<EmailTemplate>(`/api/templates/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/api/templates/${id}`),
};

// Notifications
export const notificationsApi = {
  list: () => api.get<Notification[]>("/api/notifications/").then(r => r.data),
  unreadCount: () => api.get<{ count: number }>("/api/notifications/unread-count").then(r => r.data),
  markRead: (id: number) => api.put(`/api/notifications/${id}/read`),
  markAllRead: () => api.put("/api/notifications/read-all"),
};

// Super Admin
export const superAdminApi = {
  stats: () => api.get<PlatformStats>("/api/superadmin/stats").then(r => r.data),
  listOrgs: () => api.get<OrgSummary[]>("/api/superadmin/orgs").then(r => r.data),
  getOrg: (id: number) => api.get<OrgDetail>(`/api/superadmin/orgs/${id}`).then(r => r.data),
  toggleOrg: (id: number) => api.patch<{ id: number; is_active: boolean }>(`/api/superadmin/orgs/${id}/toggle`).then(r => r.data),
};

// Settings
export const settingsApi = {
  get: () => api.get<Record<string, string>>("/api/settings/").then(r => r.data),
  update: (settings: Record<string, string>) => api.put("/api/settings/", { settings }),
  getWebhook: () => api.get<{ webhook_token: string; webhook_url: string; verify_token: string; org_name: string; org_type: string }>("/api/settings/webhook").then(r => r.data),
  regenerateWebhook: () => api.post<{ webhook_token: string; webhook_url: string }>("/api/settings/webhook/regenerate").then(r => r.data),
};
