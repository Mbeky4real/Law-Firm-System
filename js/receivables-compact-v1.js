/* MOLMS Financial Dashboard — Receivables Compact View V1
 * Layout only. Receivables Recovery V1 exclusively owns expansion and row visibility.
 */
(function(){
  'use strict';
  if(window.MOLMSReceivablesCompactV1)return;
  const api=window.MOLMSReceivablesCompactV1={version:2};
  const $=id=>document.getElementById(id);
  const host=()=> $('fdReceivablesCardV1')||$('fdReceivablesCardV2');
  function installStyle(){
    if($('molms-receivables-compact-v1-style'))return;
    const s=document.createElement('style');s.id='molms-receivables-compact-v1-style';
    s.textContent=`
      #page-findash .rr-history-note-v1{margin:7px 0 2px;color:var(--muted);font-size:10px;line-height:1.45}
      @media(max-width:760px){
        #page-findash [data-receivables-obligations-balanced="v1"]{grid-template-columns:minmax(0,1fr)!important}
      }
    `;
    document.head.appendChild(s);
  }
  function alignCards(){
    const r=host(),o=$('fdMonthlyObligationsStableV6')||$('fdMonthlyObligations');
    if(!r||!o)return;
    const ancestors=[];for(let n=r.parentElement;n;n=n.parentElement)ancestors.push(n);
    for(const common of ancestors){
      const branchFor=node=>{let x=node;while(x&&x.parentElement!==common)x=x.parentElement;return x&&x.parentElement===common?x:null};
      const rb=branchFor(r),ob=branchFor(o);
      if(!rb||!ob||rb===ob)continue;
      if(common.children.length>4)return;
      common.style.setProperty('display','grid','important');
      common.style.setProperty('grid-template-columns','repeat(2,minmax(0,1fr))','important');
      common.style.setProperty('align-items','start','important');
      common.style.setProperty('gap','12px','important');
      common.style.setProperty('width','100%','important');
      common.style.setProperty('min-width','0','important');
      common.dataset.receivablesObligationsBalanced='v1';
      [rb,ob].forEach(card=>{
        card.style.setProperty('width','100%','important');
        card.style.setProperty('max-width','100%','important');
        card.style.setProperty('min-width','0','important');
        card.style.setProperty('align-self','start','important');
        card.style.setProperty('box-sizing','border-box','important');
      });
      return;
    }
  }
  function start(){
    installStyle();alignCards();
    const page=$('page-findash');
    if(page&&!api.observer){
      api.observer=new MutationObserver(()=>alignCards());
      api.observer.observe(page,{childList:true,subtree:true});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('load',start,{once:true});
  api.refresh=alignCards;
})();