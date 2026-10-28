/* MOLMS Financial Dashboard — Phase 5: compact header and period summary
 * Presentation-only layout. No financial data, filters, or calculations changed.
 */
(function molmsFinancialHeaderSummaryCompactV1(){
  'use strict';
  const STYLE_ID='molms-financial-header-summary-phase5-style';
  const CSS=`
    #page-findash .molms-fd-header-compact {
      display:grid!important;
      grid-template-columns:minmax(190px,240px) minmax(0,1fr)!important;
      align-items:center!important;
      column-gap:18px!important;
      row-gap:8px!important;
      padding:14px 20px!important;
      box-sizing:border-box!important;
    }
    #page-findash .molms-fd-header-compact select,
    #page-findash .molms-fd-header-compact input {max-width:100%!important;min-width:0!important;box-sizing:border-box!important}
    #page-findash .molms-fd-header-compact .molms-fd-header-controls {min-width:0!important;display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:7px!important}
    #page-findash .molms-fd-period-summary-compact {
      display:flex!important;align-items:center!important;justify-content:space-between!important;
      gap:12px!important;width:calc(100% - 40px)!important;max-width:100%!important;
      min-height:0!important;padding:10px 14px!important;margin:10px 20px 12px!important;
      box-sizing:border-box!important;border-radius:12px!important;
    }
    #page-findash .molms-fd-period-summary-compact * {min-width:0}
    #page-findash .molms-fd-period-summary-compact > * {overflow-wrap:anywhere}
    @media(max-width:700px){
      #page-findash .molms-fd-header-compact{grid-template-columns:minmax(0,1fr)!important;padding:12px 14px!important;gap:8px!important}
      #page-findash .molms-fd-period-summary-compact{width:calc(100% - 24px)!important;margin:8px 12px 10px!important;align-items:flex-start!important;flex-direction:column!important;gap:4px!important;padding:10px 12px!important}
    }
  `;
  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');style.id=STYLE_ID;style.textContent=CSS;document.head.appendChild(style);
  }
  function textMatch(root,pattern){
    return Array.from(root.querySelectorAll('*')).find(el=>el.children.length<4&&pattern.test((el.textContent||'').trim()));
  }
  function apply(){
    installStyle();
    const page=document.getElementById('page-findash');if(!page)return false;
    const heading=textMatch(page,/^Financial\s+Dashboard$/i);
    if(heading){
      let node=heading;
      // Find the smallest ancestor that contains the heading, period selectors and status line.
      for(let i=0;i<6&&node.parentElement&&node.parentElement!==page;i++){
        const p=node.parentElement;
        const t=(p.textContent||'');
        if(/Real-time financial overview/i.test(t)&&/Needs Reconciliation|Last updated/i.test(t)){node=p;break;}
        node=p;
      }
      const header=node.closest('[style*="display:flex"],[style*="display: flex"],[style*="grid"]')||node.parentElement;
      if(header&&header!==page){
        header.classList.add('molms-fd-header-compact');
        const controls=Array.from(header.children).find(el=>el.querySelector('select')||el.querySelector('input'));
        if(controls)controls.classList.add('molms-fd-header-controls');
      }
    }
    const summary=textMatch(page,/Period activity:\s*Revenue\s*[·•-]\s*Payments Received/i);
    if(summary){
      let node=summary;
      for(let i=0;i<5&&node.parentElement&&node.parentElement!==page;i++){
        const p=node.parentElement;
        if(/Financial position as at/i.test(p.textContent||'')&&/Period activity/i.test(p.textContent||'')){node=p;break;}
        node=p;
      }
      const card=node.closest('[style*="border-radius"]')||node.parentElement;
      if(card&&card!==page)card.classList.add('molms-fd-period-summary-compact');
    }
    return true;
  }
  let queued=false;
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})}
  function start(){apply();const page=document.getElementById('page-findash');if(page&&!page.__molmsPhase5Observer){const o=new MutationObserver(schedule);o.observe(page,{childList:true,subtree:true});page.__molmsPhase5Observer=o}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('load',start);setTimeout(start,500);setTimeout(start,1500);setTimeout(start,3000);
  window.MOLMSFinancialHeaderSummaryCompactV1={apply};
})();