/* MOLMS Finance KPI Guard V2
 * Final, iframe-local guard for the approved three-card financial snapshot.
 * It repairs legacy two-card renders using the authoritative V16 audit API.
 */
(function(){
  'use strict';
  if(window.MOLMSFinanceKpiGuardV2&&window.MOLMSFinanceKpiGuardV2.active)return;
  const specs=[
    {title:'TOTAL REVENUE',key:'revenue',note:'Revenue recognised from issued invoices and approved manual revenue',color:'#16803d'},
    {title:'TOTAL EXPENSES',key:'expenses',note:'Approved manual Other Expenditure and Partner Drawings only',color:'#b42318'},
    {title:'CASH AVAILABLE',key:'cashAvailable',note:'Invoice cash receipts less approved manual expenditure and drawings',color:'#167244'}
  ];
  let repairing=false;
  function fmt(values){
    const rows=Object.entries(values||{}).filter(([c,v])=>c&&Number.isFinite(Number(v))&&(c==='TZS'||Number(v)!==0));
    if(!rows.length)return [['TZS','0']];
    return rows.map(([c,v])=>[c,Number(v).toLocaleString('en-US',{maximumFractionDigits:2})]);
  }
  function build(spec,values,api){
    const card=document.createElement('button');
    card.type='button';card.className='molms-kpi-guard-v2-card';
    card.setAttribute('data-finance-detail',spec.key);
    card.style.cssText='display:block!important;visibility:visible!important;min-width:0!important;width:auto!important;max-width:none!important;margin:0!important;padding:12px!important;box-sizing:border-box!important;text-align:left!important;border:1px solid #e4ddd2!important;border-radius:14px!important;background:#fff!important;box-shadow:0 2px 8px rgba(16,35,59,.05)!important;cursor:pointer!important;color:'+spec.color+'!important;font:inherit!important;overflow-wrap:anywhere!important';
    const title=document.createElement('div');title.textContent=spec.title;title.style.cssText='font-size:clamp(9px,2.4vw,12px);font-weight:800;color:#667085;margin-bottom:6px;letter-spacing:.2px;white-space:normal';card.appendChild(title);
    fmt(values).forEach(([currency,value],i)=>{const line=document.createElement('div');line.textContent=currency+' '+value;line.style.cssText='font-size:clamp(14px,4.4vw,23px);font-weight:900;line-height:1.2;color:'+spec.color+';overflow-wrap:anywhere';card.appendChild(line)});
    const note=document.createElement('div');note.textContent=spec.note;note.style.cssText='font-size:10px;color:#667085;margin-top:7px;line-height:1.35';card.appendChild(note);
    const link=document.createElement('div');link.textContent='View breakdown ↗';link.style.cssText='font-size:10px;font-weight:750;color:#1d4ed8;margin-top:8px';card.appendChild(link);
    card.addEventListener('click',()=>api.showDetails&&api.showDetails(spec.key));
    return card;
  }
  function apply(){
    if(repairing)return false;
    const host=document.querySelector('#page-findash #fdKpiRow');
    const api=window.MOLMSFinanceV16;
    if(!host||!api||typeof api.audit!=='function')return false;
    const children=[...host.children];
    const exact=children.length===3&&specs.every(s=>children.some(el=>(el.textContent||'').toUpperCase().includes(s.title)));
    host.style.setProperty('display','grid','important');
    host.style.setProperty('grid-template-columns','repeat(3,minmax(0,1fr))','important');
    host.style.setProperty('gap','10px','important');
    host.style.setProperty('align-items','stretch','important');
    host.style.setProperty('width','100%','important');
    host.style.setProperty('min-width','0','important');
    host.style.setProperty('box-sizing','border-box','important');
    if(exact){
      children.forEach(el=>{el.style.setProperty('display','block','important');el.style.setProperty('visibility','visible','important');el.style.setProperty('min-width','0','important');el.style.setProperty('width','auto','important')});
      host.dataset.molmsKpiGuard='three-cards-v2';
      return true;
    }
    let audit;
    try{audit=api.audit()}catch(e){console.warn('[MOLMS KPI Guard V2] audit failed',e);return false}
    if(!audit||!audit.revenue||!audit.expenses||!audit.cashAvailable)return false;
    repairing=true;
    try{
      host.replaceChildren(...specs.map(s=>build(s,audit[s.key],api)));
      host.dataset.molmsKpiGuard='three-cards-v2';
      return true;
    }finally{repairing=false}
  }
  function start(){
    apply();
    if(!window.MOLMSFinanceKpiGuardV2.observer&&document.documentElement){
      const observer=new MutationObserver(()=>apply());
      observer.observe(document.documentElement,{childList:true,subtree:true});
      window.MOLMSFinanceKpiGuardV2.observer=observer;
    }
  }
  window.MOLMSFinanceKpiGuardV2={active:true,apply,start};
  start();
  window.addEventListener('load',start,{once:true});
  window.setInterval(start,750);
})();