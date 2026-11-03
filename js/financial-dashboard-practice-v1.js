/* MOLMS Financial Dashboard Practice Analytics V5
 * Safe period-aware practice-area renderer.
 * Reads authoritative finance tables directly for the selected period.
 * Does not hide or remove dashboard containers.
 */
(function financialDashboardPracticeV5(){
  'use strict';
  if(window.MOLMSPracticeV5 && window.MOLMSPracticeV5.version>=6)return;

  const q=id=>document.getElementById(id);
  const num=v=>Number(v||0);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const short=n=>{n=num(n);return Math.abs(n)>=1e9?(n/1e9).toFixed(1).replace('.0','')+'B':Math.abs(n)>=1e6?(n/1e6).toFixed(1).replace('.0','')+'M':Math.abs(n)>=1e3?(n/1e3).toFixed(1).replace('.0','')+'K':n.toLocaleString()};

  let sourceRows=[];
  let loading=false;
  let loaded=false;
  let rendering=false;
  let lastPeriodKey='';

  function bounds(){
    try{return fdGetPeriodDates()}catch(e){
      const now=new Date(),p=n=>String(n).padStart(2,'0');
      return {start:`${now.getFullYear()}-${p(now.getMonth()+1)}-01`,end:`${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())}`};
    }
  }

  function periodKey(){const b=bounds();return `${b.start}|${b.end}`}

  function classify(row){
    const explicit=String(row.practice_area||'').toLowerCase();
    if(['litigation','non_litigation','general'].includes(explicit))return explicit;
    const matter=String(row.matter_ref||row.matter_title||row.receivable_matter_ref||row.description||'').toLowerCase();
    if(/(^|\b)lit:|mol\/lit\//.test(matter))return 'litigation';
    if(/(^|\b)nl:|mol\/nlt\//.test(matter))return 'non_litigation';
    if(String(row.service_type||'').toLowerCase()==='retainer'||row.retainer_period)return 'general';
    return 'general';
  }

  async function loadRows(){
    if(loading||typeof sb==='undefined'||!sb)return false;
    loading=true;
    try{
      const {start,end}=bounds();
      const [inv,man]=await Promise.all([
        sb.from('invoices')
          .select('id,invoice_number,invoice_type,status,client_name,currency,invoice_date,total_due,practice_area,matter_ref,matter_title,service_type,retainer_period')
          .eq('invoice_type','tax').gte('invoice_date',start).lte('invoice_date',end),
        sb.from('fd_manual_transactions')
          .select('id,reference,tx_type,status,is_approved,approval_status,date,amount,currency,client_receivable,agreed_amount,receivable_client_name,counterparty,practice_area,receivable_matter_ref,description')
          .eq('tx_type','revenue').gte('date',start).lte('date',end)
      ]);
      if(inv.error)throw inv.error;
      if(man.error)throw man.error;

      const invoices=(inv.data||[])
        .filter(i=>!['draft','void','cancelled','superseded'].includes(String(i.status||'').toLowerCase()))
        .map(i=>({currency:i.currency||'TZS',revenue:num(i.total_due),practice:classify(i)}));

      const manual=(man.data||[])
        .filter(t=>String(t.status||t.approval_status||(t.is_approved?'approved':'')).toLowerCase()==='approved')
        .map(t=>({currency:t.currency||'TZS',revenue:t.client_receivable&&num(t.agreed_amount)>0?num(t.agreed_amount):num(t.amount),practice:classify(t)}));

      sourceRows=[...invoices,...manual];
      loaded=true;
      lastPeriodKey=periodKey();
      return true;
    }catch(e){
      console.warn('[MOLMS practice analytics V5]',e);
      return false;
    }finally{loading=false}
  }

  function render(){
    const host=q('fdRevByPractice');
    if(!host||!loaded||rendering)return;
    rendering=true;
    try{
      const practices=[
        {key:'litigation',label:'Litigation',color:'#1d4ed8'},
        {key:'non_litigation',label:'Non-Litigation',color:'#16803c'},
        {key:'general',label:'Other / General',color:'#64748b'}
      ];
      const sum=(practice,currency)=>sourceRows.filter(r=>r.practice===practice&&String(r.currency||'TZS').toUpperCase()===currency).reduce((s,r)=>s+r.revenue,0);
      const total=currency=>sourceRows.filter(r=>String(r.currency||'TZS').toUpperCase()===currency).reduce((s,r)=>s+r.revenue,0);
      const share=(amount,currency)=>total(currency)>0?Math.round(amount/total(currency)*100):0;
      let style=q('molms-practice-two-currency-layout');
      if(!style){
        style=document.createElement('style');
        style.id='molms-practice-two-currency-layout';
        style.textContent=`
          #page-findash #fdPracticePerformance{width:100%!important;max-width:920px!important;min-width:0!important;box-sizing:border-box!important}
          #page-findash #fdRevByPractice{display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;overflow:visible!important}
          #page-findash .fd-practice-currency-panels{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;width:100%;min-width:0}
          #page-findash .fd-practice-currency-panel{min-width:0;border:1px solid #e2ddd5;border-radius:9px;overflow:hidden;background:#fff;box-sizing:border-box}
          #page-findash .fd-practice-currency-title{padding:9px 10px;background:#f7f5f0;border-bottom:1px solid #e2ddd5;font-size:12px;font-weight:800;letter-spacing:.01em;color:#19375d}
          #page-findash .fd-practice-currency-row{display:grid;grid-template-columns:minmax(0,1fr);gap:3px;padding:9px 10px;border-bottom:1px solid #eee9e1;min-width:0}
          #page-findash .fd-practice-currency-row:last-child{border-bottom:0}
          #page-findash .fd-practice-currency-label{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:10px;color:#667085}
          #page-findash .fd-practice-area-amount{font-size:13px;font-weight:800;text-align:left;white-space:normal;overflow-wrap:anywhere;color:#172f69}
          #page-findash .fd-practice-share{font-size:10px;color:#667085;white-space:nowrap}
          #page-findash .fd-practice-currency-total{padding:7px 10px;background:#faf9f6;border-top:1px solid #e2ddd5;display:flex;justify-content:space-between;gap:6px;font-size:9px;color:#667085}
          @media(max-width:760px){#page-findash #fdPracticePerformance{max-width:100%!important}#page-findash .fd-practice-currency-panels{grid-template-columns:repeat(2,minmax(0,1fr))}}
          @media(max-width:440px){#page-findash .fd-practice-currency-panels{grid-template-columns:minmax(0,1fr)}}
        `;
        document.head.appendChild(style);
      }
      const panel=p=>'<section class="fd-practice-currency-panel">'+
        '<div class="fd-practice-currency-title" style="color:'+p.color+'">'+esc(p.label)+'</div>'+
        '<div class="fd-practice-currency-row"><div class="fd-practice-currency-label"><span>TZS revenue</span><span class="fd-practice-share">'+share(sum(p.key,'TZS'),'TZS')+'% of total</span></div><div class="fd-practice-area-amount">TZS '+esc(sum(p.key,'TZS').toLocaleString())+'</div></div>'+
        '<div class="fd-practice-currency-row"><div class="fd-practice-currency-label"><span>USD revenue</span><span class="fd-practice-share">'+share(sum(p.key,'USD'),'USD')+'% of total</span></div><div class="fd-practice-area-amount">USD '+esc(sum(p.key,'USD').toLocaleString())+'</div></div>'+
        '</section>';
      host.innerHTML='<div class="fd-practice-currency-panels">'+practices.map(panel).join('')+'</div>'+
        '<div style="font-size:9px;color:var(--muted);margin-top:6px">Selected reporting period · approved and recognised revenue only · currencies reported separately</div>';
    }finally{rendering=false}
  }

  async function refresh(){const ok=await loadRows();if(ok)render();return ok}
  // The financial client can initialise after the iframe's load event. Retry
  // the first read for a bounded period instead of leaving the legacy layout.
  let bootAttempts=0;
  function boot(){refresh().then(ok=>{if(!ok&&bootAttempts++<30)setTimeout(boot,1000)}).catch(()=>{if(bootAttempts++<30)setTimeout(boot,1000)})}

  // Render once after the application has finished loading. Do not observe
  // mutations on this host: render() itself replaces host.innerHTML, which would
  // retrigger an observer attached to the same host and create an infinite loop.
  window.addEventListener('load',()=>{setTimeout(boot,900)},{once:true});
  if(document.readyState==='complete')setTimeout(boot,900);
  // Refresh when the user changes a dashboard selector (including reporting period).
  document.addEventListener('change',event=>{
    const page=q('page-findash');
    if(!page||!page.contains(event.target))return;
    if(event.target.matches('select,input[type="date"],input[type="month"]')){
      setTimeout(refresh,0);
    }
  });


  window.MOLMSPracticeV5={version:6,classify,render,refresh,audit:()=>({period:bounds(),loaded,rows:sourceRows})};
})();