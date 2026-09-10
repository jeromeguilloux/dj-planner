
const DB_NAME = 'djPlannerDB';
const DB_VERSION = 1;
const STORE = 'events';

let db;
let calendarCursor = new Date();
let selected = { public:[], ambiances:[], styles:[], materiel_sur_place:[], materiel_a_apporter:[], preparation:[] };

const $ = (id) => document.getElementById(id);
const qs = (s, root=document) => root.querySelector(s);
const qsa = (s, root=document) => [...root.querySelectorAll(s)];

function openDB(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if(!d.objectStoreNames.contains(STORE)){
        const s = d.createObjectStore(STORE,{keyPath:'id'});
        s.createIndex('date','date',{unique:false});
      }
    };
    req.onsuccess = e => { db=e.target.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}
function tx(mode='readonly'){ return db.transaction(STORE,mode).objectStore(STORE); }
function getAllEvents(){
  return new Promise((resolve,reject)=>{
    const r=tx().getAll(); r.onsuccess=()=>resolve(r.result||[]); r.onerror=()=>reject(r.error);
  });
}
function getEvent(id){
  return new Promise((resolve,reject)=>{
    const r=tx().get(id); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
  });
}
function saveEvent(ev){
  return new Promise((resolve,reject)=>{
    const r=tx('readwrite').put(ev); r.onsuccess=()=>resolve(ev); r.onerror=()=>reject(r.error);
  });
}
function removeEvent(id){
  return new Promise((resolve,reject)=>{
    const r=tx('readwrite').delete(id); r.onsuccess=()=>resolve(); r.onerror=()=>reject(r.error);
  });
}
function uid(){ return 'ev_'+Date.now()+'_'+Math.random().toString(36).slice(2,8); }
function isoToday(){
  const d=new Date(), off=d.getTimezoneOffset();
  return new Date(d.getTime()-off*60000).toISOString().slice(0,10);
}
function dateFromISO(iso){ return new Date(iso+'T12:00:00'); }
function formatLongDate(iso){
  return new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(dateFromISO(iso));
}
function monthName(d){ return new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'}).format(d); }
function duration(start,end){
  if(!start||!end) return '';
  let [sh,sm]=start.split(':').map(Number), [eh,em]=end.split(':').map(Number);
  let mins=(eh*60+em)-(sh*60+sm); if(mins<0) mins+=24*60;
  const h=Math.floor(mins/60), m=mins%60;
  return `${h} h${m?` ${String(m).padStart(2,'0')}`:''}`;
}
function money(v){ const n=Number(v||0); return n?new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(n):'—'; }
function escapeHTML(s=''){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function statusLabel(s){ return ({demande:'Demande',option:'Option',confirmee:'Confirmée',realisee:'Réalisée',annulee:'Annulée'})[s]||s; }
function paymentLabel(s){ return ({a_recevoir:'À recevoir',partiel:'Partiel',paye:'Payé'})[s]||s; }

function showToast(msg){
  const t=$('toast'); t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2200);
}

function nav(name){
  qsa('.view').forEach(v=>v.classList.remove('active'));
  const target=$('view-'+name);
  if(target) target.classList.add('active');
  qsa('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===name));
  window.scrollTo({top:0,behavior:'instant'});
  if(name==='home') renderHome();
  if(name==='planning') renderCalendar();
  if(name==='more') renderMore();
  if(name==='form' && !$('eventId').value) resetForm();
}
qsa('[data-nav]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.nav)));

function clearSelections(){
  selected = { public:[], ambiances:[], styles:[], materiel_sur_place:[], materiel_a_apporter:[], preparation:[] };
  qsa('.chip').forEach(c=>c.classList.remove('selected'));
}
function syncChips(){
  qsa('.chips[data-field]').forEach(group=>{
    const field=group.dataset.field;
    qsa('.chip',group).forEach(ch=>ch.classList.toggle('selected',(selected[field]||[]).includes(ch.dataset.value)));
  });
}
qsa('.chips[data-field]').forEach(group=>{
  group.addEventListener('click',e=>{
    const ch=e.target.closest('.chip'); if(!ch) return;
    const field=group.dataset.field, value=ch.dataset.value;
    const arr=selected[field]||[];
    selected[field]=arr.includes(value)?arr.filter(v=>v!==value):[...arr,value];
    syncChips();
  });
});

$('selectFullPack').addEventListener('click',()=>{
  selected.materiel_a_apporter=['DDJ-FLX10','MacBook','Casque','Sono','Caisson','Éclairage','RB-DMX1','Pieds','Micro','Câbles XLR','Rallonges','Multiprises'];
  syncChips();
});
qsa('.preset').forEach(b=>b.addEventListener('click',()=>{
  const p=b.dataset.preset;
  if(p==='afterwork'){
    selected.ambiances=['Chill','Lounge','Afterwork','Premium'];
    selected.styles=['Deep House','Nu Disco','Disco / Funk'];
  }
  if(p==='festif'){
    selected.ambiances=['Festif','Dansant','Premium'];
    selected.styles=['Disco / Funk','Dance Pop','House','Hits actuels'];
  }
  if(p==='open'){
    selected.ambiances=['Généraliste','Festif','Dansant'];
    selected.styles=['Open Format','80\'s','90\'s','2000\'s','2010\'s','Hits actuels'];
  }
  syncChips();
}));

function updateDuration(){
  $('durationPreview').textContent=duration($('heure_debut').value,$('heure_fin').value)||'—';
}
$('heure_debut').addEventListener('input',updateDuration);
$('heure_fin').addEventListener('input',updateDuration);

function resetForm(date=''){
  $('eventForm').reset();
  $('eventId').value='';
  $('date').value=date||isoToday();
  $('statut').value='confirmee';
  $('paiement').value='a_recevoir';
  $('formMode').textContent='NOUVELLE PRESTATION';
  $('formTitle').textContent='Créer';
  $('deleteEvent').classList.add('hidden');
  clearSelections(); updateDuration();
}
$('cancelEdit').addEventListener('click',()=>nav('planning'));

async function editEvent(id){
  const ev=await getEvent(id); if(!ev) return;
  resetForm(ev.date);
  $('eventId').value=ev.id;
  const fields=['date','lieu','adresse','contact','telephone','heure_arrivee','heure_debut','heure_fin','nombre_personnes','preconisations','styles_a_eviter','cachet','acompte','solde','paiement','notes','statut'];
  fields.forEach(f=>{ if($(f) && ev[f]!==undefined) $(f).value=ev[f]??''; });
  Object.keys(selected).forEach(k=>selected[k]=Array.isArray(ev[k])?[...ev[k]]:[]);
  syncChips(); updateDuration();
  $('formMode').textContent='MODIFIER LA PRESTATION';
  $('formTitle').textContent=ev.lieu||'Prestation';
  $('deleteEvent').classList.remove('hidden');
  nav('form');
}

$('eventForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const id=$('eventId').value||uid();
  const date=$('date').value;
  const all=await getAllEvents();
  const conflict=all.find(x=>x.date===date && x.id!==id && x.statut!=='annulee');
  if(conflict && !confirm(`Une prestation existe déjà ce jour : ${conflict.lieu}. Ajouter quand même ?`)) return;
  const ev={
    id,date,
    lieu:$('lieu').value.trim(), adresse:$('adresse').value.trim(), contact:$('contact').value.trim(),
    telephone:$('telephone').value.trim(), heure_arrivee:$('heure_arrivee').value,
    heure_debut:$('heure_debut').value, heure_fin:$('heure_fin').value,
    duree:duration($('heure_debut').value,$('heure_fin').value),
    public:selected.public, nombre_personnes:Number($('nombre_personnes').value||0),
    ambiances:selected.ambiances, styles:selected.styles,
    preconisations:$('preconisations').value.trim(), styles_a_eviter:$('styles_a_eviter').value.trim(),
    materiel_sur_place:selected.materiel_sur_place, materiel_a_apporter:selected.materiel_a_apporter,
    preparation:selected.preparation, notes:$('notes').value.trim(), statut:$('statut').value,
    cachet:Number($('cachet').value||0), acompte:Number($('acompte').value||0),
    solde:Number($('solde').value||0), paiement:$('paiement').value,
    updated_at:new Date().toISOString()
  };
  await saveEvent(ev);
  showToast('Prestation enregistrée');
  resetForm();
  await showDetail(id);
});

$('deleteEvent').addEventListener('click',async()=>{
  const id=$('eventId').value; if(!id) return;
  if(confirm('Supprimer définitivement cette prestation ?')){
    await removeEvent(id); resetForm(); showToast('Prestation supprimée'); nav('planning');
  }
});

function eventCard(ev){
  const d=dateFromISO(ev.date);
  const day=new Intl.DateTimeFormat('fr-FR',{day:'2-digit'}).format(d);
  const mon=new Intl.DateTimeFormat('fr-FR',{month:'short'}).format(d);
  return `<button class="event-card" data-open="${ev.id}">
    <div class="event-date"><strong>${day}</strong>${mon}</div>
    <div><div class="event-title">${escapeHTML(ev.lieu)}</div>
    <div class="event-meta">${escapeHTML(ev.heure_debut||'—')} → ${escapeHTML(ev.heure_fin||'—')} · ${escapeHTML((ev.ambiances||[]).slice(0,2).join(' · ')||'Sans ambiance')}</div></div>
    <i class="status ${ev.statut}"></i>
  </button>`;
}
document.addEventListener('click',e=>{
  const open=e.target.closest('[data-open]');
  if(open) showDetail(open.dataset.open);
});

async function renderHome(){
  const all=(await getAllEvents()).sort((a,b)=>a.date.localeCompare(b.date)||(a.heure_debut||'').localeCompare(b.heure_debut||''));
  const today=isoToday();
  const future=all.filter(e=>e.date>=today && !['annulee','realisee'].includes(e.statut));
  const next=future[0];
  if(!next){
    $('nextEventCard').className='hero-card empty';
    $('nextEventCard').innerHTML='<div><strong>Aucune prestation à venir</strong><p>Ajoute ton prochain DJ set depuis le bouton +.</p></div>';
  }else{
    $('nextEventCard').className='hero-card';
    $('nextEventCard').innerHTML=`
      <div class="hero-date">${escapeHTML(formatLongDate(next.date))}</div>
      <div class="hero-title">${escapeHTML(next.lieu)}</div>
      <div class="hero-time">${escapeHTML(next.heure_debut||'—')} → ${escapeHTML(next.heure_fin||'—')} ${next.duree?`· ${escapeHTML(next.duree)}`:''}</div>
      <div class="pills">${(next.ambiances||[]).slice(0,4).map(x=>`<span class="pill">${escapeHTML(x)}</span>`).join('')}</div>
      <div class="pills">${(next.styles||[]).slice(0,4).map(x=>`<span class="pill">${escapeHTML(x)}</span>`).join('')}</div>
      <button class="primary-btn" data-open="${next.id}" style="margin-top:15px">Voir le brief complet</button>`;
  }
  $('upcomingList').innerHTML=future.slice(1,6).map(eventCard).join('')||'<p class="muted">Pas d’autre prestation programmée.</p>';
}

async function renderCalendar(){
  $('calendarTitle').textContent=monthName(calendarCursor);
  const year=calendarCursor.getFullYear(), month=calendarCursor.getMonth();
  const first=new Date(year,month,1), last=new Date(year,month+1,0);
  const offset=(first.getDay()+6)%7;
  const all=await getAllEvents();
  let html='';
  for(let i=0;i<offset;i++) html+='<div class="calendar-day blank"></div>';
  for(let day=1;day<=last.getDate();day++){
    const d=new Date(year,month,day);
    const iso=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
    const evs=all.filter(e=>e.date===iso);
    const ev=evs[0];
    html+=`<button class="calendar-day ${iso===isoToday()?'today':''}" data-date="${iso}" ${ev?`data-open="${ev.id}"`:''}>
      <span class="num">${day}</span>
      ${ev?`<i class="mini-dot status ${ev.statut}"></i><div class="cal-event">${escapeHTML(ev.lieu)}</div>`:''}
    </button>`;
  }
  $('calendarGrid').innerHTML=html;
  qsa('.calendar-day[data-date]').forEach(b=>b.addEventListener('click',e=>{
    if(b.dataset.open) return;
    resetForm(b.dataset.date); nav('form');
  }));
}
$('prevMonth').addEventListener('click',()=>{calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()-1,1);renderCalendar();});
$('nextMonth').addEventListener('click',()=>{calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+1,1);renderCalendar();});
$('todayBtn').addEventListener('click',()=>{calendarCursor=new Date();nav('planning');});

async function showDetail(id){
  const ev=await getEvent(id); if(!ev) return;
  const tags=(arr)=>arr?.length?arr.map(x=>`<span class="pill">${escapeHTML(x)}</span>`).join(''):'<span class="muted">—</span>';
  $('detailContent').innerHTML=`
    <div class="detail-hero">
      <div class="hero-date">${escapeHTML(formatLongDate(ev.date))}</div>
      <div class="detail-title">${escapeHTML(ev.lieu)}</div>
      <div class="hero-time">${escapeHTML(ev.heure_debut||'—')} → ${escapeHTML(ev.heure_fin||'—')} ${ev.duree?`· ${escapeHTML(ev.duree)}`:''}</div>
      <div class="pills"><span class="pill">${escapeHTML(statusLabel(ev.statut))}</span>${tags(ev.ambiances)}</div>
      <div class="detail-actions">
        <button class="secondary-btn" id="editDetail">Modifier</button>
        <button class="secondary-btn" id="icsDetail">Calendrier</button>
      </div>
    </div>

    <div class="detail-grid">
      <div class="detail-block"><h3>Lieu & contact</h3>
        <p>${escapeHTML(ev.adresse||'Adresse non renseignée')}</p>
        <p>${escapeHTML(ev.contact||'Contact non renseigné')} ${ev.telephone?`· ${escapeHTML(ev.telephone)}`:''}</p>
        <p>Arrivée : <strong>${escapeHTML(ev.heure_arrivee||'—')}</strong></p>
      </div>
      <div class="detail-block"><h3>Public</h3>
        <div class="pills">${tags(ev.public)}</div>
        <p>${ev.nombre_personnes?`${ev.nombre_personnes} personnes prévues`:'Nombre non renseigné'}</p>
      </div>
      <div class="detail-block"><h3>Musique</h3>
        <div class="pills">${tags(ev.styles)}</div>
        <p><strong>Préconisations :</strong> ${escapeHTML(ev.preconisations||'—')}</p>
        <p><strong>À éviter :</strong> ${escapeHTML(ev.styles_a_eviter||'—')}</p>
      </div>
      <div class="detail-block"><h3>Matériel à apporter</h3>
        <div class="pills">${tags(ev.materiel_a_apporter)}</div>
        <p><strong>Sur place :</strong> ${(ev.materiel_sur_place||[]).map(escapeHTML).join(', ')||'—'}</p>
      </div>
      <div class="detail-block"><h3>Préparation</h3>
        <div class="pills">${tags(ev.preparation)}</div>
      </div>
      <div class="detail-block"><h3>Financier</h3>
        <p>Cachet : <strong>${money(ev.cachet)}</strong></p>
        <p>Acompte : ${money(ev.acompte)} · Solde : ${money(ev.solde)}</p>
        <p>Paiement : ${escapeHTML(paymentLabel(ev.paiement))}</p>
      </div>
      <div class="detail-block"><h3>Notes</h3><p>${escapeHTML(ev.notes||'—').replace(/\n/g,'<br>')}</p></div>
    </div>`;
  $('editDetail').addEventListener('click',()=>editEvent(id));
  $('icsDetail').addEventListener('click',()=>downloadICS(ev));
  qsa('.bottom-nav button').forEach(b=>b.classList.remove('active'));
  qsa('.view').forEach(v=>v.classList.remove('active'));
  $('view-detail').classList.add('active');
  window.scrollTo({top:0,behavior:'instant'});
}

async function renderMore(){
  const all=(await getAllEvents()).sort((a,b)=>b.date.localeCompare(a.date));
  const past=all.filter(e=>e.date<isoToday() || e.statut==='realisee');
  $('archiveList').innerHTML=past.map(eventCard).join('')||'<p class="muted">Aucune prestation archivée.</p>';
}

function downloadBlob(content,type,name){
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('backupBtn').addEventListener('click',async()=>{
  const events=await getAllEvents();
  const payload={app:'DJ Planner',version:1,exported_at:new Date().toISOString(),events};
  downloadBlob(JSON.stringify(payload,null,2),'application/json',`DJPlanner_Backup_${isoToday()}.json`);
  showToast('Sauvegarde créée');
});
$('restoreInput').addEventListener('change',async e=>{
  const file=e.target.files[0]; if(!file) return;
  try{
    const data=JSON.parse(await file.text());
    if(!Array.isArray(data.events)) throw new Error('Format incorrect');
    if(!confirm(`Restaurer ${data.events.length} prestation(s) ? Les éléments ayant le même identifiant seront remplacés.`)) return;
    for(const ev of data.events) await saveEvent(ev);
    showToast('Sauvegarde restaurée'); renderMore();
  }catch(err){ alert('Ce fichier ne semble pas être une sauvegarde DJ Planner valide.'); }
  e.target.value='';
});
$('csvBtn').addEventListener('click',async()=>{
  const all=await getAllEvents();
  const cols=['date','lieu','adresse','contact','telephone','heure_arrivee','heure_debut','heure_fin','duree','public','nombre_personnes','ambiances','styles','preconisations','styles_a_eviter','materiel_sur_place','materiel_a_apporter','preparation','statut','cachet','acompte','solde','paiement','notes'];
  const esc=v=>`"${String(Array.isArray(v)?v.join(' | '):(v??'')).replace(/"/g,'""')}"`;
  const csv='\ufeff'+[cols.join(';'),...all.map(ev=>cols.map(c=>esc(ev[c])).join(';'))].join('\n');
  downloadBlob(csv,'text/csv;charset=utf-8',`DJPlanner_Export_${isoToday()}.csv`);
});

function icsEscape(s=''){ return String(s).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;'); }
function localICSDate(date,time){
  const t=time||'00:00'; return date.replace(/-/g,'')+'T'+t.replace(':','')+'00';
}
function plusDay(iso){
  const d=dateFromISO(iso); d.setDate(d.getDate()+1);
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function downloadICS(ev){
  let endDate=ev.date;
  if(ev.heure_debut && ev.heure_fin && ev.heure_fin<ev.heure_debut) endDate=plusDay(ev.date);
  const desc=[
    `Arrivée : ${ev.heure_arrivee||'—'}`,
    `Public : ${(ev.public||[]).join(', ')||'—'}`,
    `Ambiance : ${(ev.ambiances||[]).join(' → ')||'—'}`,
    `Styles : ${(ev.styles||[]).join(', ')||'—'}`,
    `Matériel à apporter : ${(ev.materiel_a_apporter||[]).join(', ')||'—'}`,
    ev.preconisations?`Préconisations : ${ev.preconisations}`:'',
    ev.notes?`Notes : ${ev.notes}`:''
  ].filter(Boolean).join('\n');
  const ics=[
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//DJ Planner//FR','CALSCALE:GREGORIAN','BEGIN:VEVENT',
    `UID:${ev.id}@djplanner.local`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,
    `DTSTART:${localICSDate(ev.date,ev.heure_debut)}`,
    `DTEND:${localICSDate(endDate,ev.heure_fin)}`,
    `SUMMARY:${icsEscape('DJ SET · '+ev.lieu)}`,
    ev.adresse?`LOCATION:${icsEscape(ev.adresse)}`:'',
    `DESCRIPTION:${icsEscape(desc)}`,
    'END:VEVENT','END:VCALENDAR'
  ].filter(Boolean).join('\r\n');
  downloadBlob(ics,'text/calendar;charset=utf-8',`DJ_${ev.date}_${ev.lieu.replace(/[^\wÀ-ÿ-]+/g,'_')}.ics`);
}

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
if(navigator.storage?.persist) navigator.storage.persist().catch(()=>{});

(async function init(){
  await openDB();
  resetForm();
  await renderHome();
})();
