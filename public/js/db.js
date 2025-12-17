// js/db.js
// Prosty lokalny "DB" oparty na localStorage.
// Przeznaczony do środowiska deweloperskiego / demo.

const LS_USERS = 'erj_users_v1';
const LS_REPORTS = 'erj_reports_v1';
const LS_PHONEBOOK = 'erj_phonebook_v1';
const LS_COUNTER = 'erj_counter_v1';

function read(key, def) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : def;
  } catch (e) {
    return def;
  }
}
function write(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

/* ---------- Users ---------- */
export async function listUsers() {
  return read(LS_USERS, []);
}

export async function getUserByEmailOrId(key) {
  const users = read(LS_USERS, []);
  return users.find(u => (u.email && u.email === key) || (u.id && u.id === key)) || null;
}

export async function registerUser({ name, id, zdp, email, role, status }) {
  const users = read(LS_USERS, []);
  if (users.find(u => u.email === email || u.id === id)) throw new Error('Użytkownik już istnieje');
  users.push({ name, id, zdp, email, role: role || 'user', status: status || 'active' });
  write(LS_USERS, users);
  return true;
}

export async function updateUser(key, patch) {
  const users = read(LS_USERS, []);
  const idx = users.findIndex(u => (u.email && u.email === key) || (u.id && u.id === key));
  if (idx === -1) throw new Error('Nie znaleziono użytkownika');
  users[idx] = { ...users[idx], ...patch };
  write(LS_USERS, users);
  return users[idx];
}

export async function deleteUser(key) {
  let users = read(LS_USERS, []);
  users = users.filter(u => !((u.email && u.email === key) || (u.id && u.id === key)));
  write(LS_USERS, users);
  return true;
}

/* ---------- Reports ---------- */
export async function listReports() {
  return read(LS_REPORTS, []);
}

export async function saveReport(report) {
  const reports = read(LS_REPORTS, []);
  const idx = reports.findIndex(r => r.number === report.number);
  if (idx === -1) reports.push(report); else reports[idx] = report;
  write(LS_REPORTS, reports);
  return report;
}

export async function getReport(number) {
  const reports = read(LS_REPORTS, []);
  return reports.find(r => r.number === number) || null;
}

export async function nextCounter() {
  const c = read(LS_COUNTER, 0) + 1;
  write(LS_COUNTER, c);
  return c;
}

/* ---------- Phonebook (local cache) ---------- */
export async function listPhonebookLocal() {
  return read(LS_PHONEBOOK, []);
}

export async function replacePhonebookLocal(entries) {
  write(LS_PHONEBOOK, entries);
  return entries;
}
