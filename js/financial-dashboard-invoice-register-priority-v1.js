/* MOLMS Financial Dashboard — Phase 3: prioritize Invoice Register
 * Presentation/DOM placement only. Does not modify invoice data, payments, or totals.
 */
(function molmsInvoiceRegisterPriorityV1(){
  'use strict';
  const pageId='page-findash';
  let observer=null, scheduled=false;

  function scrollBody(){
    const page=document.getElementById(pageId);
    return page&&Array.from(page.children).find(el=>/overflow-y:\s*auto/i.test(el.getAttribute('style')||''))||null;
  }

  function apply(){
    const scroll=scrollBody();
    if(!scroll)return false;
    const register=scroll.querySelector('#molms-invoice-register-v1');
    const practice=scroll.querySelector('#fdPracticePerformance');
    if(!register||!practice)return false;

    // The practice area is inside the Matter Revenue Leaderboard / Practice
    // Performance row. Put the full-width Invoice Register immediately before
    // that row, keeping the register readable and the existing row intact.
    let practiceRow=practice;
    while(practiceRow.parentElement&&practiceRow.parentElement!==scroll){
      practiceRow=practiceRow.parentElement;
    }
    if(practiceRow.parentElement!==scroll||practiceRow===register)return false;

    if(register.nextElementSibling!==practiceRow){
      scroll.insertBefore(register,practiceRow);
    }
    register.style.setProperty('display','block','important');
    register.style.setProperty('visibility','visible','important');
    register.style.setProperty('opacity','1','important');
    register.style.setProperty('width','100%','important');
    register.style.setProperty('max-width','100%','important');
    register.style.setProperty('box-sizing','border-box','important');
    register.style.setProperty('margin','0 0 16px','important');
    register.style.setProperty('position','relative','important');
    register.style.setProperty('z-index','1','important');
    return true;
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;apply()});
  }

  function start(){
    apply();
    const scroll=scrollBody();
    if(scroll){
      if(observer)observer.disconnect();
      observer=new MutationObserver(schedule);
      observer.observe(scroll,{childList:true});
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.addEventListener('load',start);
  setTimeout(start,500);
  setTimeout(start,1500);
  setTimeout(start,3000);
  window.MOLMSInvoiceRegisterPriorityV1={apply};
})();