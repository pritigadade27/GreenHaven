/**
 * The admin dashboard's own API client.
 *
 * Deliberately separate from services/api.js, with its own token key. A shopper
 * and an admin can be signed in on the same machine without one clobbering the
 * other, and — more importantly — signing out of the shop never leaves an admin
 * token behind, or the reverse.
 */
import { readString, writeString, remove } from '../utils/storage.js';

const TOKEN_KEY = 'greenhaven.admin.token';

export const getAdminToken = () => readString(TOKEN_KEY);
export const setAdminToken = (t) => {
  if (typeof t !== 'string' || !t) return;
  writeString(TOKEN_KEY, t);
};
export const clearAdminToken = () => remove(TOKEN_KEY);

/**
 * Throws an Error carrying the server's message. A 401/403 is marked so the
 * route guard can tell "your session ended" apart from "that failed".
 */
async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getAdminToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`/api/admin${path}`, {
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
    // The session may have been revoked by a logout elsewhere, an idle timeout,
    // or a sign-in on another machine. The guard turns this into a redirect.
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

  /**
   * Multipart, so it cannot go through request(): that sets a JSON content
   * type, and the browser must set its own with the multipart boundary.
   */
  uploadProductImage: async (file) => {
    const body = new FormData();
    body.append('file', file);
    const response = await fetch('/api/admin/products/image', {
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
  // Off, not deleted: paid orders name the code they used.
  setCouponState: (id, active) =>
    request(`/coupons/${id}/state?active=${active}`, { method: 'PATCH' }),
};

/** Builds a query string, dropping empty values so "" is not sent as a filter. */
function query(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export default request;
