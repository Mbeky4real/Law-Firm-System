from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(errors='surrogateescape')
MARK='MOLMS-FINANCE-CANONICAL-V15'
if MARK in s:
    raise SystemExit('Already canonicalized')

# These were incremental overlays. V15 replaces their runtime responsibilities in one block.
obsolete_markers=[
    'MOLMS-FINANCE-30SEC-LABELS-V1',
    'MOLMS-FINANCE-PERIOD-OUTLOOK-V11',
    'MOLMS-FINANCE-KPI-COPY-V12',
    'MOLMS-FINANCE-PERIOD-INTEGRITY-V13',
    'MOLMS-FINANCE-PERIOD-INTEGRITY-V13B',
    'MOLMS-FINANCE-KPI-UNIFORMITY-V14',
]

removed={}
for marker in obsolete_markers:
    total=0
    for tag in ('style','script'):
        pat=rf'\n?<{tag}>\s*/\*\s*{re.escape(marker)}(?:\s+runtime)?\s*\*/.*?</{tag}>\s*'
        s,n=re.subn(pat,'\n',s,flags=re.S|re.I)
        total+=n
    removed[marker]=total

required=['id="page-findash"','id="fdKpiRow"','id="fdManualBody"','function fdGetPeriodDates()']
for x in required:
    assert x in s, f'Missing finance base: {x}'

canonical=r'''
<style>/* MOLMS-FINANCE-CANONICAL-V15 */
#page-findash #fdKpiRow{grid-template-columns:repeat(5,minmax(0,1fr))!important}
#page-findash #fdKpiRow>div:nth-child(1){order:1}
#page-findash #fdKpiRow>div:nth-child(4){order:2}
#page-findash #fdKpiRow>div:nth-child(5){order:3}
#page-findash #fdKpiRow>div:nth-child(2){order:4}
#page-findash #fdKpiRow>div:nth-child(6){order:5}
#page-findash #fdKpiRow>div:nth-child(3){display:none!important}
#page-findash .fdv15-context{margin:10px 24px 7px;padding:9px 12px;border:1px solid var(--border);border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
#page-findash .fdv15-context-title{font-size:12px;font-weight:900;color:var(--navy)}
#page-findash .fdv15-context-sub,#page-findash .fdv15-note{font-size:9px;color:var(--muted);line-height:1.25}
#page-findash .fdv15-position{font-size:10px;font-weight:800;color:var(--muted);white-space:nowrap}
#fdManualBody tr[data-fdv15-outside="1"]{display:none!important}
@media(max-width:980px){#page-findash #fdKpiRow{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
@media(max-width:620px){#page-findash #fdKpiRow{grid-template-columns:1fr!important}#page-findash .fdv15-context{margin-left:12px;margin-right:12px}}
</style>
<script>/* MOLMS-FINANCE-CANONICAL-V15 runtime */
(function(){
 const q=id=>document.getElementById(id);
 const pad=n=>String(n).padStart(2,'0');
 const localDate=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
 const todayLocal=()=>localDate(new Date());
 const parseMonth=v=>{const [y,m]=(v||todayLocal().slice(0,7)).split('-').map(Number);return {y,m};};
 const fmtDate=s=>{if(!s)return '';const d=new Date(s+'T00:00:00');return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});};
 const approved=t=>String(t?.status||(t?.is_approved?'approved':'pending')).toLowerCase()==='approved';
 const money=(c,v)=>`${c||'TZS'} ${Number(v||0).toLocaleString()}`;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

 function periodBounds(){
   const period=q('fdPeriod')?.value||'month', {y,m}=parseMonth(q('fdMonth')?.value);
   let start,end;
   if(period==='month'){start=new Date(y,m-1,1);end=new Date(y,m,0);}
   else if(period==='quarter'){const qi=Math.floor((m-1)/3);start=new Date(y,qi*3,1);end=new Date(y,qi*3+3,0);}
   else if(period==='half'){const hi=m<=6?0:1;start=new Date(y,hi*6,1);end=new Date(y,hi*6+6,0);}
   else if(period==='year'){start=new Date(y,0,1);end=new Date(y,11,31);}
   else {start=new Date(2020,0,1);end=new Date();}
   const today=new Date();today.setHours(0,0,0,0);end.setHours(0,0,0,0);if(end>today)end=today;
   return {start:localDate(start),end:localDate(end),monthStr:`${y}-${pad(m)}`};
 }
 window.fdGetPeriodDates=periodBounds;

 function currentAnchor(period){const n=new Date(),y=n.getFullYear(),m=n.getMonth()+1;if(period==='quarter')return `${y}-${pad(Math.floor((m-1)/3)*3+1)}`;if(period==='half')return `${y}-${m<=6?'01':'07'}`;if(period==='year')return `${y}-01`;return `${y}-${pad(m)}`;}
 function buildOptions(period,preserve){
   const sel=q('fdMonth');if(!sel)return;const prior=preserve||sel.value||currentAnchor(period),{y:py,m:pm}=parseMonth(prior),now=new Date(),cy=now.getFullYear(),cm=now.getMonth()+1;let opts=[];
   if(period==='month'){for(let i=0;i<60;i++){const d=new Date(cy,cm-1-i,1),y=d.getFullYear(),m=d.getMonth()+1;opts.push({v:`${y}-${pad(m)}`,l:d.toLocaleDateString('en-US',{month:'long',year:'numeric'})});}}
   else if(period==='quarter'){for(let y=cy;y>=2020;y--)for(let qi=3;qi>=0;qi--){const sm=qi*3+1;if(y===cy&&sm>cm)continue;opts.push({v:`${y}-${pad(sm)}`,l:`Q${qi+1} ${y}`});}}
   else if(period==='half'){for(let y=cy;y>=2020;y--){if(!(y===cy&&cm<7))opts.push({v:`${y}-07`,l:`H2 ${y} · Jul–Dec`});opts.push({v:`${y}-01`,l:`H1 ${y} · Jan–Jun`});}}
   else if(period==='year'){for(let y=cy;y>=2020;y--)opts.push({v:`${y}-01`,l:String(y)});}
   else opts=[{v:`${cy}-01`,l:'All available records'}];
   let target=period==='month'?`${py}-${pad(pm)}`:period==='quarter'?`${py}-${pad(Math.floor((pm-1)/3)*3+1)}`:period==='half'?`${py}-${pm<=6?'01':'07'}`:period==='year'?`${py}-01`:opts[0].v;
   if(!opts.some(o=>o.v===target))target=currentAnchor(period);
   sel.innerHTML=opts.map(o=>`<option value="${o.v}"${o.v===target?' selected':''}>${o.l}</option>`).join('');sel.disabled=period==='all';
 }
 function setupSelectors(initial=false){
   const per=q('fdPeriod'),month=q('fdMonth');if(!per||!month)return;
   const wanted=[['month','Monthly'],['quarter','Quarterly'],['half','Semi-Annual'],['year','Yearly'],['all','All Time']],cur=per.value||'month';
   per.innerHTML=wanted.map(([v,l])=>`<option value="${v}"${v===cur?' selected':''}>${l}</option>`).join('');
   if(initial&&!per.dataset.fdv15){per.value='month';buildOptions('month',currentAnchor('month'));}else buildOptions(per.value,month.value);
   if(!per.dataset.fdv15){per.dataset.fdv15='1';per.addEventListener('change',()=>{buildOptions(per.value,month.value);if(typeof fdRefresh==='function')fdRefresh();});month.addEventListener('change',()=>{if(typeof fdRefresh==='function')fdRefresh();});}
 }
 window.fdPeriodLabel=function(){const period=q('fdPeriod')?.value||'month',{y,m}=parseMonth(q('fdMonth')?.value),{end}=periodBounds(),live=end===todayLocal();if(period==='month')return new Date(y,m-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'})+(live?' · Month to Date':'');if(period==='quarter')return `Q${Math.floor((m-1)/3)+1} ${y}`+(live?' · Quarter to Date':'');if(period==='half')return `H${m<=6?1:2} ${y}`+(live?' · Half-Year to Date':'');if(period==='year')return `${y}`+(live?' · Year to Date':'');return 'All Time';};

 function context(){const k=q('fdKpiRow');if(!k)return;let c=q('fdV15PeriodContext');if(!c){c=document.createElement('div');c.id='fdV15PeriodContext';c.className='fdv15-context';k.parentNode.insertBefore(c,k);}c.innerHTML=`<div><div class="fdv15-context-title">${fdPeriodLabel()}</div><div class="fdv15-context-sub">Period activity: Revenue · Payments Received · Outstanding Payments · Expenses</div></div><div class="fdv15-position">Financial position as at ${fmtDate(periodBounds().end)}</div>`;}
 function cleanLegacyCardText(card){[...card.querySelectorAll('.fdv11-scope,.fdv12-note,.fdv15-note')].forEach(x=>x.remove());[...card.querySelectorAll('div')].slice(1).forEach(d=>{const t=(d.textContent||'').trim();if(/Opening balance carried forward|Includes opening cash carried forward|Selected period|Month to Date|Quarter to Date|Half-Year to Date|Year to Date/i.test(t)||/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}(?:\s*·.*)?$/i.test(t)||/^As at \d{1,2}\s+[A-Za-z]{3}\s+\d{4}/i.test(t))d.style.display='none';});}
 function renderKpiCopy(){
   const cards=[...document.querySelectorAll('#fdKpiRow>div')];if(cards.length<6)return;
   const titles={0:'REVENUE',1:'EXPENSES',3:'PAYMENTS RECEIVED',4:'OUTSTANDING PAYMENTS',5:'CASH AVAILABLE'},copy={0:'Revenue recorded this period.',1:'Operating expenses this period.',3:'Cash received this period.',4:'Unpaid from this period’s invoices.',5:`Cash available as at ${fmtDate(periodBounds().end)}.`};
   Object.keys(titles).forEach(i=>{const c=cards[Number(i)];if(!c)return;const h=c.firstElementChild;if(h)h.textContent=titles[i];cleanLegacyCardText(c);const n=document.createElement('div');n.className='fdv15-note';n.textContent=copy[i];c.appendChild(n);});
 }
 function receiptsAsOf(i,end){try{return (typeof fdInvoiceCashReceipts==='function'?fdInvoiceCashReceipts(i):[]).filter(r=>String(r.date||'').slice(0,10)<=end)}catch(e){return []}}
 function whtAsOf(i,end){let w=0,m;const re=/\[Payment\s+(\d{4}-\d{2}-\d{2})\].*?WHT\s+([\d,]+(?:\.\d+)?)/gi;while((m=re.exec(String(i.notes||'')))!==null){if(m[1]<=end)w+=Number(m[2].replace(/,/g,''))||0;}if(!w&&String(i.status||'').toLowerCase()==='paid'&&String(i.invoice_date||'').slice(0,10)<=end)w=Number(i.withholding_tax_amount||0);return w;}
 function receivableSourcesAsOf(){const {end}=periodBounds(),out=[],invs=Array.isArray(window._fdAllInvoices)?window._fdAllInvoices:[];invs.forEach(i=>{const dt=String(i.invoice_date||'').slice(0,10),type=String(i.invoice_type||'tax').toLowerCase(),st=String(i.status||'').toLowerCase();if(type!=='tax'||!dt||dt>end||['draft','void','cancelled','superseded'].includes(st))return;const settled=receiptsAsOf(i,end).reduce((a,r)=>a+Number(r.amount||0),0)+whtAsOf(i,end),bal=Math.max(0,Number(i.total_due||0)-settled);if(bal>0)out.push({client:i.client_name||'Unknown Client',currency:i.currency||'TZS',amount:bal});});const manual=Array.isArray(window._fdAllManual)?window._fdAllManual:[];manual.forEach(t=>{const dt=String(t.date||'').slice(0,10);if(!approved(t)||!t.client_receivable||!dt||dt>end)return;const bal=Math.max(0,Number(t.outstanding_amount||0));if(bal>0)out.push({client:t.receivable_client_name||t.counterparty||'Unknown Client',currency:t.currency||'TZS',amount:bal});});return out;}
 function renderReceivables(){const card=q('fdReceivablesCardV1')||q('fdReceivablesCardV2');if(!card)return;const g={};receivableSourcesAsOf().forEach(r=>{const k=r.client+'|'+r.currency;if(!g[k])g[k]={...r,amount:0};g[k].amount+=r.amount;});const rows=Object.values(g).sort((a,b)=>b.amount-a.amount),tot={};rows.forEach(r=>tot[r.currency]=(tot[r.currency]||0)+r.amount);const totals=Object.entries(tot).map(([c,v])=>money(c,v)).join(' · ')||'TZS 0',end=periodBounds().end;card.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:8px"><div><div style="font-size:11px;font-weight:800;color:var(--navy)">TOTAL CLIENT RECEIVABLES</div><div style="font-size:21px;font-weight:900;color:var(--navy);margin-top:2px">${totals}</div><div style="font-size:10px;color:var(--muted);margin-top:2px">Open client balances as at ${fmtDate(end)}</div></div><div style="font-size:9px;color:var(--muted);text-align:right">Historical position</div></div><div>${rows.length?rows.map(r=>`<div style="width:100%;display:flex;justify-content:space-between;gap:12px;align-items:center;border-top:1px solid var(--border);padding:7px 0;color:var(--navy)"><span style="font-size:11px">${esc(r.client)}</span><span style="font-size:11px;font-weight:800">${money(r.currency,r.amount)}</span></div>`).join(''):'<div style="font-size:11px;color:var(--muted);padding:6px 0">No open receivables as at this date.</div>'}</div>`;}
 function filterManual(){const body=q('fdManualBody');if(!body)return;body.querySelectorAll('tr[data-fdv15-empty="1"]').forEach(x=>x.remove());const {start,end}=periodBounds();let visible=0;[...body.querySelectorAll('tr')].forEach(tr=>{const td=[...tr.querySelectorAll('td')];if(!td.length)return;let d='';for(const cell of td.slice(0,3)){const m=(cell.textContent||'').match(/\b\d{4}-\d{2}-\d{2}\b/);if(m){d=m[0];break;}}if(!d){delete tr.dataset.fdv15Outside;return;}const ok=d>=start&&d<=end;tr.dataset.fdv15Outside=ok?'0':'1';if(ok)visible++;});if(!visible){const tr=document.createElement('tr');tr.dataset.fdv15Empty='1';tr.innerHTML='<td colspan="9" style="padding:12px;text-align:center;color:var(--muted)">No manual financial transactions for the selected period.</td>';body.appendChild(tr);}}
 function apply(){setupSelectors(false);context();renderKpiCopy();renderReceivables();filterManual();}
 const baseRefresh=window.fdRefresh;if(typeof baseRefresh==='function')window.fdRefresh=async function(){const r=await baseRefresh.apply(this,arguments);setTimeout(apply,0);return r;};
 const baseKpi=window.fdRenderKpi;if(typeof baseKpi==='function')window.fdRenderKpi=function(){const r=baseKpi.apply(this,arguments);setTimeout(()=>{context();renderKpiCopy();renderReceivables();filterManual();},0);return r;};
 window.addEventListener('load',()=>{setTimeout(()=>{setupSelectors(true);apply();},500);setTimeout(apply,1400);});
 window.fdFinanceAuditV15=function(){const {start,end}=periodBounds();return {version:15,start,end,receivableSources:receivableSourcesAsOf().length,manualVisibleRows:[...document.querySelectorAll('#fdManualBody tr')].filter(tr=>tr.dataset.fdv15Outside!=='1'&&tr.dataset.fdv15Empty!=='1').length};};
})();
</script>
'''
pos=s.lower().rfind('</body>')
assert pos>=0
s=s[:pos]+canonical+s[pos:]
for marker in obsolete_markers:
    assert marker not in s, f'Obsolete runtime marker remains: {marker}'
assert s.count('MOLMS-FINANCE-CANONICAL-V15 runtime')==1
p.write_text(s,errors='surrogateescape')
print('Removed overlay blocks:',removed)
print('Canonical finance dashboard V15 applied')
