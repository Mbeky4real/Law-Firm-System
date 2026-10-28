/* MOLMS Budget Mathematical Reconciliation V1
 * Read-only cross-check of item calculations, budget-line amounts and document totals.
 * Does not alter financial records; it makes discrepancies explicit for review.
 */
(function(){
 'use strict';
 if(window.__molmsBudgetMathAuditV1)return;
 window.__molmsBudgetMathAuditV1=true;
 const money=n=>'TZS '+(Number(n||0)).toLocaleString('en-TZ',{maximumFractionDigits:2});
 const num=n=>Number.isFinite(Number(n))?Number(n):0;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function client(){return (typeof sb!=='undefined'&&sb)||window.sb||window.supabaseClient||null}
 function activeId(){const p=document.getElementById('bdPanelActions');return p?.dataset.bdBudgetId||window._bdActiveId||(typeof _bdActiveId!=='undefined'?_bdActiveId:null)}
 function root(){return document.getElementById('page-budget')||document.querySelector('[data-page="budget"]')||document.getElementById('budgetPage')||document.querySelector('#bdPanelActions')?.parentElement?.parentElement||document.body}
 function ensureStyle(){if(document.getElementById('molms-budget-math-audit-style'))return;const s=document.createElement('style');s.id='molms-budget-math-audit-style';s.textContent='#molmsBudgetMathAudit{margin:12px 0;padding:12px 14px;border:1px solid #d7dfe8;border-radius:10px;background:#fff;font-size:12px;color:#0f2440}#molmsBudgetMathAudit .bma-title{font-weight:900;font-size:13px;margin-bottom:7px}#molmsBudgetMathAudit .bma-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}#molmsBudgetMathAudit .bma-card{padding:9px;border-radius:8px;background:#f7f9fc;border:1px solid #e4e9f0;min-width:0}#molmsBudgetMathAudit .bma-label{font-size:10px;color:#65738a;font-weight:800}#molmsBudgetMathAudit .bma-value{font-weight:900;font-size:14px;margin-top:4px;overflow-wrap:anywhere}#molmsBudgetMathAudit .bma-warn{margin-top:8px;padding:8px;border-radius:7px;background:#fff1f0;color:#b42318;font-weight:800}#molmsBudgetMathAudit .bma-ok{margin-top:8px;padding:8px;border-radius:7px;background:#ecfdf3;color:#167443;font-weight:800}@media(max-width:700px){#molmsBudgetMathAudit .bma-grid{grid-template-columns:1fr}}';document.head.appendChild(s)}
 async function refresh(){
  const id=activeId(),sbx=client(),r=root();if(!r)return;
  if(!id||!sbx){let waiting=document.getElementById('molmsBudgetMathAudit');if(!waiting){waiting=document.createElement('section');waiting.id='molmsBudgetMathAudit';(r.querySelector('#bdPanelActions')?.parentElement||r).appendChild(waiting)}waiting.innerHTML='<div class="bma-title">Budget Mathematical Reconciliation</div><div class="bma-warn">The selected budget or database client is not available yet. Reopen the budget document or refresh to retry the audit.</div>';return;}
  let panel=document.getElementById('molmsBudgetMathAudit');
  if(!panel){panel=document.createElement('section');panel.id='molmsBudgetMathAudit';const target=r.querySelector('#bdDocumentSummary,[id*="DocumentSummary"],[class*="document-summary"],[class*="DocumentSummary"]')||document.getElementById('bdLinesBody')?.parentElement||r;target.appendChild(panel)}
  panel.innerHTML='<div class="bma-title">Budget Mathematical Reconciliation</div><div>Checking saved amounts against item calculations…</div>';
  try{
   const dr=await sbx.from('budget_documents').select('id,reference_number,status').eq('id',id).maybeSingle();if(dr.error)throw dr.error;
   const lr=await sbx.from('budget_lines').select('id,category,requested_amount,status,created_at').eq('budget_document_id',id).order('created_at',{ascending:true});if(lr.error)throw lr.error;
   const lines=lr.data||[],ids=lines.map(x=>x.id).filter(Boolean);let items=[];
   if(ids.length){const ir=await sbx.from('budget_line_items').select('id,budget_line_id,quantity,unit_price,item_total').in('budget_line_id',ids);if(ir.error)throw ir.error;items=ir.data||[]}
   const byLine=new Map(lines.map(l=>[String(l.id),[]]));items.forEach(it=>{const k=String(it.budget_line_id);if(byLine.has(k))byLine.get(k).push(it)});
   let recorded=0,calculated=0,approved=0,rejected=0,held=0,returned=0,discrepancies=[];
   lines.forEach(l=>{
    const amt=num(l.requested_amount),its=byLine.get(String(l.id))||[],itemSum=its.reduce((s,it)=>s+num(it.quantity)*num(it.unit_price),0);
    recorded+=amt;
    const basis=its.length?itemSum:amt;calculated+=basis;
    const status=String(l.status||'').toLowerCase();
    if(status==='approved')approved+=basis;else if(status==='rejected')rejected+=basis;else if(status==='on_hold'||status==='hold')held+=basis;else if(status==='returned')returned+=basis;
    if(its.length&&Math.abs(itemSum-amt)>0.009)discrepancies.push((l.category||'Budget line')+': recorded '+money(amt)+' vs item sum '+money(itemSum));
    its.forEach(it=>{if(it.item_total!=null&&Math.abs(num(it.item_total)-num(it.quantity)*num(it.unit_price))>0.009)discrepancies.push('Item total mismatch on '+(l.category||'budget line'))});
   });
   const status=String(dr.data?.status||'').toLowerCase();
   panel.innerHTML='<div class="bma-title">Budget Mathematical Reconciliation</div><div class="bma-grid">'+
    [['Recorded line total',recorded],['Calculated total from items',calculated],['Approved amount (calculated)',approved],['Rejected amount (calculated)',rejected],['On hold (calculated)',held],['Returned (calculated)',returned]].map(x=>'<div class="bma-card"><div class="bma-label">'+esc(x[0])+'</div><div class="bma-value">'+money(x[1])+'</div></div>').join('')+
    '</div><div class="'+(discrepancies.length?'bma-warn':'bma-ok')+'">'+(discrepancies.length?esc(discrepancies.length+' mathematical discrepancy/discrepancies found. Review the line amounts below; saved records have not been changed.'):'No item-vs-line mathematical discrepancies detected for this document.')+'</div>'+
    '<div style="font-size:10px;color:#65738a;margin-top:6px">Document status: '+esc(status||'unknown')+'. Lines without item details use their recorded line amount. This audit is read-only.</div>'+
    (discrepancies.length?'<details style="margin-top:7px"><summary style="cursor:pointer;font-weight:800">View discrepancy details</summary><ul>'+discrepancies.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></details>':'');
  }catch(e){console.error('[Budget math audit]',e);panel.innerHTML='<div class="bma-title">Budget Mathematical Reconciliation</div><div class="bma-warn">Audit could not be completed: '+esc(e.message||e)+'</div>'}
 }
 let timer;function schedule(){clearTimeout(timer);timer=setTimeout(refresh,250)}
 const ob=new MutationObserver(schedule);function install(){ensureStyle();schedule();if(document.body)ob.observe(document.body,{childList:true,subtree:true});window.addEventListener('focus',schedule)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
 window.MOLMSBudgetMathAuditV1={refresh};
})();