/* MOLMS Financial Dashboard — Phase 2: compact Practice Performance
 * Presentation-only CSS. Does not alter financial sources or calculations.
 */
(function molmsPracticePerformanceCompactV1(){
  'use strict';
  const STYLE_ID='molms-practice-performance-phase2-style';
  const STYLE_TEXT=`
    #page-findash #fdPracticePerformance {
      display:grid!important;
      grid-template-columns:repeat(3,minmax(0,1fr))!important;
      align-items:stretch!important;
      gap:7px!important;
      min-width:0!important;
      width:100%!important;
    }
    #page-findash #fdPracticePerformance > div:not([style*="grid-column"]) {
      min-width:0!important;
      width:auto!important;
      max-width:none!important;
      box-sizing:border-box!important;
      padding:7px 8px!important;
      margin:0!important;
      overflow-wrap:anywhere!important;
    }
    #page-findash #fdPracticePerformance > div[style*="grid-column"] {
      grid-column:1/-1!important;
      margin:2px 0 0!important;
      padding:5px 0 0!important;
    }
    #page-findash #fdPracticePerformance > div:not([style*="grid-column"]) > div:nth-child(1) {
      font-size:10px!important;
      line-height:1.25!important;
    }
    #page-findash #fdPracticePerformance > div:not([style*="grid-column"]) > div:nth-child(2) {
      font-size:13px!important;
      line-height:1.25!important;
      margin:3px 0!important;
      overflow-wrap:anywhere!important;
    }
    #page-findash #fdPracticePerformance > div:not([style*="grid-column"]) > div:nth-child(3) {
      font-size:9px!important;
      line-height:1.25!important;
    }
    @media(max-width:760px){
      #page-findash #fdPracticePerformance {grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important}
    }
    @media(max-width:420px){
      #page-findash #fdPracticePerformance {grid-template-columns:1fr!important}
    }
  `;

  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=STYLE_TEXT;
    document.head.appendChild(style);
  }

  function findPracticeCard(host){
    let node=host;
    while(node&&node.parentElement&&node.id!=='page-findash'){
      const style=node.getAttribute&&node.getAttribute('style')||'';
      if(node.matches&&node.matches('div')&&/border-radius:.*12px/i.test(style)&&/background:.*#fff/i.test(style))return node;
      node=node.parentElement;
    }
    return null;
  }

  function apply(){
    installStyle();
    const page=document.getElementById('page-findash');
    const host=page&&page.querySelector('#fdPracticePerformance');
    if(!host)return false;
    host.style.setProperty('display','grid','important');
    host.style.setProperty('grid-template-columns','repeat(3,minmax(0,1fr))','important');
    host.style.setProperty('align-items','stretch','important');
    host.style.setProperty('gap','7px','important');
    host.style.setProperty('min-width','0','important');
    const card=findPracticeCard(host);
    if(card){
      card.style.setProperty('padding','10px 12px','important');
      card.style.setProperty('margin','0','important');
      card.style.setProperty('height','auto','important');
      card.style.setProperty('min-height','0','important');
      card.style.setProperty('max-height','none','important');
      card.style.setProperty('box-sizing','border-box','important');
    }
    return true;
  }

  let observer=null,scheduled=false;
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;apply()});
  }
  function start(){
    apply();
    const host=document.querySelector('#page-findash #fdPracticePerformance');
    if(host){
      if(observer)observer.disconnect();
      observer=new MutationObserver(schedule);
      observer.observe(host,{childList:true,subtree:true});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.addEventListener('load',start);
  setTimeout(start,500);
  setTimeout(start,1500);
  window.MOLMSPracticePerformanceCompactV1={apply};
})();