(function(){
'use strict';
if(window.__molmsInvoiceGovernanceV2)return;
window.__molmsInvoiceGovernanceV2=true;

const $=id=>document.getElementById(id);
const client=()=>typeof sb!=='undefined'?sb:(window.supabaseClient||null);
const invoicePage=()=>{const p=$('page-invoice');return p&&p.style.display!=='none'&&!p.hidden?p:null};
let identity={userId:null,name:'',role:''};

async function loadIdentity(){
  const c=client(); if(!c?.auth?.getUser)return;
  try{
    const u=(await c.auth.getUser()).data?.user;
    if(!u?.id)return;
    identity.userId=u.id;

    // A user may have more than one role row. maybeSingle() fails in that
    // case and silently leaves the invoice UI without the correct role.
    const {data:roleRows,error:roleError}=await c.from('roles')
      .select('user_id,full_name,email,role,position,active')
      .eq('user_id',u.id);
    let rows=Array.isArray(roleRows)?roleRows:[];
    if(roleError) console.warn('[MOLMS invoice governance] role lookup:',roleError.message);
    rows=rows.filter(r=>r.active!==false);
    const normalise=r=>String(r?.role||'').trim().toLowerCase().replace(/[ -]+/g,'_');
    // For invoice preparation labels, an explicit Office Manager role must
    // take precedence over a stale/secondary partner row.
    const selected=rows.find(r=>['office_manager','office_admin'].includes(normalise(r)))
      || rows.find(r=>normalise(r)==='partner')
      || rows[0]
      || null;
    identity.name=selected?.full_name||selected?.position||u.user_metadata?.full_name||u.email||'';
    identity.role=normalise(selected);

    // Compatibility fallback for installations where roles are stored on users.
    if(!identity.role){
      const {data:userRow}=await c.from('users').select('name,email,role,position').eq('id',u.id).maybeSingle();
      identity.name=userRow?.name||userRow?.position||identity.name;
      identity.role=String(userRow?.role||'').toLowerCase().replace(/[ -]+/g,'_');
      if(identity.role==='administrator') identity.role='admin';
    }
    // Older role naming used office-admin / office-manager variants.
    if(identity.role==='officeadmin') identity.role='office_admin';
    if(identity.role==='officemanager') identity.role='office_manager';
  }catch(e){console.warn('[MOLMS invoice governance]',e);}
}

function manager(){return identity.role==='office_manager'||identity.role==='office_admin';}
function partner(){return identity.role==='partner';}
function text(el){return String(el?.textContent||'').replace(/\s+/g,' ').trim();}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

function neutraliseManagerIssueControls(){
  const p=invoicePage(); if(!p||!manager())return;
  [...p.querySelectorAll('button,input[type="button"],input[type="submit"],a')].forEach(el=>{
    const t=text(el).toLowerCase();
    if(/\b(issue|approve|authorize|authorise|finalize|finalise)\b/.test(t) && !/send to partner/.test(t)){
      el.disabled=true;
      el.setAttribute('aria-disabled','true');
      el.title='Only a Partner may issue an invoice. Save as Draft and send it to a Partner for issuing.';
      el.style.pointerEvents='none';
      el.style.opacity='.45';
    }
  });
}

function correctManagerIdentityLabels(){
  const p=invoicePage(); if(!p||!manager())return;
  // Issued invoices must retain the actual Partner signatory.
  const statusText=text(p).toLowerCase();
  if(statusText.includes('issued') && !statusText.includes('draft')) return;
  const walker=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(n=>{
    const raw=n.nodeValue||'';
    if(/signatory/i.test(raw)){
      n.nodeValue=raw.replace(/signatory/gi,'Prepared by');
    }
    if(/\bpartner\b/i.test(n.nodeValue||'') && /prepared by|signatory|issuer|issued by/i.test(n.parentElement?.parentElement?.textContent||'')){
      n.nodeValue=n.nodeValue.replace(/\bpartner\b/gi,'Office Manager');
    }
  });
}

async function sendToPartner(){
  const c=client(); if(!c||!identity.userId){alert('Please sign in again.');return;}
  const p=invoicePage(); if(!p)return;
  const num=[...p.querySelectorAll('input')].find(x=>/invoice.?number/i.test((x.name||'')+' '+(x.id||'')))?.value?.trim();
  if(!num){alert('Save the invoice as a Draft first.');return;}
  const {data,error}=await c.from('invoices').select('id,status,submitted_for_issue_at').eq('invoice_number',num).maybeSingle();
  if(error||!data){alert('Save the invoice as a Draft first.');return;}
  if(data.status!=='draft'){alert('Only a Draft invoice can be sent to a Partner for issuing.');return;}
  if(data.submitted_for_issue_at){alert('This invoice has already been sent to a Partner for issuing.');return;}
  const r=await c.from('invoices').update({submitted_for_issue_by:identity.userId,submitted_for_issue_at:new Date().toISOString()}).eq('id',data.id).eq('status','draft');
  if(r.error){alert('The invoice could not be sent to a Partner: '+r.error.message);return;}
  alert('Invoice sent to the Partners for issuing.');
}

function addSendButton(){
  const p=invoicePage(); if(!p||!manager()||$('molmsInvoiceSendPartnerV2'))return;
  const b=document.createElement('button');
  b.id='molmsInvoiceSendPartnerV2'; b.type='button'; b.className='btn out'; b.textContent='Send to Partner for Issuing';
  b.addEventListener('click',sendToPartner);
  const host=[...p.querySelectorAll('button')].find(x=>/save.*draft/i.test(text(x)))?.parentElement||p.querySelector('.card')||p;
  host.appendChild(b);
}

async function partnerIssueButton(){
  const p=invoicePage(); if(!p||!partner()||$('molmsPartnerIssueV2'))return;
  const num=[...p.querySelectorAll('input')].find(x=>/invoice.?number/i.test((x.name||'')+' '+(x.id||'')))?.value?.trim();
  if(!num)return;
  const c=client(); if(!c)return;
  const {data}=await c.from('invoices').select('id,status,submitted_for_issue_at').eq('invoice_number',num).maybeSingle();
  if(!data||data.status!=='draft'||!data.submitted_for_issue_at)return;
  const b=document.createElement('button'); b.id='molmsPartnerIssueV2';b.type='button';b.className='btn gold';b.textContent='Issue Invoice as Partner';
  b.onclick=async()=>{const r=await c.from('invoices').update({status:'issued'}).eq('id',data.id).eq('status','draft');if(r.error)alert(r.error.message);else location.reload();};
  (p.querySelector('.card')||p).appendChild(b);
}

async function refresh(){
  const p=invoicePage();if(!p)return;
  await loadIdentity();
  neutraliseManagerIssueControls();
  correctManagerIdentityLabels();
  addSendButton();
  partnerIssueButton();
}

let last='';
setInterval(async()=>{
  const p=invoicePage();const key=p?(identity.role+'|'+p.textContent.slice(0,300)):'';
  if(p&&key!==last){last=key;await refresh();}
  if(p){neutraliseManagerIssueControls();correctManagerIdentityLabels();}
},700);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
})();