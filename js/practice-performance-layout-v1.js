/* MOLMS Dedicated Practice Performance Layout V1
 * Presentation-only enforcement for the legacy six-tile practice renderer.
 * Does not read, calculate, or modify financial data.
 */
(function molmsDedicatedPracticeLayout(){
  'use strict';
  if(window.MOLMSPracticeLayoutRuntime && window.MOLMSPracticeLayoutRuntime.version>=1)return;

  const STYLE_ID='molms-dedicated-practice-layout-v1-style';
  let queued=false;
  let observer=null;

  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #page-findash #fdRevByPractice{
        display:grid!important;
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
        align-items:stretch!important;
        gap:8px!important;
        width:100%!important;
        max-width:100%!important;
        min-width:0!important;
        overflow:visible!important;
      }
      #page-findash #fdRevByPractice>.fd-practice-currency-panels{
        display:grid!important;
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
        gap:8px!important;
        width:100%!important;
        min-width:0!important;
      }
      #page-findash #fdRevByPractice>*{
        min-width:0!important;
        max-width:100%!important;
        box-sizing:border-box!important;
      }
      #page-findash #fdRevByPractice .fd-practice-area-amount,
      #page-findash #fdRevByPractice .fd-practice-mini-card{
        overflow-wrap:anywhere!important;
        word-break:normal!important;
      }
      @media(max-width:760px){
        #page-findash #fdRevByPractice,
        #page-findash #fdRevByPractice>.fd-practice-currency-panels{
          grid-template-columns:repeat(2,minmax(0,1fr))!important;
        }
      }
      @media(max-width:440px){
        #page-findash #fdRevByPractice,
        #page-findash #fdRevByPractice>.fd-practice-currency-panels{
          grid-template-columns:repeat(2,minmax(0,1fr))!important;
          gap:6px!important;
        }
      }
      #page-findash #fdPracticePerformance{
        width:100%!important;
        max-width:100%!important;
        min-width:0!important;
        box-sizing:border-box!important;
        overflow:visible!important;
      }
    `;
    document.head.appendChild(style);
  }

  function set(el,prop,value){
    if(el&&el.style.getPropertyValue(prop)!==value)el.style.setProperty(prop,value,'important');
  }

  function apply(){
    const page=document.getElementById('page-findash');
    const host=page&&page.querySelector('#fdRevByPractice');
    const title=page&&page.querySelector('#fdPracticePerformance');
    if(!page||!host)return false;
    installStyle();

    // A legacy renderer places a USD heading between the TZS and USD tiles.
    // Hide that heading only; all six underlying practice figures remain.
    Array.from(host.children).forEach(child=>{
      const label=String(child.textContent||'').replace(/\\s+/g,' ').trim().toUpperCase();
      if(label==='USD PRACTICE REVENUE'){
        set(child,'display','none');
      }else{
        set(child,'display','block');
        set(child,'width','100%');
        set(child,'min-width','0');
        set(child,'max-width','100%');
        set(child,'margin','0');
        set(child,'box-sizing','border-box');
        set(child,'overflow-wrap','anywhere');
      }
    });

    if(title){
      let card=title;
      for(let n=0;n<6&&card.parentElement&&card.parentElement!==page;n++){
        const style=card.getAttribute('style')||'';
        if(/border-radius/i.test(style)&&/background/i.test(style))break;
        card=card.parentElement;
      }
      set(card,'width','min(100%, 920px)');
      set(card,'max-width','920px');
      set(card,'min-width','0');
      set(card,'box-sizing','border-box');
    }
    return true;
  }

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;try{apply()}catch(error){console.error('[MOLMS practice layout]',error)}});
  }

  function start(){
    schedule();
    if(!observer&&document.documentElement){
      observer=new MutationObserver(schedule);
      observer.observe(document.documentElement,{childList:true,subtree:true});
    }
  }

  window.MOLMSPracticeLayoutRuntime={version:1,apply,start};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.addEventListener('load',start,{once:true});
})();