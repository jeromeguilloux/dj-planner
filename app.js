const DB_NAME='djPlannerDB';
const DB_VERSION=1;
const STORE='events';
const SETTINGS_KEY='djPlannerSettingsV11';
const FINANCE_SETTINGS_KEY='djPlannerFinanceV13';
const FINANCE_DEFAULTS={socialRate:21.2,taxRate:1.7,cfpRate:0.1};
let financeSeasonYear=null;
const PACKS={
  dj:['DDJ-FLX10','MacBook','Casque','Câbles XLR','Rallonges','Multiprises'],
  son:['DDJ-FLX10','MacBook','Casque','Câbles XLR','Rallonges','Multiprises','Sono','Caisson','Pieds','Micro'],
  complet:['DDJ-FLX10','MacBook','Casque','Câbles XLR','Rallonges','Multiprises','Sono','Caisson','Pieds','Micro','Éclairage','RB-DMX1']
};
const PACK_LABELS={dj:'Pack DJ',son:'DJ + Son',complet:'Pack complet'};
let db;
let calendarCursor=new Date();
let currentPack='';
let selected={public:[],ambiances:[],styles:[],materiel_sur_place:[],materiel_a_apporter:[],preparation:[]};

const $=id=>document.getElementById(id);
const qsa=(s,root=document)=>[...root.querySelectorAll(s)];

function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=e=>{const d=e.target.result;if(!d.objectStoreNames.contains(STORE)){const s=d.createObjectStore(STORE,{keyPath:'id'});s.createIndex('date','date',{unique:false});}};req.onsuccess=e=>{db=e.target.result;resolve(db)};req.onerror=()=>reject(req.error);});}
function tx(mode='readonly'){return db.transaction(STORE,mode).objectStore(STORE)}
function getAllRaw(){return new Promise((resolve,reject)=>{const r=tx().getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error)})}
function getRaw(id){return new Promise((resolve,reject)=>{const r=tx().get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function saveEvent(ev){return new Promise((resolve,reject)=>{const r=tx('readwrite').put(ev);r.onsuccess=()=>resolve(ev);r.onerror=()=>reject(r.error)})}
function removeEvent(id){return new Promise((resolve,reject)=>{const r=tx('readwrite').delete(id);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})}
function uid(){return 'ev_'+Date.now()+'_'+Math.random().toString(36).slice(2,8)}
function num(v){const n=Number(v||0);return Number.isFinite(n)?n:0}
function calcFinance(ev){const total=Math.max(0,num(ev.cachet)+num(ev.frais_deplacement));const received=Math.max(0,num(ev.acompte_recu)+num(ev.solde_recu));const reste=Math.max(0,total-received);let paiement='a_recevoir';if(total>0&&received>=total)paiement='paye';else if(received>0)paiement='partiel';return{total,reste,paiement};}
function normalizeEvent(ev={}){const oldAcompte=num(ev.acompte);const migrated={...ev};migrated.public=Array.isArray(ev.public)?ev.public:[];migrated.ambiances=Array.isArray(ev.ambiances)?ev.ambiances:[];migrated.styles=Array.isArray(ev.styles)?ev.styles:[];migrated.materiel_sur_place=Array.isArray(ev.materiel_sur_place)?ev.materiel_sur_place:[];migrated.materiel_a_apporter=Array.isArray(ev.materiel_a_apporter)?ev.materiel_a_apporter:[];migrated.preparation=Array.isArray(ev.preparation)?ev.preparation:[];migrated.materiel_pack=ev.materiel_pack||'';migrated.frais_deplacement=num(ev.frais_deplacement);migrated.acompte_demande=ev.acompte_demande!==undefined?num(ev.acompte_demande):oldAcompte;migrated.acompte_recu=ev.acompte_recu!==undefined?num(ev.acompte_recu):oldAcompte;migrated.solde_recu=ev.solde_recu!==undefined?num(ev.solde_recu):(ev.paiement==='paye'?Math.max(0,num(ev.cachet)-oldAcompte):0);migrated.mode_reglement=ev.mode_reglement||'';migrated.date_reglement=ev.date_reglement||'';
migrated.date_acompte_recu=ev.date_acompte_recu||((num(migrated.acompte_recu)>0&&num(migrated.solde_recu)===0)?migrated.date_reglement:'');
migrated.date_solde_recu=ev.date_solde_recu||((num(migrated.solde_recu)>0)?migrated.date_reglement:'');
if(!migrated.date_acompte_recu&&num(migrated.acompte_recu)>0&&migrated.date_reglement)migrated.date_acompte_recu=migrated.date_reglement;
migrated.facture_envoyee=!!ev.facture_envoyee;migrated.jourj_material_done=Array.isArray(ev.jourj_material_done)?ev.jourj_material_done:[];migrated.jourj_preparation_done=Array.isArray(ev.jourj_preparation_done)?ev.jourj_preparation_done:[];migrated.record_type=ev.record_type||'booking';migrated.unavailability_reason=ev.unavailability_reason||'';migrated.unavailability_notes=ev.unavailability_notes||'';Object.assign(migrated,calcFinance(migrated));return migrated;}
async function getAllEvents(){return (await getAllRaw()).map(normalizeEvent)}
async function getEvent(id){const ev=await getRaw(id);return ev?normalizeEvent(ev):null}

function loadSettings(){try{return{djName:'ÉDOUARD KINNER',...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}}catch{return{djName:'ÉDOUARD KINNER'}}}
function saveSettings(s){localStorage.setItem(SETTINGS_KEY,JSON.stringify(s));applySettings()}
function applySettings(){const s=loadSettings();$('djNameDisplay').textContent=(s.djName||'DJ').toUpperCase();if($('djNameInput'))$('djNameInput').value=s.djName||'';}
function loadFinanceSettings(){try{return{...FINANCE_DEFAULTS,...JSON.parse(localStorage.getItem(FINANCE_SETTINGS_KEY)||'{}')}}catch{return{...FINANCE_DEFAULTS}}}
function saveFinanceSettings(s){localStorage.setItem(FINANCE_SETTINGS_KEY,JSON.stringify({...loadFinanceSettings(),...s}))}
function totalFinanceRate(){const s=loadFinanceSettings();return num(s.socialRate)+num(s.taxRate)+num(s.cfpRate)}
function periodStartYearForDate(iso){const d=dateFromISO(iso),y=d.getFullYear(),m=d.getMonth()+1;return m>=5?y:y-1}
function financePeriodBounds(startYear){return{start:`${startYear}-05-01`,end:`${startYear+1}-04-30`}}
function formatShortDate(iso){if(!iso)return'—';return new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(dateFromISO(iso))}
function monthKeyFromDate(iso){return iso?iso.slice(0,7):''}
function financeMonthSequence(startYear){const out=[];for(let i=0;i<12;i++){const d=new Date(startYear,4+i,1);out.push({key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,label:new Intl.DateTimeFormat('fr-FR',{month:'short',year:'2-digit'}).format(d)});}return out}
function paymentEntriesForEvent(ev){
  if(!isBooking(ev))return[];
  const entries=[];
  const invoice=!!ev.facture_envoyee;
  if(num(ev.acompte_recu)>0)entries.push({
    eventId:ev.id,date:ev.date_acompte_recu||ev.date_reglement||ev.date,
    inferred:!(ev.date_acompte_recu||ev.date_reglement),lieu:ev.lieu||'Prestation',nature:'Acompte',
    amount:num(ev.acompte_recu),invoice,mode:ev.mode_reglement||''
  });
  if(num(ev.solde_recu)>0)entries.push({
    eventId:ev.id,date:ev.date_solde_recu||ev.date_reglement||ev.date,
    inferred:!(ev.date_solde_recu||ev.date_reglement),lieu:ev.lieu||'Prestation',nature:'Solde',
    amount:num(ev.solde_recu),invoice,mode:ev.mode_reglement||''
  });
  return entries;
}
function financeCalc(entry){
  const s=loadFinanceSettings(),base=entry.invoice?num(entry.amount):0;
  const social=base*num(s.socialRate)/100,tax=base*num(s.taxRate)/100,cfp=base*num(s.cfpRate)/100;
  const charges=social+tax+cfp;
  return{...entry,social,tax,cfp,charges,after:num(entry.amount)-charges};
}

function formatMoneyCompact(value){
  return new Intl.NumberFormat('fr-FR',{
    style:'currency',
    currency:'EUR',
    maximumFractionDigits:0
  }).format(value||0);
}
function renderFinanceNetChart(labels,values){
  const canvas=$('financeNetChart');
  if(!canvas) return;
  const cssWidth=Math.max(280, canvas.clientWidth || canvas.parentElement?.clientWidth || 320);
  const cssHeight=220;
  const dpr=window.devicePixelRatio||1;
  canvas.width=Math.round(cssWidth*dpr);
  canvas.height=Math.round(cssHeight*dpr);
  const ctx=canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,cssWidth,cssHeight);

  const pad={top:18,right:16,bottom:40,left:54};
  const w=cssWidth-pad.left-pad.right;
  const h=cssHeight-pad.top-pad.bottom;
  const vals=values.map(v=>Number(v||0));
  const minVal=Math.min(0,...vals);
  const maxVal=Math.max(0,...vals);
  const span=(maxVal-minVal)||1;
  const axisColor='#2d3138', mutedColor='#7f8590', accentColor='#d7bf84', fillColor='rgba(215,191,132,0.12)';

  function xFor(i){ return labels.length===1 ? pad.left+w/2 : pad.left + (i*(w/(labels.length-1))); }
  function yFor(v){ return pad.top + ((maxVal-v)/span)*h; }

  ctx.font='11px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif';
  ctx.textAlign='right';
  ctx.textBaseline='middle';
  ctx.strokeStyle=axisColor;
  ctx.fillStyle=mutedColor;
  ctx.lineWidth=1;
  const steps=4;
  for(let i=0;i<=steps;i++){
    const val=maxVal-(span/steps)*i;
    const y=yFor(val);
    ctx.beginPath();
    ctx.moveTo(pad.left,y);
    ctx.lineTo(pad.left+w,y);
    ctx.stroke();
    ctx.fillText(formatMoneyCompact(val), pad.left-8, y);
  }

  if(minVal<0 && maxVal>0){
    const y0=yFor(0);
    ctx.strokeStyle='rgba(201,106,106,0.5)';
    ctx.beginPath();
    ctx.moveTo(pad.left,y0);
    ctx.lineTo(pad.left+w,y0);
    ctx.stroke();
  }

  if(!labels.length){
    ctx.fillStyle=mutedColor;
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText('Aucune donnée', cssWidth/2, cssHeight/2);
    return;
  }

  const baseline=yFor(Math.min(0,minVal));
  ctx.beginPath();
  vals.forEach((v,i)=>{
    const x=xFor(i), y=yFor(v);
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.lineTo(xFor(labels.length-1), baseline);
  ctx.lineTo(xFor(0), baseline);
  ctx.closePath();
  ctx.fillStyle=fillColor;
  ctx.fill();

  ctx.beginPath();
  vals.forEach((v,i)=>{
    const x=xFor(i), y=yFor(v);
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.strokeStyle=accentColor;
  ctx.lineWidth=2.5;
  ctx.stroke();

  vals.forEach((v,i)=>{
    const x=xFor(i), y=yFor(v);
    ctx.beginPath();
    ctx.arc(x,y,3.5,0,Math.PI*2);
    ctx.fillStyle=accentColor;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x,y,1.5,0,Math.PI*2);
    ctx.fillStyle='#101114';
    ctx.fill();
  });

  ctx.fillStyle=mutedColor;
  ctx.textAlign='center';
  ctx.textBaseline='top';
  labels.forEach((label,i)=>{
    ctx.fillText(label, xFor(i), cssHeight-24);
  });
}

function isoToday(){const d=new Date(),off=d.getTimezoneOffset();return new Date(d.getTime()-off*60000).toISOString().slice(0,10)}
function dateFromISO(iso){return new Date(iso+'T12:00:00')}
function formatLongDate(iso){return new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(dateFromISO(iso))}
function monthName(d){return new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'}).format(d)}
function duration(start,end){if(!start||!end)return'';let[sh,sm]=start.split(':').map(Number),[eh,em]=end.split(':').map(Number);let mins=(eh*60+em)-(sh*60+sm);if(mins<0)mins+=1440;const h=Math.floor(mins/60),m=mins%60;return`${h} h${m?` ${String(m).padStart(2,'0')}`:''}`}
function money(v){return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(num(v))}
function escapeHTML(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function statusLabel(s){return({demande:'Demande',option:'Option',confirmee:'Confirmée',realisee:'Réalisée',annulee:'Annulée'})[s]||s}
function paymentLabel(s){return({a_recevoir:'À recevoir',partiel:'Partiellement payé',paye:'Payé'})[s]||s}
function showToast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function isUnavailable(ev){return ev?.record_type==='unavailability'}
function isBooking(ev){return !isUnavailable(ev)}
function activeBooking(ev){return isBooking(ev)&&ev.statut!=='annulee'}
function closeModal(id){$(id)?.classList.add('hidden')}
function openModal(id){$(id)?.classList.remove('hidden')}
let selectedCalendarDate='';
function scrollTop(){const m=$('mainScroller');if(m)m.scrollTo({top:0,behavior:'instant'})}

function nav(name){qsa('.view').forEach(v=>v.classList.remove('active'));const target=$('view-'+name);if(target)target.classList.add('active');qsa('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===name));scrollTop();if(name==='home')renderHome();if(name==='planning')renderCalendar();if(name==='more')renderMore();if(name==='finance')renderFinance();if(name==='form'&&!$('eventId').value)resetForm();}
qsa('[data-nav]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.nav)));

function clearSelections(){selected={public:[],ambiances:[],styles:[],materiel_sur_place:[],materiel_a_apporter:[],preparation:[]};currentPack='';qsa('.chip').forEach(c=>c.classList.remove('selected'));qsa('.pack-btn').forEach(b=>b.classList.remove('selected'));updatePackHelp();}
function syncChips(){qsa('.chips[data-field]').forEach(group=>{const field=group.dataset.field;qsa('.chip',group).forEach(ch=>ch.classList.toggle('selected',(selected[field]||[]).includes(ch.dataset.value)))});qsa('.pack-btn').forEach(b=>b.classList.toggle('selected',b.dataset.pack===currentPack));updatePackHelp();}
function updatePackHelp(){const el=$('packHelp');if(!el)return;el.textContent=currentPack?`${PACK_LABELS[currentPack]} actif : ce qui est fourni sur place est retiré automatiquement de la liste à apporter.`:`Mode personnalisé : la liste « À apporter » peut être cochée librement.`;}
function recalcMaterialFromPack(){if(!currentPack)return;const onsite=new Set(selected.materiel_sur_place);selected.materiel_a_apporter=PACKS[currentPack].filter(x=>!onsite.has(x));syncChips();}
qsa('.chips[data-field]').forEach(group=>{group.addEventListener('click',e=>{const ch=e.target.closest('.chip');if(!ch)return;const field=group.dataset.field,value=ch.dataset.value;const arr=selected[field]||[];selected[field]=arr.includes(value)?arr.filter(v=>v!==value):[...arr,value];if(field==='materiel_sur_place'&&currentPack)recalcMaterialFromPack();else if(field==='materiel_a_apporter'){currentPack='';syncChips();}else syncChips();});});
qsa('.pack-btn').forEach(b=>b.addEventListener('click',()=>{currentPack=b.dataset.pack;recalcMaterialFromPack();}));
$('clearPack').addEventListener('click',()=>{currentPack='';syncChips();});

qsa('.preset').forEach(b=>b.addEventListener('click',()=>{const p=b.dataset.preset;if(p==='afterwork'){selected.ambiances=['Chill','Lounge','Afterwork','Premium'];selected.styles=['Deep House','Nu Disco','Disco / Funk']}if(p==='festif'){selected.ambiances=['Festif','Dansant','Premium'];selected.styles=['Disco / Funk','Dance Pop','House','Hits actuels']}if(p==='open'){selected.ambiances=['Généraliste','Festif','Dansant'];selected.styles=['Open Format',"80's","90's","2000's","2010's",'Hits actuels']}syncChips();}));

function updateDuration(){$('durationPreview').textContent=duration($('heure_debut').value,$('heure_fin').value)||'—'}
$('heure_debut').addEventListener('input',updateDuration);$('heure_fin').addEventListener('input',updateDuration);
function updateFinancePreview(){const tmp={cachet:$('cachet').value,frais_deplacement:$('frais_deplacement').value,acompte_recu:$('acompte_recu').value,solde_recu:$('solde_recu').value};const f=calcFinance(tmp);$('totalPreview').textContent=money(f.total);$('restePreview').textContent=money(f.reste);$('paymentPreview').textContent=paymentLabel(f.paiement);}
['cachet','frais_deplacement','acompte_recu','solde_recu'].forEach(id=>$(id).addEventListener('input',updateFinancePreview));

function resetForm(date=isoToday()){$('eventForm').reset();$('eventId').value='';$('date').value=date;$('statut').value='confirmee';$('formMode').textContent='NOUVELLE PRESTATION';$('formTitle').textContent='Créer';$('deleteEvent').classList.add('hidden');clearSelections();updateDuration();updateFinancePreview();}
$('cancelEdit').addEventListener('click',()=>nav('planning'));
function setField(id,value){if($(id))$(id).value=value??''}
function fillForm(ev){const fields=['date','lieu','adresse','contact','telephone','heure_arrivee','heure_debut','heure_fin','nombre_personnes','preconisations','styles_a_eviter','cachet','frais_deplacement','acompte_demande','acompte_recu','date_acompte_recu','solde_recu','date_solde_recu','mode_reglement','date_reglement','notes','statut'];fields.forEach(f=>setField(f,ev[f]));$('facture_envoyee').checked=!!ev.facture_envoyee;Object.keys(selected).forEach(k=>selected[k]=Array.isArray(ev[k])?[...ev[k]]:[]);currentPack=ev.materiel_pack||'';syncChips();updateDuration();updateFinancePreview();}
async function editEvent(id){const ev=await getEvent(id);if(!ev)return;resetForm(ev.date);$('eventId').value=ev.id;fillForm(ev);$('formMode').textContent='MODIFIER LA PRESTATION';$('formTitle').textContent=ev.lieu||'Prestation';$('deleteEvent').classList.remove('hidden');nav('form');}
async function duplicateEvent(id){const ev=await getEvent(id);if(!ev)return;resetForm('');nav('form');fillForm(ev);$('eventId').value='';$('date').value='';$('statut').value='option';$('acompte_recu').value='';$('date_acompte_recu').value='';$('solde_recu').value='';$('date_solde_recu').value='';$('date_reglement').value='';$('facture_envoyee').checked=false;updateFinancePreview();$('formMode').textContent='DUPLIQUER LA PRESTATION';$('formTitle').textContent=ev.lieu||'Prestation';$('deleteEvent').classList.add('hidden');setTimeout(()=>$('date').focus(),150);showToast('Copie prête : choisis la nouvelle date');}

$('eventForm').addEventListener('submit',async e=>{e.preventDefault();const id=$('eventId').value||uid(),date=$('date').value;const all=await getAllEvents();const blocked=all.find(x=>x.date===date&&x.id!==id&&isUnavailable(x));if(blocked){alert(`Cette journée est verrouillée comme indisponible${blocked.unavailability_reason?` (${blocked.unavailability_reason})`:''}. Déverrouille-la d'abord depuis le Planning.`);return;}const conflict=all.find(x=>x.date===date&&x.id!==id&&activeBooking(x));if(conflict&&!confirm(`Une prestation existe déjà ce jour : ${conflict.lieu}. Ajouter quand même ?`))return;const ev={id,date,record_type:'booking',lieu:$('lieu').value.trim(),adresse:$('adresse').value.trim(),contact:$('contact').value.trim(),telephone:$('telephone').value.trim(),heure_arrivee:$('heure_arrivee').value,heure_debut:$('heure_debut').value,heure_fin:$('heure_fin').value,duree:duration($('heure_debut').value,$('heure_fin').value),public:selected.public,nombre_personnes:num($('nombre_personnes').value),ambiances:selected.ambiances,styles:selected.styles,preconisations:$('preconisations').value.trim(),styles_a_eviter:$('styles_a_eviter').value.trim(),materiel_pack:currentPack,materiel_sur_place:selected.materiel_sur_place,materiel_a_apporter:selected.materiel_a_apporter,preparation:selected.preparation,notes:$('notes').value.trim(),statut:$('statut').value,cachet:num($('cachet').value),frais_deplacement:num($('frais_deplacement').value),acompte_demande:num($('acompte_demande').value),acompte_recu:num($('acompte_recu').value),date_acompte_recu:$('date_acompte_recu').value,
solde_recu:num($('solde_recu').value),date_solde_recu:$('date_solde_recu').value,
mode_reglement:$('mode_reglement').value,
date_reglement:$('date_solde_recu').value||$('date_acompte_recu').value||$('date_reglement').value,
facture_envoyee:$('facture_envoyee').checked,jourj_material_done:[],jourj_preparation_done:[],updated_at:new Date().toISOString()};const previous=$('eventId').value?await getEvent(id):null;if(previous){ev.jourj_material_done=previous.jourj_material_done||[];ev.jourj_preparation_done=previous.jourj_preparation_done||[];}Object.assign(ev,calcFinance(ev));await saveEvent(ev);showToast('Prestation enregistrée');resetForm();await showDetail(id);});
$('deleteEvent').addEventListener('click',async()=>{const id=$('eventId').value;if(!id)return;if(confirm('Supprimer définitivement cette prestation ?')){await removeEvent(id);resetForm();showToast('Prestation supprimée');nav('planning')}});

function eventCard(ev){const d=dateFromISO(ev.date),day=new Intl.DateTimeFormat('fr-FR',{day:'2-digit'}).format(d),mon=new Intl.DateTimeFormat('fr-FR',{month:'short'}).format(d);return`<button class="event-card" data-open="${ev.id}"><div class="event-date"><strong>${day}</strong>${mon}</div><div><div class="event-title">${escapeHTML(ev.lieu)}</div><div class="event-meta">${escapeHTML(ev.heure_debut||'—')} → ${escapeHTML(ev.heure_fin||'—')} · ${escapeHTML((ev.ambiances||[]).slice(0,2).join(' · ')||'Sans ambiance')}</div></div><i class="status ${ev.statut}"></i></button>`}
document.addEventListener('click',e=>{const open=e.target.closest('[data-open]');if(open)showDetail(open.dataset.open)});

async function renderHome(){const all=(await getAllEvents()).sort((a,b)=>a.date.localeCompare(b.date)||(a.heure_debut||'').localeCompare(b.heure_debut||'')),today=isoToday(),future=all.filter(e=>isBooking(e)&&e.date>=today&&!['annulee','realisee'].includes(e.statut)),next=future[0];if(!next){$('nextEventCard').className='hero-card empty';$('nextEventCard').innerHTML='<div><strong>Aucune prestation à venir</strong><p>Ajoute ton prochain DJ set depuis le bouton +.</p></div>'}else{$('nextEventCard').className='hero-card';$('nextEventCard').innerHTML=`<div class="hero-date">${escapeHTML(formatLongDate(next.date))}</div><div class="hero-title">${escapeHTML(next.lieu)}</div><div class="hero-time">${escapeHTML(next.heure_debut||'—')} → ${escapeHTML(next.heure_fin||'—')} ${next.duree?`· ${escapeHTML(next.duree)}`:''}</div><div class="pills">${(next.ambiances||[]).slice(0,4).map(x=>`<span class="pill">${escapeHTML(x)}</span>`).join('')}</div><div class="pills">${(next.styles||[]).slice(0,4).map(x=>`<span class="pill">${escapeHTML(x)}</span>`).join('')}</div><div class="hero-actions"><button class="secondary-btn" data-open="${next.id}">Brief complet</button><button class="primary-btn" data-dayj="${next.id}">Mode Jour J</button></div>`} $('upcomingList').innerHTML=future.slice(1,6).map(eventCard).join('')||'<p class="muted">Pas d’autre prestation programmée.</p>';qsa('[data-dayj]').forEach(b=>b.addEventListener('click',()=>showDayJ(b.dataset.dayj)));}

async function renderCalendar(){
  $('calendarTitle').textContent=monthName(calendarCursor);
  const year=calendarCursor.getFullYear(),month=calendarCursor.getMonth(),first=new Date(year,month,1),last=new Date(year,month+1,0),offset=(first.getDay()+6)%7,all=await getAllEvents();
  let html='';
  for(let i=0;i<offset;i++)html+='<div class="calendar-day blank"></div>';
  for(let day=1;day<=last.getDate();day++){
    const d=new Date(year,month,day),iso=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
    const records=all.filter(e=>e.date===iso);
    const active=records.find(activeBooking);
    const unavailable=records.find(isUnavailable);
    const booking=active||(!unavailable?records.find(e=>isBooking(e)):null);
    const ev=booking||unavailable;
    const unavailableShown=!active&&!!unavailable;
    html+=`<button class="calendar-day ${iso===isoToday()?'today':''} ${unavailableShown?'unavailable':''}" data-date="${iso}" ${booking?`data-open="${booking.id}"`:unavailableShown?`data-block="${unavailable.id}"`:''}>
      <span class="num">${day}</span>
      ${booking?`<i class="mini-dot status ${booking.statut}"></i><div class="cal-event">${escapeHTML(booking.lieu)}</div>`:''}
      ${unavailableShown?`<span class="lock-mark">🔒</span><div class="cal-event">Indisponible${unavailable.unavailability_reason?`<br>${escapeHTML(unavailable.unavailability_reason)}`:''}</div>`:''}
    </button>`;
  }
  $('calendarGrid').innerHTML=html;
  qsa('.calendar-day[data-date]').forEach(b=>b.addEventListener('click',()=>{
    if(b.dataset.open)return;
    if(b.dataset.block){openUnavailability(b.dataset.block);return;}
    openDayActions(b.dataset.date);
  }));
}

function openDayActions(date){
  selectedCalendarDate=date;
  $('dayActionDate').textContent=formatLongDate(date);
  openModal('dayActionModal');
}
$('dayActionCancel').addEventListener('click',()=>closeModal('dayActionModal'));
$('dayAddBooking').addEventListener('click',()=>{
  const date=selectedCalendarDate;
  closeModal('dayActionModal');
  resetForm(date);
  nav('form');
});
$('dayBlock').addEventListener('click',()=>{
  const date=selectedCalendarDate;
  closeModal('dayActionModal');
  prepareUnavailability(date);
});
$('dayActionModal').addEventListener('click',e=>{if(e.target===$('dayActionModal'))closeModal('dayActionModal')});

function prepareUnavailability(date){
  $('unavailabilityId').value='';
  $('unavailabilityDate').value=date;
  $('unavailabilityDateLabel').textContent=formatLongDate(date);
  $('unavailabilityReason').value='Personnel';
  $('unavailabilityNotes').value='';
  $('unavailabilityTitle').textContent='Verrouiller la journée';
  $('saveUnavailability').textContent='🔒 Verrouiller cette journée';
  $('removeUnavailability').classList.add('hidden');
  openModal('unavailabilityModal');
}
async function openUnavailability(id){
  const ev=await getEvent(id);if(!ev||!isUnavailable(ev))return;
  $('unavailabilityId').value=ev.id;
  $('unavailabilityDate').value=ev.date;
  $('unavailabilityDateLabel').textContent=formatLongDate(ev.date);
  $('unavailabilityReason').value=ev.unavailability_reason||'Personnel';
  $('unavailabilityNotes').value=ev.unavailability_notes||'';
  $('unavailabilityTitle').textContent='Journée indisponible';
  $('saveUnavailability').textContent='Enregistrer les modifications';
  $('removeUnavailability').classList.remove('hidden');
  openModal('unavailabilityModal');
}
$('unavailabilityCancel').addEventListener('click',()=>closeModal('unavailabilityModal'));
$('unavailabilityModal').addEventListener('click',e=>{if(e.target===$('unavailabilityModal'))closeModal('unavailabilityModal')});
$('saveUnavailability').addEventListener('click',async()=>{
  const date=$('unavailabilityDate').value,id=$('unavailabilityId').value||('blk_'+Date.now()+'_'+Math.random().toString(36).slice(2,8));
  const all=await getAllEvents();
  const booking=all.find(x=>x.date===date&&activeBooking(x));
  if(booking){alert(`Impossible de verrouiller cette journée : une prestation active existe déjà (${booking.lieu}).`);return;}
  const ev={
    id,date,record_type:'unavailability',statut:'indisponible',lieu:'Indisponible',
    unavailability_reason:$('unavailabilityReason').value,
    unavailability_notes:$('unavailabilityNotes').value.trim(),
    updated_at:new Date().toISOString()
  };
  await saveEvent(ev);
  closeModal('unavailabilityModal');
  showToast('Journée verrouillée');
  renderCalendar();
});
$('removeUnavailability').addEventListener('click',async()=>{
  const id=$('unavailabilityId').value;if(!id)return;
  if(confirm('Déverrouiller cette journée ?')){
    await removeEvent(id);
    closeModal('unavailabilityModal');
    showToast('Journée déverrouillée');
    renderCalendar();
  }
});
$('prevMonth').addEventListener('click',()=>{calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()-1,1);renderCalendar()});$('nextMonth').addEventListener('click',()=>{calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+1,1);renderCalendar()});$('todayBtn').addEventListener('click',()=>{calendarCursor=new Date();nav('planning')});

function mapsUrl(address){return address?`https://maps.apple.com/?q=${encodeURIComponent(address)}`:'#'}
function telUrl(phone){return phone?`tel:${String(phone).replace(/[^+\d]/g,'')}`:'#'}
async function showDetail(id){const ev=await getEvent(id);if(!ev)return;const tags=arr=>arr?.length?arr.map(x=>`<span class="pill">${escapeHTML(x)}</span>`).join(''):'<span class="muted">—</span>';$('detailContent').innerHTML=`<div class="detail-hero"><div class="hero-date">${escapeHTML(formatLongDate(ev.date))}</div><div class="detail-title">${escapeHTML(ev.lieu)}</div><div class="hero-time">${escapeHTML(ev.heure_debut||'—')} → ${escapeHTML(ev.heure_fin||'—')} ${ev.duree?`· ${escapeHTML(ev.duree)}`:''}</div><div class="pills"><span class="pill">${escapeHTML(statusLabel(ev.statut))}</span>${tags(ev.ambiances)}</div><div class="quick-actions"><a class="quick-link ${ev.adresse?'':'disabled'}" href="${mapsUrl(ev.adresse)}" target="_blank" rel="noopener">⌖ Plans</a><a class="quick-link ${ev.telephone?'':'disabled'}" href="${telUrl(ev.telephone)}">☎ Appeler</a></div><div class="detail-actions"><button class="secondary-btn" id="editDetail">Modifier</button><button class="secondary-btn" id="duplicateDetail">Dupliquer</button><button class="primary-btn" id="dayJDetail">Mode Jour J</button><button class="secondary-btn" id="icsDetail">Calendrier</button></div></div><div class="detail-grid"><div class="detail-block"><h3>Lieu & contact</h3><p>${escapeHTML(ev.adresse||'Adresse non renseignée')}</p><p>${escapeHTML(ev.contact||'Contact non renseigné')} ${ev.telephone?`· ${escapeHTML(ev.telephone)}`:''}</p><p>Arrivée : <strong>${escapeHTML(ev.heure_arrivee||'—')}</strong></p></div><div class="detail-block"><h3>Public</h3><div class="pills">${tags(ev.public)}</div><p>${ev.nombre_personnes?`${ev.nombre_personnes} personnes prévues`:'Nombre non renseigné'}</p></div><div class="detail-block"><h3>Musique</h3><div class="pills">${tags(ev.styles)}</div><p><strong>Préconisations :</strong> ${escapeHTML(ev.preconisations||'—')}</p><p><strong>À éviter :</strong> ${escapeHTML(ev.styles_a_eviter||'—')}</p></div><div class="detail-block"><h3>Matériel à apporter</h3><div class="pills">${tags(ev.materiel_a_apporter)}</div><p><strong>Sur place :</strong> ${(ev.materiel_sur_place||[]).map(escapeHTML).join(', ')||'—'}</p>${ev.materiel_pack?`<p><strong>Pack :</strong> ${escapeHTML(PACK_LABELS[ev.materiel_pack]||ev.materiel_pack)}</p>`:''}</div><div class="detail-block"><h3>Préparation</h3><div class="pills">${tags(ev.preparation)}</div></div><div class="detail-block"><h3>Financier</h3><p>Prestation : <strong>${money(ev.cachet)}</strong>${ev.frais_deplacement?` · déplacement ${money(ev.frais_deplacement)}`:''}</p><p>Total : <strong>${money(ev.total)}</strong></p><p>Acompte demandé : ${money(ev.acompte_demande)} · reçu : ${money(ev.acompte_recu)}${ev.date_acompte_recu?` le ${formatShortDate(ev.date_acompte_recu)}`:''}</p><p>Solde reçu : ${money(ev.solde_recu)}${ev.date_solde_recu?` le ${formatShortDate(ev.date_solde_recu)}`:''}</p><p>Reste : <strong>${money(ev.reste)}</strong></p><p>Paiement : ${escapeHTML(paymentLabel(ev.paiement))}${ev.mode_reglement?` · ${escapeHTML(ev.mode_reglement)}`:''}</p><p>Facture : ${ev.facture_envoyee?'envoyée':'non envoyée'}</p></div><div class="detail-block"><h3>Notes</h3><p>${escapeHTML(ev.notes||'—').replace(/\n/g,'<br>')}</p></div></div>`;$('editDetail').addEventListener('click',()=>editEvent(id));$('duplicateDetail').addEventListener('click',()=>duplicateEvent(id));$('dayJDetail').addEventListener('click',()=>showDayJ(id));$('icsDetail').addEventListener('click',()=>downloadICS(ev));qsa('.bottom-nav button').forEach(b=>b.classList.remove('active'));qsa('.view').forEach(v=>v.classList.remove('active'));$('view-detail').classList.add('active');scrollTop();}

async function showDayJ(id){const ev=await getEvent(id);if(!ev)return;const checks=(items,done,kind)=>items?.length?items.map(x=>`<button class="check-item ${done.includes(x)?'done':''}" data-check-kind="${kind}" data-check-value="${encodeURIComponent(x)}">${escapeHTML(x)}</button>`).join(''):'<p class="muted">Aucun élément.</p>';$('dayJContent').innerHTML=`<div class="dayj-head"><div class="hero-date">MODE JOUR J · ${escapeHTML(formatLongDate(ev.date))}</div><div class="detail-title">${escapeHTML(ev.lieu)}</div><div class="quick-actions"><a class="quick-link ${ev.adresse?'':'disabled'}" href="${mapsUrl(ev.adresse)}" target="_blank" rel="noopener">⌖ Ouvrir dans Plans</a><a class="quick-link ${ev.telephone?'':'disabled'}" href="${telUrl(ev.telephone)}">☎ Appeler</a></div></div><div class="dayj-time-grid"><div class="dayj-time"><span>Arrivée</span><strong>${escapeHTML(ev.heure_arrivee||'—')}</strong></div><div class="dayj-time"><span>Set</span><strong>${escapeHTML(ev.heure_debut||'—')} → ${escapeHTML(ev.heure_fin||'—')}</strong></div></div><div class="detail-grid" style="margin-top:12px"><div class="detail-block"><h3>Public</h3><p>${escapeHTML((ev.public||[]).join(' · ')||'—')}${ev.nombre_personnes?` · ${ev.nombre_personnes} personnes`:''}</p></div><div class="detail-block"><h3>Direction musicale</h3><p><strong>${escapeHTML((ev.styles||[]).join(' · ')||'—')}</strong></p><p class="dayj-note">${escapeHTML(ev.preconisations||'Aucune préconisation')}</p>${ev.styles_a_eviter?`<p><strong>À éviter :</strong> ${escapeHTML(ev.styles_a_eviter)}</p>`:''}</div><div class="detail-block"><h3>Matériel à charger</h3><div class="checklist">${checks(ev.materiel_a_apporter,ev.jourj_material_done,'material')}</div></div><div class="detail-block"><h3>Préparation</h3><div class="checklist">${checks(ev.preparation,ev.jourj_preparation_done,'prep')}</div></div><div class="detail-block"><h3>Notes</h3><p class="dayj-note">${escapeHTML(ev.notes||'—')}</p></div><button class="secondary-btn full" id="backToDetail">← Retour au brief complet</button></div>`;qsa('[data-check-kind]').forEach(b=>b.addEventListener('click',async()=>{const value=decodeURIComponent(b.dataset.checkValue),kind=b.dataset.checkKind,fresh=await getEvent(id),key=kind==='material'?'jourj_material_done':'jourj_preparation_done',arr=fresh[key]||[];fresh[key]=arr.includes(value)?arr.filter(x=>x!==value):[...arr,value];await saveEvent(fresh);b.classList.toggle('done',fresh[key].includes(value));}));$('backToDetail').addEventListener('click',()=>showDetail(id));qsa('.bottom-nav button').forEach(b=>b.classList.remove('active'));qsa('.view').forEach(v=>v.classList.remove('active'));$('view-dayj').classList.add('active');scrollTop();}


async function renderFinance(){
  if(financeSeasonYear===null)financeSeasonYear=periodStartYearForDate(isoToday());
  const s=loadFinanceSettings(),bounds=financePeriodBounds(financeSeasonYear);
  $('financePeriodTitle').textContent=`01/05/${financeSeasonYear} → 30/04/${financeSeasonYear+1}`;
  $('socialRateInput').value=s.socialRate;
  $('taxRateInput').value=s.taxRate;
  $('cfpRateInput').value=s.cfpRate;
  $('financeTotalRate').textContent=`${totalFinanceRate().toFixed(2).replace('.',',')} %`;

  const all=await getAllEvents();
  const entries=all.flatMap(paymentEntriesForEvent).filter(x=>x.date>=bounds.start&&x.date<=bounds.end).map(financeCalc).sort((a,b)=>a.date.localeCompare(b.date));
  const total=entries.reduce((a,x)=>a+x.amount,0);
  const invoiced=entries.filter(x=>x.invoice).reduce((a,x)=>a+x.amount,0);
  const nonInvoiced=total-invoiced;
  const charges=entries.reduce((a,x)=>a+x.charges,0);
  const after=entries.reduce((a,x)=>a+x.after,0);

  $('financeKpis').innerHTML=`
    <div class="finance-kpi"><span>Total encaissé</span><strong>${money(total)}</strong><em>Acompte + solde</em></div>
    <div class="finance-kpi"><span>Encaissé facturé</span><strong>${money(invoiced)}</strong><em>Base de provision affichée</em></div>
    <div class="finance-kpi"><span>Encaissé non facturé</span><strong>${money(nonInvoiced)}</strong><em>Charges non calculées selon ton filtre</em></div>
    <div class="finance-kpi"><span>Charges provisionnées</span><strong>${money(charges)}</strong><em>${totalFinanceRate().toFixed(2).replace('.',',')} % sur le facturé encaissé</em></div>
    <div class="finance-kpi wide"><span>Disponible après provisions affichées</span><strong>${money(after)}</strong><em>Encaissements − provisions calculées</em></div>`;

  const social=entries.reduce((a,x)=>a+x.social,0),tax=entries.reduce((a,x)=>a+x.tax,0),cfp=entries.reduce((a,x)=>a+x.cfp,0);
  $('financeChargesBreakdown').innerHTML=`
    <div class="charge-card"><span>Cotisations sociales<br>${num(s.socialRate).toFixed(2).replace('.',',')} %</span><strong>${money(social)}</strong></div>
    <div class="charge-card"><span>Versement libératoire IR<br>${num(s.taxRate).toFixed(2).replace('.',',')} %</span><strong>${money(tax)}</strong></div>
    <div class="charge-card"><span>CFP<br>${num(s.cfpRate).toFixed(2).replace('.',',')} %</span><strong>${money(cfp)}</strong></div>`;

  const months=financeMonthSequence(financeSeasonYear);
  const monthlyRows=months.map(m=>{
    const xs=entries.filter(x=>monthKeyFromDate(x.date)===m.key);
    const mt=xs.reduce((a,x)=>a+x.amount,0),mi=xs.filter(x=>x.invoice).reduce((a,x)=>a+x.amount,0),mc=xs.reduce((a,x)=>a+x.charges,0),ma=xs.reduce((a,x)=>a+x.after,0);
    return {...m,total:mt,invoiced:mi,charges:mc,after:ma};
  });
  renderFinanceNetChart(monthlyRows.map(x=>x.label.split(' ')[0]), monthlyRows.map(x=>x.after));
  $('financeMonthlyBody').innerHTML=monthlyRows.map(m=>`<tr><td>${escapeHTML(m.label)}</td><td>${money(m.total)}</td><td>${money(m.invoiced)}</td><td>${money(m.charges)}</td><td>${money(m.after)}</td></tr>`).join('');

  $('financeDetailBody').innerHTML=entries.length?entries.map(x=>`<tr>
    <td>${formatShortDate(x.date)}${x.inferred?' *':''}</td>
    <td>${escapeHTML(x.lieu)}</td>
    <td>${escapeHTML(x.nature)}</td>
    <td>${money(x.amount)}</td>
    <td class="${x.invoice?'invoice-yes':'invoice-no'}">${x.invoice?'Oui':'Non'}</td>
    <td>${money(x.charges)}</td>
    <td>${money(x.after)}</td>
  </tr>`).join(''):`<tr><td colspan="7" class="finance-empty">Aucun encaissement sur cette période.</td></tr>`;

  window.__financeEntries=entries;
}

$('openFinanceBtn').addEventListener('click',()=>nav('finance'));
$('backFromFinance').addEventListener('click',()=>nav('more'));
$('financePrevYear').addEventListener('click',()=>{financeSeasonYear=(financeSeasonYear??periodStartYearForDate(isoToday()))-1;renderFinance()});
$('financeNextYear').addEventListener('click',()=>{financeSeasonYear=(financeSeasonYear??periodStartYearForDate(isoToday()))+1;renderFinance()});
$('saveFinanceRatesBtn').addEventListener('click',()=>{
  saveFinanceSettings({
    socialRate:num($('socialRateInput').value),
    taxRate:num($('taxRateInput').value),
    cfpRate:num($('cfpRateInput').value)
  });
  showToast('Taux enregistrés');
  renderFinance();
});
$('financeCsvBtn').addEventListener('click',()=>{
  const rows=window.__financeEntries||[];
  const header=['Date','Prestation','Nature','Encaisse','Facture_envoyee','Cotisations_sociales','Versement_liberatoire','CFP','Charges_total','Apres_provisions'];
  const esc=v=>`"${String(v??'').replace(/"/g,'""')}"`;
  const csv='\ufeff'+[header.join(';'),...rows.map(x=>[
    x.date,x.lieu,x.nature,x.amount.toFixed(2),x.invoice?'Oui':'Non',
    x.social.toFixed(2),x.tax.toFixed(2),x.cfp.toFixed(2),x.charges.toFixed(2),x.after.toFixed(2)
  ].map(esc).join(';'))].join('\n');
  downloadBlob(csv,'text/csv;charset=utf-8',`DJPlanner_Finances_${financeSeasonYear}-${financeSeasonYear+1}.csv`);
});

window.addEventListener('resize',()=>{
  if($('view-finance')?.classList.contains('active')) renderFinance();
});

async function renderMore(){applySettings();const all=(await getAllEvents()).sort((a,b)=>b.date.localeCompare(a.date)),past=all.filter(e=>isBooking(e)&&(e.date<isoToday()||e.statut==='realisee'));$('archiveList').innerHTML=past.map(eventCard).join('')||'<p class="muted">Aucune prestation archivée.</p>';}
$('saveSettingsBtn').addEventListener('click',()=>{const name=$('djNameInput').value.trim()||'DJ';saveSettings({djName:name});showToast('Nom enregistré')});

function downloadBlob(content,type,name){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('backupBtn').addEventListener('click',async()=>{const events=await getAllEvents(),payload={app:'DJ Planner',version:'1.3',exported_at:new Date().toISOString(),settings:loadSettings(),finance_settings:loadFinanceSettings(),events};downloadBlob(JSON.stringify(payload,null,2),'application/json',`DJPlanner_Backup_${isoToday()}.json`);showToast('Sauvegarde créée')});
$('restoreInput').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.events))throw new Error('Format incorrect');if(!confirm(`Restaurer ${data.events.length} prestation(s) ? Les éléments ayant le même identifiant seront remplacés.`))return;for(const ev of data.events)await saveEvent(normalizeEvent(ev));if(data.settings?.djName)saveSettings(data.settings);if(data.finance_settings)saveFinanceSettings(data.finance_settings);showToast('Sauvegarde restaurée');renderMore()}catch(err){alert('Ce fichier ne semble pas être une sauvegarde DJ Planner valide.')}e.target.value=''});
$('csvBtn').addEventListener('click',async()=>{const all=(await getAllEvents()).filter(isBooking),cols=['date','lieu','adresse','contact','telephone','heure_arrivee','heure_debut','heure_fin','duree','public','nombre_personnes','ambiances','styles','preconisations','styles_a_eviter','materiel_pack','materiel_sur_place','materiel_a_apporter','preparation','statut','cachet','frais_deplacement','total','acompte_demande','acompte_recu','date_acompte_recu','solde_recu','date_solde_recu','reste','paiement','mode_reglement','date_reglement','facture_envoyee','notes'],esc=v=>`"${String(Array.isArray(v)?v.join(' | '):(v??'')).replace(/"/g,'""')}"`,csv='\ufeff'+[cols.join(';'),...all.map(ev=>cols.map(c=>esc(ev[c])).join(';'))].join('\n');downloadBlob(csv,'text/csv;charset=utf-8',`DJPlanner_Export_${isoToday()}.csv`)});

function icsEscape(s=''){return String(s).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;')}
function localICSDate(date,time){const t=time||'00:00';return date.replace(/-/g,'')+'T'+t.replace(':','')+'00'}
function plusDay(iso){const d=dateFromISO(iso);d.setDate(d.getDate()+1);return[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function downloadICS(ev){const startTime=ev.heure_arrivee||ev.heure_debut||'00:00',endTime=ev.heure_fin||ev.heure_debut||'23:59';let endDate=ev.date;if(endTime<startTime)endDate=plusDay(ev.date);const desc=[`Arrivée : ${ev.heure_arrivee||'—'}`,`Set : ${ev.heure_debut||'—'} → ${ev.heure_fin||'—'}`,`Public : ${(ev.public||[]).join(', ')||'—'}${ev.nombre_personnes?` · ${ev.nombre_personnes} personnes`:''}`,`Ambiance : ${(ev.ambiances||[]).join(' → ')||'—'}`,`Styles : ${(ev.styles||[]).join(', ')||'—'}`,ev.preconisations?`Préconisations : ${ev.preconisations}`:'',ev.styles_a_eviter?`À éviter : ${ev.styles_a_eviter}`:'',`Matériel à apporter : ${(ev.materiel_a_apporter||[]).join(', ')||'—'}`,ev.contact?`Contact : ${ev.contact}${ev.telephone?` · ${ev.telephone}`:''}`:'',ev.notes?`Notes : ${ev.notes}`:''].filter(Boolean).join('\n');const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//DJ Planner V1.2//FR','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',`UID:${ev.id}@djplanner.local`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART:${localICSDate(ev.date,startTime)}`,`DTEND:${localICSDate(endDate,endTime)}`,`SUMMARY:${icsEscape('DJ SET · '+ev.lieu)}`,ev.adresse?`LOCATION:${icsEscape(ev.adresse)}`:'',`DESCRIPTION:${icsEscape(desc)}`,ev.statut==='option'?'STATUS:TENTATIVE':'STATUS:CONFIRMED','BEGIN:VALARM','TRIGGER:-P1D','ACTION:DISPLAY',`DESCRIPTION:${icsEscape('DJ demain · '+ev.lieu)}`,'END:VALARM','BEGIN:VALARM','TRIGGER:-PT2H','ACTION:DISPLAY',`DESCRIPTION:${icsEscape('Départ DJ · '+ev.lieu)}`,'END:VALARM','END:VEVENT','END:VCALENDAR'].filter(Boolean).join('\r\n');downloadBlob(ics,'text/calendar;charset=utf-8',`DJ_${ev.date}_${ev.lieu.replace(/[^\wÀ-ÿ-]+/g,'_')}.ics`)}

if('serviceWorker'in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{});
(async function init(){await openDB();applySettings();resetForm();await renderHome();})();
