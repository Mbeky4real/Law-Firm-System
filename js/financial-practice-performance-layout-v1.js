(function(){
'use strict';
if(window.MOLMSPracticePerformanceLayoutV1)return;
window.MOLMSPracticePerformanceLayoutV1=true;
const style=document.createElement('style');
style.id='molms-practice-performance-layout-v1';
style.textContent=`
#page-findash #fdPracticePerformance{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important;min-width:0!important;overflow:visible!important}
#page-findash #fdPracticePerformance table{display:none!important}
#page-findash #fdPracticePerformance tr{display:contents!important}
#page-findash #fdPracticePerformance td{display:block!important;min-width:0!important;padding:9px 10px!important;border:1px solid #e4ddd2!important;border-radius:9px!important;background:#faf9f6!important;line-height:1.25!important;overflow-wrap:anywhere!important}
#page-findash #fdPracticePerformance td:first-child{font-weight:600!important}
#page-findash #fdPracticePerformance th{display:none!important}
#page-findash #fdPracticePerformance button{font-size:11px!important}
@media(max-width:760px){#page-findash #fdPracticePerformance{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
@media(max-width:420px){#page-findash #fdPracticePerformance{grid-template-columns:1fr!important}}
`;
(document.head||document.documentElement).appendChild(style);
function cardFor(el,scroll){
 let n=el;
 while(n&&n.parentElement&&n.parentElement!==scroll){
  const s=n.getAttribute&&n.getAttribute('style')||'';
  if(n.matches&&n.matches('div')&&(/border-radius:\\s*12px/i.test(s)||/border-radius:\\s*14px/i.test(s)))return n;
  n=n.parentElement;
 }
 return n&&n.parentElement===scroll?n:null;
}
function apply(){
 const page=document.getElementById('page-findash');if(!page)return;
 const scroll=Array.from(page.children).find(el=>/overflow-y:\\s*auto/i.test(el.getAttribute('style')||''));if(!scroll)return;
 const practice=page.querySelector('#fdPracticePerformance');if(!practice)return;
 const practiceCard=cardFor(practice,scroll);if(!practiceCard)return;
 const candidates=Array.from(scroll.querySelectorAll('h1,h2,h3,strong,b,div,span')).filter(el=>(el.textContent||'').trim()==='Invoice Register');
 let invoiceCard=null;
 for(const el of candidates){invoiceCard=cardFor(el,scroll);if(invoiceCard&&invoiceCard!==practiceCard)break;invoiceCard=null;}
 if(invoiceCard&&practiceCard.parentElement===scroll&&invoiceCard!==practiceCard.nextElementSibling)invoiceCard.insertAdjacentElement('afterend',practiceCard);
 practiceCard.classList.remove('fd-compact-workspace-card');
 practiceCard.style.setProperty('display','block','important');
 practiceCard.style.setProperty('width','100%','important');
 practiceCard.style.setProperty('max-width','100%','important');
 practiceCard.style.setProperty('height','auto','important');
 practiceCard.style.setProperty('min-height','0','important');
 practiceCard.style.setProperty('max-height','none','important');
 practiceCard.style.setProperty('margin','12px 0 14px','important');
 practiceCard.style.setProperty('padding','12px 14px','important');
 practiceCard.style.setProperty('overflow','visible','important');
}
function start(){apply();const page=document.getElementById('page-findash');if(page&&!window.MOLMSPracticePerformanceLayoutObserver){window.MOLMSPracticePerformanceLayoutObserver=new MutationObserver(()=>apply());window.MOLMSPracticePerformanceLayoutObserver.observe(page,{childList:true,subtree:true});}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('load',start,{once:true});
})();