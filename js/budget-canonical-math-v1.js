/* MOLMS canonical budget mathematics
 * Displays the canonical saved line totals from budget_lines, which are now
 * synchronised transactionally with item quantity × unit_price in Postgres.
 * It does not independently rewrite financial records in the browser.
 */
(function(){
 'use strict';
 if(window.__molmsBudgetCanonicalMathV1)return;
 window.__molmsBudgetCanonicalMathV1=true;
 const db=()=> (typeof sb!=='undefined'&&sb)||window.sb||window.supabaseClient||null;
 const money=n=>'TZS '+Number(n||0).toLocaleString('en-TZ',{maximumFractionDigits:2});
 const root=()=>document.getElementById('page-budget')||document.querySelector('[data-page="budget"]')||document.getElementById('budgetPage')||document.body;
 function selectedRef(){
  const r=root();
  const p=document.getElementById('bdPanelActions');
  const text=[p?.parentElement?.parentElement?.textContent||'',r.querySelector('#bdDocumentHeader,#bdDocumentDetails')?.textContent||''].join(' ');
  return text.match(/MOL\/BUD\/\d+\/\d{2}\/\d{2}\/\d{2}\/[A-Z]{2}/)?.[0]||null;
 }
 function selectedId(){const p=document.getElementById('bdPanelActions');return p?.dataset.bdBudgetId||window._bdActiveId||(typeof _bdActiveId!=='undefined'?_bdActiveId:null)}
 function updateDocumentTotal(total){
  const r=root();
  const leaves=[...r.querySelectorAll('*')].filter(el=>el.children.length===0&&/^(document total)$/i.test((el.textContent||'').trim()));
  for(const label of leaves){
   const box=label.parentElement;
   if(!box)continue;
   const value=[...box.querySelectorAll('*')].filter(el=>el.children.length===0&&/^(TZS\s*)?0(?:\.00)?$/i.test((el.textContent||'').trim())).pop();
   if(value){value.textContent=money(total);value.dataset.canonicalBudgetTotal='true';}
  }
 }
 async function refresh(){
  const client=db(),r=root();if(!client||!client.from||!r)return;
  const id=selectedId(),ref=selectedRef();let doc=null;
  try{
   if(id){const q=await client.from('budget_documents').select('id,reference_number').eq('id',id).maybeSingle();if(q.error)throw q.error;doc=q.data}
   if(!doc&&ref){const q=await client.from('budget_documents').select('id,reference_number').eq('reference_number',ref).maybeSingle();if(q.error)throw q.error;doc=q.data}
   if(!doc)return;
   const q=await client.from('budget_lines').select('id,category,requested_amount,status').eq('budget_document_id',doc.id).order('created_at',{ascending:true});
   if(q.error)throw q.error;
   const lines=q.data||[],total=lines.reduce((s,l)=>s+Number(l.requested_amount||0),0);
   updateDocumentTotal(total);
   const tbody=document.getElementById('bdLinesBody');
   if(tbody){
    const rows=[...tbody.querySelectorAll('tr')].filter(tr=>!tr.querySelector('td[colspan]'));
    // Preserve the native row structure; the database line amount is canonical.
    rows.forEach((row,i)=>{
     const line=lines[i];if(!line)return;
     const cells=row.querySelectorAll('td');
     const totalCell=[...cells].find(td=>/^[\d,]+(?:\.\d+)?$/.test((td.textContent||'').trim())&&td!==cells[0]);
     if(totalCell&&cells.length>=6){
      const candidate=[...cells].find(td=>td.dataset.canonicalBudgetLineTotal==='true');
      if(candidate)candidate.textContent=Number(line.requested_amount||0).toLocaleString('en-TZ',{maximumFractionDigits:2});
     }
    });
   }
  }catch(e){console.error('[MOLMS canonical budget mathematics]',e)}
 }
 let timer;function schedule(){clearTimeout(timer);timer=setTimeout(refresh,300)}
 const obs=new MutationObserver(schedule);
 function install(){schedule();if(document.body)obs.observe(document.body,{childList:true,subtree:true});window.addEventListener('focus',schedule)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
 window.MOLMSBudgetCanonicalMathV1={refresh};
})();