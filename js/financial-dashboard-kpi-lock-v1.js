/* MOLMS Financial Dashboard KPI Lock V1
 * Runs from the parent shell after the srcdoc application has loaded.
 * Enforces the approved three-card executive snapshot against V16 audit data.
 */
(function(){
  'use strict';
  if(window.MOLMSKpiLockV1&&window.MOLMSKpiLockV1.active)return;
  const labels=[
    {title:'TOTAL REVENUE',key:'revenue',note:'Recognised invoice and manual revenue',color:'#16803d'},
    {title:'TOTAL EXPENSES',key:'expenses',note:'Approved manual Other Expenditure and Partner Drawings only',color:'#b42318'},
    {title:'CASH AVAILABLE',key:'cashAvailable',note:'Invoice cash receipts less approved manual expenditure and drawings',color:'#167244'}
  ];
  let busy=false,observer=null,rootObserver=null;
  const money=(values)=>{
    const entries=Object.entries(values||{}).filter(([k,v])=>k&&Number.isFinite(Number(v))&&(k==='TZS'||Number(v)!==0));
    if(!entries.length)return [['TZS','0']];
    return entries.map(([k,v])=>[k,Number(v).toLocaleString('en-US',{maximumFractionDigits:2})]);
  };
  function apply(){
    if(busy)return false;
    const host=document.getElementById('fdKpiRow');
    const api=window.MOLMSFinanceV16;
    if(!host||!api||typeof api.audit!=='function')return false;
    const current=[...host.children];
    const ok=current.length===3&&labels.every(x=>current.some(el=>(el.textContent||'').toUpperCase().includes(x.title)));
    if(ok){host.dataset.molmsKpiLock='active';return true;}
    let audit;
    try{audit=api.audit()}catch(e){console.error('[MOLMS KPI Lock] audit unavailable',e);return false}
    busy=true;
    try{
      host.replaceChildren();
      labels.forEach(item=>{
        const card=document.createElement('button');
        card.type='button';card.className='molms-kpi-lock-card';
        card.setAttribute('data-finance-detail',item.key);
        card.style.cssText='display:block!important;visibility:visible!important;text-align:left!important;min-width:0!important;width:auto!important;max-width:none!important;margin:0!important;padding:14px!important;box-sizing:border-box!important;border:1px solid #e4ddd2!important;border-radius:12px!important;background:#fff!important;box-shadow:0 2px 8px rgba(16,35,59,.045)!important;cursor:pointer!important;color:'+item.color+'!important;font:inherit!important';
        const title=document.createElement('div');title.textContent=item.title;title.style.cssText='font-size:11px;font-weight:800;color:#667085;margin-bottom:6px;letter-spacing:.25px';
        card.appendChild(title);
        money(audit[item.key]).forEach(([currency,value],i)=>{
          const line=document.createElement('div');line.textContent=currency+' '+value;
          line.style.cssText='font-size:'+(i? '13px':'25px')+';font-weight:900;line-height:1.25;color:'+item.color;
          card.appendChild(line);
        });
        const note=document.createElement('div');note.textContent=item.note;note.style.cssText='font-size:11px;color:#667085;margin-top:6px;line-height:1.4';
        card.appendChild(note);
        const link=document.createElement('div');link.textContent='View breakdown ↗';link.style.cssText='font-size:11px;font-weight:750;color:#1d4ed8;margin-top:9px';
        card.appendChild(link);
        card.addEventListener('click',()=>api.showDetails&&api.showDetails(item.key));
        host.appendChild(card);
      });
      host.dataset.molmsKpiLock='active';
      host.dataset.molmsKpiLockVersion='1';
      return true;
    }finally{busy=false}
  }
  function start(){
    // Observe the document root: the application can replace #page-findash.
    if(!observer&&document.documentElement){
      observer=new MutationObserver(()=>{apply()});
      observer.observe(document.documentElement,{childList:true,subtree:true});
    }
    apply();
    return !!observer;
  }
  window.MOLMSKpiLockV1={active:true,apply,start};
  start();
  window.addEventListener('load',start,{once:true});
  // Persistent watchdog repairs later dashboard subtree replacements.
  start();
  setInterval(()=>{start();apply()},1000);
})();