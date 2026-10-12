const rawApiUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').trim();

export const API_URL = (() => {
  if (!rawApiUrl) return 'http://127.0.0.1:8000';
  if (rawApiUrl.includes('localhost') || rawApiUrl.includes('127.0.0.1')) {
    return rawApiUrl.replace(/\/+$/, '');
  }
  if (!rawApiUrl.endsWith('/api.php')) {
    return `${rawApiUrl.replace(/\/+$/, '')}/api.php`;
  }
  return rawApiUrl;
})();

export const BASE_URL = API_URL.replace(/\/api\.php$/, '');

