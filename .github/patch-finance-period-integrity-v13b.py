from pathlib import Path
p=Path('index.html'); s=p.read_text(errors='surrogateescape')
MARK='MOLMS-FINANCE-PERIOD-INTEGRITY-V13B'
if MARK in s: raise SystemExit('Already patched')
for x in ['MOLMS-FINANCE-PERIOD-OUTLOOK-V11','MOLMS-FINANCE-KPI-COPY-V12','id="fdManualBody"']:
    assert x in s, x
insert=r'''
<style>/* MOLMS-FINANCE-PERIOD-INTEGRITY-V13B */
#fdManualBody tr[data-fdv13-outside="1"]{display:none!important}
</style>
<script>/* MOLMS-FINANCE-PERIOD-INTEGRITY-V13B runtime */
(function(){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=(c,v)=>`${c||'TZS'} ${Number(v||0).toLocaleString()}`;
 const approved=t=>String(t?.status||(t?.is_approved?'approved':'pending')).toLowerCase()==='approved';
 const bounds=()=>fdGetPeriodDates();
 const inRange=d=>{if(!d)return false;const {start,end}=bounds(),x=String(d).slice(0,10);return x>=start&&x<=end;};
 function receiptsAsOf(i,end){try{return (typeof fdInvoiceCashReceipts==='function'?fdInvoiceCashReceipts(i):[]).filter(r=>String(r.date||'').slice(0,10)<=end)}catch(e){return []}}
 function whtAsOf(i,end){let w=0,m;const re=/\[Payment\s+(\d{4}-\d{2}-\d{2})\].*?WHT\s+([\d,]+(?:\.\d+)?)/gi;while((m=re.exec(String(i.notes||'')))!==null){if(m[1]<=end)w+=Number(m[2].replace(/,/g,''))||0;}if(!w&&String(i.status||'').toLowerCase()==='paid'&&String(i.invoice_date||'').slice(0,10)<=end)w=Number(i.withholding_tax_amount||0);return w;}
 function receivableSourcesAsOf(){
   const {end}=bounds(),out=[];
   const invs=(typeof _fdAllInvoices!=='undefined'&&Array.isArray(_fdAllInvoices))?_fdAllInvoices:[];
   invs.forEach(i=>{const dt=String(i.invoice_date||'').slice(0,10),type=String(i.invoice_type||'tax').toLowerCase(),st=String(i.status||'').toLowerCase();if(type!=='tax'||!dt||dt>end||['draft','void','cancelled','superseded'].includes(st))return;const settled=receiptsAsOf(i,end).reduce((a,r)=>a+Number(r.amount||0),0)+whtAsOf(i,end);const bal=Math.max(0,Number(i.total_due||0)-settled);if(bal>0)out.push({client:i.client_name||'Unknown Client',currency:i.currency||'TZS',amount:bal});});
   const manual=(typeof _fdAllManual!=='undefined'&&Array.isArray(_fdAllManual))?_fdAllManual:[];
   manual.forEach(t=>{const dt=String(t.date||'').slice(0,10);if(!approved(t)||!t.client_receivable||!dt||dt>end)return;const bal=Math.max(0,Number(t.outstanding_amount||0));if(bal>0)out.push({client:t.receivable_client_name||t.counterparty||'Unknown Client',currency:t.currency||'TZS',amount:bal});});
   return out;
 }
 function renderReceivables(){
   const card=document.getElementById('fdReceivablesCardV1')||document.getElementById('fdReceivablesCardV2');if(!card)return;
   const g={};receivableSourcesAsOf().forEach(r=>{const k=r.client+'|'+r.currency;if(!g[k])g[k]={...r,amount:0};g[k].amount+=r.amount;});const rows=Object.values(g).sort((a,b)=>b.amount-a.amount),tot={};rows.forEach(r=>tot[r.currency]=(tot[r.currency]||0)+r.amount);const totals=Object.entries(tot).map(([c,v])=>money(c,v)).join(' · ')||'TZS 0',end=bounds().end;
   card.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:8px"><div><div style="font-size:11px;font-weight:800;color:var(--navy)">TOTAL CLIENT RECEIVABLES</div><div style="font-size:21px;font-weight:900;color:var(--navy);margin-top:2px">${totals}</div><div style="font-size:10px;color:var(--muted);margin-top:2px">Open client balances as at ${end}</div></div><div style="font-size:9px;color:var(--muted);text-align:right">Historical position</div></div><div>${rows.length?rows.map(r=>`<div style="width:100%;display:flex;justify-content:space-between;gap:12px;align-items:center;border-top:1px solid var(--border);padding:7px 0;color:var(--navy)"><span style="font-size:11px">${esc(r.client)}</span><span style="font-size:11px;font-weight:800">${money(r.currency,r.amount)}</span></div>`).join(''):'<div style="font-size:11px;color:var(--muted);padding:6px 0">No open receivables as at this date.</div>'}</div>`;
 }
 function filterManual(){
   const body=document.getElementById('fdManualBody');if(!body)return;body.querySelectorAll('tr[data-fdv13-empty="1"]').forEach(x=>x.remove());
   let visible=0;[...body.querySelectorAll('tr')].forEach(tr=>{const td=[...tr.querySelectorAll('td')];if(!td.length)return;let d='';for(const cell of td.slice(0,3)){const m=(cell.textContent||'').match(/\b\d{4}-\d{2}-\d{2}\b/);if(m){d=m[0];break;}}if(!d){delete tr.dataset.fdv13Outside;return;}const ok=inRange(d);tr.dataset.fdv13Outside=ok?'0':'1';if(ok)visible++;});
   if(!visible){const tr=document.createElement('tr');tr.dataset.fdv13Empty='1';tr.innerHTML='<td colspan="9" style="padding:12px;text-align:center;color:var(--muted)">No manual financial transactions for the selected period.</td>';body.appendChild(tr);}
 }
 function fixKpiCopy(){const notes={'REVENUE':'Revenue recorded this period.','PAYMENTS RECEIVED':'Cash received this period.','OUTSTANDING PAYMENTS':'Unpaid from this period’s invoices.','EXPENSES':'Operating expenses this period.'};[...document.querySelectorAll('#fdKpiRow>div')].forEach(c=>{const h=(c.firstElementChild?.textContent||'').trim().toUpperCase(),n=c.querySelector('.fdv12-note');if(n&&notes[h])n.textContent=notes[h];});}
 function apply(){renderReceivables();filterManual();fixKpiCopy();}
 const baseRefresh=window.fdRefresh;if(typeof baseRefresh==='function')window.fdRefresh=async function(){const r=await baseRefresh.apply(this,arguments);setTimeout(apply,0);return r;};
 const baseKpi=window.fdRenderKpi;if(typeof baseKpi==='function')window.fdRenderKpi=function(){const r=baseKpi.apply(this,arguments);setTimeout(apply,0);return r;};
 window.addEventListener('load',()=>{[700,1400,2600].forEach(t=>setTimeout(apply,t));const p=document.getElementById('fdPeriod'),m=document.getElementById('fdMonth');p?.addEventListener('change',()=>setTimeout(apply,80));m?.addEventListener('change',()=>setTimeout(apply,80));});
 window.fdPeriodIntegrityAuditV13=function(){const {start,end}=bounds();return {start,end,receivableSources:receivableSourcesAsOf().length,manualVisibleRows:[...document.querySelectorAll('#fdManualBody tr')].filter(tr=>tr.dataset.fdv13Outside!=='1'&&tr.dataset.fdv13Empty!=='1').length};};
})();
</script>
'''
pos=s.lower().rfind('</body>'); assert pos>=0
s=s[:pos]+insert+s[pos:]
p.write_text(s,errors='surrogateescape')
print('V13B historical period integrity applied')
