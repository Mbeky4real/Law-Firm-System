(function(){
  'use strict';
  if(window.__molmsNonLitAddMatterFixV1) return;
  window.__molmsNonLitAddMatterFixV1=true;

  function textOf(el){ return String(el?.textContent||el?.value||'').replace(/\s+/g,' ').trim(); }
  function isAddMatterButton(el){
    if(!el || el.tagName!=='BUTTON') return false;
    const t=textOf(el).toLowerCase();
    return t==='add new matter' || (t.includes('add new matter') && !t.includes('client'));
  }
  function modal(){
    return document.getElementById('nlMatterModal') ||
      document.querySelector('[id*="nlMatter"][id*="Modal"], [id*="nlMatter"][class*="modal"]');
  }
  function open(){
    const m=modal();
    if(!m) return false;
    try{
      if(typeof window.cancelNonLitEdit==='function') window.cancelNonLitEdit();
    }catch(e){}
    try{ window.nlEditId=null; }catch(e){}
    m.classList.remove('hidden');
    m.removeAttribute('hidden');
    m.setAttribute('aria-hidden','false');
    m.style.display='flex';
    m.style.visibility='visible';
    m.style.opacity='1';
    m.style.pointerEvents='auto';
    const first=m.querySelector('#nlTitle, input, select, textarea');
    if(first) setTimeout(()=>{try{first.focus()}catch(e){}},30);
    return true;
  }
  document.addEventListener('click',function(e){
    const b=e.target?.closest?.('button');
    if(!isAddMatterButton(b)) return;
    const page=document.getElementById('page-nonlitigation') || document.getElementById('page-non-litigation');
    if(page && !page.contains(b)) return;
    const m=modal();
    if(!m) return;
    e.preventDefault();
    e.stopPropagation();
    try{ e.stopImmediatePropagation(); }catch(x){}
    open();
  },true);

  function normalize(){
    document.querySelectorAll('button').forEach(b=>{
      if(!isAddMatterButton(b)) return;
      const page=document.getElementById('page-nonlitigation') || document.getElementById('page-non-litigation');
      if(page && page.contains(b)){
        b.disabled=false;
        b.removeAttribute('disabled');
        b.style.pointerEvents='auto';
        b.style.cursor='pointer';
      }
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',normalize,{once:true});
  else normalize();
  new MutationObserver(normalize).observe(document.body,{childList:true,subtree:true});
})();