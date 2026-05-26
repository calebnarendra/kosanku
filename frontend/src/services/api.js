import axios from 'axios';

function resolveApiBaseUrl() {
  const configuredUrl = process.env.REACT_APP_API_URL;

  if (configuredUrl && configuredUrl !== 'auto') {
    return configuredUrl;
  }

  if (typeof window !== 'undefined' && window.location?.hostname) {
    const protocol = window.location.protocol || 'http:';
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:3000/api`;
  }

  return 'http://localhost:3000/api';
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
