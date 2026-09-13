/* MOLMS Financial Dashboard Dedupe V1
 * Keep the integrated "By Practice Area" analytics view and remove the
 * duplicate standalone "Practice Performance" card.
 */
(function financialDashboardDedupeV1(){
  'use strict';

  function exactText(el,text){
    return String(el?.textContent||'').trim().replace(/\s+/g,' ')===text;
  }

  function findStandaloneHeading(){
    const all=[...document.querySelectorAll('div,h1,h2,h3,h4,h5,h6,span,p')];
    return all.find(el=>exactText(el,'PRACTICE PERFORMANCE'))||null;
  }

  function findCardContainer(heading){
    if(!heading)return null;
    let node=heading;
    for(let depth=0;node&&depth<7;depth++,node=node.parentElement){
      const text=String(node.textContent||'').replace(/\s+/g,' ');
      const hasPracticeRows=/Litigation/.test(text)&&/Non-Litigation/.test(text)&&/Other\s*\/\s*General/.test(text);
      if(!hasPracticeRows)continue;
      const cs=getComputedStyle(node);
      const bordered=parseFloat(cs.borderTopWidth||'0')>0||parseFloat(cs.borderLeftWidth||'0')>0;
      const rect=node.getBoundingClientRect();
      if(bordered&&rect.width>300)return node;
    }
    return heading.parentElement||null;
  }

  function removeDuplicate(){
    const heading=findStandaloneHeading();
    const card=findCardContainer(heading);
    if(!card)return false;
    card.dataset.financialDuplicateRemoved='practice-performance';
    card.style.display='none';
    return true;
  }

  function run(){
    removeDuplicate();
    setTimeout(removeDuplicate,250);
    setTimeout(removeDuplicate,900);
    setTimeout(removeDuplicate,1800);
  }

  window.addEventListener('load',run);
  const observer=new MutationObserver(()=>removeDuplicate());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setInterval(removeDuplicate,1500);

  window.MOLMSFinanceDedupeV1={removeDuplicate};
})();