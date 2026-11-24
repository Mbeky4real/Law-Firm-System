(function molmsInvoicePaymentAccessGuard(){
  'use strict';
  if(window.MOLMSInvoicePaymentAccessGuardV1)return;
  const api=window.MOLMSInvoicePaymentAccessGuardV1={version:1,installed:false};

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
  function wrap(name,after){
    const original=window[name];
    if(typeof original!=='function'||original.__molmsInvoicePaymentGuard)return;
    const wrapped=function(){
      if(!canRecord()){deny();syncControls();return;}
      const result=original.apply(this,arguments);
      if(after){
        if(result&&typeof result.then==='function')return result.finally(syncControls);
        syncControls();
      }
      return result;
    };
    wrapped.__molmsInvoicePaymentGuard=true;
    window[name]=wrapped;
  }
  function install(){
    wrap('invRecordPayment',true);
    wrap('invSubmitPayment',true);
    wrap('invLockForm',true);
    wrap('invLoadInvoice',true);
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