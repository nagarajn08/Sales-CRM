import api from "./axiosInstance";
import type { Lead, User, EmailTemplate, DashboardStats, Activity, Notification } from "../types";

// Auth
export const authApi = {
  login: (email: string, password: string) => api.post("/api/auth/login", { email, password }).then(r => r.data),
  logout: () => api.post("/api/auth/logout"),
  refresh: () => api.post("/api/auth/refresh").then(r => r.data),
  me: () => api.get<User>("/api/auth/me").then(r => r.data),
  signupIndividual: (data: { name: string; email: string; password: string; mobile?: string }) =>
    api.post("/api/auth/signup/individual", data).then(r => r.data),
  signupCorporate: (data: { company_name: string; admin_name: string; email: string; password: string; mobile?: string }) =>
    api.post("/api/auth/signup/corporate", data).then(r => r.data),
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

// Settings
export const settingsApi = {
  get: () => api.get<Record<string, string>>("/api/settings/").then(r => r.data),
  update: (settings: Record<string, string>) => api.put("/api/settings/", { settings }),
  getWebhook: () => api.get<{ webhook_token: string; webhook_url: string; verify_token: string; org_name: string; org_type: string }>("/api/settings/webhook").then(r => r.data),
  regenerateWebhook: () => api.post<{ webhook_token: string; webhook_url: string }>("/api/settings/webhook/regenerate").then(r => r.data),
};
