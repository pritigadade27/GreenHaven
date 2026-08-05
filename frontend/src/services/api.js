import { readString, writeString, remove } from '../utils/storage.js';

/** Green Haven — the single place the app talks to the Spring Boot API. */

const TOKEN_KEY = 'greenhaven.token';

// Storage can be unavailable (Safari Private Browsing, enterprise policy) or
// full. Signing in must not crash the app because of it — see utils/storage.js.
export const getToken = () => readString(TOKEN_KEY);
export const setToken = (t) => {
  // Guarding against the string "undefined", which is truthy and would make
  // every later request send `Authorization: Bearer undefined`.
  if (typeof t !== 'string' || !t) return;
  writeString(TOKEN_KEY, t);
};
export const clearToken = () => remove(TOKEN_KEY);

/**
 * Throws an Error carrying the server's own message and, when the failure is
 * per-field validation, a `fields` map the forms can render inline.
 */
async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // The API being down is the commonest failure while developing, and the
    // browser's own message ("Failed to fetch") tells the user nothing.
    throw new Error('Cannot reach the server. Is the Spring Boot API running on port 8080?');
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // A proxy error page or a challenge page is HTML, not JSON. Showing the
    // parser's own complaint to a customer mid-payment helps nobody.
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

export const authApi = {
  register: (fullName, email, password) =>
    request('/auth/register', { method: 'POST', body: { fullName, email, password } }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/auth/me', { auth: true }),
};

/**
 * Orders and payment.
 *
 * The client sends slugs and quantities only — never prices. The server prices
 * the basket from the database, so what the customer is charged cannot be
 * edited in a browser devtools console.
 */
export const orderApi = {
  start: (shipping, items) =>
    request('/orders', { method: 'POST', auth: true, body: { ...shipping, items } }),
  verify: (payload) => request('/orders/verify', { method: 'POST', auth: true, body: payload }),
  cancel: (razorpayOrderId) =>
    request(`/orders/${razorpayOrderId}/cancel`, { method: 'POST', auth: true }),
  mine: () => request('/orders', { auth: true }),
};

/** The two public forms. Neither needs a signed-in user. */
export const contactApi = {
  send: ({ name, email, subject, message }) =>
    request('/contact', { method: 'POST', body: { name, email, subject, message } }),
  subscribe: (email) => request('/newsletter', { method: 'POST', body: { email } }),
};

export default request;
