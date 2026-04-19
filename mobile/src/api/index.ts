import client from './client';
import type { Lead, Activity, DashboardStats } from '../types';

export const dashboardApi = {
  stats: () => client.get<DashboardStats>('/api/dashboard/stats').then(r => r.data),
};

export const leadsApi = {
  list: (params?: object) => client.get<Lead[]>('/api/leads/', { params }).then(r => ({
    leads: r.data,
    total: parseInt(r.headers['x-total-count'] ?? '0', 10),
  })),
  get: (id: number) => client.get<Lead>(`/api/leads/${id}`).then(r => r.data),
  create: (data: object) => client.post<Lead>('/api/leads/', data).then(r => r.data),
  update: (id: number, data: object) => client.put<Lead>(`/api/leads/${id}`, data).then(r => r.data),
  updateStatus: (id: number, data: object) => client.post<Lead>(`/api/leads/${id}/status`, data).then(r => r.data),
  addComment: (id: number, comment: string) => client.post<Lead>(`/api/leads/${id}/comment`, null, { params: { comment } }).then(r => r.data),
  timeline: (id: number) => client.get<Activity[]>(`/api/leads/${id}/timeline`).then(r => r.data),
  logCall: (id: number, data: object) => client.post(`/api/leads/${id}/call-log`, data).then(r => r.data),
};

export const usersApi = {
  list: () => client.get('/api/users/').then(r => r.data),
  me: () => client.get('/api/auth/me').then(r => r.data),
};
