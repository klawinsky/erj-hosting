// js/app.js
import { listUsers, getUserByEmailOrId, updateUser, deleteUser, saveReport, nextCounter, getReport, listReports, listPhonebookLocal, replacePhonebookLocal } from './db.js';
import { initAuth, registerUser, login, logout, currentUser, hashPassword } from './auth.js';
import { exportPdf, exportR7Pdf } from './pdf.js';

/* ---------- Helpers ---------- */
function qs(id){ return document.getElementById(id); }
function el(tag, cls){ const d=document.createElement(tag); if(cls) d.className=cls; return d; }
function safeText(v){ return (v===undefined||v===null||v==='')?'-':v; }
function toNumber(v){ const n=parseFloat(String(v||'').replace(',','.')); return isNaN(n)?0:n; }
function round2(v){ return Math.round((v+Number.EPSILON)*100)/100; }
function isValidTime(t){ if(!t) return true; return /^([01]\d|2[0-3]):[0-5]\d$/.test(t); }
function parseDateTime(dateStr, timeStr, fallbackDate){ if(!timeStr) return null; const useDate=dateStr||fallbackDate; if(!useDate) return null; const [yyyy,mm,dd]=useDate.split('-').map(Number); const [hh,mi]=timeStr.split(':').map(Number); return new Date(yyyy,mm-1,dd,hh,mi).getTime(); }
function formatDelayClass(v){ if(v==null) return 'delay-zero'; if(v>0) return 'delay-pos'; if(v<0) return 'delay-neg'; return 'delay-zero'; }
function formatDelayText(v){ if(v==null) return '-'; return `${v} min`; }

/* ---------- Config ---------- */
// Raw URL do pliku książki telefonicznej w repo GitHub (zmień na własne repo)
const PHONEBOOK_GITHUB_RAW = 'https://raw.githubusercontent.com/your-org/your-repo/main/phonebook.csv';

/* ---------- App Init ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  const adminPlain = await initAuth();

  /* UI refs */
  const loginView = qs('loginView'), appShell = qs('appShell');
  const loginForm = qs('loginForm'), loginId = qs('loginId'), loginPassword = qs('loginPassword'), loginMsg = qs('loginMsg'), demoBtn = qs('demoBtn'), rememberMe = qs('rememberMe');
  const loggedUserInfo = qs('loggedUserInfo'), btnLogout = qs('btnLogout'), btnHome = qs('btnHome');

  const dashboard = qs('dashboard');
  const tileHandleTrain = qs('tileHandleTrain'), tileTakeOver = qs('tileTakeOver'), tileAdmin = qs('tileAdmin'), tilePhonebook = qs('tilePhonebook'), tileR7 = qs('tileR7');

  const handleTrainMenu = qs('handleTrainMenu'), backFromHandle = qs('backFromHandle'), homeFromHandle = qs('homeFromHandle');
  const takeOverMenu = qs('takeOverMenu'), backFromTakeover = qs('backFromTakeover'), homeFromTakeover = qs('homeFromTakeover'), takeoverForm = qs('takeoverForm'), takeoverMsg = qs('takeoverMsg');

  const btnNewReport = qs('btnNewReport'), btnNewBrake = qs('btnNewBrake'), btnNewR7 = qs('btnNewR7');

  const adminPanel = qs('adminPanel'), usersTableBody = document.querySelector('#usersTable tbody'), addUserBtn = qs('addUserBtn'), modalUser = qs('modalUser'), formUser = qs('formUser'), userFormMsg = qs('userFormMsg'), backFromAdmin = qs('backFromAdmin'), homeFromAdmin = qs('homeFromAdmin');

  const phonebookPanel = qs('phonebookPanel'), phonebookTableBody = qs('phonebookTable')?.querySelector('tbody'), backFromPhonebook = qs('backFromPhonebook'), homeFromPhonebook = qs('homeFromPhonebook');

  const reportPanelContainer = qs('reportPanelContainer');

  // R7 refs
  const r7Panel = qs('r7Panel'), backFromR7 = qs('backFromR7'), homeFromR7 = qs('homeFromR7');
  const r7_addLocomotive = qs('r7_addLocomotive'), r7_addWagon = qs('r7_addWagon'), r7_analyze = qs('r7_analyze');
  const r7List = qs('r7List'), r7Results = qs('r7Results');
  const formR7Vehicle = qs('formR7Vehicle'), modalR7Vehicle = qs('modalR7Vehicle');
  const r7_print_pdf = qs('r7_print_pdf');

  /* Session helpers */
  function showLogin(){ loginView.style.display='block'; appShell.style.display='none'; }
  async function showAppFor(user){
    loginView.style.display='none'; appShell.style.display='block';
    loggedUserInfo.textContent = `${user.name} (${user.id}) · ${user.role}`;
    adminPanel.style.display = 'none';
    dashboard.style.display = 'block';
    handleTrainMenu.style.display = 'none';
    takeOverMenu.style.display = 'none';
    phonebookPanel.style.display = 'none';
    reportPanelContainer.style.display = 'none';
    if(r7Panel) r7Panel.style.display = 'none';
    await refreshUsersTable();
    await loadPhonebookFromGithub();
  }

  /* On load: always show login (requirement). If persistent session exists, restore */
  const sess = currentUser();
  showLogin();
  if (sess) {
    await showAppFor(sess);
  }

  /* ---------- Auth / Login ---------- */
  loginForm && loginForm.addEventListener('submit', async (e)=>{ 
    e.preventDefault(); 
    loginMsg.textContent=''; 
    const id=loginId.value.trim(); 
    const pw=loginPassword.value; 
    const remember = rememberMe && rememberMe.checked;
    if(!id||!pw) return loginMsg.textContent='Podaj login i hasło.'; 
    const res=await login(id,pw,remember); 
    if(!res.ok) return loginMsg.textContent=res.reason||'Błąd logowania'; 
    await showAppFor(res.user); 
  });

  demoBtn && demoBtn.addEventListener('click', ()=>{ 
    loginId.value='klawinski.pawel@gmail.com'; 
    loginPassword.value=adminPlain; 
    if(rememberMe) rememberMe.checked = true; 
    loginForm.dispatchEvent(new Event('submit',{cancelable:true})); 
  });

  btnLogout && btnLogout.addEventListener('click', ()=>{ logout(); showLogin(); loginId.value=''; loginPassword.value=''; loginMsg.textContent=''; });

  btnHome && btnHome.addEventListener('click', ()=>{ 
    dashboard.style.display = 'block'; 
    handleTrainMenu.style.display = 'none'; 
    takeOverMenu.style.display = 'none'; 
    adminPanel.style.display = 'none'; 
    phonebookPanel.style.display = 'none'; 
    reportPanelContainer.style.display = 'none'; 
    if(r7Panel) r7Panel.style.display='none';
  });

  /* ---------- Dashboard navigation ---------- */
  tileHandleTrain && tileHandleTrain.addEventListener('click', ()=>{ dashboard.style.display='none'; handleTrainMenu.style.display='block'; });
  backFromHandle && backFromHandle.addEventListener('click', ()=>{ handleTrainMenu.style.display='none'; dashboard.style.display='block'; });
  homeFromHandle && homeFromHandle.addEventListener('click', ()=>{ handleTrainMenu.style.display='none'; dashboard.style.display='block'; });

  tileTakeOver && tileTakeOver.addEventListener('click', ()=>{ dashboard.style.display='none'; takeOverMenu.style.display='block'; });
  backFromTakeover && backFromTakeover.addEventListener('click', ()=>{ takeOverMenu.style.display='none'; dashboard.style.display='block'; });
  homeFromTakeover && homeFromTakeover.addEventListener('click', ()=>{ takeOverMenu.style.display='none'; dashboard.style.display='block'; });

  tileAdmin && tileAdmin.addEventListener('click', async ()=>{ const u=currentUser(); if(!u||u.role!=='admin') return alert('Brak uprawnień. Panel administracyjny dostępny tylko dla administratora.'); dashboard.style.display='none'; adminPanel.style.display='block'; await refreshUsersTable(); });
  backFromAdmin && backFromAdmin.addEventListener('click', ()=>{ adminPanel.style.display='none'; dashboard.style.display='block'; });
  homeFromAdmin && homeFromAdmin.addEventListener('click', ()=>{ adminPanel.style.display='none'; dashboard.style.display='block'; });

  tilePhonebook && tilePhonebook.addEventListener('click', async ()=>{ dashboard.style.display='none'; phonebookPanel.style.display='block'; await loadPhonebookFromGithub(); });
  backFromPhonebook && backFromPhonebook.addEventListener('click', ()=>{ phonebookPanel.style.display='none'; dashboard.style.display='block'; });
  homeFromPhonebook && homeFromPhonebook.addEventListener('click', ()=>{ phonebookPanel.style.display='none'; dashboard.style.display='block'; });

  tileR7 && tileR7.addEventListener('click', ()=>{ dashboard.style.display='none'; if(r7Panel) r7Panel.style.display='block'; });
  backFromR7 && backFromR7.addEventListener('click', ()=>{ if(r7Panel) r7Panel.style.display='none'; dashboard.style.display='block'; });
  homeFromR7 && homeFromR7.addEventListener('click', ()=>{ if(r7Panel) r7Panel.style.display='none'; dashboard.style.display='block'; });

  /* ---------- TAKEOVER form ---------- */
  takeoverForm && takeoverForm.addEventListener('submit', async (e)=>{ 
    e.preventDefault(); 
    takeoverMsg.textContent=''; 
    const trainNum = qs('takeoverTrainNumber').value.trim(); 
    const date = qs('takeoverDate').value; 
    if(!trainNum || !date) return takeoverMsg.textContent='Wypełnij numer pociągu i datę.'; 
    const reports = await listReports(); 
    const found = reports.find(r => (r.sectionA && r.sectionA.trainNumber && r.sectionA.trainNumber.includes(trainNum)) || (r.createdBy && r.createdBy.id === trainNum) || (r.currentDriver && r.currentDriver.id === trainNum)); 
    if(!found) return takeoverMsg.textContent='Nie znaleziono raportu dla podanego numeru i daty.'; 
    const u = currentUser(); 
    found.takenBy = { name: u.name, id: u.id, at: new Date().toISOString() }; 
    found.currentDriver = { name: u.name, id: u.id }; 
    await saveReport(found); 
    openReportUI(found); 
  });

  /* ---------- HANDLE TRAIN menu buttons ---------- */
  btnNewReport && btnNewReport.addEventListener('click', async ()=> {
    const u = currentUser();
    const name = u?.name || '';
    const id = u?.id || '';
    if(!name || !id) return alert('Brak danych prowadzącego. Uzupełnij profil.');
    const c = await nextCounter();
    const d = new Date();
    const DD = String(d.getDate()).padStart(2,'0');
    const MM = String(d.getMonth()+1).padStart(2,'0');
    const YY = String(d.getFullYear()).slice(-2);
    const XXX = String(c).padStart(3,'0');
    const number = `${XXX}/${DD}/${MM}/${YY}`;
    const report = {
      number,
      createdAt: new Date().toISOString(),
      createdBy: { name, id },
      currentDriver: { name, id },
      sectionA: { category:'', traction:'', trainNumber:'', route:'', date: d.toISOString().slice(0,10) },
      sectionB:[], sectionC:[], sectionD:[], sectionE:[], sectionF:[], sectionG:[], r7List:[], r7Meta:{}, brakeTests:[], history:[]
    };
    await saveReport(report);
    openReportUI(report);
  });

  // New R7: utwórz nowy raport z pustym wykazem i otwórz panel R7
  btnNewR7 && btnNewR7.addEventListener('click', async ()=> {
    const u = currentUser();
    const name = u?.name || '';
    const id = u?.id || '';
    if(!name || !id) return alert('Brak danych prowadzącego. Uzupełnij profil.');
    const c = await nextCounter();
    const d = new Date();
    const DD = String(d.getDate()).padStart(2,'0');
    const MM = String(d.getMonth()+1).padStart(2,'0');
    const YY = String(d.getFullYear()).slice(-2);
    const XXX = String(c).padStart(3,'0');
    const number = `R7-${XXX}-${DD}${MM}${YY}`;
    const report = {
      number,
      createdAt: new Date().toISOString(),
      createdBy: { name, id },
      currentDriver: { name, id },
      sectionA: { category:'', traction:'', trainNumber:'', route:'', date: d.toISOString().slice(0,10) },
      sectionB:[], sectionC:[], sectionD:[], sectionE:[], sectionF:[], sectionG:[], r7List:[], r7Meta:{}, brakeTests:[], history:[]
    };
    await saveReport(report);
    // open R7 panel directly and set currentReport
    currentReport = report;
    dashboard.style.display='none';
    handleTrainMenu.style.display='none';
    reportPanelContainer.style.display='none';
    if(r7Panel) r7Panel.style.display='block';
    // populate general fields
    qs('r7_trainNumber') && (qs('r7_trainNumber').value = report.sectionA.trainNumber || '');
    qs('r7_date') && (qs('r7_date').value = report.sectionA.date || '');
    renderR7List(report);
  });

  /* ---------- Admin users table ---------- */
  async function refreshUsersTable(){
    if(!usersTableBody) return;
    usersTableBody.innerHTML='';
    const users = await listUsers();
    users.forEach(u=>{
      const tr=document.createElement('tr');
      tr.innerHTML = `<td>${safeText(u.name)}</td><td>${safeText(u.id)}</td><td>${safeText(u.zdp)}</td><td>${safeText(u.email)}</td><td>${safeText(u.role)}</td><td>${safeText(u.status)}</td>
        <td><button class="btn btn-sm btn-outline-secondary me-1" data-action="edit" data-key="${u.email||u.id}">Edytuj</button><button class="btn btn-sm btn-outline-danger" data-action="del" data-key="${u.email||u.id}">Usuń</button></td>`;
      usersTableBody.appendChild(tr);
    });
  }

  formUser && formUser.addEventListener('submit', async (e)=>{ 
    e.preventDefault(); userFormMsg.textContent=''; 
    const mode=formUser.getAttribute('data-mode')||'add'; 
    const idx=formUser.getAttribute('data-index')||''; 
    const name=qs('u_name').value.trim(); 
    const id=qs('u_id').value.trim(); 
    const zdp=qs('u_zdp').value; 
    const email=qs('u_email').value.trim(); 
    const password=qs('u_password').value; 
    const role=qs('u_role').value; 
    const status=qs('u_status').value; 
    if(!name||!id||!email||!password) return userFormMsg.textContent='Wypełnij wszystkie wymagane pola.'; 
    try{ 
      if(mode==='add'){ await registerUser({name,id,zdp,email,password,role,status}); } 
      else { const patch={name,id,zdp,email,role,status}; if(password) patch.passwordHash = await hashPassword(password); await updateUser(idx,patch); } 
      const bs=bootstrap.Modal.getInstance(modalUser); bs&&bs.hide(); formUser.reset(); await refreshUsersTable(); 
    }catch(err){ userFormMsg.textContent = err.message||'Błąd zapisu użytkownika'; } 
  });

  usersTableBody && usersTableBody.addEventListener('click', async (e)=>{ 
    const btn=e.target.closest('button'); if(!btn) return; 
    const action=btn.getAttribute('data-action'); const key=btn.getAttribute('data-key'); 
    if(action==='edit'){ 
      const u=await getUserByEmailOrId(key); if(!u) return alert('Nie znaleziono użytkownika'); 
      formUser.setAttribute('data-mode','edit'); formUser.setAttribute('data-index',key); 
      qs('u_name').value=u.name||''; qs('u_id').value=u.id||''; qs('u_zdp').value=u.zdp||'WAW'; qs('u_email').value=u.email||''; qs('u_password').value=''; qs('u_role').value=u.role||'user'; qs('u_status').value=u.status||'active'; 
      document.querySelector('#modalUser .modal-title').textContent='Edytuj użytkownika'; new bootstrap.Modal(modalUser).show(); 
    } else if(action==='del'){ 
      if(!confirm('Usunąć użytkownika?')) return; 
      try{ await deleteUser(key); await refreshUsersTable(); }catch(err){ alert('Błąd usuwania: '+(err.message||err)); } 
    } 
  });

  addUserBtn && addUserBtn.addEventListener('click', ()=>{ formUser.setAttribute('data-mode','add'); formUser.setAttribute('data-index',''); formUser.reset(); document.querySelector('#modalUser .modal-title').textContent='Dodaj użytkownika'; userFormMsg.textContent=''; });

  /* ---------- Phonebook (fetch from GitHub raw CSV) ---------- */
  async function loadPhonebookFromGithub(){
    if(!phonebookTableBody) return;
    phonebookTableBody.innerHTML = '<tr><td colspan="4" class="text-muted small">Ładowanie...</td></tr>';
    try {
      const res = await fetch(PHONEBOOK_GITHUB_RAW, { cache: 'no-store' });
      if (!res.ok) throw new Error('Brak pliku na GitHub');
      const text = await res.text();
      const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
      const entries = lines.map(line => {
        const cols = line.split(',');
        return { name: cols[0]?.trim(), role: cols[1]?.trim(), number: cols[2]?.trim(), hours: cols[3]?.trim() };
      });
      await replacePhonebookLocal(entries);
      renderPhonebook(entries);
    } catch (err) {
      const local = await listPhonebookLocal();
      if (local && local.length) {
        renderPhonebook(local);
      } else {
        phonebookTableBody.innerHTML = '<tr><td colspan="4" class="text-danger small">Nie udało się załadować książki telefonicznej.</td></tr>';
      }
    }
  }
  function renderPhonebook(entries) { phonebookTableBody.innerHTML = ''; entries.forEach(e => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${safeText(e.name)}</td><td>${safeText(e.role)}</td><td><a href="tel:${encodeURIComponent(e.number)}">${safeText(e.number)}</a></td><td>${safeText(e.hours)}</td>`; phonebookTableBody.appendChild(tr); }); }

  /* ---------- Report state and helpers ---------- */
  let currentReport = null;

  function renderReportHeader() {
    const headerNumber = qs('rp_number');
    const headerUser = qs('rp_user');
    if(headerNumber) headerNumber.textContent = currentReport.number || '-';
    if(headerUser) headerUser.textContent = `${currentReport.currentDriver?.name || currentReport.createdBy?.name || '-'} (${currentReport.currentDriver?.id || currentReport.createdBy?.id || '-'})`;
  }

  /* ---------- Full Report UI: modals and lists ---------- */
  function renderLists() {
    if(!currentReport) return;

    function renderList(containerId, arr, renderer) {
      const container = qs(containerId);
      if(!container) return;
      container.innerHTML = '';
      (arr||[]).forEach((it, idx) => container.appendChild(renderer(it, idx)));
    }

    // B - traction
    renderList('tractionList', currentReport.sectionB, (it, idx) => {
      const d = el('div','d-flex justify-content-between align-items-center station-row');
      d.innerHTML = `<div><strong>${safeText(it.name)}</strong> (${safeText(it.id)}) · ZDP: ${safeText(it.zdp)} · Lok: ${safeText(it.loco)} [${safeText(it.from)} → ${safeText(it.to)}]</div>
        <div><button class="btn btn-sm btn-outline-secondary me-1" data-edit="${idx}" data-type="traction">Edytuj</button><button class="btn btn-sm btn-outline-danger" data-del="${idx}" data-type="traction">Usuń</button></div>`;
      d.querySelector('[data-del]').addEventListener('click', async ()=>{ currentReport.sectionB.splice(idx,1); await saveAndRender(); });
      d.querySelector('[data-edit]').addEventListener('click', ()=> openEditModal('traction', idx));
      return d;
    });

    // C - conductor
    renderList('conductorList', currentReport.sectionC, (it, idx) => {
      const d = el('div','d-flex justify-content-between align-items-center station-row');
      d.innerHTML = `<div><strong>${safeText(it.name)}</strong> (${safeText(it.id)}) · ZDP: ${safeText(it.zdp)} · Funkcja: ${safeText(it.role)} [${safeText(it.from)} → ${safeText(it.to)}]</div>
        <div><button class="btn btn-sm btn-outline-secondary me-1" data-edit="${idx}" data-type="conductor">Edytuj</button><button class="btn btn-sm btn-outline-danger" data-del="${idx}" data-type="conductor">Usuń</button></div>`;
      d.querySelector('[data-del]').addEventListener('click', async ()=>{ currentReport.sectionC.splice(idx,1); await saveAndRender(); });
      d.querySelector('[data-edit]').addEventListener('click', ()=> openEditModal('conductor', idx));
      return d;
    });

    // D - orders
    renderList('ordersList', currentReport.sectionD, (it, idx) => {
      const meta = `${it.number?('Nr: '+it.number+' · '):''}${it.time?('Godz.: '+it.time):''}`;
      const d = el('div','d-flex justify-content-between align-items-center station-row');
      d.innerHTML = `<div>${safeText(it.text)} <div class="small text-muted">${meta} · Źródło: ${safeText(it.source)}</div></div>
        <div><button class="btn btn-sm btn-outline-secondary me-1" data-edit="${idx}" data-type="order">Edytuj</button><button class="btn btn-sm btn-outline-danger" data-del="${idx}" data-type="order">Usuń</button></div>`;
      d.querySelector('[data-del]').addEventListener('click', async ()=>{ currentReport.sectionD.splice(idx,1); await saveAndRender(); });
      d.querySelector('[data-edit]').addEventListener('click', ()=> openEditModal('order', idx));
      return d;
    });

    // E - stations
    renderList('stationsList', currentReport.sectionE, (it, idx) => {
      const arrClass = formatDelayClass(it.delayArrMinutes), depClass = formatDelayClass(it.delayDepMinutes);
      const arrText = formatDelayText(it.delayArrMinutes), depText = formatDelayText(it.delayDepMinutes);
      const stopText = it.realStopMinutes!=null?`${it.realStopMinutes} min`:'-';
      const d = el('div','station-row');
      d.innerHTML = `<div class="d-flex justify-content-between">
        <div>
          <strong>${safeText(it.station)}</strong>
          <div class="small text-muted">Przyjazd (plan): ${safeText(it.dateArr)} · ${safeText(it.planArr)}</div>
          <div class="small text-muted">Przyjazd (real): ${safeText(it.dateArrReal)} · ${safeText(it.realArr)}</div>
          <div class="small">Odchylenie przyj.: <span class="${arrClass}">${arrText}</span></div>
          <div class="small text-muted">Odjazd (plan): ${safeText(it.dateDep)} · ${safeText(it.planDep)}</div>
          <div class="small text-muted">Odjazd (real): ${safeText(it.dateDepReal)} · ${safeText(it.realDep)}</div>
          <div class="small">Odchylenie odj.: <span class="${depClass}">${depText}</span></div>
          <div class="small">Postój realny: ${stopText}</div>
          <div class="small text-muted">Powód: ${safeText(it.delayReason)}; Rozkazy: ${safeText(it.writtenOrders)}</div>
        </div>
        <div>
          <button class="btn btn-sm btn-outline-secondary me-1" data-edit="${idx}" data-type="station">Edytuj</button>
          <button class="btn btn-sm btn-outline-danger" data-del="${idx}" data-type="station">Usuń</button>
        </div>
      </div>`;
      d.querySelector('[data-del]').addEventListener('click', async ()=>{ currentReport.sectionE.splice(idx,1); await saveAndRender(); });
      d.querySelector('[data-edit]').addEventListener('click', ()=> openEditModal('station', idx));
      return d;
    });

    // F - controls
    renderList('controlsList', currentReport.sectionF, (it, idx) => {
      const d = el('div','station-row d-flex justify-content-between align-items-center');
      d.innerHTML = `<div><strong>${safeText(it.by)}</strong> (${safeText(it.id)})<div class="small text-muted">${safeText(it.desc)}</div><div class="small text-muted">Uwagi: ${safeText(it.notes)}</div></div>
        <div><button class="btn btn-sm btn-outline-secondary me-1" data-edit="${idx}" data-type="control">Edytuj</button><button class="btn btn-sm btn-outline-danger" data-del="${idx}" data-type="control">Usuń</button></div>`;
      d.querySelector('[data-del]').addEventListener('click', async ()=>{ currentReport.sectionF.splice(idx,1); await saveAndRender(); });
      d.querySelector('[data-edit]').addEventListener('click', ()=> openEditModal('control', idx));
      return d;
    });

    // G - notes
    renderList('notesList', currentReport.sectionG, (it, idx) => {
      const d = el('div','station-row d-flex justify-content-between align-items-center');
      d.innerHTML = `<div>${safeText(it.text)}</div><div><button class="btn btn-sm btn-outline-secondary me-1" data-edit="${idx}" data-type="note">Edytuj</button><button class="btn btn-sm btn-outline-danger" data-del="${idx}" data-type="note">Usuń</button></div>`;
      d.querySelector('[data-del]').addEventListener('click', async ()=>{ currentReport.sectionG.splice(idx,1); await saveAndRender(); });
      d.querySelector('[data-edit]').addEventListener('click', ()=> openEditModal('note', idx));
      return d;
    });

    // R7 list
    renderR7List(currentReport);
  }

  async function saveAndRender(){
    if(!currentReport) return;
    currentReport.lastEditedAt = new Date().toISOString();
    const cat = qs('r_cat')?.value || '';
    const traction = qs('r_traction')?.value || '';
    const trainNumber = qs('r_trainNumber')?.value || '';
    const route = qs('r_route')?.value || '';
    const date = qs('r_date')?.value || '';
    currentReport.sectionA = { category: cat, traction, trainNumber, route, date };
    currentReport.r7List = currentReport.r7List || [];
    await saveReport(currentReport);
    renderReportHeader();
    renderLists();
  }

  /* ---------- Edit modal helper (for B-G) ---------- */
  function openEditModal(type, idx){
    if(!currentReport) return;
    if(type==='traction'){
      const it = currentReport.sectionB[idx] || {};
      qs('t_name').value = it.name || '';
      qs('t_id').value = it.id || '';
      qs('t_zdp').value = it.zdp || 'WAW';
      qs('t_loco').value = it.loco || '';
      qs('t_from').value = it.from || '';
      qs('t_to').value = it.to || '';
      const form = qs('formTraction');
      form.setAttribute('data-mode','edit');
      form.setAttribute('data-index', idx);
      new bootstrap.Modal(qs('modalTraction')).show();
    } else if(type==='conductor'){
      const it = currentReport.sectionC[idx] || {};
      qs('c_name').value = it.name || '';
      qs('c_id').value = it.id || '';
      qs('c_zdp').value = it.zdp || 'WAW';
      qs('c_role').value = it.role || 'KP';
      qs('c_from').value = it.from || '';
      qs('c_to').value = it.to || '';
      const form = qs('formConductor');
      form.setAttribute('data-mode','edit');
      form.setAttribute('data-index', idx);
      new bootstrap.Modal(qs('modalConductor')).show();
    } else if(type==='order'){
      const it = currentReport.sectionD[idx] || {};
      qs('o_number').value = it.number || '';
      qs('o_time').value = it.time || '';
      qs('o_text').value = it.text || '';
      qs('o_source').value = it.source || 'Dyspozytura';
      const form = qs('formOrder');
      form.setAttribute('data-mode','edit');
      form.setAttribute('data-index', idx);
      new bootstrap.Modal(qs('modalOrder')).show();
    } else if(type==='station'){
      const it = currentReport.sectionE[idx] || {};
      qs('s_station').value = it.station || '';
      qs('s_dateArr').value = it.dateArr || '';
      qs('s_planArr').value = it.planArr || '';
      qs('s_dateArrReal').value = it.dateArrReal || '';
      qs('s_realArr').value = it.realArr || '';
      qs('s_dateDep').value = it.dateDep || '';
      qs('s_planDep').value = it.planDep || '';
      qs('s_dateDepReal').value = it.dateDepReal || '';
      qs('s_realDep').value = it.realDep || '';
      qs('s_delayReason').value = it.delayReason || '';
      qs('s_writtenOrders').value = it.writtenOrders || '';
      const form = qs('formStation');
      form.setAttribute('data-mode','edit');
      form.setAttribute('data-index', idx);
      new bootstrap.Modal(qs('modalStation')).show();
    } else if(type==='control'){
      const it = currentReport.sectionF[idx] || {};
      qs('f_by').value = it.by || '';
      qs('f_id').value = it.id || '';
      qs('f_desc').value = it.desc || '';
      qs('f_notes').value = it.notes || '';
      const form = qs('formControl');
      form.setAttribute('data-mode','edit');
      form.setAttribute('data-index', idx);
      new bootstrap.Modal(qs('modalControl')).show();
    } else if(type==='note'){
      const it = currentReport.sectionG[idx] || {};
      qs('n_text').value = it.text || '';
      const form = qs('formNote');
      form.setAttribute('data-mode','edit');
      form.setAttribute('data-index', idx);
      new bootstrap.Modal(qs('modalNote')).show();
    }
  }

  /* Reset modals on hide */
  document.querySelectorAll('.modal').forEach(m=>{ m.addEventListener('hidden.bs.modal', ()=>{ const form=m.querySelector('form'); if(form){ form.setAttribute('data-mode','add'); form.setAttribute('data-index',''); form.reset(); } }); });

  /* ---------- Modal forms for B-G ---------- */
  // Traction
  const formTraction = qs('formTraction');
  if(formTraction){
    formTraction.addEventListener('submit', async (e)=>{ e.preventDefault(); try{ const name=qs('t_name').value.trim(), id=qs('t_id').value.trim(), zdp=qs('t_zdp').value, loco=qs('t_loco').value.trim(), from=qs('t_from').value.trim(), to=qs('t_to').value.trim(); if(!name||!id) return alert('Imię i numer są wymagane.'); const entry={name,id,zdp,loco,from,to}; const mode=formTraction.getAttribute('data-mode'); if(mode==='edit'){ const ix=Number(formTraction.getAttribute('data-index')); currentReport.sectionB[ix]=entry; } else { currentReport.sectionB.push(entry); } await saveAndRender(); formTraction.reset(); bootstrap.Modal.getInstance(qs('modalTraction')).hide(); }catch(err){ console.error(err); alert('Błąd zapisu: '+(err.message||err)); bootstrap.Modal.getInstance(qs('modalTraction')).hide(); } });
  }

  // Conductor
  const formConductor = qs('formConductor');
  if(formConductor){
    formConductor.addEventListener('submit', async (e)=>{ e.preventDefault(); try{ const name=qs('c_name').value.trim(), id=qs('c_id').value.trim(), zdp=qs('c_zdp').value, role=qs('c_role').value, from=qs('c_from').value.trim(), to=qs('c_to').value.trim(); if(!name||!id) return alert('Imię i numer są wymagane.'); const entry={name,id,zdp,role,from,to}; const mode=formConductor.getAttribute('data-mode'); if(mode==='edit'){ const ix=Number(formConductor.getAttribute('data-index')); currentReport.sectionC[ix]=entry; } else { currentReport.sectionC.push(entry); } await saveAndRender(); formConductor.reset(); bootstrap.Modal.getInstance(qs('modalConductor')).hide(); }catch(err){ console.error(err); alert('Błąd zapisu: '+(err.message||err)); bootstrap.Modal.getInstance(qs('modalConductor')).hide(); } });
  }

  // Order
  const formOrder = qs('formOrder');
  if(formOrder){
    formOrder.addEventListener('submit', async (e)=>{ e.preventDefault(); try{ const number=qs('o_number').value.trim(), time=qs('o_time').value.trim(), text=qs('o_text').value.trim(), source=qs('o_source').value; if(!text) return alert('Treść dyspozycji jest wymagana.'); if(time && !isValidTime(time)) return alert('Godzina musi być HH:MM.'); const entry={number,time,text,source}; const mode=formOrder.getAttribute('data-mode'); if(mode==='edit'){ const ix=Number(formOrder.getAttribute('data-index')); currentReport.sectionD[ix]=entry; } else { currentReport.sectionD.push(entry); } await saveAndRender(); formOrder.reset(); bootstrap.Modal.getInstance(qs('modalOrder')).hide(); }catch(err){ console.error(err); alert('Błąd zapisu: '+(err.message||err)); bootstrap.Modal.getInstance(qs('modalOrder')).hide(); } });
  }

  // Station
  const formStation = qs('formStation');
  if(formStation){
    formStation.addEventListener('submit', async (e)=>{ e.preventDefault(); try{ const station=qs('s_station').value.trim(); const dateArrPlan=qs('s_dateArr').value, dateArrReal=qs('s_dateArrReal').value; const dateDepPlan=qs('s_dateDep').value, dateDepReal=qs('s_dateDepReal').value; const planArr=qs('s_planArr').value.trim(), planDep=qs('s_planDep').value.trim(); const realArr=qs('s_realArr').value.trim(), realDep=qs('s_realDep').value.trim(); const delayReason=qs('s_delayReason').value.trim(), writtenOrders=qs('s_writtenOrders').value.trim(); if(!station) return alert('Nazwa stacji jest wymagana.'); if(!isValidTime(planArr)||!isValidTime(planDep)||!isValidTime(realArr)||!isValidTime(realDep)) return alert('Czas HH:MM lub puste.'); const fallback = qs('r_date')?.value || currentReport.sectionA.date || ''; const planArrDT=parseDateTime(dateArrPlan,planArr,fallback); const realArrDT=parseDateTime(dateArrReal,realArr,fallback); const planDepDT=parseDateTime(dateDepPlan,planDep,fallback); const realDepDT=parseDateTime(dateDepReal,realDep,fallback); let delayArrMinutes=null; if(planArrDT&&realArrDT) delayArrMinutes=Math.round((realArrDT-planArrDT)/60000); let delayDepMinutes=null; if(planDepDT&&realDepDT) delayDepMinutes=Math.round((realDepDT-planDepDT)/60000); let realStopMinutes=null; if(realArrDT&&realDepDT) realStopMinutes=Math.round((realDepDT-realArrDT)/60000); const entry={ station, dateArr:dateArrPlan, planArr, dateArrReal, realArr, dateDep:dateDepPlan, planDep, dateDepReal, realDep, delayArrMinutes, delayDepMinutes, realStopMinutes, delayReason, writtenOrders }; const mode=formStation.getAttribute('data-mode'); if(mode==='edit'){ const ix=Number(formStation.getAttribute('data-index')); currentReport.sectionE[ix]=entry; } else { currentReport.sectionE.push(entry); } await saveAndRender(); formStation.reset(); bootstrap.Modal.getInstance(qs('modalStation')).hide(); }catch(err){ console.error(err); alert('Błąd zapisu: '+(err.message||err)); bootstrap.Modal.getInstance(qs('modalStation')).hide(); } });
  }

  // Control
  const formControl = qs('formControl');
  if(formControl){
    formControl.addEventListener('submit', async (e)=>{ e.preventDefault(); try{ const by=qs('f_by').value.trim(), id=qs('f_id').value.trim(), desc=qs('f_desc').value.trim(), notes=qs('f_notes').value.trim(); if(!by) return alert('Imię i nazwisko kontrolującego jest wymagane.'); const entry={by,id,desc,notes}; const mode=formControl.getAttribute('data-mode'); if(mode==='edit'){ const ix=Number(formControl.getAttribute('data-index')); currentReport.sectionF[ix]=entry; } else { currentReport.sectionF.push(entry); } await saveAndRender(); formControl.reset(); bootstrap.Modal.getInstance(qs('modalControl')).hide(); }catch(err){ console.error(err); alert('Błąd zapisu: '+(err.message||err)); bootstrap.Modal.getInstance(qs('modalControl')).hide(); } });
  }

  // Note
  const formNote = qs('formNote');
  if(formNote){
    formNote.addEventListener('submit', async (e)=>{ e.preventDefault(); try{ const text=qs('n_text').value.trim(); if(!text) return alert('Treść uwagi jest wymagana.'); const entry={text}; const mode=formNote.getAttribute('data-mode'); if(mode==='edit'){ const ix=Number(formNote.getAttribute('data-index')); currentReport.sectionG[ix]=entry; } else { currentReport.sectionG.push(entry); } await saveAndRender(); formNote.reset(); bootstrap.Modal.getInstance(qs('modalNote')).hide(); }catch(err){ console.error(err); alert('Błąd zapisu: '+(err.message||err)); bootstrap.Modal.getInstance(qs('modalNote')).hide(); } });
  }

  /* ---------- R-7: UI, drag & drop, analysis, print ---------- */

  function renderR7List(report){
    if(!r7List) return;
    r7List.innerHTML = '';
    (report.r7List||[]).forEach((v, idx) => {
      const item = document.createElement('div');
      item.className = 'list-group-item d-flex justify-content-between align-items-start';
      item.draggable = true;
      item.dataset.index = idx;
      item.innerHTML = `<div>
          <div><strong>${safeText(v.type==='locomotive'?'Lokomotywa':'Wagon')} ${safeText(v.evn)}</strong> <span class="small text-muted">(${safeText(v.series)})</span></div>
          <div class="small text-muted">Dł: ${safeText(v.length)} m · Masa własna: ${safeText(v.empty_mass)} t · Masa ład.: ${safeText(v.payload)} t · Masa ham.: ${safeText(v.brake_mass)} t · Nastawa: ${safeText(v.brake_type)}</div>
          <div class="small text-muted">Nadanie: ${safeText(v.from)} → Przezn.: ${safeText(v.to)}</div>
        </div>
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-secondary r7-edit" data-idx="${idx}">Edytuj</button>
          <button class="btn btn-sm btn-outline-danger r7-del" data-idx="${idx}">Usuń</button>
        </div>`;
      item.addEventListener('dragstart', (ev)=>{ ev.dataTransfer.setData('text/plain', idx); item.classList.add('dragging'); });
      item.addEventListener('dragend', ()=>{ item.classList.remove('dragging'); });
      r7List.appendChild(item);
    });
    r7List.querySelectorAll('.r7-edit').forEach(btn => btn.addEventListener('click', (e)=> {
      const idx = Number(btn.dataset.idx);
      openR7VehicleModal('edit', idx);
    }));
    r7List.querySelectorAll('.r7-del').forEach(btn => btn.addEventListener('click', async (e)=> {
      const idx = Number(btn.dataset.idx);
      if(!currentReport) return;
      currentReport.r7List.splice(idx,1);
      await saveReport(currentReport);
      renderR7List(currentReport);
    }));
  }

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.list-group-item:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  if(r7List){
    r7List.addEventListener('dragover', (e)=>{ e.preventDefault(); const dragging = r7List.querySelector('.dragging'); const after = getDragAfterElement(r7List, e.clientY); if(after==null) r7List.appendChild(dragging); else r7List.insertBefore(dragging, after); });
    r7List.addEventListener('drop', async (e)=>{ e.preventDefault(); if(!currentReport) return; const nodes = Array.from(r7List.children); const newList = nodes.map(n => {
      const strong = n.querySelector('strong');
      const text = strong ? strong.textContent.trim() : '';
      const parts = text.split(' ');
      const evn = parts.length>1 ? parts.slice(1).join(' ') : parts[0];
      return currentReport.r7List.find(v => (v.evn||'') === evn) || null;
    }).filter(Boolean);
      if(newList.length === currentReport.r7List.length) currentReport.r7List = newList;
      await saveReport(currentReport);
      renderR7List(currentReport);
    });
  }

  function openR7VehicleModal(mode='add', index=null, presetType=null){
    if(!formR7Vehicle) return;
    formR7Vehicle.setAttribute('data-mode', mode);
    formR7Vehicle.setAttribute('data-index', index===null?'':String(index));
    if(mode==='add'){
      formR7Vehicle.reset();
      if(presetType) qs('v_type').value = presetType;
    } else {
      const v = currentReport.r7List[index];
      if(!v) return;
      qs('v_type').value = v.type || 'wagon';
      qs('v_evn').value = v.evn || '';
      qs('v_country').value = v.country || 'PL';
      qs('v_operator').value = v.operator || 'RJ';
      qs('v_operator_code').value = v.operator_code || '';
      qs('v_series').value = v.series || '';
      qs('v_length').value = v.length || '';
      qs('v_payload').value = v.payload || '';
      qs('v_empty_mass').value = v.empty_mass || '';
      qs('v_brake_mass').value = v.brake_mass || '';
      qs('v_brake_type').value = v.brake_type || 'G';
      qs('v_from').value = v.from || '';
      qs('v_to').value = v.to || '';
      qs('v_notes').value = v.notes || '';
    }
    new bootstrap.Modal(modalR7Vehicle).show();
  }

  formR7Vehicle && formR7Vehicle.addEventListener('submit', async (e)=> {
    e.preventDefault();
    if(!currentReport) { alert('Brak otwartego wykazu. Otwórz lub utwórz raport.'); return; }
    const mode = formR7Vehicle.getAttribute('data-mode') || 'add';
    const idx = formR7Vehicle.getAttribute('data-index');
    const v = {
      type: qs('v_type').value,
      evn: qs('v_evn').value.trim(),
      country: qs('v_country').value,
      operator: qs('v_operator').value,
      operator_code: qs('v_operator_code').value.trim(),
      series: qs('v_series').value.trim(),
      length: round2(toNumber(qs('v_length').value)),
      payload: round2(toNumber(qs('v_payload').value)),
      empty_mass: round2(toNumber(qs('v_empty_mass').value)),
      brake_mass: round2(toNumber(qs('v_brake_mass').value)),
      brake_type: qs('v_brake_type').value,
      from: qs('v_from').value.trim(),
      to: qs('v_to').value.trim(),
      notes: qs('v_notes').value.trim()
    };
    if(mode==='edit' && idx!==''){
      currentReport.r7List[Number(idx)] = v;
    } else {
      currentReport.r7List.push(v);
    }
    await saveReport(currentReport);
    // close modal using bootstrap API to ensure X and Anuluj work
    const bs = bootstrap.Modal.getInstance(modalR7Vehicle);
    bs && bs.hide();
    renderR7List(currentReport);
  });

  r7_addLocomotive && r7_addLocomotive.addEventListener('click', ()=> openR7VehicleModal('add', null, 'locomotive'));
  r7_addWagon && r7_addWagon.addEventListener('click', ()=> openR7VehicleModal('add', null, 'wagon'));

  r7_analyze && r7_analyze.addEventListener('click', ()=> {
    if(!currentReport) { alert('Otwórz raport, aby przeprowadzić analizę.'); return; }
    const list = currentReport.r7List || [];
    const totalLength = round2(list.reduce((s,v)=> s + toNumber(v.length), 0));
    const massWagons = round2(list.filter(v=>v.type==='wagon').reduce((s,v)=> s + toNumber(v.empty_mass) + toNumber(v.payload), 0));
    const massLocos = round2(list.filter(v=>v.type==='locomotive').reduce((s,v)=> s + toNumber(v.empty_mass) + toNumber(v.payload), 0));
    const massTotal = round2(massWagons + massLocos);
    const brakeWagons = round2(list.filter(v=>v.type==='wagon').reduce((s,v)=> s + toNumber(v.brake_mass), 0));
    const brakeLocos = round2(list.filter(v=>v.type==='locomotive').reduce((s,v)=> s + toNumber(v.brake_mass), 0));
    const brakeTotal = round2(brakeWagons + brakeLocos);
    const pctWagons = massWagons>0 ? round2((brakeWagons / massWagons) * 100) : 0;
    const pctTotal = massTotal>0 ? round2((brakeTotal / massTotal) * 100) : 0;

    currentReport._analysis = { length: totalLength, massWagons, massTotal, brakeWagons, brakeTotal, pctWagons, pctTotal };

    if(r7Results) r7Results.style.display = 'block';
    qs('res_length') && (qs('res_length').textContent = `${totalLength}`);
    qs('res_mass_wagons') && (qs('res_mass_wagons').textContent = `${massWagons}`);
    qs('res_mass_total') && (qs('res_mass_total').textContent = `${massTotal}`);
    qs('res_brake_wagons') && (qs('res_brake_wagons').textContent = `${brakeWagons}`);
    qs('res_brake_total') && (qs('res_brake_total').textContent = `${brakeTotal}`);
    qs('res_pct_wagons') && (qs('res_pct_wagons').textContent = `${pctWagons}`);
    qs('res_pct_total') && (qs('res_pct_total').textContent = `${pctTotal}`);

    saveReport(currentReport);
  });

  r7_print_pdf && r7_print_pdf.addEventListener('click', async ()=> {
    if(!currentReport) return alert('Brak otwartego wykazu.');
    currentReport.r7Meta = {
      from: qs('r7_from')?.value || '',
      to: qs('r7_to')?.value || '',
      driver: qs('r7_driver')?.value || '',
      conductor: qs('r7_conductor')?.value || ''
    };
    currentReport.sectionA = currentReport.sectionA || {};
    currentReport.sectionA.trainNumber = qs('r7_trainNumber')?.value || currentReport.sectionA.trainNumber || '';
    currentReport.sectionA.date = qs('r7_date')?.value || currentReport.sectionA.date || '';
    await saveReport(currentReport);
    await exportR7Pdf(currentReport, `${(currentReport.number||'R7').replace(/\//g,'-')}.pdf`);
  });

  /* ---------- Open Report UI (build full A-G UI + R7 integration) ---------- */
  function openReportUI(report) {
    currentReport = report;
    dashboard.style.display = 'none';
    handleTrainMenu.style.display = 'none';
    takeOverMenu.style.display = 'none';
    adminPanel.style.display = 'none';
    phonebookPanel.style.display = 'none';
    if(r7Panel) r7Panel.style.display = 'none';
    reportPanelContainer.style.display = 'block';
    reportPanelContainer.innerHTML = '';

    const card = el('div','card p-3 mb-3');

    const header = el('div','d-flex justify-content-between align-items-center mb-2');
    header.innerHTML = `<div><h5 class="mb-0">Raport z jazdy pociągu</h5><div class="small text-muted">Numer: <strong id="rp_number">${safeText(report.number)}</strong></div></div>
      <div class="text-end"><div class="small text-muted" id="rp_user">${safeText(report.currentDriver?.name || report.createdBy?.name)} (${safeText(report.currentDriver?.id || report.createdBy?.id)})</div>
      <div class="mt-2"><button id="rp_back" class="btn btn-sm btn-outline-secondary me-1">Powrót</button><button id="rp_home" class="btn btn-sm btn-outline-primary me-1">Strona główna</button><button id="rp_open_r7" class="btn btn-sm btn-outline-success">Otwórz wykaz R-7</button></div></div>`;
    card.appendChild(header);

    // Section A
    const secA = el('div','mb-3 card p-3');
    secA.innerHTML = `<h6>A - Dane ogólne</h6>
      <div class="row g-2">
        <div class="col-6 col-md-2"><label class="form-label small">Kategoria</label><select id="r_cat" class="form-select"><option value=""></option><option>EX</option><option>MP</option><option>RJ</option><option>OS</option><option>PW</option></select></div>
        <div class="col-6 col-md-2"><label class="form-label small">Trakcja</label><select id="r_traction" class="form-select"><option value=""></option><option>E</option><option>S</option></select></div>
        <div class="col-6 col-md-2"><label class="form-label small">Numer pociągu</label><input id="r_trainNumber" class="form-control"></div>
        <div class="col-6 col-md-3"><label class="form-label small">Relacja</label><input id="r_route" class="form-control"></div>
        <div class="col-6 col-md-3"><label class="form-label small">Data</label><input id="r_date" type="date" class="form-control"></div>
      </div>`;
    card.appendChild(secA);

    // Sections B-G containers
    const secB = el('div','mb-3 card p-3'); secB.innerHTML = `<div class="d-flex justify-content-between align-items-center"><h6 class="mb-0">B - Drużyna trakcyjna</h6><div><button id="addTractionBtn" class="btn btn-sm btn-outline-primary">Dodaj</button></div></div><div id="tractionList" class="mt-2"></div>`;
    const secC = el('div','mb-3 card p-3'); secC.innerHTML = `<div class="d-flex justify-content-between align-items-center"><h6 class="mb-0">C - Drużyna konduktorska</h6><div><button id="addConductorBtn" class="btn btn-sm btn-outline-primary">Dodaj</button></div></div><div id="conductorList" class="mt-2"></div>`;
    const secD = el('div','mb-3 card p-3'); secD.innerHTML = `<div class="d-flex justify-content-between align-items-center"><h6 class="mb-0">D - Dyspozycje</h6><div><button id="addOrderBtn" class="btn btn-sm btn-outline-primary">Dodaj</button></div></div><div id="ordersList" class="mt-2"></div>`;
    const secE = el('div','mb-3 card p-3'); secE.innerHTML = `<div class="d-flex justify-content-between align-items-center"><h6 class="mb-0">E - Dane o jeździe pociągu</h6><div><button id="addStationBtn" class="btn btn-sm btn-outline-primary">Dodaj</button></div></div><div id="stationsList" class="mt-2"></div>`;
    const secF = el('div','mb-3 card p-3'); secF.innerHTML = `<div class="d-flex justify-content-between align-items-center"><h6 class="mb-0">F - Kontrola pociągu</h6><div><button id="addControlBtn" class="btn btn-sm btn-outline-primary">Dodaj</button></div></div><div id="controlsList" class="mt-2"></div>`;
    const secG = el('div','mb-3 card p-3'); secG.innerHTML = `<div class="d-flex justify-content-between align-items-center"><h6 class="mb-0">G - Uwagi kierownika pociągu</h6><div><button id="addNoteBtn" class="btn btn-sm btn-outline-primary">Dodaj</button></div></div><div id="notesList" class="mt-2"></div>`;

    card.appendChild(secB); card.appendChild(secC); card.appendChild(secD); card.appendChild(secE); card.appendChild(secF); card.appendChild(secG);

    // actions: export/import/pdf
    const actions = el('div','d-flex justify-content-between align-items-center mt-3');
    const left = el('div');
    const btnExportJson = el('button','btn btn-outline-info btn-sm me-2'); btnExportJson.textContent='Eksportuj JSON';
    const btnImportJson = el('button','btn btn-outline-secondary btn-sm me-2'); btnImportJson.textContent='Importuj JSON';
    const importFile = el('input'); importFile.type='file'; importFile.accept='.json'; importFile.style.display='none'; importFile.id='rp_import_file';
    left.appendChild(btnExportJson); left.appendChild(btnImportJson); left.appendChild(importFile);
    const right = el('div');
    const btnPreviewPdf = el('button','btn btn-success btn-sm me-2'); btnPreviewPdf.textContent='Pobierz PDF';
    const btnClose = el('button','btn btn-danger btn-sm'); btnClose.textContent='Zamknij raport';
    right.appendChild(btnPreviewPdf); right.appendChild(btnClose);
    actions.appendChild(left); actions.appendChild(right);
    card.appendChild(actions);

    reportPanelContainer.appendChild(card);

    // populate fields
    qs('r_cat').value = report.sectionA?.category || '';
    qs('r_traction').value = report.sectionA?.traction || '';
    qs('r_trainNumber').value = report.sectionA?.trainNumber || '';
    qs('r_route').value = report.sectionA?.route || '';
    qs('r_date').value = report.sectionA?.date || '';

    // header buttons
    qs('rp_back').addEventListener('click', ()=>{ reportPanelContainer.style.display='none'; dashboard.style.display='block'; });
    qs('rp_home').addEventListener('click', ()=>{ reportPanelContainer.style.display='none'; dashboard.style.display='block'; });
    qs('rp_open_r7').addEventListener('click', ()=> {
      qs('r7_trainNumber') && (qs('r7_trainNumber').value = report.sectionA?.trainNumber || '');
      qs('r7_date') && (qs('r7_date').value = report.sectionA?.date || '');
      qs('r7_from') && (qs('r7_from').value = report.r7Meta?.from || '');
      qs('r7_to') && (qs('r7_to').value = report.r7Meta?.to || '');
      qs('r7_driver') && (qs('r7_driver').value = report.r7Meta?.driver || '');
      qs('r7_conductor') && (qs('r7_conductor').value = report.r7Meta?.conductor || '');
      reportPanelContainer.style.display='none';
      if(r7Panel) r7Panel.style.display='block';
      renderR7List(report);
    });

    // wire section A autosave
    ['r_cat','r_traction','r_trainNumber','r_route','r_date'].forEach(id => {
      const elid = qs(id);
      if(!elid) return;
      elid.addEventListener('change', saveAndRender);
      elid.addEventListener('input', saveAndRender);
    });

    // wire add buttons to open modals for B-G
    const addTractionBtn = qs('addTractionBtn');
    if(addTractionBtn){
      addTractionBtn.addEventListener('click', ()=> {
        const form = qs('formTraction');
        if(form){ form.setAttribute('data-mode','add'); form.setAttribute('data-index',''); }
        new bootstrap.Modal(qs('modalTraction')).show();
      });
    }
    const addConductorBtn = qs('addConductorBtn');
    if(addConductorBtn){
      addConductorBtn.addEventListener('click', ()=> {
        const form = qs('formConductor');
        if(form){ form.setAttribute('data-mode','add'); form.setAttribute('data-index',''); }
        new bootstrap.Modal(qs('modalConductor')).show();
      });
    }
    const addOrderBtn = qs('addOrderBtn');
    if(addOrderBtn){
      addOrderBtn.addEventListener('click', ()=> {
        const form = qs('formOrder');
        if(form){ form.setAttribute('data-mode','add'); form.setAttribute('data-index',''); }
        new bootstrap.Modal(qs('modalOrder')).show();
      });
    }
    const addStationBtn = qs('addStationBtn');
    if(addStationBtn){
      addStationBtn.addEventListener('click', ()=> {
        const form = qs('formStation');
        if(form){ form.setAttribute('data-mode','add'); form.setAttribute('data-index',''); }
        new bootstrap.Modal(qs('modalStation')).show();
      });
    }
    const addControlBtn = qs('addControlBtn');
    if(addControlBtn){
      addControlBtn.addEventListener('click', ()=> {
        const form = qs('formControl');
        if(form){ form.setAttribute('data-mode','add'); form.setAttribute('data-index',''); }
        new bootstrap.Modal(qs('modalControl')).show();
      });
    }
    const addNoteBtn = qs('addNoteBtn');
    if(addNoteBtn){
      addNoteBtn.addEventListener('click', ()=> {
        const form = qs('formNote');
        if(form){ form.setAttribute('data-mode','add'); form.setAttribute('data-index',''); }
        new bootstrap.Modal(qs('modalNote')).show();
      });
    }

    // export/import handlers
    btnExportJson.addEventListener('click', ()=> {
      const dataStr = JSON.stringify(currentReport, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${currentReport.number.replace(/\//g,'-')}.json`; a.click(); URL.revokeObjectURL(url);
    });
    btnImportJson.addEventListener('click', ()=> importFile.click());
    importFile.addEventListener('change', async (e)=> {
      const f = e.target.files?.[0];
      if(!f) return;
      const text = await f.text();
      try {
        const rep = JSON.parse(text);
        if(!rep.number) throw new Error('Nieprawidłowy plik');
        await saveReport(rep);
        alert('Raport zaimportowany.');
      } catch (err) {
        alert('Błąd importu: ' + (err.message || err));
      }
    });

    btnPreviewPdf.addEventListener('click', async ()=> {
      const container = document.createElement('div');
      container.className = 'print-container';
      const header = document.createElement('div');
      header.className = 'print-header';
      header.innerHTML = `<div class="print-title">Raport z jazdy pociągu</div><div class="print-meta">Numer: ${currentReport.number} · Prowadzący: ${currentReport.currentDriver?.name || currentReport.createdBy?.name} (${currentReport.currentDriver?.id || currentReport.createdBy?.id})</div><div class="print-meta">Wygenerowano dnia ${new Date().toLocaleString()}</div>`;
      container.appendChild(header);
      const secAprint = document.createElement('div');
      secAprint.innerHTML = `<h6>A - Dane ogólne</h6><table class="table-print"><tbody>
        <tr><th>Kategoria</th><td>${safeText(currentReport.sectionA.category)}</td></tr>
        <tr><th>Trakcja</th><td>${safeText(currentReport.sectionA.traction)}</td></tr>
        <tr><th>Numer pociągu</th><td>${safeText(currentReport.sectionA.trainNumber)}</td></tr>
        <tr><th>Relacja</th><td>${safeText(currentReport.sectionA.route)}</td></tr>
        <tr><th>Data kursu</th><td>${safeText(currentReport.sectionA.date)}</td></tr>
      </tbody></table>`;
      container.appendChild(secAprint);
      const makeCrewTable = (title, arr, cols) => {
        const s = document.createElement('div'); s.className='section';
        s.innerHTML = `<h6>${title}</h6>`;
        const table = document.createElement('table'); table.className='table-print';
        const thead = document.createElement('thead'); thead.innerHTML = `<tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr>`;
        table.appendChild(thead);
        const tbody = document.createElement('tbody');
        if((arr||[]).length===0) tbody.innerHTML = `<tr><td colspan="${cols.length}">-</td></tr>`;
        else arr.forEach(it => { const cells = cols.map(k=>`<td>${safeText(it[k])}</td>`).join(''); tbody.innerHTML += `<tr>${cells}</tr>`; });
        table.appendChild(tbody); s.appendChild(table); return s;
      };
      container.appendChild(makeCrewTable('B - Drużyna trakcyjna', currentReport.sectionB, ['name','id','zdp','loco','from','to']));
      container.appendChild(makeCrewTable('C - Drużyna konduktorska', currentReport.sectionC, ['name','id','zdp','role','from','to']));
      const secDprint = document.createElement('div'); secDprint.className = 'section'; secDprint.innerHTML = `<h6>D - Dyspozycje</h6>`;
      if((currentReport.sectionD||[]).length===0) secDprint.innerHTML += `<div>-</div>`; else {
        const t = document.createElement('table'); t.className='table-print';
        t.innerHTML = `<thead><tr><th>Nr</th><th>Godz.</th><th>Treść</th><th>Źródło</th></tr></thead><tbody>${currentReport.sectionD.map(o=>`<tr><td>${safeText(o.number)}</td><td>${safeText(o.time)}</td><td>${safeText(o.text)}</td><td>${safeText(o.source)}</td></tr>`).join('')}</tbody>`;
        secDprint.appendChild(t);
      }
      container.appendChild(secDprint);
      const secEprint = document.createElement('div'); secEprint.className='section'; secEprint.innerHTML = `<h6>E - Dane o jeździe pociągu</h6>`;
      const tableE = document.createElement('table'); tableE.className='table-print';
      tableE.innerHTML = `<thead><tr><th>Stacja</th><th>Przyj. (plan)</th><th>Przyj. (real)</th><th>Odch. przyj.</th><th>Odj. (plan)</th><th>Odj. (real)</th><th>Odch. odj.</th><th>Postój</th><th>Powód/Rozkazy</th></tr></thead><tbody>${(currentReport.sectionE||[]).length===0?`<tr><td colspan="9">-</td></tr>`: currentReport.sectionE.map(s=>{ const arrVal=(s.delayArrMinutes!=null)?`${s.delayArrMinutes} min`:'-'; const depVal=(s.delayDepMinutes!=null)?`${s.delayDepMinutes} min`:'-'; const stop=s.realStopMinutes!=null?`${s.realStopMinutes}`:'-'; const pow=(s.delayReason||'-')+(s.writtenOrders? ' / '+s.writtenOrders : ''); return `<tr><td>${safeText(s.station)}</td><td>${safeText(s.dateArr)} ${safeText(s.planArr)}</td><td>${safeText(s.dateArrReal)} ${safeText(s.realArr)}</td><td>${arrVal}</td><td>${safeText(s.dateDep)} ${safeText(s.planDep)}</td><td>${safeText(s.dateDepReal)} ${safeText(s.realDep)}</td><td>${depVal}</td><td>${stop}</td><td>${pow}</td></tr>`; }).join('')}</tbody>`;
      secEprint.appendChild(tableE); container.appendChild(secEprint);
      const secFprint = document.createElement('div'); secFprint.className='section'; secFprint.innerHTML = `<h6>F - Kontrola pociągu</h6>`;
      if((currentReport.sectionF||[]).length===0) secFprint.innerHTML += `<div>-</div>`; else {
        const t = document.createElement('table'); t.className='table-print';
        t.innerHTML = `<thead><tr><th>Kontrolujący</th><th>Nr</th><th>Opis</th><th>Uwagi</th></tr></thead><tbody>${currentReport.sectionF.map(c=>`<tr><td>${safeText(c.by)}</td><td>${safeText(c.id)}</td><td>${safeText(c.desc)}</td><td>${safeText(c.notes)}</td></tr>`).join('')}</tbody>`;
        secFprint.appendChild(t);
      }
      container.appendChild(secFprint);
      const secGprint = document.createElement('div'); secGprint.className='section'; secGprint.innerHTML = `<h6>G - Uwagi kierownika pociągu</h6>`;
      if((currentReport.sectionG||[]).length===0) secGprint.innerHTML += `<div>-</div>`; else {
        const ul = document.createElement('ul'); currentReport.sectionG.forEach(n=>{ const li = document.createElement('li'); li.textContent = n.text; ul.appendChild(li); }); secGprint.appendChild(ul);
      }
      container.appendChild(secGprint);

      const footer = document.createElement('div'); footer.className='print-footer'; footer.textContent = `Wygenerowano dnia ${new Date().toLocaleString()} z systemu eRJ`;
      container.appendChild(footer);

      await exportPdf(container, `${currentReport.number.replace(/\//g,'-')}.pdf`);
    });

    // initial render lists
    renderReportHeader();
    renderLists();
  }

  /* expose helper for takeover to open report */
  window.openReportUI = openReportUI;

  /* initial refreshes */
  await refreshUsersTable();
  await loadPhonebookFromGithub();
});
