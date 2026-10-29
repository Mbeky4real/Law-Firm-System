/* MOLMS Financial Dashboard Practice Analytics V5
 * Safe period-aware practice-area renderer.
 * Reads authoritative finance tables directly for the selected period.
 * Does not hide or remove dashboard containers.
 */
(function financialDashboardPracticeV5(){
  'use strict';

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
      const currencies=['TZS',...new Set(sourceRows.map(r=>r.currency).filter(c=>c&&c!=='TZS').sort())];
      const practices=[
        {key:'litigation',label:'Litigation',color:'#1d4ed8'},
        {key:'non_litigation',label:'Non-Litigation',color:'#16803c'},
        {key:'general',label:'Other / General',color:'#64748b'}
      ];
      const sum=(practice,currency)=>sourceRows.filter(r=>r.practice===practice&&r.currency===currency).reduce((s,r)=>s+r.revenue,0);
      host.innerHTML=`
        <div class="fd-practice-compact" style="display:grid;grid-template-columns:minmax(130px,1.2fr) repeat(${currencies.length},minmax(110px,1fr));gap:0;border:1px solid var(--border,#e2ddd5);border-radius:9px;overflow:hidden;background:#fff">
          <div style="padding:7px 9px;background:#f7f5f0;font-size:9px;font-weight:800;color:var(--muted)">PRACTICE AREA</div>
          ${currencies.map(cur=>`<div style="padding:7px 9px;background:#f7f5f0;text-align:right;font-size:9px;font-weight:800;color:var(--muted)">${esc(cur)} REVENUE</div>`).join('')}
          ${practices.map(p=>`<div style="padding:8px 9px;border-top:1px solid var(--border,#e2ddd5);font-size:10px;font-weight:800;color:${p.color}">${esc(p.label)}</div>${currencies.map(cur=>`<div style="padding:8px 9px;border-top:1px solid var(--border,#e2ddd5);text-align:right;font-size:11px;font-weight:800;color:var(--navy)">${esc(cur)} ${esc(short(sum(p.key,cur)))}</div>`).join('')}`).join('')}
        </div>
        <div style="font-size:9px;color:var(--muted);margin-top:5px">Selected reporting period · approved and recognised revenue only · currencies shown separately</div>
      `;
    }finally{rendering=false}
  }

  async function refresh(){await loadRows();render()}

  window.addEventListener('load',()=>{setTimeout(refresh,700);setTimeout(refresh,1700);setTimeout(refresh,3000)});
  // Other legacy dashboard renderers may repaint this host after initial load.
  // Restore the compact matrix only when another renderer has replaced it; our own
  // render is stable because the expected class is present after each update.
  function observeHost(){
    const host=q('fdRevByPractice');
    if(!host||host.dataset.molmsCompactObserver==='1')return;
    host.dataset.molmsCompactObserver='1';
    const observer=new MutationObserver(()=>{
      if(!rendering&&loaded&&!host.querySelector('.fd-practice-compact'))render();
    });
    observer.observe(host,{childList:true,subtree:true});
  }
  setInterval(()=>{observeHost();if(periodKey()!==lastPeriodKey)refresh();else if(loaded){const host=q('fdRevByPractice');if(host&&!host.querySelector('.fd-practice-compact'))render()}},1000);


  window.MOLMSPracticeV5={classify,render,refresh,audit:()=>({period:bounds(),loaded,rows:sourceRows})};
})();