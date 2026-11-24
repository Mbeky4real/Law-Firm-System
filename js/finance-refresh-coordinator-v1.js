(function molmsFinanceRefreshCoordinator(){
  'use strict';
  if(window.MOLMSFinanceRefreshCoordinatorV1)return;
  const api=window.MOLMSFinanceRefreshCoordinatorV1={version:1,busy:false,lastReason:null};
  let scheduled=false;

  function schedule(reason){
    api.lastReason=reason||'manual';
    if(scheduled)return;
    scheduled=true;
    window.setTimeout(async function(){
      scheduled=false;
      await refreshAll(api.lastReason);
    },180);
  }

  async function refreshAll(reason){
    if(api.busy)return;
    api.busy=true;
    const jobs=[];
    try{
      // The invoice list and KPI are owned by the Invoice module.
      if(typeof window.invLoadSavedList==='function')jobs.push(window.invLoadSavedList());
      // The invoice register and receivables views are independent consumers.
      if(window.MOLMSInvoiceRegisterRepairV1&&typeof window.MOLMSInvoiceRegisterRepairV1.refresh==='function'){
        jobs.push(window.MOLMSInvoiceRegisterRepairV1.refresh());
      }
      if(window.MOLMSReceivablesRecoveryV1&&typeof window.MOLMSReceivablesRecoveryV1.refresh==='function'){
        jobs.push(window.MOLMSReceivablesRecoveryV1.refresh());
      }
      const results=await Promise.allSettled(jobs);
      const failures=results.filter(x=>x.status==='rejected');
      if(failures.length)console.warn('[MOLMS finance refresh] One or more views did not refresh:',reason,failures);
      api.lastRefreshAt=new Date().toISOString();
      api.lastRefreshReason=reason||'manual';
      api.lastRefreshCount=jobs.length;
      return {reason:api.lastRefreshReason,refreshed:jobs.length,failures:failures.length};
    }finally{api.busy=false;}
  }

  function wrapMutation(name){
    const original=window[name];
    if(typeof original!=='function'||original.__molmsFinanceRefreshWrapped)return;
    const wrapped=async function(){
      const result=await original.apply(this,arguments);
      schedule(name);
      return result;
    };
    wrapped.__molmsFinanceRefreshWrapped=true;
    window[name]=wrapped;
  }

  function install(){
    ['invSaveDraft','invIssueInvoice','invSubmitPayment','invVoidInvoice','invDeleteDraft'].forEach(wrapMutation);
    const originalRefresh=window.fdRefresh;
    if(typeof originalRefresh==='function'&&!originalRefresh.__molmsFinanceRefreshWrapped){
      const wrapped=async function(){
        const result=await originalRefresh.apply(this,arguments);
        await refreshAll('financial-dashboard-refresh');
        return result;
      };
      wrapped.__molmsFinanceRefreshWrapped=true;
      window.fdRefresh=wrapped;
    }
    window.addEventListener('molms:invoice-data-changed',function(event){
      schedule(event.detail&&event.detail.reason||'invoice-data-changed');
    });
  }

  install();
  window.addEventListener('load',install);
  window.setTimeout(install,1200);
  window.setTimeout(install,3000);
  api.refresh=refreshAll;
})();