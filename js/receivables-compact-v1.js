/* MOLMS Financial Dashboard — Receivables Compact View V1
 * Presentation only: preserves receivables calculations and source records.
 */
(function(){
  'use strict';
  if(window.MOLMSReceivablesCompactV1)return;
  const api=window.MOLMSReceivablesCompactV1={version:1,expanded:false};
  const $=id=>document.getElementById(id);
  const host=()=> $('fdReceivablesCardV1')||$('fdReceivablesCardV2');
  const styleId='molms-receivables-compact-v1-style';
  function installStyle(){
    if($(styleId))return;
    const s=document.createElement('style');s.id=styleId;
    s.textContent=`
      #page-findash .rr-list:not(.rr-expanded) .rr-row:nth-child(n+4){display:none!important}
      #page-findash .rr-view-more-v1{display:block;width:100%;margin-top:8px;padding:8px 12px;border:1px solid #d8dee8;border-radius:8px;background:#f8fafc;color:#1d4ed8;font-size:11px;font-weight:800;text-align:center;cursor:pointer}
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
      if(common.children.length>4) return;
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
  function apply(){
    const r=host();if(!r)return;
    alignCards();
    const list=r.querySelector('.rr-list');
    if(!list)return;
    const rows=list.querySelectorAll('.rr-row');
    let button=r.querySelector('.rr-view-more-v1');
    let note=r.querySelector('.rr-history-note-v1');
    if(rows.length<=3){
      button?.remove();note?.remove();list.classList.remove('rr-expanded');return;
    }
    list.classList.toggle('rr-expanded',api.expanded);
    if(!button){
      button=document.createElement('button');
      button.type='button';button.className='rr-view-more-v1';
      button.addEventListener('click',()=>{
        api.expanded=!api.expanded;
        apply();
      });
      list.insertAdjacentElement('afterend',button);
    }
    const buttonLabel=api.expanded?'Show less':'View more · '+(rows.length-3)+' more items';
    if(button.textContent!==buttonLabel)button.textContent=buttonLabel;
    if(api.expanded){
      if(!note){
        note=document.createElement('div');note.className='rr-history-note-v1';
        button.insertAdjacentElement('afterend',note);
      }
      note.textContent='Showing all outstanding issued invoices and approved manual receivables, including unpaid balances carried forward from previous months. Fully settled invoices are excluded from outstanding receivables.';
    }else note?.remove();
  }
  function start(){
    installStyle();apply();
    const page=$('page-findash');
    if(page&&!api.observer){
      api.observer=new MutationObserver(()=>apply());
      api.observer.observe(page,{childList:true,subtree:true});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('load',start,{once:true});
  api.refresh=apply;
})();