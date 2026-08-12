import { readString, writeString, remove } from '../utils/storage.js';
import { apiUrl } from './api.js';

const TOKEN_KEY = 'greenhaven.admin.token';

export const getAdminToken = () => readString(TOKEN_KEY);
export const setAdminToken = (t) => {
  if (typeof t !== 'string' || !t) return;
  writeString(TOKEN_KEY, t);
};
export const clearAdminToken = () => remove(TOKEN_KEY);

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getAdminToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(apiUrl(`/api/admin${path}`), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Is the Spring Boot API running on port 8080?');
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    if (response.ok) throw new Error('The server sent a response we could not read.');
  }

  if (!response.ok) {
    const error = new Error(data?.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.sessionEnded = response.status === 401 || response.status === 403;
    throw error;
  }
  return data;
}

export const adminAuthApi = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  activity: (params = {}) => request(`/auth/activity${query(params)}`),
};

export const adminApi = {
  stats: () => request('/stats'),
  analytics: () => request('/analytics'),

  orders: (params = {}) => request(`/orders${query(params)}`),
  order: (id) => request(`/orders/${id}`),
  deliveryStatuses: () => request('/delivery-statuses'),
  setDeliveryStatus: (id, status) =>
    request(`/orders/${id}/delivery-status`, { method: 'PATCH', body: { status } }),

  payments: (params = {}) => request(`/payments${query(params)}`),

  users: (params = {}) => request(`/users${query(params)}`),
  setBlocked: (id, blocked) =>
    request(`/users/${id}/blocked`, { method: 'PATCH', body: { blocked } }),

  inventory: (params = {}) => request(`/inventory${query(params)}`),
  setStock: (id, stock) =>
    request(`/inventory/${id}/stock`, { method: 'PATCH', body: { stock: Number(stock) } }),

  createProduct: (body) => request('/products', { method: 'POST', body }),
  updateProduct: (id, body) => request(`/products/${id}`, { method: 'PUT', body }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  setProductGallery: (id, urls) =>
    request(`/products/${id}/gallery`, { method: 'PUT', body: { urls } }),
  setProductListing: (id, discontinued) =>
    request(`/products/${id}/listing?discontinued=${discontinued}`, { method: 'PATCH' }),

  uploadProductImage: async (file) => {
    const body = new FormData();
    body.append('file', file);
    const response = await fetch(apiUrl('/api/admin/products/image'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${getAdminToken()}` },
      body,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || `Upload failed (${response.status})`);
    return data;
  },

  reviews: (params = {}) => request(`/reviews${query(params)}`),
  setReviewStatus: (id, status, reason) =>
    request(`/reviews/${id}/status`, { method: 'PATCH', body: { status, reason } }),
  deleteReview: (id) => request(`/reviews/${id}`, { method: 'DELETE' }),

  coupons: (params = {}) => request(`/coupons${query(params)}`),
  createCoupon: (body) => request('/coupons', { method: 'POST', body }),
  updateCoupon: (id, body) => request(`/coupons/${id}`, { method: 'PUT', body }),
  setCouponState: (id, active) =>
    request(`/coupons/${id}/state?active=${active}`, { method: 'PATCH' }),
};

function query(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export default request;
