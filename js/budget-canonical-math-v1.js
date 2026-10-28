/* MOLMS budget totals: render only canonical saved values; no audit panel or layout mutation. */
(function(){
 'use strict';
 if(window.__molmsBudgetCanonicalMathV2)return;
 window.__molmsBudgetCanonicalMathV2=true;
 const client=()=> (typeof sb!=='undefined'&&sb)||window.sb||window.supabaseClient||null;
 const fmt=n=>'TZS '+Number(n||0).toLocaleString('en-TZ',{maximumFractionDigits:2});
 function activeId(){const p=document.getElementById('bdPanelActions');return p?.dataset.bdBudgetId||window._bdActiveId||(typeof _bdActiveId!=='undefined'?_bdActiveId:null)}
 function reference(){const r=document.getElementById('page-budget')||document.body;const nodes=[r.querySelector('#bdDocumentHeader'),r.querySelector('#bdDocumentDetails')].filter(Boolean);for(const n of nodes){const m=(n.textContent||'').match(/MOL\/BUD\/\d+\/\d{2}\/\d{2}\/\d{2}\/[A-Z]{2}/);if(m)return m[0]}return null}
 function setValueBesideLabel(labelText,value){
  const root=document.getElementById('page-budget')||document.body;
  for(const label of [...root.querySelectorAll('*')].filter(e=>e.children.length===0&&(e.textContent||'').trim().toLowerCase()===labelText.toLowerCase())){
   const parent=label.parentElement;if(!parent)continue;
   const valueNodes=[...parent.querySelectorAll('*')].filter(e=>e.children.length===0&&/^(?:TZS\s*)?[\d,]+(?:\.\d+)?$/i.test((e.textContent||'').trim()));
   const node=valueNodes[valueNodes.length-1];
   if(node){node.textContent=Number(value||0).toLocaleString('en-TZ',{maximumFractionDigits:2});node.dataset.molmsBudgetCanonical='true'}
  }
 }
 async function refresh(){
  const db=client();if(!db?.from)return;
  let doc=null;const id=activeId(),ref=reference();
  try{
   if(id){const q=await db.from('budget_documents').select('id,reference_number').eq('id',id).maybeSingle();if(q.error)throw q.error;doc=q.data}
   if(!doc&&ref){const q=await db.from('budget_documents').select('id,reference_number').eq('reference_number',ref).maybeSingle();if(q.error)throw q.error;doc=q.data}
   if(!doc)return;
   const q=await db.from('budget_lines').select('id,requested_amount,status,created_at').eq('budget_document_id',doc.id).order('created_at',{ascending:true});
   if(q.error)throw q.error;
   const lines=q.data||[],total=lines.reduce((s,l)=>s+Number(l.requested_amount||0),0);
   const rows=[...document.querySelectorAll('#bdLinesBody tr')].filter(tr=>!tr.querySelector('td[colspan]'));
   rows.forEach((row,i)=>{const cell=row.querySelectorAll('td')[4],line=lines[i];if(cell&&line){cell.textContent=Number(line.requested_amount||0).toLocaleString('en-TZ',{maximumFractionDigits:2)};}});
   // The native footer shows "N lines · M items" next to the total. Update only
   // its monetary sibling; do not replace the container or affect module sizing.
   const root=document.getElementById('page-budget')||document.body;
   const countLabel=[...root.querySelectorAll('*')].find(e=>e.children.length===0&&/\b\d+\s+lines?\s*[·|,]\s*\d+\s+items?\b/i.test((e.textContent||'').trim()));
   if(countLabel){
    const parent=countLabel.parentElement;
    const candidates=[...parent.querySelectorAll('*')].filter(e=>e.children.length===0&&/TZS/i.test(e.textContent||''));
    const amount=candidates[candidates.length-1];
    if(amount)amount.textContent=fmt(total);
   }
   // Native header/sidebar totals, where present, are updated without adding UI.
   const labelLeaves=[...root.querySelectorAll('*')].filter(e=>e.children.length===0&&/^document total$/i.test((e.textContent||'').trim()));
   labelLeaves.forEach(label=>{const parent=label.parentElement;const vals=parent?[...parent.querySelectorAll('*')].filter(e=>e.children.length===0&&/TZS/i.test(e.textContent||'')):[];if(vals.length)vals[vals.length-1].textContent=fmt(total)});
  }catch(e){console.error('[MOLMS budget totals]',e)}
 }
 let timer;function schedule(){clearTimeout(timer);timer=setTimeout(refresh,500)}
 function install(){schedule();const body=document.body;if(body){const observer=new MutationObserver(()=>schedule());observer.observe(body,{childList:true,subtree:true});}window.addEventListener('focus',schedule)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
 window.MOLMSBudgetCanonicalMathV1={refresh};
})();