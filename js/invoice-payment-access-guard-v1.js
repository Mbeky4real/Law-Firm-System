(function molmsInvoicePaymentAccessGuard(){
  'use strict';
  if(window.MOLMSInvoicePaymentAccessGuardV1)return;
  const api=window.MOLMSInvoicePaymentAccessGuardV1={version:2,installed:false};

  function canRecord(){
    return typeof authRole!=='undefined' && (authRole==='partner'||authRole==='admin');
  }
  function deny(){
    if(typeof notice==='function')notice('Only an active Partner or Administrator may record invoice payments.','err');
  }
  function syncControls(){
    const button=document.getElementById('invBtnRecordPayment');
    if(button)button.style.display=canRecord()?'':'none';
  }
  function guardPaymentAction(name){
    const original=window[name];
    if(typeof original!=='function'||original.__molmsInvoicePaymentGuard)return;
    const wrapped=function(){
      if(!canRecord()){deny();syncControls();return;}
      return original.apply(this,arguments);
    };
    wrapped.__molmsInvoicePaymentGuard=true;
    window[name]=wrapped;
  }
  function wrapRefreshOnly(name){
    const original=window[name];
    if(typeof original!=='function'||original.__molmsInvoicePaymentGuard)return;
    const wrapped=function(){
      const result=original.apply(this,arguments);
      if(result&&typeof result.then==='function')return result.finally(syncControls);
      syncControls();
      return result;
    };
    wrapped.__molmsInvoicePaymentGuard=true;
    window[name]=wrapped;
  }
  function install(){
    guardPaymentAction('invRecordPayment');
    guardPaymentAction('invSubmitPayment');
    wrapRefreshOnly('invLockForm');
    wrapRefreshOnly('invLoadInvoice');
    syncControls();
    if(!api.observer&&typeof MutationObserver!=='undefined'){
      api.observer=new MutationObserver(syncControls);
      api.observer.observe(document.body,{childList:true,subtree:true});
    }
    api.installed=true;
  }
  install();
  window.addEventListener('load',install);
  window.setTimeout(install,1000);
  window.setTimeout(install,2500);
})();