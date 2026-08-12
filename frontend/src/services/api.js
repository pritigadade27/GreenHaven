import { readString, writeString, remove } from '../utils/storage.js';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export const apiUrl = (path) => `${API_BASE}${path}`;

export const fileUrl = (path) =>
  !path || /^https?:\/\//.test(path) ? path : `${API_BASE}${path}`;

const TOKEN_KEY = 'greenhaven.token';

export const getToken = () => readString(TOKEN_KEY);
export const setToken = (t) => {
  if (typeof t !== 'string' || !t) return;
  writeString(TOKEN_KEY, t);
};
export const clearToken = () => remove(TOKEN_KEY);

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(apiUrl(`/api${path}`), {
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
    error.fields = data?.fields;
    error.status = response.status;
    throw error;
  }
  return data;
}

async function download(path) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(apiUrl(`/api${path}`), { headers });
  } catch {
    throw new Error('Cannot reach the server. Is the Spring Boot API running on port 8080?');
  }

  if (!response.ok) {
    let message = `Download failed (${response.status})`;
    try {
      const data = JSON.parse(await response.text());
      if (data?.message) message = data.message;
    } catch {
      // ignore
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const disposition = response.headers.get('Content-Disposition') || '';
  const named = /filename="?([^"]+)"?/.exec(disposition);
  return { blob: await response.blob(), filename: named ? named[1] : 'download.pdf' };
}

export async function saveFile(path) {
  const { blob, filename } = await download(path);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}

export const authApi = {
  register: (fullName, email, password, phone = '') =>
    request('/auth/register', { method: 'POST', body: { fullName, email, password, phone } }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/auth/me', { auth: true }),

  forgotPassword: (email) =>
    request('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token, newPassword, confirmPassword) =>
    request('/auth/reset-password', { method: 'POST', body: { token, newPassword, confirmPassword } }),
};

export const orderApi = {
  start: (shipping, items, couponCode) =>
    request('/orders', {
      method: 'POST',
      auth: true,
      body: { ...shipping, items, couponCode: couponCode || null },
    }),
  verify: (payload) => request('/orders/verify', { method: 'POST', auth: true, body: payload }),
  simulate: (razorpayOrderId, succeed = true) =>
    request(`/orders/${razorpayOrderId}/simulate?succeed=${succeed}`, {
      method: 'POST',
      auth: true,
    }),
  cancel: (razorpayOrderId) =>
    request(`/orders/${razorpayOrderId}/cancel`, { method: 'POST', auth: true }),
  mine: () => request('/orders', { auth: true }),
};

export const profileApi = {
  me: () => request('/profile', { auth: true }),
  update: (body) => request('/profile', { method: 'PATCH', auth: true, body }),

  requestEmailChange: (email, password) =>
    request('/profile/email', { method: 'POST', auth: true, body: { email, password } }),
  confirmEmailChange: async (token) => {
    const session = await request(`/profile/email/confirm?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      auth: true,
    });
    setToken(session.token);
    return session;
  },
  cancelEmailChange: () => request('/profile/email', { method: 'DELETE', auth: true }),

  changePassword: (currentPassword, newPassword, confirmPassword) =>
    request('/profile/password', {
      method: 'POST',
      auth: true,
      body: { currentPassword, newPassword, confirmPassword },
    }),

  orders: () => request('/profile/orders', { auth: true }),
  order: (orderNumber) => request(`/profile/orders/${orderNumber}`, { auth: true }),
  cancelOrder: (orderNumber, reason) =>
    request(`/profile/orders/${orderNumber}/cancel`, {
      method: 'POST',
      auth: true,
      body: { reason },
    }),
  reorder: (orderNumber) => request(`/profile/orders/${orderNumber}/reorder`, { auth: true }),
  downloadInvoice: (orderNumber) => saveFile(`/profile/orders/${orderNumber}/invoice`),
  downloadDocument: (number) => saveFile(`/profile/documents/${encodeURIComponent(number)}`),

  payments: () => request('/profile/payments', { auth: true }),
  invoices: () => request('/profile/invoices', { auth: true }),

  notifications: () => request('/profile/notifications', { auth: true }),
  markNotificationsRead: () =>
    request('/profile/notifications/read', { method: 'POST', auth: true }),
};

export const reviewApi = {
  list: (slug, page = 0, size = 10) =>
    request(`/plants/${slug}/reviews?page=${page}&size=${size}`, { auth: true }),
  eligibility: (slug) => request(`/reviews/${slug}/eligibility`, { auth: true }),
  write: (slug, body) => request(`/reviews/${slug}`, { method: 'POST', auth: true, body }),
  edit: (id, body) => request(`/reviews/${id}`, { method: 'PUT', auth: true, body }),
  remove: (id) => request(`/reviews/${id}`, { method: 'DELETE', auth: true }),
  mine: () => request('/reviews/mine', { auth: true }),

  uploadImage: async (file) => {
    const body = new FormData();
    body.append('file', file);

    const headers = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
      response = await fetch(apiUrl('/api/reviews/image'), { method: 'POST', headers, body });
    } catch {
      throw new Error('Cannot reach the server. Is the Spring Boot API running on port 8080?');
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || `Upload failed (${response.status})`);
    return data;
  },
};

export const couponApi = {
  quote: (code, items) =>
    request('/coupons/quote', { method: 'POST', auth: true, body: { code, items } }),
};

export const addressApi = {
  list: () => request('/addresses', { auth: true }),
  add: (body) => request('/addresses', { method: 'POST', auth: true, body }),
  update: (id, body) => request(`/addresses/${id}`, { method: 'PUT', auth: true, body }),
  makeDefault: (id) => request(`/addresses/${id}/default`, { method: 'POST', auth: true }),
  remove: (id) => request(`/addresses/${id}`, { method: 'DELETE', auth: true }),
};

export const contactApi = {
  send: ({ name, email, subject, message }) =>
    request('/contact', { method: 'POST', body: { name, email, subject, message } }),
  subscribe: (email) => request('/newsletter', { method: 'POST', body: { email } }),
};

export default request;
