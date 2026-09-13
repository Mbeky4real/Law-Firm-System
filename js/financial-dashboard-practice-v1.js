/* MOLMS Financial Dashboard Practice Classification V1
 * Practice Performance must reconcile to the same recognised revenue population
 * as Financial Dashboard V16. Matter-linked and explicit classifications win;
 * retainers/general fees remain Other / General.
 */
(function financialDashboardPracticeV1(){
  'use strict';

  const q=id=>document.getElementById(id);
  const num=v=>Number(v||0);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date=v=>String(v||'').slice(0,10);
  const approved=t=>String(t?.status||(t?.is_approved?'approved':'pending')).toLowerCase()==='approved';
  const validTax=i=>String(i?.invoice_type||'tax').toLowerCase()==='tax'&&!['draft','void','cancelled','superseded'].includes(String(i?.status||'').toLowerCase());
  const short=n=>{n=num(n);return Math.abs(n)>=1e9?(n/1e9).toFixed(1).replace('.0','')+'B':Math.abs(n)>=1e6?(n/1e6).toFixed(1).replace('.0','')+'M':Math.abs(n)>=1e3?(n/1e3).toFixed(1).replace('.0','')+'K':n.toLocaleString()};

  let invoicePractice=new Map();
  let manualPractice=new Map();
  let loaded=false;
  let loading=false;
  let lastSignature='';

  function bounds(){
    try{return fdGetPeriodDates()}catch(e){const now=new Date(),p=n=>String(n).padStart(2,'0');return {start:`${now.getFullYear()}-${p(now.getMonth()+1)}-01`,end:`${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())}`}}
  }

  function data(){
    let invoices=[],manual=[];
    try{invoices=typeof _fdAllInvoices!=='undefined'&&Array.isArray(_fdAllInvoices)?_fdAllInvoices:[]}catch(e){}
    try{manual=typeof _fdAllManual!=='undefined'&&Array.isArray(_fdAllManual)?_fdAllManual:[]}catch(e){}
    return {invoices,manual};
  }

  async function loadPracticeAreas(){
    if(loading)return;
    loading=true;
    try{
      if(typeof sb==='undefined'||!sb)return;
      const [inv,man]=await Promise.all([
        sb.from('invoices').select('id,practice_area'),
        sb.from('fd_manual_transactions').select('id,practice_area')
      ]);
      if(inv.error)throw inv.error;
      if(man.error)throw man.error;
      invoicePractice=new Map((inv.data||[]).map(r=>[String(r.id),r.practice_area||null]));
      manualPractice=new Map((man.data||[]).map(r=>[String(r.id),r.practice_area||null]));
      loaded=true;
    }catch(e){
      console.warn('[MOLMS practice classification]',e);
    }finally{
      loading=false;
    }
  }

  function explicitPractice(kind,row){
    const local=String(row.practice_area||'').toLowerCase();
    if(local)return local;
    return String((kind==='invoice'?invoicePractice:manualPractice).get(String(row.id))||'').toLowerCase();
  }

  function classify(kind,row){
    const explicit=explicitPractice(kind,row);
    if(['litigation','non_litigation','general'].includes(explicit))return explicit;

    const matter=String(kind==='invoice'?(row.matter_ref||row.matter_title||''):(row.receivable_matter_ref||row.description||'')).toLowerCase();
    if(/(^|\b)lit:|mol\/lit\//.test(matter))return 'litigation';
    if(/(^|\b)nl:|mol\/nlt\//.test(matter))return 'non_litigation';

    if(kind==='invoice'&&(String(row.service_type||'').toLowerCase()==='retainer'||row.retainer_period))return 'general';
    return 'general';
  }

  function periodRows(){
    const {start,end}=bounds(),{invoices,manual}=data(),rows=[];
    invoices.filter(i=>validTax(i)&&date(i.invoice_date)>=start&&date(i.invoice_date)<=end).forEach(i=>{
      rows.push({currency:i.currency||'TZS',revenue:num(i.total_due),practice:classify('invoice',i),client:i.client_name||'Unknown client'});
    });
    manual.filter(t=>approved(t)&&t.tx_type==='revenue'&&date(t.date)>=start&&date(t.date)<=end).forEach(t=>{
      const revenue=t.client_receivable&&num(t.agreed_amount)>0?num(t.agreed_amount):num(t.amount);
      rows.push({currency:t.currency||'TZS',revenue,practice:classify('manual',t),client:t.receivable_client_name||t.counterparty||'Other revenue'});
    });
    return rows;
  }

  function categoryCard(label,value,total,currency,accent){
    const pct=total?Math.round(value/total*100):0;
    return `<div style="background:#faf8f4;border-radius:10px;padding:10px 12px;margin-bottom:8px"><div style="font-size:10px;font-weight:800;color:${accent}">${esc(label)}</div><div style="font-size:16px;font-weight:900;color:${accent};margin-top:2px">${esc(currency)} ${short(value)}</div><div style="font-size:9px;color:var(--muted);margin-top:2px">Revenue · ${pct}% of ${esc(currency)} total</div></div>`;
  }

  function section(currency,rows,heading){
    const cur=rows.filter(r=>r.currency===currency),total=cur.reduce((s,r)=>s+r.revenue,0);
    const value=p=>cur.filter(r=>r.practice===p).reduce((s,r)=>s+r.revenue,0);
    return `${heading?`<div style="font-size:10px;font-weight:800;color:var(--muted);margin:7px 0 7px">${esc(heading)}</div>`:''}
      ${categoryCard('Litigation',value('litigation'),total,currency,'#1d4ed8')}
      ${categoryCard('Non-Litigation',value('non_litigation'),total,currency,'#16a34a')}
      ${categoryCard('Other / General',value('general'),total,currency,'#64748b')}`;
  }

  function render(){
    const host=q('fdRevByPractice');if(!host)return;
    const rows=periodRows(),currencies=['TZS',...new Set(rows.map(r=>r.currency).filter(c=>c!=='TZS'))];
    const signature=JSON.stringify([bounds(),rows.map(r=>[r.currency,r.revenue,r.practice,r.client]),loaded]);
    if(signature===lastSignature&&/Litigation/.test(host.textContent||''))return;
    lastSignature=signature;
    host.innerHTML=currencies.map((c,i)=>section(c,rows,i?`${c} PRACTICE REVENUE`:'' )).join('');
  }

  async function refresh(){await loadPracticeAreas();render();setTimeout(render,80);setTimeout(render,300)}

  window.addEventListener('load',()=>{setTimeout(refresh,700);setTimeout(refresh,1600)});
  setInterval(()=>{if(!loaded&&!loading)loadPracticeAreas().then(render);else render()},700);
  window.MOLMSPracticeV1={classify,periodRows,render,refresh,audit:()=>({period:bounds(),loaded,rows:periodRows()})};
})();