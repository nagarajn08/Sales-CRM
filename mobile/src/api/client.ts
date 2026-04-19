import axios from 'axios';
import { getTokens, setTokens, clearTokens } from '../auth/storage';

// Change this to your server IP when testing on a physical device
// For Android emulator: http://10.0.2.2:8000
// For physical device: http://YOUR_LOCAL_IP:8000
// For production: https://yourdomain.com
export const API_BASE = 'http://10.0.2.2:8000';

const client = axios.create({ baseURL: API_BASE, timeout: 15000 });

client.interceptors.request.use(async (config) => {
  const { accessToken } = await getTokens();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

client.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { refreshToken } = await getTokens();
        if (!refreshToken) throw new Error('No refresh token');
        const res = await axios.post(`${API_BASE}/api/auth/mobile/refresh`, { refresh_token: refreshToken });
        await setTokens(res.data.access_token, refreshToken);
        original.headers.Authorization = `Bearer ${res.data.access_token}`;
        return client(original);
      } catch {
        await clearTokens();
        // NavigationRef reset handled by AuthContext
      }
    }
    return Promise.reject(error);
  }
);

export default client;
