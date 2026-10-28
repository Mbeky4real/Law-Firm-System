/* MOLMS Financial Dashboard — Phase 4: visible horizontal scrolling for Manual Financial Transactions
 * Presentation-only. Does not modify transaction records, approval rules, or calculations.
 */
(function molmsManualTransactionsHorizontalScrollV1(){
  'use strict';
  const STYLE_ID='molms-manual-horizontal-scroll-phase4-style';
  const NOTE_CLASS='molms-manual-scroll-hint-v1';
  let observer=null,scheduled=false;

  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #page-findash .fd-manual-table-scroll{
        display:block!important;
        position:relative!important;
        width:100%!important;
        max-width:100%!important;
        overflow-x:scroll!important;
        overflow-y:auto!important;
        overscroll-behavior-x:contain!important;
        -webkit-overflow-scrolling:touch!important;
        scrollbar-width:auto!important;
        scrollbar-color:#7b8794 #e8edf1!important;
        box-sizing:border-box!important;
      }
      #page-findash .fd-manual-table-scroll table{
        width:1370px!important;
        min-width:1370px!important;
        max-width:none!important;
        table-layout:fixed!important;
      }
      #page-findash .fd-manual-table-scroll::-webkit-scrollbar{height:14px!important;width:12px!important;display:block!important}
      #page-findash .fd-manual-table-scroll::-webkit-scrollbar-thumb{background:#7b8794!important;border:2px solid #e8edf1!important;border-radius:8px!important}
      #page-findash .fd-manual-table-scroll::-webkit-scrollbar-track{background:#e8edf1!important;border-radius:8px!important}
      #page-findash .${NOTE_CLASS}{
        display:flex!important;align-items:center!important;justify-content:space-between!important;
        gap:8px!important;flex-wrap:wrap!important;margin:0 0 7px!important;padding:7px 10px!important;
        border:1px solid #d8e4f0!important;border-radius:7px!important;background:#f4f8fc!important;
        color:#244766!important;font-size:11px!important;line-height:1.35!important;
      }
      #page-findash .${NOTE_CLASS} strong{font-weight:800!important}
    `;
    document.head.appendChild(style);
  }

  function apply(){
    const page=document.getElementById('page-findash');
    const body=page&&page.querySelector('#fdManualBody');
    const table=body&&body.closest('table');
    if(!table)return false;
    installStyle();
    let scroller=table.closest('.fd-manual-table-scroll');
    if(!scroller){
      scroller=document.createElement('div');
      scroller.className='fd-manual-table-scroll';
      scroller.setAttribute('role','region');
      scroller.setAttribute('aria-label','Manual financial transactions. Scroll horizontally to view all columns.');
      table.parentNode.insertBefore(scroller,table);
      scroller.appendChild(table);
    }
    scroller.style.setProperty('overflow-x','scroll','important');
    scroller.style.setProperty('overflow-y','auto','important');
    scroller.style.setProperty('width','100%','important');
    scroller.style.setProperty('max-width','100%','important');
    scroller.style.setProperty('height','250px','important');
    scroller.style.setProperty('max-height','250px','important');
    scroller.style.setProperty('box-sizing','border-box','important');
    table.style.setProperty('width','1370px','important');
    table.style.setProperty('min-width','1370px','important');
    table.style.setProperty('max-width','none','important');

    let hint=scroller.previousElementSibling;
    if(!hint||!hint.classList.contains(NOTE_CLASS)){
      hint=document.createElement('div');
      hint.className=NOTE_CLASS;
      hint.innerHTML='<span><strong>View all transaction details</strong> — scroll horizontally to see every column and action.</span><span aria-hidden="true">↔</span>';
      scroller.parentNode.insertBefore(hint,scroller);
    }
    hint.setAttribute('role','note');
    return true;
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;apply()});
  }
  function start(){
    apply();
    if(observer)observer.disconnect();
    const page=document.getElementById('page-findash');
    if(page){
      observer=new MutationObserver(schedule);
      observer.observe(page,{childList:true,subtree:true});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.addEventListener('load',start);
  setTimeout(start,500);
  setTimeout(start,1500);
  window.MOLMSManualTransactionsHorizontalScrollV1={apply};
})();