/* MOLMS Receivables Card Layout V1
 * Presentation-only repair. Does not alter finance calculations or payment workflows.
 */
(function receivablesCardLayoutV1(){
  'use strict';
  const STYLE_ID = 'molms-receivables-card-layout-v1';
  function install(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #page-findash #fdReceivablesCardV1,
      #page-findash #fdReceivablesCardV2 {
        min-width:0!important; max-width:100%; box-sizing:border-box;
        overflow-wrap:anywhere; word-break:normal;
      }
      #page-findash #fdReceivablesCardV1 *,
      #page-findash #fdReceivablesCardV2 * { box-sizing:border-box; min-width:0; }
      #page-findash #fdReceivablesCardV1 [data-v16-kind],
      #page-findash #fdReceivablesCardV2 [data-v16-kind] {
        display:grid!important;
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
        gap:7px!important; width:100%!important; max-width:100%;
        white-space:normal!important; overflow-wrap:anywhere; word-break:normal;
        padding:9px 2px!important; line-height:1.35;
      }
      #page-findash #fdReceivablesCardV1 [data-v16-kind] > span:first-child,
      #page-findash #fdReceivablesCardV2 [data-v16-kind] > span:first-child {
        grid-column:1/-1; text-align:left!important;
        padding-bottom:3px; font-size:12px!important; line-height:1.35;
      }
      #page-findash #fdReceivablesCardV1 [data-v16-kind] > span:not(:first-child),
      #page-findash #fdReceivablesCardV2 [data-v16-kind] > span:not(:first-child) {
        text-align:left!important; font-size:10px!important;
        white-space:normal!important; overflow-wrap:anywhere;
      }
      #page-findash #fdReceivablesCardV1 [data-v16-kind] b,
      #page-findash #fdReceivablesCardV2 [data-v16-kind] b {
        display:block; margin-top:2px; font-size:11px; line-height:1.35;
        white-space:normal!important; overflow-wrap:anywhere; word-break:normal;
      }
      @media(max-width:600px){
        #page-findash #fdReceivablesCardV1 [data-v16-kind],
        #page-findash #fdReceivablesCardV2 [data-v16-kind] {gap:5px!important;padding:9px 0!important}
        #page-findash #fdReceivablesCardV1 [data-v16-kind] > span:not(:first-child),
        #page-findash #fdReceivablesCardV2 [data-v16-kind] > span:not(:first-child) {font-size:9px!important}
        #page-findash #fdReceivablesCardV1 [data-v16-kind] b,
        #page-findash #fdReceivablesCardV2 [data-v16-kind] b {font-size:10px}
      }
    `;
    document.head.appendChild(style);
  }
  function apply(){
    const page=document.getElementById('page-findash');
    if(!page)return;
    install();
    ['fdReceivablesCardV1','fdReceivablesCardV2'].forEach(id=>{
      const host=page.querySelector('#'+id);
      if(host){host.style.minWidth='0';host.style.maxWidth='100%';host.style.overflowWrap='anywhere'}
    });
  }
  function start(){
    apply();
    const page=document.getElementById('page-findash');
    if(page&&!window.__molmsReceivablesLayoutObserver){
      window.__molmsReceivablesLayoutObserver=new MutationObserver(apply);
      window.__molmsReceivablesLayoutObserver.observe(page,{childList:true,subtree:true});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.addEventListener('load',start,{once:true});
})();