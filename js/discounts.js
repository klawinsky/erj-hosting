// js/discounts.js
// Moduł UI dla zakładki "Zniżki ustawowe - PL"
// Odpowiada za renderowanie listy, wyszukiwanie, filtrowanie, import CSV i szczegóły.

import { listDiscounts, replaceDiscounts, resetDiscountsToSeed } from './db.js';

const el = id => document.getElementById(id);

let discounts = [];

/* Inicjalizacja: podłącz eventy i załaduj dane */
export async function initDiscountsUI() {
  // elementy
  const searchInput = el('discountSearch');
  const filterType = el('discountFilterType');
  const listContainer = el('discountsList');
  const details = el('discountDetails');
  const detailsContent = el('discountDetailsContent');
  const importBtn = el('discountImportBtn');
  const importFile = el('discountImportFile');
  const resetBtn = el('discountResetBtn');

  // załaduj dane
  discounts = await listDiscounts();
  renderList(discounts);

  // wyszukiwanie (inteligentne)
  searchInput && searchInput.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    applyFilters(q, filterType.value);
  });

  filterType && filterType.addEventListener('change', (e) => {
    const q = searchInput.value.trim().toLowerCase();
    applyFilters(q, e.target.value);
  });

  // import CSV
  importBtn && importBtn.addEventListener('click', () => importFile.click());
  importFile && importFile.addEventListener('change', async (ev) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const parsed = parseCsvToDiscounts(text);
      if (parsed.length === 0) return alert('Plik nie zawiera poprawnych danych.');
      await replaceDiscounts(parsed);
      discounts = parsed;
      renderList(discounts);
      alert('Import zakończony pomyślnie.');
    } catch (err) {
      console.error(err);
      alert('Błąd importu: ' + (err.message || err));
    } finally {
      importFile.value = '';
    }
  });

  // reset do danych domyślnych
  resetBtn && resetBtn.addEventListener('click', async () => {
    if (!confirm('Przywrócić domyślne zniżki?')) return;
    discounts = await resetDiscountsToSeed();
    renderList(discounts);
  });

  // kliknięcie poza szczegółami ukrywa panel
  document.addEventListener('click', (e) => {
    const detailsPanel = el('discountDetails');
    if (!detailsPanel) return;
    if (!detailsPanel.contains(e.target) && !el('discountsList').contains(e.target)) {
      detailsPanel.style.display = 'none';
    }
  });
}

/* Render listy zniżek */
function renderList(arr) {
  const container = el('discountsList');
  if (!container) return;
  container.innerHTML = '';
  if (!arr || arr.length === 0) {
    container.innerHTML = '<div class="text-muted small">Brak zniżek do wyświetlenia.</div>';
    return;
  }
  arr.forEach((d, idx) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-start';
    item.innerHTML = `<div>
        <div><strong>${escapeHtml(d.name)}</strong> <span class="text-muted small">[${escapeHtml(d.code)}]</span></div>
        <div class="small text-muted">${escapeHtml(d.description || '')}</div>
      </div>
      <div class="text-end">
        <span class="badge bg-primary discount-badge">${escapeHtml(displayValue(d))}</span>
      </div>`;
    item.addEventListener('click', () => showDetails(d));
    container.appendChild(item);
  });
}

/* Pokaż szczegóły zniżki */
function showDetails(d) {
  const details = el('discountDetails');
  const content = el('discountDetailsContent');
  if (!details || !content) return;
  content.innerHTML = `
    <div><strong>${escapeHtml(d.name)}</strong> <span class="text-muted">[${escapeHtml(d.code)}]</span></div>
    <div class="small text-muted mb-2">${escapeHtml(d.type)} · ${escapeHtml(displayValue(d))}</div>
    <div>${escapeHtml(d.description || '-')}</div>
    <div class="mt-2">
      <button id="copyDiscountBtn" class="btn btn-sm btn-outline-secondary">Kopiuj kod</button>
      <button id="applyDiscountBtn" class="btn btn-sm btn-outline-primary ms-2">Zastosuj (kopiuj wartość)</button>
    </div>
  `;
  details.style.display = 'block';
  // akcje
  el('copyDiscountBtn').addEventListener('click', () => {
    navigator.clipboard?.writeText(d.code || '')?.then(()=> alert('Kod skopiowany do schowka.'), ()=> alert('Nie udało się skopiować.'));
  });
  el('applyDiscountBtn').addEventListener('click', () => {
    navigator.clipboard?.writeText(displayValue(d) || '')?.then(()=> alert('Wartość zniżki skopiowana.'), ()=> alert('Nie udało się skopiować.'));
  });
}

/* Filtruj i wyszukaj */
function applyFilters(query, type) {
  const q = (query || '').trim().toLowerCase();
  const t = (type || '').trim().toLowerCase();
  const filtered = discounts.filter(d => {
    const matchesType = !t || (d.type || '').toLowerCase() === t;
    if (!q) return matchesType;
    // inteligentne wyszukiwanie: kod, nazwa, opis, wartość, typ
    const hay = `${d.code || ''} ${d.name || ''} ${d.description || ''} ${d.value || ''} ${d.type || ''}`.toLowerCase();
    return matchesType && hay.includes(q);
  });
  renderList(filtered);
}

/* Parsowanie CSV prostego formatu: kod;nazwa;typ;wartość;opis (separator ; lub ,) */
function parseCsvToDiscounts(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const out = [];
  for (const line of lines) {
    // obsłuż separator ; lub ,
    const parts = line.includes(';') ? line.split(';') : line.split(',');
    if (parts.length < 2) continue;
    const code = parts[0].trim();
    const name = parts[1].trim();
    const type = (parts[2] || 'percent').trim();
    const value = (parts[3] || '').trim();
    const description = (parts[4] || '').trim();
    out.push({ code, name, type, value, description });
  }
  return out;
}

/* Pomocnicze */
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function displayValue(d) {
  if (!d) return '';
  if (d.type === 'percent') return `${d.value}%`;
  if (d.type === 'exemption') return `Zwolnienie ${d.value}%`;
  return String(d.value || '');
}
