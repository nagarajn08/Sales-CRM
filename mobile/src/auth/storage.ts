import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'crm_access_token';
const REFRESH_KEY = 'crm_refresh_token';
const USER_KEY = 'crm_user';

export async function setTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync(ACCESS_KEY, access);
  await SecureStore.setItemAsync(REFRESH_KEY, refresh);
}

export async function getTokens() {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
  ]);
  return { accessToken, refreshToken };
}

export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}

export async function saveUser(user: object) {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function loadUser() {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}
