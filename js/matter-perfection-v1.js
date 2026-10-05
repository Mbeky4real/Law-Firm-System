/* MOLMS-MATTER-PERFECTION-V1 */
(function(){
'use strict';

const getSb=()=>typeof sb!=='undefined'?sb:(window.supabaseClient||null);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const ACTIVITIES=[
'Court attendance','Mention','Hearing','Trial','Judgment','Ruling','Filing / Lodging documents',
'Court registry follow-up','Drafting','Document review','Document collection','Legal research',
'Client consultation','Client meeting','Telephone call','Email correspondence','Letter correspondence',
'Mediation','Negotiation','Conciliation','Settlement discussion','Arbitration','Visitation',
'Site visit / inspection','Client premises visit','Government office follow-up','Police follow-up',
'Prison visit','Bail / Police bond follow-up','Service of documents','Process serving',
'Witness interview','Affidavit preparation','Swearing / Commissioning','Notarisation / Certification',
'Execution follow-up','Legal opinion','Contract drafting / review','Due diligence',
'Company / Business registration','Immigration follow-up','Land / Survey / Valuation follow-up',
'Tax / TRA follow-up','Internal conference','Partner consultation','Other'
];

const LOCATIONS=[
'M&O Law Office','Court of Appeal','High Court','District Court','Resident Magistrates Court',
'Primary Court','Labour Court','Land Court','Commercial Court','Court Registry','Tribunal',
'Police Station','Prison / Correctional Facility','Client premises','Opponent / Advocate office',
'Government office','BRELA','TRA','Immigration Office','Land Office','Municipal / City Council',
'Site / Project location','Bank / Financial Institution','Commissioner for Oaths / Notary',
'Mediation / Arbitration Centre','Telephone','Email / Online','Remote / Virtual','Other'
];

function textOf(el){
  let s='';
  if(!el)return s;
  const id=el.id;
  if(id){const l=document.querySelector('label[for="'+CSS.escape(id)+'"]');if(l)s+=' '+l.textContent}
  const p=el.parentElement;
  if(p)s+=' '+(p.querySelector('label')?.textContent||'')+' '+(p.textContent||'').slice(0,300);
  s+=' '+(el.name||'')+' '+(el.id||'')+' '+(el.placeholder||'')+' '+(el.getAttribute('aria-label')||'');
  return s.toLowerCase();
}

function addOptions(select,items){
  if(!select||select.dataset.molmsPerfected==='1')return;
  const t=textOf(select);
  let kind=null;
  if(/activity|work performed|work done|task type/.test(t))kind='activity';
  else if(/(^|\b)location\b|place.*work|where.*work/.test(t))kind='location';
  if(!kind)return;
  const list=kind==='activity'?ACTIVITIES:LOCATIONS;
  const existing=new Set([...select.options].map(o=>o.textContent.trim().toLowerCase()));
  list.forEach(v=>{
    if(!existing.has(v.toLowerCase())){
      const o=document.createElement('option');o.value=v;o.textContent=v;select.appendChild(o);
    }
  });
  select.dataset.molmsPerfected='1';
}

function enhanceDropdowns(){
  document.querySelectorAll('select').forEach(addOptions);
}

function labelFor(input){
  if(!input)return '';
  const id=input.id;
  let s='';
  if(id)s+=document.querySelector('label[for="'+CSS.escape(id)+'"]')?.textContent||'';
  s+=' '+(input.name||'')+' '+(input.placeholder||'')+' '+(input.getAttribute('aria-label')||'');
  return s.toLowerCase();
}

function findInput(form,patterns){
  return [...form.querySelectorAll('input,textarea')].find(i=>patterns.some(p=>p.test(labelFor(i))))||null;
}

function matterKind(form){
  const t=(form.innerText||'').toLowerCase()+' '+(document.body.innerText||'').slice(0,2500).toLowerCase();
  if(/non[- ]litigation|non litigation/.test(t))return 'nonlit';
  if(/cause list|case number|opposing advocate/.test(t))return 'cause';
  return null;
}

function addField(form,key,label,placeholder){
  if(form.querySelector('[data-molms-contact="'+key+'"]'))return;
  const wrap=document.createElement('div');
  wrap.setAttribute('data-molms-contact',key);
  wrap.style.cssText='margin-top:10px;';
  const l=document.createElement('label');
  l.textContent=label;
  l.style.cssText='display:block;font-weight:600;margin-bottom:5px;';
  const i=document.createElement('input');
  i.type=key==='email'?'email':'text';
  i.placeholder=placeholder;
  i.style.cssText='width:100%;box-sizing:border-box;';
  i.dataset.molmsContactInput=key;
  wrap.appendChild(l);wrap.appendChild(i);
  const client=findInput(form,[/\bclient\b/]);
  if(client?.parentElement?.parentElement)client.parentElement.parentElement.insertAdjacentElement('afterend',wrap);
  else form.appendChild(wrap);
}

function contactInputs(form){
  return {
    person:form.querySelector('[data-molms-contact-input="person"]'),
    phone:form.querySelector('[data-molms-contact-input="phone"]'),
    email:form.querySelector('[data-molms-contact-input="email"]')
  };
}

function ensureContacts(form){
  if(form.dataset.molmsContacts==='1')return;
  const client=findInput(form,[/^client\b/,/client name/,/\bclient\b/]);
  if(!client||!title)return;
  const kind=matterKind(form);
  if(!kind)return;
  addField(form,'person','Client Contact Person','Name of primary client contact person');
  addField(form,'phone','Client Phone','Client telephone / mobile number');
  addField(form,'email','Client Email','Client email address');
  form.dataset.molmsContacts='1';
  const load=async()=>loadContacts(form,kind);\n  const save=async()=>saveContacts(form,kind);\n  setTimeout(load,300);
  ['change','blur'].forEach(ev=>Object.values(contactInputs(form)).forEach(i=>i?.addEventListener(ev,save)));
  form.addEventListener('submit',()=>setTimeout(save,900),true);
  [...form.querySelectorAll('button,input[type=submit]')].forEach(b=>{
    if(/save|update|submit|create/i.test(b.textContent||b.value||''))b.addEventListener('click',()=>setTimeout(save,900),true);
  });
}

function fieldValue(form,patterns){
  return (findInput(form,patterns)?.value||'').trim();
}

async function loadContacts(form,kind){\n  const c=getSb(); if(!c)return;\n  const client=fieldValue(form,[/^client\\b/,/client name/,/\\bclient\\b/]);\n  const title=fieldValue(form,[/^title\\b/,/matter title/,/subject/]);\n  if(!client||!title)return;\n  const table=kind==='cause'?'cause_list_v2':'non_litigations';\n  const clientCol=kind==='cause'?'client_name':'client';\n  const r=await c.from(table).select('client_contact_person,client_phone,client_email').is('deleted_at',null).ilike(clientCol,client).ilike('title',title).order('updated_at',{ascending:false}).limit(1);\n  if(r.error||!r.data?.length)return;\n  const v=contactInputs(form), row=r.data[0];\n  if(v.person&&!v.person.value)v.person.value=row.client_contact_person||'';\n  if(v.phone&&!v.phone.value)v.phone.value=row.client_phone||'';\n  if(v.email&&!v.email.value)v.email.value=row.client_email||'';\n}\n\nasync function saveContacts(form,kind){
  const c=getSb(); if(!c)return;
  const client=fieldValue(form,[/^client\b/,/client name/,/\bclient\b/]);
  const title=fieldValue(form,[/^title\b/,/matter title/,/subject/]);
  if(!client)return;
  const v=contactInputs(form);
  const payload={
    client_contact_person:(v.person?.value||'').trim()||null,
    client_phone:(v.phone?.value||'').trim()||null,
    client_email:(v.email?.value||'').trim()||null
  };
  const table=kind==='cause'?'cause_list_v2':'non_litigations';
  const clientCol=kind==='cause'?'client_name':'client';
  let q=c.from(table).select('id').is('deleted_at',null).ilike(clientCol,client).order('updated_at',{ascending:false}).limit(5);
  if(title)q=q.ilike('title',title);
  let {data,error}=await q;
  if(error)console.warn('MOLMS contact save lookup:',error.message);
  if(!data?.length&&title){
    const r=await c.from(table).select('id').is('deleted_at',null).ilike('title',title).ilike(clientCol,client).order('created_at',{ascending:false}).limit(1);
    data=r.data;
  }
  if(!data?.length)return;
  const id=data[0].id;
  const r=await c.from(table).update(payload).eq('id',id);
  if(r.error)console.warn('MOLMS contact save:',r.error.message);
}

function boot(){
  enhanceDropdowns();
  document.querySelectorAll('form').forEach(ensureContacts);
  const obs=new MutationObserver(()=>{
    enhanceDropdowns();
    document.querySelectorAll('form').forEach(ensureContacts);
  });
  obs.observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();