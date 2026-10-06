(function(){
  'use strict';
  if(window.__molmsInvoiceGovernanceV1)return;
  window.__molmsInvoiceGovernanceV1=true;

  const state={role:null,userId:null,invoice:null,bound:false};

  function sbc(){return typeof sb!=='undefined'?sb:(window.supabaseClient||null);}
  function page(){const p=document.getElementById('page-invoice');return p&&p.style.display!=='none'&&!p.hidden?p:null;}
  function text(el){return String(el?.textContent||'').replace(/\s+/g,' ').trim();}
  function buttons(){const p=page();return p?[...p.querySelectorAll('button')]:[];}
  function invoiceNumberField(){
    const p=page(); if(!p)return null;
    return p.querySelector('input[name="invoice_number"],input[name="invoiceNumber"],input[id*="invoice"][id*="number" i],input[id*="inv"][id*="number" i]');
  }
  function currentInvoiceNumber(){return String(invoiceNumberField()?.value||'').trim();}
  function roleIsManager(){return state.role==='office_manager'||state.role==='office_admin';}
  function roleIsPartner(){return state.role==='partner';}

  async function loadIdentity(){
    const c=sbc(); if(!c?.auth?.getUser)return;
    try{
      const u=(await c.auth.getUser()).data?.user;
      state.userId=u?.id||null;
      if(!state.userId)return;
      const {data}=await c.from('members').select('role,full_name,position').eq('user_id',state.userId).maybeSingle();
      if(data?.role) state.role=String(data.role).toLowerCase();
      if(!state.role){
        const {data:r}=await c.from('roles').select('role').eq('user_id',state.userId).eq('active',true).maybeSingle();
        state.role=String(r?.role||'').toLowerCase();
      }
    }catch(e){console.warn('[MOLMS invoice governance]',e);}
  }

  async function loadInvoice(){
    const c=sbc(), n=currentInvoiceNumber();
    if(!c||!n)return null;
    try{
      const {data,error}=await c.from('invoices').select('id,invoice_number,status,created_by,issued_by,issued_at,submitted_for_issue_by,submitted_for_issue_at').eq('invoice_number',n).maybeSingle();
      if(error||!data)return null;
      state.invoice=data; return data;
    }catch(e){return null;}
  }

  async function people(ids){
    const c=sbc(); if(!c||!ids.length)return {};
    try{
      const {data}=await c.from('members').select('user_id,full_name,position,role').in('user_id',ids);
      return Object.fromEntries((data||[]).map(x=>[x.user_id,x]));
    }catch(e){return {};}
  }

  function removeOldUi(){
    document.getElementById('molmsInvoiceGovernance')?.remove();
    document.getElementById('molmsInvoiceSendPartner')?.remove();
    document.getElementById('molmsInvoicePartnerIssue')?.remove();
  }

  async function renderGovernance(){
    const p=page(); if(!p)return;
    const inv=state.invoice||await loadInvoice();
    if(!inv)return;
    removeOldUi();
    const ids=[inv.created_by,inv.issued_by,inv.submitted_for_issue_by].filter(Boolean);
    const pp=await people([...new Set(ids)]);
    const prep=pp[inv.created_by]?.full_name||'Unknown';
    const signer=pp[inv.issued_by]?.full_name||'Not assigned';
    const submitter=pp[inv.submitted_for_issue_by]?.full_name||'';
    const issued=inv.status!=='draft' && inv.issued_by;
    const submitted=!!inv.submitted_for_issue_at && inv.status==='draft';

    const box=document.createElement('div');
    box.id='molmsInvoiceGovernance';
    box.style.cssText='margin:10px 0;padding:10px 12px;border:1px solid var(--border,#ddd);border-radius:10px;background:#fafafa;font-size:12px;line-height:1.55';
    box.innerHTML=issued
      ? '<b>Invoice authority</b><br>Prepared by: '+esc(prep)+'<br><b>Signatory: '+esc(signer)+'</b> <span style="color:#555">— Partner</span>'
      : '<b>Invoice authority</b><br>Prepared by: '+esc(prep)+'<br>Signatory: <span style="color:#777">Not assigned — draft invoice</span>'
        +(submitted?'<br><span style="color:#7a4b00">Sent to Partner for issuing'+(submitter?' by '+esc(submitter):'')+'. Awaiting Partner issuance.</span>':'');
    const anchor=p.querySelector('input[name="invoice_number"]')?.closest('div')||p.querySelector('h1,h2,h3')?.parentElement||p.firstElementChild;
    if(anchor?.parentElement)anchor.parentElement.insertBefore(box,anchor.nextSibling);else p.prepend(box);
  }

  function esc(v){
    return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function disableIssueControls(){
    if(!roleIsManager())return;
    buttons().forEach(b=>{
      const t=text(b).toLowerCase();
      if(/\b(issue|approve|authorize|finalize|send to client|send invoice)\b/.test(t) && !/send to partner/.test(t)){
        b.disabled=true;
        b.title='Only a Partner may issue an invoice. Save the invoice as draft and send it to a Partner for issuing.';
        b.style.opacity='.5';
        b.style.pointerEvents='none';
      }
    });
  }

  async function sendToPartner(){
    const c=sbc(); const inv=state.invoice||await loadInvoice();
    if(!c||!inv){alert('Please save the invoice as a draft first, then send it to a Partner for issuing.');return;}
    if(inv.status!=='draft'){alert('Only a draft invoice can be sent to a Partner for issuing.');return;}
    if(inv.submitted_for_issue_at){alert('This invoice has already been sent to a Partner for issuing.');return;}
    const {error}=await c.from('invoices').update({submitted_for_issue_by:state.userId,submitted_for_issue_at:new Date().toISOString()}).eq('id',inv.id).eq('status','draft');
    if(error){alert('The invoice could not be sent to a Partner: '+error.message);return;}
    state.invoice=await loadInvoice();
    renderGovernance();
    alert('Invoice sent to the Partners for issuing.');
  }

  async function issueAsPartner(){
    const c=sbc(); const inv=state.invoice||await loadInvoice();
    if(!c||!inv||!roleIsPartner())return;
    if(inv.status!=='draft'){alert('Only a draft invoice can be issued from this workflow.');return;}
    if(!inv.submitted_for_issue_at){alert('This invoice has not been sent for Partner issuing yet.');return;}
    const {error}=await c.from('invoices').update({status:'issued'}).eq('id',inv.id).eq('status','draft');
    if(error){alert('The invoice could not be issued: '+error.message);return;}
    state.invoice=await loadInvoice();
    renderGovernance();
    try{if(typeof invLoadSavedList==='function')await invLoadSavedList();}catch(e){}
    try{if(typeof invRenderSavedList==='function')await invRenderSavedList();}catch(e){}
    alert('Invoice issued. The issuing Partner is now recorded as the signatory.');
  }

  function addWorkflowButton(){
    const p=page(); if(!p)return;
    if(roleIsManager()){
      if(document.getElementById('molmsInvoiceSendPartner'))return;
      const b=document.createElement('button');
      b.id='molmsInvoiceSendPartner'; b.type='button'; b.textContent='Send to Partner for Issuing';
      b.style.cssText='margin:6px 0;padding:8px 12px;border:1px solid #555;border-radius:8px;background:#fff;cursor:pointer;font-weight:700';
      b.addEventListener('click',sendToPartner);
      const target=[...buttons()].find(x=>/save draft/i.test(text(x)))||buttons()[buttons().length-1];
      if(target?.parentElement)target.parentElement.appendChild(b);else p.appendChild(b);
    }
    if(roleIsPartner() && state.invoice?.submitted_for_issue_at && state.invoice.status==='draft'){
      if(document.getElementById('molmsInvoicePartnerIssue'))return;
      const b=document.createElement('button');
      b.id='molmsInvoicePartnerIssue'; b.type='button'; b.textContent='Issue Invoice as Partner';
      b.style.cssText='margin:6px 0;padding:8px 12px;border:1px solid #555;border-radius:8px;background:#fff;cursor:pointer;font-weight:800';
      b.addEventListener('click',issueAsPartner);
      const target=[...buttons()].find(x=>/save draft|send/i.test(text(x)))||buttons()[buttons().length-1];
      if(target?.parentElement)target.parentElement.appendChild(b);else p.appendChild(b);
    }
  }

  async function refresh(){
    const p=page(); if(!p)return;
    await loadIdentity();
    await loadInvoice();
    disableIssueControls();
    addWorkflowButton();
    await renderGovernance();
  }

  function boot(){
    if(state.bound)return;
    state.bound=true;
    let last='';
    const tick=async()=>{
      const p=page(); const key=p?(currentInvoiceNumber()+'|'+state.role+'|'+(state.invoice?.submitted_for_issue_at||'')+'|'+(state.invoice?.status||'')):'';
      if(p&&key!==last){last=key;await refresh();}
      if(p)disableIssueControls();
    };
    setInterval(tick,800);
    tick();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();