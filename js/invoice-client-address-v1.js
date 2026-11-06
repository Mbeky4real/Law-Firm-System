/* MOLMS Invoice Client Address V1
 * Adds an optional per-invoice billing address without replacing the existing invoice form.
 * Address is stored as a snapshot on invoices.client_address and rendered in preview/print.
 */
(function(){
'use strict';
if(window.__molmsInvoiceClientAddressV1)return;
window.__molmsInvoiceClientAddressV1=true;
const $=id=>document.getElementById(id);
const db=()=>typeof sb!=='undefined'?sb:(window.supabaseClient||window.sb||null);
const page=()=>$('page-invoice');
const preview=()=>$('invPreviewPane');
const state={address:'',loading:false,rendering:false};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function activeId(){return typeof _invActiveId!=='undefined'&&_invActiveId?String(_invActiveId):'';}
function clientNameField(){
 const p=page();if(!p)return null;
 const labels=[...p.querySelectorAll('label')];
 for(const l of labels){
  if(!/^(client|client name|bill to|customer|customer name)\s*:?$/i.test((l.textContent||'').trim()))continue;
  const id=l.getAttribute('for');if(id&&$(id))return $(id);
  const parent=l.parentElement;
  const field=parent?.querySelector('input:not([type=hidden]),textarea,select');
  if(field)return field;
 }
 return p.querySelector('#invClientName,#invClient,select[name="client_name"],select[name="clientName"],input[name="client_name"],input[name="clientName"]');
}
function ensureAddressField(){
 const p=page(),name=clientNameField();if(!p||!name)return null;
 let wrap=$('molms-invoice-client-address-wrap-v1');if(wrap)return $('molms-invoice-client-address-v1');
 wrap=document.createElement('div');wrap.id='molms-invoice-client-address-wrap-v1';
 wrap.style.cssText='margin-top:10px;max-width:100%;';
 const label=document.createElement('label');label.htmlFor='molms-invoice-client-address-v1';label.textContent='Client Address (optional)';
 label.style.cssText='display:block;font-size:12px;font-weight:700;color:#183247;margin-bottom:5px;';
 const field=document.createElement('textarea');field.id='molms-invoice-client-address-v1';field.rows=3;field.maxLength=1200;
 field.placeholder='Enter the client’s full billing address';
 field.style.cssText='display:block;width:100%;min-height:68px;box-sizing:border-box;border:1px solid #d6cabb;border-radius:7px;padding:9px 10px;font:inherit;font-size:13px;resize:vertical;background:#fff;color:#183247;';
 field.setAttribute('aria-label','Client billing address');
 field.addEventListener('input',()=>{state.address=field.value;renderPreview();});
 wrap.append(label,field);
 const host=name.closest('.form-group,.field,.mb-3,.grid,div')||name.parentElement;
 host.insertAdjacentElement('afterend',wrap);
 return field;
}
async function loadAddress(){
 const id=activeId(),field=ensureAddressField();if(!field||state.loading)return;
 if(!id){field.value='';field.disabled=false;state.address='';return;}
 state.loading=true;
 try{
  const {data,error}=await db().from('invoices').select('client_address,status').eq('id',id).maybeSingle();
  if(error)throw error;
  state.address=String(data?.client_address||'');field.value=state.address;
  field.disabled=String(data?.status||'')!=='draft';
  field.title=field.disabled?'Issued invoices are locked.':'Optional billing address printed on this invoice.';
 }catch(e){console.error('[MOLMS invoice address load]',e);}
 finally{state.loading=false;}
}
async function saveAddress(){
 const id=activeId(),field=ensureAddressField();if(!id||!field)return;
 const c=db();if(!c)throw new Error('Invoice database connection is unavailable.');
 // Issuance calls the original save routine too. Once an Office Manager has
 // submitted the invoice, its workflow state is pending while status remains
 // draft; do not attempt an ordinary draft-only address write at that stage.
 const current=await c.from('invoices').select('status,issuance_state,client_address').eq('id',id).maybeSingle();
 if(current.error)throw current.error;
 if(!current.data)throw new Error('The saved invoice could not be found while saving its client address.');
 if(current.data.status!=='draft'||!['draft','returned'].includes(String(current.data.issuance_state||''))){
  state.address=String(current.data.client_address||'');
  return;
 }
 const value=String(field.value||'').trim();
 const {data,error}=await c.from('invoices').update({client_address:value||null}).eq('id',id).eq('status','draft').in('issuance_state',['draft','returned']).select('id,client_address').maybeSingle();
 if(error)throw error;
 if(!data)throw new Error('Client address was not saved. The invoice workflow state changed; refresh and verify the saved address.');
 state.address=String(data.client_address||'');
}
function findClientNode(root,name){
 if(!root||!name)return null;
 const target=String(name).trim().toUpperCase();if(!target)return null;
 const candidates=[...root.querySelectorAll('div,span,p,strong,b,td')].filter(el=>el.children.length===0&&String(el.textContent||'').trim().toUpperCase()===target);
 return candidates.sort((a,b)=>a.parentElement?.children.length-b.parentElement?.children.length)[0]||null;
}
function selectedClientName(){
 const p=page();if(!p)return '';
 const field=clientNameField();
 if(!field)return '';
 if(field.tagName==='SELECT')return String(field.selectedOptions?.[0]?.textContent||'').trim();
 return String(field.value||'').trim();
}
async function renderPreview(){
 const root=preview();if(!root||state.rendering)return;
 state.rendering=true;
 try{
  let clientName=selectedClientName();
  let address=String($('molms-invoice-client-address-v1')?.value||state.address||'').trim();
  const id=activeId();
  if(id){
   const {data,error}=await db().from('invoices').select('client_name,client_address').eq('id',id).maybeSingle();
   if(error)throw error;
   if(data){
    clientName=String(data.client_name||clientName);
    address=String(data.client_address||address).trim();
   }
  }
  const old=$('molms-invoice-client-address-preview-v1');if(old)old.remove();
  if(!address)return;
  const name=findClientNode(root,clientName);
  if(!name)return;
  const block=document.createElement('div');block.id='molms-invoice-client-address-preview-v1';
  block.textContent=address;
  block.style.cssText='white-space:pre-line;overflow-wrap:anywhere;font-size:11px;line-height:1.45;color:#344054;font-weight:400;margin-top:2px;';
  name.insertAdjacentElement('afterend',block);
 }catch(e){console.warn('[MOLMS invoice address preview]',e);}
 finally{state.rendering=false;}
}
function patchSave(){
 if(typeof window.invSaveDraft!=='function'||window.invSaveDraft.__clientAddressV1)return false;
 const base=window.invSaveDraft;
 const wrapped=async function(){
  const result=await base.apply(this,arguments);
  await saveAddress();
  await renderPreview();
  return result;
 };
 wrapped.__clientAddressV1=true;window.invSaveDraft=wrapped;return true;
}
function patchPreview(){
 if(typeof window.invRenderPreview!=='function'||window.invRenderPreview.__clientAddressV1)return false;
 const base=window.invRenderPreview;
 const wrapped=function(){const result=base.apply(this,arguments);setTimeout(renderPreview,0);return result;};
 wrapped.__clientAddressV1=true;window.invRenderPreview=wrapped;return true;
}
function boot(){
 ensureAddressField();patchSave();patchPreview();
 const field=$('molms-invoice-client-address-v1');
 if(field&&!field.dataset.bound){field.dataset.bound='1';field.addEventListener('change',()=>state.address=field.value);}
}
let lastId='';
const timer=setInterval(()=>{
 const p=page();
 if(p&&p.style.display!=='none'){
  boot();const id=activeId();
  if(id!==lastId){lastId=id;loadAddress();}
  if(typeof window.invRenderPreview==='function')patchPreview();
 }
},400);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();