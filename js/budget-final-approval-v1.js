/* MOLMS Budget Final Approval V2
 * Partner-only approval after partial review is permitted once at least one line
 * has been reviewed and approved. Pending lines remain pending; rejected lines
 * remain rejected. The confirmation makes the partial decision explicit.
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
        panel.querySelectorAll('[data-bd-finalize]').forEach(x=>x.remove());
        if(canFinalize() && !['Approved','approved'].includes(status)){
          const b=document.createElement('button');
          b.type='button'; b.className='btn gold'; b.setAttribute('data-bd-finalize','1');
          b.textContent='✓ Approve Reviewed Budget';
          b.title='Approve the reviewed portion of this budget. Pending lines remain pending; rejected lines remain rejected.';
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
      b.textContent='✓ Approve Reviewed Budget';
      b.title='Approve the reviewed portion of this budget. Pending lines remain pending; rejected lines remain rejected.';
      b.onclick=()=>window.bdFinalizeBudget(_bdActiveId);
      panel.appendChild(b);
    }
  }
  window.bdFinalizeBudget=async function(id){
    if(typeof authRole==='undefined'||authRole!=='partner'){notice('Only Partners can finalise a budget.','err');return;}
    if(!canFinalize()){notice('Review and approve at least one budget line before approving the reviewed budget.','err');return;}
    const pending=Array.isArray(_bdLines)?_bdLines.filter(l=>['pending','returned','on_hold','on-hold'].includes(String(l.status||'pending').toLowerCase())).length:0;
    const yes=confirm('Approve the reviewed portion of this budget?\n\nApproved lines remain approved and rejected lines remain rejected.'+(pending?'\n\n'+pending+' line(s) are still pending review and will remain pending.':'')+'\n\nThe budget document will be marked approved.');
    if(!yes)return;
    if(!sb){notice('Database connection is unavailable.','err');return;}
    const {error}=await sb.from('budget_documents').update({
      status:'approved', updated_at:new Date().toISOString(), updated_by:authUser?.id
    }).eq('id',id);
    if(error){console.error('[Budget finalise]',error);notice('Unable to finalise budget: '+error.message,'err');return;}
    try{await bdRecordAudit('approved','Budget approved by Partner after partial review. Pending lines remain pending; rejected lines remain rejected.');}catch(e){console.warn(e);}
    if(typeof bdOpenDocument==='function') await bdOpenDocument(id);
    if(typeof bdLoadDocs==='function') await bdLoadDocs();
    if(typeof bdRenderKpiCards==='function') bdRenderKpiCards();
    if(typeof bdRenderList==='function') bdRenderList();
    notice('Reviewed budget approved. Pending lines remain pending; rejected lines remain rejected.');
  };
  function install(){
    decorate();
    const target=get('bdPanelActions')||document.body;
    new MutationObserver(()=>decorate()).observe(target,{childList:true,subtree:true});
    [250,800,1600,3000].forEach(ms=>setTimeout(decorate,ms));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();