import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import router from '@/router';

const BACKEND_PORT = 3000;

/**
 * Falls back to whatever host the page itself was loaded from (localhost,
 * or a LAN IP when testing from another device on the same network), so
 * dev machines don't need to hardcode an IP that changes with the network.
 * VITE_API_URL still wins when set, for cases that need a different host.
 */
function resolveBaseUrl(): string {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return `${window.location.protocol}//${window.location.hostname}:${BACKEND_PORT}/api`;
}

// Points to the NestJS API. In production the URL comes from environment variables.
const apiClient = axios.create({
  baseURL: resolveBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the JWT token to every outgoing request.
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// Global error handling: force re-login when the session expires.
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      router.push({ name: 'Login' });
    }
    return Promise.reject(error);
  },
);

export default apiClient;
