/* MOLMS invoice void status visibility — updates the original invoice preview and saved-list row. */
(function(){
'use strict';
if(window.__molmsInvoiceVoidVisibilityV1)return;
window.__molmsInvoiceVoidVisibilityV1=true;
const db=()=>typeof sb!=='undefined'?sb:(window.supabaseClient||window.sb||null);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const style='display:inline-flex;align-items:center;border:1px solid #b91c1c;border-radius:5px;background:#fef2f2;color:#991b1b;font:800 11px/1.2 Arial,sans-serif;letter-spacing:.5px;padding:4px 8px;margin:4px 6px;';
function statusTag(){let n=document.getElementById('molms-invoice-void-status-tag');if(!n){n=document.createElement('span');n.id='molms-invoice-void-status-tag';}n.setAttribute('style',style);n.textContent='VOID';return n;}
function previewMark(row){
 const root=document.getElementById('invPreviewPane');if(!root)return false;
 let banner=root.querySelector('#molms-invoice-void-banner');
 if(!banner){banner=document.createElement('div');banner.id='molms-invoice-void-banner';banner.style.cssText='display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 12px;padding:10px 12px;border:1px solid #fecaca;border-left:5px solid #b91c1c;border-radius:7px;background:#fef2f2;color:#7f1d1d;font:700 13px Arial,sans-serif;';root.prepend(banner);}
 banner.innerHTML='<span style="font-size:15px;font-weight:900;letter-spacing:1px">VOID</span><span>This invoice has been voided and is not valid for payment or revenue recognition.</span><span style="font-weight:400">Reason: '+esc(row.void_reason||'Not recorded')+'</span>';
 return true;
}
function listMark(row){
 const root=document.getElementById('page-invoice');if(!root)return false;
 let found=false;
 const leaves=[...root.querySelectorAll('*')].filter(el=>el.children.length===0&&String(el.textContent||'').includes(row.invoice_number));
 for(const leaf of leaves){
  found=true;
  let host=leaf.parentElement;
  if(!host)continue;
  let tag=host.querySelector(':scope > [data-molms-void-badge="true"]');
  if(!tag){tag=document.createElement('span');tag.dataset.molmsVoidBadge='true';tag.textContent='VOID';tag.style.cssText=style;host.appendChild(tag);}
  else {tag.textContent='VOID';tag.style.cssText=style;}
  const rowHost=leaf.closest('tr,[role="row"],li,[data-invoice-id],.invoice-row,.invoice-item');
  if(rowHost){rowHost.style.background='#fff7f7';rowHost.style.borderLeft='3px solid #b91c1c';rowHost.setAttribute('data-invoice-status','void');}
 }
 return found;
}
async function refresh(id,number){
 const c=db();if(!c)throw new Error('Database client is not available to the invoice status renderer.');
 const q=await c.from('invoices').select('id,invoice_number,status,voided_at,voided_by,void_reason').eq('id',id).maybeSingle();
 if(q.error)throw q.error;
 const row=q.data;
 if(!row||row.status!=='void'||!row.voided_at)throw new Error('The invoice status renderer could not confirm VOID in the saved invoice record.');
 previewMark(row);listMark(row);
 window.dispatchEvent(new CustomEvent('molms:invoice-status-updated',{detail:{invoiceId:row.id,invoiceNumber:row.invoice_number,status:'void'}}));
 return row;
}
window.MOLMSInvoiceVoidVisibility={refresh,paint(row){previewMark(row);listMark(row);}};
window.addEventListener('molms:invoice-voided',e=>{
 const d=e.detail||{};if(d.invoiceId)refresh(d.invoiceId,d.invoiceNumber).catch(err=>console.error('[MOLMS void visibility]',err));
});
})();
