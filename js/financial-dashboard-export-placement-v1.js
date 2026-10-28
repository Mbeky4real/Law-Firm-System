/* MOLMS Financial Dashboard — Phase 1 export controls placement
 * Presentation-only: moves the existing print/export controls after dashboard content.
 * Does not alter report generation, export logic, calculations, or data.
 */
(function financialDashboardExportPlacementV1(){
  'use strict';
  const marker='data-fd-export-placement-v1';
  let observer=null;
  let scheduled=false;

  function relocate(){
    scheduled=false;
    const page=document.getElementById('page-findash');
    if(!page)return;
    const printButton=page.querySelector('button[onclick="fdPrintReport()"]');
    if(!printButton)return;
    const group=printButton.parentElement;
    if(!group)return;
    const body=group.parentElement;
    if(!body || !body.matches('div[style*="overflow-y:auto"]'))return;

    group.setAttribute(marker,'true');
    group.setAttribute('aria-label','Financial report export actions');
    group.style.display='flex';
    group.style.flexWrap='wrap';
    group.style.gap='10px';
    group.style.marginTop='12px';
    group.style.paddingTop='12px';
    group.style.paddingBottom='4px';
    group.style.borderTop='1px solid var(--border)';
    group.style.flexShrink='0';

    // Dynamic dashboard sections (including the Invoice Register) may render
    // after the original static markup. Keep the action group after all of them.
    if(body.lastElementChild!==group)body.appendChild(group);
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(relocate);
  }

  function init(){
    const page=document.getElementById('page-findash');
    if(!page)return false;
    const body=page.querySelector('div[style*="overflow-y:auto"]');
    if(!body)return false;
    relocate();
    if(observer)observer.disconnect();
    observer=new MutationObserver(schedule);
    observer.observe(body,{childList:true,subtree:true});
    return true;
  }

  function start(){
    if(init())return;
    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      if(init()||attempts>=40)clearInterval(timer);
    },250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.addEventListener('load',start);
  window.MOLMSFinancialDashboardExportPlacementV1={relocate};
})();