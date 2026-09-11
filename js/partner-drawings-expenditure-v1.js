/* MOLMS-PARTNER-DRAWINGS-EXPENDITURE-V1 */
(function(){'use strict';
const DRAWING_LABEL='Partner Drawings';
function isExpenseCategorySelect(sel){
  if(!sel||sel.tagName!=='SELECT') return false;
  const labels=[...sel.options].map(o=>(o.textContent||'').trim());
  const signature=['Transportation','Utilities','Stationery & Office Supplies','Pantry Supplies','Entertainment & Client Hospitality','Training & Professional Development','Petty Cash','Rent & Office Management','Other'];
  return signature.filter(x=>labels.includes(x)).length>=5;
}
function refineSelect(sel){
  if(!isExpenseCategorySelect(sel)) return;
  if([...sel.options].some(o=>(o.textContent||'').trim()===DRAWING_LABEL)) return;
  const opt=document.createElement('option');
  opt.value=DRAWING_LABEL;
  opt.textContent=DRAWING_LABEL;
  const other=[...sel.options].find(o=>(o.textContent||'').trim()==='Other');
  if(other) sel.insertBefore(opt,other); else sel.appendChild(opt);
}
function scan(){document.querySelectorAll('select').forEach(refineSelect)}
function boot(){scan();const mo=new MutationObserver(scan);mo.observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();