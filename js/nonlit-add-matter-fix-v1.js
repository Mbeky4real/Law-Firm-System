/* MOLMS MATTER ADD BUTTON RECOVERY V2 */
(function(){
  'use strict';
  if(window.__molmsMatterAddButtonFixV2)return;
  window.__molmsMatterAddButtonFixV2=true;

  function txt(el){return String(el?.textContent||el?.value||'').replace(/\s+/g,' ').trim().toLowerCase();}
  function isAdd(el){if(!el||el.tagName!=='BUTTON')return false;const t=txt(el);return t==='add new matter'||(t.includes('add new matter')&&!t.includes('client'));}
  function visible(el){if(!el)return false;const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'&&r.width>0&&r.height>0;}
  function pageOf(b){
    let p=b;
    while(p){
      if(/^page-(causelist|cause-list|nonlitigation|non-litigation)$/.test(p.id||''))return p;
      p=p.parentElement;
    }
    return ['page-causelist','page-cause-list','page-nonlitigation','page-non-litigation'].map(id=>document.getElementById(id)).find(visible)||null;
  }
  function show(id,reset,cancel){
    const m=document.getElementById(id);if(!m)return false;
    try{if(typeof cancel==='function')cancel();}catch(e){}
    try{if(typeof reset==='function')reset();}catch(e){}
    m.classList.remove('hidden');m.removeAttribute('hidden');m.setAttribute('aria-hidden','false');
    m.style.display='flex';m.style.visibility='visible';m.style.opacity='1';m.style.pointerEvents='auto';
    const first=m.querySelector('input,select,textarea');if(first)setTimeout(()=>{try{first.focus()}catch(e){}},30);
    return true;
  }
  function openFor(b){
    const id=String(pageOf(b)?.id||'').toLowerCase();
    if(/non.?litigation/.test(id)){window.nlEditId=null;return show('nlMatterModal',window.resetNonLitForm,window.cancelNonLitEdit);}
    if(/cause.?list|causelist/.test(id)){window.caseEditId=null;return show('clMatterModal',window.resetCaseForm,window.cancelCaseEdit);}
    return false;
  }
  document.addEventListener('click',function(e){
    const b=e.target?.closest?.('button');if(!isAdd(b))return;
    if(!openFor(b))return;
    e.preventDefault();e.stopPropagation();try{e.stopImmediatePropagation()}catch(x){}
  },true);
  function normalize(){document.querySelectorAll('button').forEach(b=>{if(isAdd(b)){b.disabled=false;b.removeAttribute('disabled');b.style.pointerEvents='auto';b.style.cursor='pointer';}});}
  normalize();new MutationObserver(normalize).observe(document.body,{childList:true,subtree:true});
})();