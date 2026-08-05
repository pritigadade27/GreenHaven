/** localStorage that cannot take the site down. */
const memory = new Map();

export function readJson(key, fallback, isValid = () => true) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch {
    return memory.has(key) ? memory.get(key) : fallback;
  }
}

export function writeJson(key, value) {
  memory.set(key, value);
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function readString(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

export function writeString(key, value) {
  memory.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {
    /* in-memory only for this session */
  }
}

export function remove(key) {
  memory.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    /* nothing to do */
  }
}
