import axios, { AxiosRequestConfig } from 'axios';

const instance = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('rms_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

instance.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success !== undefined) {
      return response.data.data;
    }
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('rms_token');
      localStorage.removeItem('rms_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  },
);

export const apiClient = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    instance.get(url, config) as any,
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    instance.post(url, data, config) as any,
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    instance.put(url, data, config) as any,
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    instance.delete(url, config) as any,
};
