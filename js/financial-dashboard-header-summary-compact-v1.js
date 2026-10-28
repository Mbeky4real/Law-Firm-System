/* MOLMS Financial Dashboard — Phase 5 layout correction
 * Compact month/period/status controls and icon-only refresh; presentation only.
 */
(function molmsFinancialHeaderSummaryCompactV1(){
 'use strict';
 const SID='molms-financial-header-summary-phase5-style';
 const CSS=`
 #page-findash .molms-fd-header-compact{display:grid!important;grid-template-columns:minmax(190px,270px) minmax(0,1fr)!important;align-items:center!important;gap:10px 18px!important;padding:14px 20px!important;box-sizing:border-box!important}
 #page-findash .molms-fd-header-controls{display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:8px!important;min-width:0!important;width:100%!important}
 #page-findash .molms-fd-header-controls select,#page-findash .molms-fd-header-controls input{flex:0 1 220px!important;width:auto!important;min-width:150px!important;max-width:260px!important;box-sizing:border-box!important}
 #page-findash .molms-fd-header-controls #fdStatusIndicator{flex:0 1 auto!important;width:max-content!important;max-width:100%!important}
 #page-findash .molms-fd-header-controls button{flex:0 0 42px!important;width:42px!important;min-width:42px!important;max-width:42px!important;height:40px!important;padding:0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;box-sizing:border-box!important}
 #page-findash .molms-fd-period-summary-compact{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;width:calc(100% - 40px)!important;max-width:100%!important;min-height:0!important;padding:10px 14px!important;margin:10px 20px 12px!important;box-sizing:border-box!important;border-radius:12px!important}
 #page-findash .molms-fd-period-summary-compact>*{min-width:0!important;overflow-wrap:anywhere}
 @media(max-width:700px){#page-findash .molms-fd-header-compact{grid-template-columns:minmax(0,1fr)!important;padding:12px 14px!important;gap:8px!important}#page-findash .molms-fd-header-controls select,#page-findash .molms-fd-header-controls input{flex:1 1 100%!important;width:100%!important;max-width:none!important}#page-findash .molms-fd-header-controls button{flex:0 0 42px!important}#page-findash .molms-fd-period-summary-compact{width:calc(100% - 24px)!important;margin:8px 12px 10px!important;align-items:flex-start!important;flex-direction:column!important;gap:4px!important;padding:10px 12px!important}}
 `;
 function install(){let s=document.getElementById(SID);if(!s){s=document.createElement('style');s.id=SID;document.head.appendChild(s)}s.textContent=CSS}
 function apply(){
  install();const page=document.getElementById('page-findash');if(!page)return false;
  const heading=Array.from(page.querySelectorAll('*')).find(e=>e.children.length===0&&/^Financial Dashboard$/i.test((e.textContent||'').trim()));
  if(heading){
   let candidate=heading;
   for(let i=0;i<8&&candidate.parentElement&&candidate.parentElement!==page;i++){
    candidate=candidate.parentElement;
    const txt=candidate.textContent||'';
    if(/Real-time financial overview/i.test(txt)&&candidate.querySelectorAll('select').length>=2){break}
   }
   if(candidate&&candidate!==page){
    candidate.classList.add('molms-fd-header-compact');
    let controls=Array.from(candidate.children).find(el=>el.querySelectorAll&&el.querySelectorAll('select').length>=2);
    if(!controls)controls=Array.from(candidate.querySelectorAll('*')).find(el=>el.querySelectorAll&&el.querySelectorAll('select').length>=2&&el.querySelectorAll('select').length<=3&&/Needs Reconciliation|Last updated/i.test(el.textContent||''));
    if(controls){
     controls.classList.add('molms-fd-header-controls');
     const selects=Array.from(controls.querySelectorAll('select'));
     selects.forEach(el=>{el.style.setProperty('width','auto','important');el.style.setProperty('max-width','260px','important');el.style.setProperty('flex','0 1 220px','important')});
     const status=controls.querySelector('#fdStatusIndicator');
     if(status){status.style.setProperty('width','max-content','important');status.style.setProperty('max-width','100%','important')}
     const refresh=Array.from(controls.querySelectorAll('button')).find(b=>/refresh|reload/i.test((b.getAttribute('aria-label')||'')+' '+(b.title||'')+' '+(b.textContent||''))||b.querySelector('svg'));
     if(refresh){refresh.style.setProperty('width','42px','important');refresh.style.setProperty('min-width','42px','important');refresh.style.setProperty('max-width','42px','important');refresh.style.setProperty('flex','0 0 42px','important');refresh.style.setProperty('height','40px','important')}
    }
   }
  }
  const summary=Array.from(page.querySelectorAll('*')).find(e=>e.children.length===0&&/Period activity:\s*Revenue\s*[·•-]\s*Payments Received/i.test((e.textContent||'').trim()));
  if(summary){let card=summary;for(let i=0;i<5&&card.parentElement&&card.parentElement!==page;i++){card=card.parentElement;if(/Financial position as at/i.test(card.textContent||'')&&/Period activity/i.test(card.textContent||''))break}if(card&&card!==page)card.classList.add('molms-fd-period-summary-compact')}
  return true;
 }
 let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})}
 function start(){apply();const p=document.getElementById('page-findash');if(p&&!p.__molmsPhase5Observer){const o=new MutationObserver(schedule);o.observe(p,{childList:true,subtree:true});p.__molmsPhase5Observer=o}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 window.addEventListener('load',start);setTimeout(start,500);setTimeout(start,1500);setTimeout(start,3000);
 window.MOLMSFinancialHeaderSummaryCompactV1={apply};
})();