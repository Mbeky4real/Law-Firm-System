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

  function card(label,value,total,currency,accent){
    const pct=total?Math.round(value/total*100):0;
    return `<div style="background:#faf8f4;border-radius:10px;padding:10px 12px;margin-bottom:8px"><div style="font-size:10px;font-weight:800;color:${accent}">${esc(label)}</div><div style="font-size:16px;font-weight:900;color:${accent};margin-top:2px">${esc(currency)} ${short(value)}</div><div style="font-size:9px;color:var(--muted);margin-top:2px">Revenue · ${pct}% of ${esc(currency)} total</div></div>`;
  }

  function section(currency,heading){
    const cur=sourceRows.filter(r=>r.currency===currency),total=cur.reduce((s,r)=>s+r.revenue,0);
    const value=p=>cur.filter(r=>r.practice===p).reduce((s,r)=>s+r.revenue,0);
    return `${heading?`<div style="font-size:10px;font-weight:800;color:var(--muted);margin:7px 0 7px">${esc(heading)}</div>`:''}${card('Litigation',value('litigation'),total,currency,'#1d4ed8')}${card('Non-Litigation',value('non_litigation'),total,currency,'#16a34a')}${card('Other / General',value('general'),total,currency,'#64748b')}`;
  }

  function render(){
    const host=q('fdRevByPractice');
    if(!host||!loaded||rendering)return;
    rendering=true;
    try{
      const extras=[...new Set(sourceRows.map(r=>r.currency).filter(c=>c&&c!=='TZS'))].sort();
      host.innerHTML=['TZS',...extras].map((c,i)=>section(c,i?`${c} PRACTICE REVENUE`:'' )).join('');
    }finally{rendering=false}
  }

  async function refresh(){await loadRows();render()}

  window.addEventListener('load',()=>{setTimeout(refresh,700);setTimeout(refresh,1700)});
  setInterval(async()=>{if(periodKey()!==lastPeriodKey)await refresh()},1500);

  window.MOLMSPracticeV5={classify,render,refresh,audit:()=>({period:bounds(),loaded,rows:sourceRows})};
})();