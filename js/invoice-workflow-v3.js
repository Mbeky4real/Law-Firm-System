/* MOLMS Invoice Actions V7 — preserve the original invoice workspace.
 * The original invoice form, saved-invoice list and preview remain authoritative.
 * Role-specific workflow actions are placed in one compact footer at the bottom.
 */
(function(){
'use strict';
if(window.__molmsInvoiceActionsV7)return;
window.__molmsInvoiceActionsV7=true;
const $=id=>document.getElementById(id);
const db=()=>typeof sb!=='undefined'?sb:(window.supabaseClient||window.sb||null);
const page=()=>{const p=$('page-invoice');return p&&p.style.display!=='none'&&!p.hidden?p:null;};
let identity={id:null,role:'',name:''},lastNumber='',lastInvoice=null,busy=false;
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function roleName(v){return String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');}
function isManager(){return ['office_manager','office_admin'].includes(identity.role);}
function isPartner(){return ['partner','admin'].includes(identity.role);}
function client(){const c=db();if(!c?.auth)throw new Error('Database session is unavailable.');return c;}
async function loadIdentity(){
 const c=client();let user=null,authError=null;
 try{const s=await c.auth.getSession();user=s?.data?.session?.user||null;authError=s?.error||null;}catch(e){authError=e;}
 if(!user){try{const u=await c.auth.getUser();user=u?.data?.user||null;authError=u?.error||authError;}catch(e){authError=e;}}
 if(!user?.id)throw new Error('Your sign-in session could not be read. Please sign out and sign in again.'+(authError?.message?' ('+authError.message+')':''));
 let q=await c.from('roles').select('user_id,full_name,role,active,position').eq('user_id',user.id).maybeSingle();
 if(q.error)throw new Error('Your account role could not be read: '+q.error.message);
 if(!q.data)throw new Error('No MOLMS role is assigned to this account. Contact the system administrator.');
 if(q.data.active===false)throw new Error('Your MOLMS account is inactive. Contact the system administrator.');
 identity={id:user.id,role:roleName(q.data.role),name:q.data.full_name||''};
 if(!identity.role)throw new Error('Your MOLMS role is blank. Contact the system administrator.');
}
function numberInput(){
 const p=page();if(!p)return null;
 return p.querySelector('input[name="invoice_number"],input[name="invoiceNumber"],input[id*="invoice"][id*="number" i],input[id*="inv"][id*="number" i],input[placeholder*="MOL/INV"]');
}
function ensureFooter(){
 const p=page();if(!p)return null;
 let old=$('molms-invoice-workflow-v3');if(old)old.remove();
 let bar=$('molms-invoice-actions-footer-v7');
 if(!bar){
  bar=document.createElement('section');bar.id='molms-invoice-actions-footer-v7';
  bar.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:14px 16px 20px;padding:12px 14px;border:1px solid #dfd4c5;border-radius:10px;background:#fff;box-sizing:border-box;color:#183247;font:inherit';
  p.appendChild(bar);
 }
 return bar;
}
function btn(action,label,kind){return '<button type="button" data-iwf7="'+action+'" style="border:1px solid #c9b89f;border-radius:7px;padding:8px 13px;background:'+(kind==='primary'?'#183247':kind==='danger'?'#fff7ed':'#faf8f4')+';color:'+(kind==='primary'?'#fff':kind==='danger'?'#9a3412':'#183247')+';font-weight:700;font-size:12px;cursor:pointer">'+label+'</button>';}
async function findInvoice(){
 const el=numberInput(),num=String(el?.value||'').trim();
 if(!num)return {num:'',row:null};
 const c=client(),q=await c.from('invoices').select('id,invoice_number,client_name,status,issuance_state,invoice_type,total_due,currency,amount_paid,withholding_tax_amount,voided_at,submitted_for_issue_at').eq('invoice_number',num).maybeSingle();
 if(q.error)throw q.error;
 return {num,row:q.data||null};
}
async function render(){
 const p=page();if(!p)return;
 const bar=ensureFooter();if(!bar)return;
 try{
  if(!identity.id)await loadIdentity();
  const {num,row}=await findInvoice();lastNumber=num;lastInvoice=row;
  const status=row?String(row.status||'').replace(/_/g,' ').toUpperCase():'No saved invoice selected';
  let actions='';
  if(isManager()){
   if(row&&row.status==='draft'&&['draft','returned'].includes(row.issuance_state))
    actions=btn('send','Send to Partners for Issuing','primary');
   else if(!row)actions='<span style="font-size:12px;color:#667085">Create an invoice and use the original Save as Draft control. You can then send the saved draft to Partners.</span>';
   else actions='<span style="font-size:12px;color:#667085">This invoice is not an editable draft. Only Partners can issue or void invoices.</span>';
  }else if(isPartner()){
   if(row&&row.status==='draft'&&row.issuance_state==='pending'){
    actions=btn('issue','Issue Invoice','primary')+btn('return','Return for Correction','');
   }else if(row&&row.status==='issued'&&!row.voided_at){
    const blocked=Number(row.amount_paid||0)>0||Number(row.withholding_tax_amount||0)>0;
    actions=blocked?'<span style="font-size:12px;color:#9a3412">Payments or withholding tax recorded. Use the appropriate credit note/payment reversal.</span>':btn('void','Void Invoice','danger');
   }else if(row&&row.status==='draft'){
    actions='<span style="font-size:12px;color:#667085">This draft has not been submitted. Office Manager may send it to Partners for issuance.</span>';
   }else actions='<span style="font-size:12px;color:#667085">Select an invoice from the existing saved-invoices list to view available actions.</span>';
  }else actions='<span style="font-size:12px;color:#b42318">You do not have invoice workflow permissions.</span>';
  bar.innerHTML='<div style="min-width:180px"><div style="font-size:12px;font-weight:800;color:#183247">INVOICE ACTIONS</div><div style="font-size:11px;color:#667085;margin-top:3px">'+esc(identity.name)+' · '+esc(identity.role.replace(/_/g,' '))+' · '+esc(row?row.invoice_number+' — '+status:'Select or create an invoice')+'</div></div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+actions+'</div><div id="molms-invoice-actions-message-v7" style="width:100%;font-size:12px;color:#475467"></div>';
 }catch(e){
  bar.innerHTML='<div style="font-size:12px;color:#b42318">Invoice actions unavailable: '+esc(e.message||e)+'</div><button type="button" data-iwf7="retry" style="border:1px solid #c9b89f;border-radius:7px;padding:7px 12px;background:#faf8f4">Retry</button>';
  console.error('[MOLMS invoice actions V7]',e);
 }
}
async function act(action,button){
 if(busy)return;busy=true;if(button)button.disabled=true;
 const message=()=> $('molms-invoice-actions-message-v7');
 try{
  const c=client();if(!identity.id)await loadIdentity();
  if(action==='retry'){identity.id=null;await render();return;}
  const {row}=await findInvoice();
  if(!row)throw new Error('Save the invoice first, then select it from the existing saved-invoices list.');
  if(action==='send'){
   if(!isManager())throw new Error('Only the Office Manager can submit a draft to Partners.');
   if(row.status!=='draft'||!['draft','returned'].includes(row.issuance_state))throw new Error('Only an editable draft can be submitted.');
   const r=await c.rpc('submit_invoice_for_issuance',{p_invoice_id:row.id});if(r.error)throw r.error;
   await render();const m=message();if(m)m.textContent='Invoice sent to Partners for issuing.';return;
  }
  if(action==='issue'){
   if(!isPartner())throw new Error('Only a Partner or Admin can issue invoices.');
   if(!window.confirm('Issue '+row.invoice_number+'? Your account will be recorded as the issuing Partner.'))return;
   const r=await c.rpc('issue_submitted_invoice',{p_invoice_id:row.id});if(r.error)throw r.error;
   await render();const m=message();if(m)m.textContent='Invoice issued successfully.';return;
  }
  if(action==='return'){
   if(!isPartner())throw new Error('Only a Partner can return an invoice.');
   const note=window.prompt('Enter the corrections required from the Office Manager:');if(note===null)return;if(!note.trim())throw new Error('A correction note is required.');
   const r=await c.rpc('return_invoice_for_correction',{p_invoice_id:row.id,p_note:note.trim()});if(r.error)throw r.error;
   await render();const m=message();if(m)m.textContent='Invoice returned to the Office Manager for correction.';return;
  }
  if(action==='void'){
   if(!isPartner())throw new Error('Only a Partner or Admin can void an invoice.');
   const reason=window.prompt('Enter the reason for voiding '+row.invoice_number+':');if(reason===null)return;if(!reason.trim())throw new Error('A reason is required.');
   if(!window.confirm('Void this invoice? It will be excluded from firm revenue and retained in the audit trail.'))return;
   const r=await c.rpc('void_issued_invoice',{p_invoice_id:row.id,p_reason:reason.trim()});if(r.error)throw r.error;
   await render();const m=message();if(m)m.textContent='Invoice voided. It remains in the audit trail and is excluded from revenue.';return;
  }
 }catch(e){const m=message();if(m)m.textContent=e.message||String(e);else alert(e.message||String(e));}
 finally{busy=false;if(button)button.disabled=false;}
}
function boot(){
 const p=page();if(!p)return;
 const bar=ensureFooter();if(!bar)return;
 if(!bar.dataset.bound){bar.dataset.bound='1';bar.addEventListener('click',e=>{const b=e.target.closest('[data-iwf7]');if(b)act(b.dataset.iwf7,b);});}
 render();
 const el=numberInput();if(el&&!el.dataset.iwf7Bound){el.dataset.iwf7Bound='1';el.addEventListener('change',()=>render());el.addEventListener('input',()=>{clearTimeout(el._iwf7Timer);el._iwf7Timer=setTimeout(render,350);});}
}
let attempts=0;const timer=setInterval(()=>{if(page()){boot();if(++attempts>20)clearInterval(timer);}else if(++attempts>120)clearInterval(timer);},500);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
const observer=new MutationObserver(()=>{if(page()&&!$('molms-invoice-actions-footer-v7'))boot();});
observer.observe(document.body,{childList:true,subtree:true});
})();
