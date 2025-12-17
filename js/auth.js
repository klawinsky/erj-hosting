// js/auth.js
// Prosty mechanizm autoryzacji dla demo.
// Hasła są hashowane i przechowywane w localStorage (nie produkcyjne).

const LS_AUTH = 'erj_auth_v1';
const LS_USERS = 'erj_users_v1';
const LS_SESS = 'erj_session_v1';

// Domyślny admin (seed). Możesz zmienić wartości przed pierwszym uruchomieniem.
const ADMIN_EMAIL = 'klawinski.pawel@gmail.com';
const ADMIN_ID = '77144';
const ADMIN_PLAIN = 'Admin@77144';

function read(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
}
function write(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

async function ensureSeed() {
  const users = read(LS_USERS, []);
  const auth = read(LS_AUTH, {});
  if (!users.find(u => u.email === ADMIN_EMAIL)) {
    users.push({ name: 'Paweł Klawiński', id: ADMIN_ID, zdp: 'WAW', email: ADMIN_EMAIL, role: 'admin', status: 'active' });
    write(LS_USERS, users);
  }
  if (!auth[ADMIN_EMAIL]) {
    auth[ADMIN_EMAIL] = await hashPassword(ADMIN_PLAIN);
    write(LS_AUTH, auth);
  }
}

export async function initAuth() {
  await ensureSeed();
  return ADMIN_PLAIN;
}

export async function registerUser({ name, id, zdp, email, password, role, status }) {
  const users = read(LS_USERS, []);
  if (users.find(u => u.email === email || u.id === id)) throw new Error('Użytkownik już istnieje');
  users.push({ name, id, zdp, email, role: role || 'user', status: status || 'active' });
  write(LS_USERS, users);
  const auth = read(LS_AUTH, {});
  auth[email] = await hashPassword(password);
  write(LS_AUTH, auth);
  return true;
}

export async function login(idOrEmail, password, remember = false) {
  const users = read(LS_USERS, []);
  const user = users.find(u => u.email === idOrEmail || u.id === idOrEmail);
  if (!user) return { ok: false, reason: 'Nieprawidłowy login' };
  const auth = read(LS_AUTH, {});
  const hash = auth[user.email];
  if (!hash) return { ok: false, reason: 'Brak hasła' };
  const pwHash = await hashPassword(password);
  if (pwHash !== hash) return { ok: false, reason: 'Nieprawidłowe hasło' };
  const session = { user, at: new Date().toISOString() };
  if (remember) localStorage.setItem(LS_SESS, JSON.stringify(session)); else sessionStorage.setItem(LS_SESS, JSON.stringify(session));
  return { ok: true, user };
}

export function logout() {
  localStorage.removeItem(LS_SESS);
  sessionStorage.removeItem(LS_SESS);
}

export function currentUser() {
  const s = sessionStorage.getItem(LS_SESS) || localStorage.getItem(LS_SESS);
  if (!s) return null;
  try { const obj = JSON.parse(s); return obj.user; } catch { return null; }
}

export async function hashPassword(pw) {
  const enc = new TextEncoder();
  const data = enc.encode((pw || '') + '::erj_salt_v1');
  const buf = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hex;
}
