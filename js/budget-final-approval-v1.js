/* MOLMS Budget Final Approval V1
 * Adds a Partner-only finalisation action after every line has been reviewed.
 * Mixed approved/rejected budgets may be finalised; rejected lines remain rejected.
 */
(function(){
  'use strict';
  const get = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function canFinalize(){
    if(typeof authRole === 'undefined' || authRole !== 'partner') return false;
    if(!Array.isArray(_bdLines) || !_bdLines.length) return false;
    const statuses=_bdLines.map(l=>String(l.status||'pending').toLowerCase());
    const allReviewed=statuses.every(s=>['approved','rejected'].includes(s));
    const hasApproved=statuses.includes('approved');
    const mixed=statuses.includes('rejected');
    return allReviewed && hasApproved && mixed;
  }
  function decorate(){
    const el=get('bdPanelActions');
    if(!el || typeof bdRenderPanelActions!=='function') return;
    if(!window.__bdFinalApprovalWrapped){
      const original=bdRenderPanelActions;
      window.__bdFinalApprovalOriginal=original;
      window.bdRenderPanelActions=function(status,id){
        window.__bdFinalApprovalOriginal(status,id);
        const panel=get('bdPanelActions');
        if(!panel) return;
        panel.querySelectorAll('[data-bd-finalize]').forEach(x=>x.remove());
        if(canFinalize() && !['Approved','approved'].includes(status)){
          const b=document.createElement('button');
          b.type='button'; b.className='btn gold'; b.setAttribute('data-bd-finalize','1');
          b.textContent='✓ Finalise Budget';
          b.title='Finalise this budget after all lines have been reviewed. Rejected lines remain rejected.';
          b.onclick=()=>window.bdFinalizeBudget(_bdActiveId);
          panel.appendChild(b);
        }
      };
      window.__bdFinalApprovalWrapped=true;
    }
    const panel=get('bdPanelActions');
    if(panel && canFinalize() && !panel.querySelector('[data-bd-finalize]')){
      const b=document.createElement('button');
      b.type='button'; b.className='btn gold'; b.setAttribute('data-bd-finalize','1');
      b.textContent='✓ Finalise Budget';
      b.title='Finalise this budget after all lines have been reviewed. Rejected lines remain rejected.';
      b.onclick=()=>window.bdFinalizeBudget(_bdActiveId);
      panel.appendChild(b);
    }
  }
  window.bdFinalizeBudget=async function(id){
    if(typeof authRole==='undefined'||authRole!=='partner'){notice('Only Partners can finalise a budget.','err');return;}
    if(!canFinalize()){notice('Resolve all pending, returned or on-hold lines before finalising.','err');return;}
    const yes=confirm('Finalise this budget?\n\nApproved lines will remain approved and rejected lines will remain rejected. This action records the final budget decision.');
    if(!yes)return;
    if(!sb){notice('Database connection is unavailable.','err');return;}
    const {error}=await sb.from('budget_documents').update({
      status:'approved', updated_at:new Date().toISOString(), updated_by:authUser?.id
    }).eq('id',id);
    if(error){console.error('[Budget finalise]',error);notice('Unable to finalise budget: '+error.message,'err');return;}
    try{await bdRecordAudit('approved','Budget finalised by Partner after review. Rejected lines remain rejected.');}catch(e){console.warn(e);}
    if(typeof bdOpenDocument==='function') await bdOpenDocument(id);
    if(typeof bdLoadDocs==='function') await bdLoadDocs();
    if(typeof bdRenderKpiCards==='function') bdRenderKpiCards();
    if(typeof bdRenderList==='function') bdRenderList();
    notice('Budget finalised. Rejected lines remain rejected.');
  };
  function install(){
    decorate();
    const target=get('bdPanelActions')||document.body;
    new MutationObserver(()=>decorate()).observe(target,{childList:true,subtree:true});
    [250,800,1600,3000].forEach(ms=>setTimeout(decorate,ms));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();