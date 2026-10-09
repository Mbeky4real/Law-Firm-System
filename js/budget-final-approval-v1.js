/* MOLMS Budget Final Approval V3
 * Fixes click handling and active-document ID resolution. Reports database failures
 * and verifies that the document row was actually updated.
 */
(function(){
  'use strict';
  const get = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function canFinalize(){
    if(typeof authRole === 'undefined' || authRole !== 'partner') return false;
    if(!Array.isArray(_bdLines) || !_bdLines.length) return false;
    const statuses=_bdLines.map(l=>String(l.status||'pending').toLowerCase());
    const hasApproved=statuses.includes('approved');
    return hasApproved;
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
        if(id) panel.dataset.bdBudgetId=String(id);
        panel.querySelectorAll('[data-bd-finalize]').forEach(x=>x.remove());
        if(canFinalize() && !['Approved','approved'].includes(status)){
          const b=document.createElement('button');
          b.type='button'; b.className='btn gold'; b.setAttribute('data-bd-finalize','1');
          b.textContent='✓ Approve Reviewed Budget';
          b.title='Approve the reviewed portion of this budget. Pending lines remain pending; rejected lines remain rejected.';
          b.onclick=()=>window.bdFinalizeBudget(panel.dataset.bdBudgetId || (typeof _bdActiveId!=='undefined' ? _bdActiveId : null));
          panel.appendChild(b);
        }
      };
      window.__bdFinalApprovalWrapped=true;
    }
    const panel=get('bdPanelActions');
    if(panel && canFinalize() && !panel.querySelector('[data-bd-finalize]')){
      const b=document.createElement('button');
      b.type='button'; b.className='btn gold'; b.setAttribute('data-bd-finalize','1');
      b.textContent='✓ Approve Reviewed Budget';
      b.title='Approve the reviewed portion of this budget. Pending lines remain pending; rejected lines remain rejected.';
      b.onclick=()=>window.bdFinalizeBudget(panel.dataset.bdBudgetId || (typeof _bdActiveId!=='undefined' ? _bdActiveId : null));
      panel.appendChild(b);
    }
  }
  window.bdFinalizeBudget=async function(id){
    try{
      if(typeof authRole==='undefined'||authRole!=='partner'){
        notice('Only Partners can approve a reviewed budget.','err');return;
      }
      if(!canFinalize()){
        notice('Review and approve at least one budget line before approving the reviewed budget.','err');return;
      }
      const docId=id || (typeof _bdActiveId!=='undefined' ? _bdActiveId : null);
      if(!docId){
        notice('Could not identify the selected budget. Close the budget and open it again, then retry.','err');
        console.error('[MOLMS budget approval] Missing document ID', {id, activeId:typeof _bdActiveId!=='undefined'?_bdActiveId:null});
        return;
      }
      const pending=Array.isArray(_bdLines)?_bdLines.filter(l=>['pending','returned','on_hold','on-hold'].includes(String(l.status||'pending').toLowerCase())).length:0;
      const yes=confirm('Approve the reviewed portion of this budget?\\n\\nApproved lines remain approved and rejected lines remain rejected.'+(pending?'\\n\\n'+pending+' line(s) are still pending review and will remain pending.':'')+'\\n\\nThe budget document will be marked approved.');
      if(!yes)return;
      if(typeof sb==='undefined'||!sb){
        notice('Database connection is unavailable.','err');return;
      }
      const updatePayload={status:'approved',updated_at:new Date().toISOString()};
      if(typeof authUser!=='undefined' && authUser && authUser.id) updatePayload.updated_by=authUser.id;
      const {data,error}=await sb.from('budget_documents')
        .update(updatePayload)
        .eq('id',docId)
        .select('id,status')
        .maybeSingle();
      if(error) throw error;
      if(!data){
        throw new Error('No budget record was updated. This may be a permissions/RLS issue or the selected budget ID is incorrect.');
      }
      try{
        if(typeof bdRecordAudit==='function') await bdRecordAudit('approved','Budget approved by Partner after partial review. Pending lines remain pending; rejected lines remain rejected.');
      }catch(auditError){console.warn('[MOLMS budget approval audit]',auditError);}
      if(typeof bdOpenDocument==='function') await bdOpenDocument(docId);
      if(typeof bdLoadDocs==='function') await bdLoadDocs();
      if(typeof bdRenderKpiCards==='function') bdRenderKpiCards();
      if(typeof bdRenderList==='function') bdRenderList();
      notice('Reviewed budget approved. Pending lines remain pending; rejected lines remain rejected.');
    }catch(error){
      console.error('[MOLMS budget approval]',error);
      notice('Budget approval failed: '+(error && error.message ? error.message : String(error)),'err');
    }
  };
  function install(){
    decorate();
    const target=get('bdPanelActions')||document.body;
    new MutationObserver(()=>decorate()).observe(target,{childList:true,subtree:true});
    [250,800,1600,3000].forEach(ms=>setTimeout(decorate,ms));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();