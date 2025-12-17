// js/pdf.js
// Funkcje eksportu HTML do PDF przy użyciu html2pdf.js (załadowane w index.html).
// Zawiera ogólną funkcję exportPdf oraz specjalną funkcję exportR7Pdf generującą układ R-7.

export async function exportPdf(elementOrHtml, filename = 'document.pdf') {
  let node;
  if (typeof elementOrHtml === 'string') {
    node = document.createElement('div');
    node.innerHTML = elementOrHtml;
  } else {
    node = elementOrHtml;
  }
  const opt = {
    margin:       10,
    filename:     filename,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  return html2pdf().set(opt).from(node).save();
}

/* Buduje PDF w układzie zbliżonym do oficjalnego formularza R-7.
   Generuje 42 wiersze numerowane 1..42 oraz H1..H3 (tak jak w wzorze). */
export async function exportR7Pdf(report, filename = 'R7.pdf') {
  const meta = report.r7Meta || {};
  const rowsData = report.r7List || [];

  // Build rows: 1..42 then H1..H3
  const numericRows = Array.from({length:42}, (_,i)=>i+1);
  const headerRows = ['H1','H2','H3'];

  // Helper to get row data or empty
  function rowHtmlForIndex(i) {
    const v = rowsData[i-1];
    if (!v) {
      return `<tr>
        <td style="border:1px solid #333; padding:6px; text-align:center;">${i}</td>
        <td style="border:1px solid #333; padding:6px;"></td><td style="border:1px solid #333; padding:6px;"></td><td style="border:1px solid #333; padding:6px;"></td>
        <td style="border:1px solid #333; padding:6px;"></td><td style="border:1px solid #333; padding:6px;"></td>
        <td style="border:1px solid #333; padding:6px;"></td><td style="border:1px solid #333; padding:6px;"></td>
        <td style="border:1px solid #333; padding:6px;"></td><td style="border:1px solid #333; padding:6px;"></td>
        <td style="border:1px solid #333; padding:6px;"></td><td style="border:1px solid #333; padding:6px;"></td>
        <td style="border:1px solid #333; padding:6px;"></td>
      </tr>`;
    } else {
      return `<tr>
        <td style="border:1px solid #333; padding:6px; text-align:center;">${i}</td>
        <td style="border:1px solid #333; padding:6px;">${escapeHtml(v.evn)}</td>
        <td style="border:1px solid #333; padding:6px; text-align:center;">${escapeHtml(v.country)}</td>
        <td style="border:1px solid #333; padding:6px; text-align:center;">${escapeHtml(v.operator)}</td>
        <td style="border:1px solid #333; padding:6px;">${escapeHtml(v.series)}</td>
        <td style="border:1px solid #333; padding:6px; text-align:center;">${escapeHtml(v.operator_code)}</td>
        <td style="border:1px solid #333; padding:6px; text-align:right;">${v.length!=null?v.length:''}</td>
        <td style="border:1px solid #333; padding:6px; text-align:right;">${v.payload!=null?v.payload:''}</td>
        <td style="border:1px solid #333; padding:6px; text-align:right;">${v.empty_mass!=null?v.empty_mass:''}</td>
        <td style="border:1px solid #333; padding:6px; text-align:right;">${v.brake_mass!=null?v.brake_mass:''}</td>
        <td style="border:1px solid #333; padding:6px;">${escapeHtml(v.from)}</td>
        <td style="border:1px solid #333; padding:6px;">${escapeHtml(v.to)}</td>
        <td style="border:1px solid #333; padding:6px;">${escapeHtml(v.notes)}</td>
      </tr>`;
    }
  }

  // H rows
  function headerRowHtml(label, idx) {
    const v = rowsData[42 + idx];
    if (!v) {
      return `<tr>
        <td style="border:1px solid #333; padding:6px; text-align:center;">${label}</td>
        <td style="border:1px solid #333; padding:6px;"></td><td style="border:1px solid #333; padding:6px;"></td><td style="border:1px solid #333; padding:6px;"></td>
        <td style="border:1px solid #333; padding:6px;"></td><td style="border:1px solid #333; padding:6px;"></td>
        <td style="border:1px solid #333; padding:6px;"></td><td style="border:1px solid #333; padding:6px;"></td>
        <td style="border:1px solid #333; padding:6px;"></td><td style="border:1px solid #333; padding:6px;"></td>
        <td style="border:1px solid #333; padding:6px;"></td><td style="border:1px solid #333; padding:6px;"></td>
        <td style="border:1px solid #333; padding:6px;"></td>
      </tr>`;
    } else {
      return `<tr>
        <td style="border:1px solid #333; padding:6px; text-align:center;">${label}</td>
        <td style="border:1px solid #333; padding:6px;">${escapeHtml(v.evn)}</td>
        <td style="border:1px solid #333; padding:6px; text-align:center;">${escapeHtml(v.country)}</td>
        <td style="border:1px solid #333; padding:6px; text-align:center;">${escapeHtml(v.operator)}</td>
        <td style="border:1px solid #333; padding:6px;">${escapeHtml(v.series)}</td>
        <td style="border:1px solid #333; padding:6px; text-align:center;">${escapeHtml(v.operator_code)}</td>
        <td style="border:1px solid #333; padding:6px; text-align:right;">${v.length!=null?v.length:''}</td>
        <td style="border:1px solid #333; padding:6px; text-align:right;">${v.payload!=null?v.payload:''}</td>
        <td style="border:1px solid #333; padding:6px; text-align:right;">${v.empty_mass!=null?v.empty_mass:''}</td>
        <td style="border:1px solid #333; padding:6px; text-align:right;">${v.brake_mass!=null?v.brake_mass:''}</td>
        <td style="border:1px solid #333; padding:6px;">${escapeHtml(v.from)}</td>
        <td style="border:1px solid #333; padding:6px;">${escapeHtml(v.to)}</td>
        <td style="border:1px solid #333; padding:6px;">${escapeHtml(v.notes)}</td>
      </tr>`;
    }
  }

  // Build rows HTML
  const rowsHtml = numericRows.map(i => rowHtmlForIndex(i)).join('\n') +
    headerRows.map((h, idx) => headerRowHtml(h, idx)).join('\n');

  const analysis = report._analysis || {};

  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; font-size:11px; padding:8px;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
      <div style="font-weight:700; font-size:14px;">Wykaz pojazdów kolejowych w składzie pociągu (R-7)</div>
      <div style="text-align:right; font-size:11px; color:#444;">
        <div>Nr raportu: ${escapeHtml(report.number||'')}</div>
        <div>Data wydruku: ${new Date().toLocaleString()}</div>
      </div>
    </div>

    <table style="width:100%; border-collapse:collapse; margin-bottom:8px; font-size:11px;">
      <tr>
        <td style="width:25%;"><strong>Nr pociągu:</strong> ${escapeHtml(report.sectionA?.trainNumber||'')}</td>
        <td style="width:25%;"><strong>Wyprawiony dnia:</strong> ${escapeHtml(report.sectionA?.date||'')}</td>
        <td style="width:25%;"><strong>Ze stacji:</strong> ${escapeHtml(meta.from||'')}</td>
        <td style="width:25%;"><strong>Do stacji:</strong> ${escapeHtml(meta.to||'')}</td>
      </tr>
      <tr>
        <td><strong>Maszynista:</strong> ${escapeHtml(meta.driver||'')}</td>
        <td colspan="3"><strong>Kierownik pociągu:</strong> ${escapeHtml(meta.conductor||'')}</td>
      </tr>
    </table>

    <table style="width:100%; border-collapse:collapse; font-size:10px;">
      <thead>
        <tr style="background:#f0f0f0;">
          <th style="border:1px solid #333; padding:6px; width:3%;">Lp.</th>
          <th style="border:1px solid #333; padding:6px; width:12%;">Numer inw.</th>
          <th style="border:1px solid #333; padding:6px; width:5%;">Państwo</th>
          <th style="border:1px solid #333; padding:6px; width:6%;">Ekspl.</th>
          <th style="border:1px solid #333; padding:6px; width:12%;">Typ/seria</th>
          <th style="border:1px solid #333; padding:6px; width:5%;">Kod</th>
          <th style="border:1px solid #333; padding:6px; width:6%;">Długość (m)</th>
          <th style="border:1px solid #333; padding:6px; width:6%;">Masa ład. (t)</th>
          <th style="border:1px solid #333; padding:6px; width:6%;">Masa własna (t)</th>
          <th style="border:1px solid #333; padding:6px; width:6%;">Masa ham. (t)</th>
          <th style="border:1px solid #333; padding:6px; width:8%;">Stacja nadania</th>
          <th style="border:1px solid #333; padding:6px; width:8%;">Stacja przezn.</th>
          <th style="border:1px solid #333; padding:6px; width:13%;">Uwagi</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div style="margin-top:8px; font-size:11px;">
      <strong>Podsumowanie analizy:</strong>
      <div>Długość składu: ${analysis.length ?? '-'} m</div>
      <div>Masa składu (wagony): ${analysis.massWagons ?? '-'} t</div>
      <div>Masa pociągu (lok.+wagony): ${analysis.massTotal ?? '-'} t</div>
      <div>Masa hamująca składu (wagony): ${analysis.brakeWagons ?? '-'} t</div>
      <div>Masa hamująca pociągu: ${analysis.brakeTotal ?? '-'} t</div>
      <div>Procent rzeczywisty masy składu: ${analysis.pctWagons ?? '-'} %</div>
      <div>Procent rzeczywisty masy pociągu: ${analysis.pctTotal ?? '-'} %</div>
    </div>
  </div>
  `;

  const node = document.createElement('div');
  node.innerHTML = html;
  return exportPdf(node, filename);
}

function escapeHtml(s) {
  if (!s && s !== 0) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
