/* MOLMS Financial Dashboard V16
 * One financial interpretation for recognised revenue, cash collections and
 * receivables. Proformas remain pipeline. Currencies are never combined.
 */
(function financialDashboardV16(){
  'use strict';

  const q=id=>document.getElementById(id);
  const num=v=>Number(v||0);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const date=v=>String(v||'').slice(0,10);
  const add=(o,c,v)=>{c=c||'TZS';o[c]=(o[c]||0)+num(v);return o;};
  const approved=t=>String(t?.status||(t?.is_approved?'approved':'pending')).toLowerCase()==='approved';
  const money=(c,v)=>`${c||'TZS'} ${num(v).toLocaleString()}`;
  const short=n=>{n=num(n);return Math.abs(n)>=1e9?(n/1e9).toFixed(1).replace('.0','')+'B':Math.abs(n)>=1e6?(n/1e6).toFixed(1).replace('.0','')+'M':Math.abs(n)>=1e3?(n/1e3).toFixed(1).replace('.0','')+'K':n.toLocaleString()};
  const moneyLines=(byCur,compact=true)=>{
    const ordered=['TZS',...Object.keys(byCur||{}).filter(c=>c!=='TZS').sort()];
    return [...new Set(ordered)].filter(c=>c==='TZS'||num(byCur[c])!==0).map(c=>({currency:c,value:num(byCur[c]),text:`${c} ${compact?short(byCur[c]):num(byCur[c]).toLocaleString()}`}));
  };

  let paymentRows=[];
  let expenseRegisterRows=[];
  let authoritativePayrollRuns=[];
  let paymentLedgerLoadError=false;
  let rendering=false;

  function data(){
    let invoices=[],manual=[],entries=[],payroll=[],office=[],historical=[];
    try{invoices=typeof _fdAllInvoices!=='undefined'&&Array.isArray(_fdAllInvoices)?_fdAllInvoices:[]}catch(e){}
    try{manual=typeof _fdAllManual!=='undefined'&&Array.isArray(_fdAllManual)?_fdAllManual:[]}catch(e){}
    try{entries=typeof _fdAllEntries!=='undefined'&&Array.isArray(_fdAllEntries)?_fdAllEntries:[]}catch(e){}
    try{payroll=typeof _fdAllPayroll!=='undefined'&&Array.isArray(_fdAllPayroll)?_fdAllPayroll:[]}catch(e){}
    try{office=typeof _fdAllOfficeExpenses!=='undefined'&&Array.isArray(_fdAllOfficeExpenses)?_fdAllOfficeExpenses:[]}catch(e){}
    try{historical=typeof _fdAllHistPayroll!=='undefined'&&Array.isArray(_fdAllHistPayroll)?_fdAllHistPayroll:[]}catch(e){}
    return {invoices,manual,entries,payroll,office,historical};
  }

  function bounds(){
    try{return fdGetPeriodDates()}catch(e){const now=new Date(),p=n=>String(n).padStart(2,'0');return {start:`${now.getFullYear()}-${p(now.getMonth()+1)}-01`,end:`${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())}`}}
  }

  function validTax(i){
    const st=String(i.status||'').toLowerCase();
    return String(i.invoice_type||'tax').toLowerCase()==='tax'&&!['draft','void','cancelled','superseded'].includes(st);
  }

  // Payment dates and amounts come only from Invoice Module ledger rows.
  // Notes and updated_at are not payment evidence and must never be used as fallback.
  function receipts(i){
    return paymentRows.filter(p=>p.invoice_id===i.id).map(p=>({
      date:date(p.payment_date),cash:num(p.cash_amount),wht:num(p.withholding_tax_amount),
      estimated:p.payment_date_is_estimated===true,
      origin:String(p.entry_origin||'')
    }));
  }

  function paymentIntegrity(i){
    const rows=receipts(i),cash=rows.reduce((s,r)=>s+r.cash,0),wht=rows.reduce((s,r)=>s+r.wht,0);
    const storedCash=Math.max(0,num(i.amount_paid)),storedWht=Math.max(0,num(i.withholding_tax_amount));
    return {
      missing:!rows.length&&(storedCash>.01||storedWht>.01),
      mismatch:Math.abs(cash-storedCash)>.01||Math.abs(wht-storedWht)>.01,
      estimated:rows.some(r=>r.estimated),
      ledgerRows:rows.length,
      cash,wht,
      needsReconciliation:(!rows.length&&(storedCash>.01||storedWht>.01))||
        Math.abs(cash-storedCash)>.01||Math.abs(wht-storedWht)>.01||rows.some(r=>r.estimated)
    };
  }

  function invoicePaidAsOf(i,end){
    return receipts(i).filter(r=>!r.estimated&&r.date&&r.date<=end).reduce((s,r)=>s+r.cash+r.wht,0);
  }

  // Period receivables are balances, not cash-flow evidence. Include recorded
  // settlements dated on/before period end even if the date is estimated;
  // the reconciliation warning remains visible and cash-flow cards still
  // exclude estimated-date rows until their dates are verified.
  function invoiceSettledAsOf(i,end){
    return receipts(i).filter(r=>r.date&&r.date<=end).reduce((s,r)=>s+r.cash+r.wht,0);
  }

  // Current open balances use the recorded settlement amount even when its
  // date is estimated; the date remains flagged and is excluded from period flows.
  function invoicePaidTotal(i){
    return receipts(i).reduce((s,r)=>s+r.cash+r.wht,0);
  }

  function periodClientRows(){
    const {start,end}=bounds(),{invoices,manual}=data(),rows=[];
    invoices.filter(i=>validTax(i)&&date(i.invoice_date)>=start&&date(i.invoice_date)<=end).forEach(i=>{
      const revenue=num(i.total_due),paid=invoiceSettledAsOf(i,end),outstanding=Math.max(0,revenue-paid);
      rows.push({kind:'invoice',id:i.id,client:i.client_name||'Unknown client',matter:i.matter_ref||i.matter_title||'General / Unlinked',source:i.invoice_number||'—',currency:i.currency||'TZS',revenue,paid,outstanding,status:paymentIntegrity(i).needsReconciliation?'Needs Reconciliation':outstanding<=.01?'Paid':paid>0?'Part Paid':'Unpaid'});
    });
    manual.filter(t=>approved(t)&&t.tx_type==='revenue'&&date(t.date)>=start&&date(t.date)<=end).forEach(t=>{
      const paid=num(t.amount),revenue=t.client_receivable&&num(t.agreed_amount)>0?num(t.agreed_amount):paid;
      const outstanding=t.client_receivable?Math.max(0,num(t.outstanding_amount)||revenue-paid):0;
      rows.push({kind:'manual',id:t.id,client:t.receivable_client_name||t.counterparty||'Other revenue',matter:t.receivable_matter_ref||t.description||'General / Unlinked',source:t.reference||'Manual revenue',currency:t.currency||'TZS',revenue,paid,outstanding,status:outstanding<=.01?'Paid':paid>0?'Part Paid':'Unpaid'});
    });
    return rows.sort((a,b)=>b.revenue-a.revenue);
  }

  function localToday(){
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  // Receivables are a live balance, not a period-flow metric. Always reconcile
  // against payments recorded through today, even when the dashboard is set to
  // a prior reporting period. Issued proformas are shown here as open client
  // commitments, but remain excluded from recognised revenue and period KPIs.
  function allReceivables(){
    const end=localToday(),{invoices,manual}=data(),rows=[];
    invoices.filter(i=>{
      const type=String(i.invoice_type||'tax').toLowerCase(),status=String(i.status||'').toLowerCase();
      const activeTax=validTax(i);
      const issuedProforma=type==='proforma'&&status==='issued';
      return (activeTax||issuedProforma)&&date(i.invoice_date)<=end;
    }).forEach(i=>{
      const total=num(i.total_due),paid=invoicePaidTotal(i),outstanding=Math.max(0,total-paid);
      if(outstanding>.01)rows.push({kind:'invoice',id:i.id,client:i.client_name||'Unknown client',matter:i.matter_ref||i.matter_title||'General / Unlinked',source:i.invoice_number||'—',currency:i.currency||'TZS',revenue:total,paid,outstanding,status:String(i.invoice_type||'').toLowerCase()==='proforma'?'Proforma Outstanding':paymentIntegrity(i).needsReconciliation?'Needs Reconciliation':paid>0?'Part Paid':'Unpaid'});
    });
    manual.filter(t=>approved(t)&&t.client_receivable&&date(t.date)<=end).forEach(t=>{
      const outstanding=Math.max(0,num(t.outstanding_amount));if(outstanding<=.01)return;
      rows.push({kind:'manual',id:t.id,client:t.receivable_client_name||t.counterparty||'Unknown client',matter:t.receivable_matter_ref||t.description||'General / Unlinked',source:t.reference||'—',currency:t.currency||'TZS',revenue:num(t.agreed_amount||t.amount),paid:num(t.amount),outstanding,status:'Part Paid'});
    });
    return rows.sort((a,b)=>b.outstanding-a.outstanding);
  }

  function totals(rows,key){const out={TZS:0};rows.forEach(r=>add(out,r.currency,r[key]));return out}

  // Cash collections use verified, non-estimated invoice cash rows plus
  // approved manual client receipts. WHT is settlement, not cash. To reduce
  // duplicate counting, a manual receipt is skipped when an invoice ledger row
  // already records the same currency, date and amount.
  function periodCollections(){
    const {start,end}=bounds(),{invoices,manual}=data(),out={TZS:0},ledgerEvents=[];
    invoices.filter(validTax).forEach(i=>{
      receipts(i).filter(r=>!r.estimated&&r.date>=start&&r.date<=end).forEach(r=>{
        add(out,i.currency,r.cash);
        if(r.cash>0)ledgerEvents.push({date:r.date,currency:i.currency||'TZS',amount:r.cash,client:String(i.client_name||'').trim().toLowerCase()});
      });
    });
    manual.filter(t=>approved(t)&&String(t.tx_type||'').toLowerCase()==='revenue'&&date(t.date)>=start&&date(t.date)<=end&&String(t.status||'').toLowerCase()!=='cancelled')
      .forEach(t=>{
        const cur=t.currency||'TZS',amount=num(t.amount),d=date(t.date);
        const client=String(t.receivable_client_name||t.counterparty||'').trim().toLowerCase();
        const duplicate=ledgerEvents.some(e=>e.date===d&&e.currency===cur&&Math.abs(e.amount-amount)<.01&&(!client||!e.client||e.client===client));
        if(!duplicate)add(out,cur,amount);
      });
    return out;
  }

  function periodWithholdingTax(){
    const {start,end}=bounds(),{invoices}=data(),out={TZS:0};
    invoices.filter(validTax).forEach(i=>{
      receipts(i).filter(r=>!r.estimated&&r.date>=start&&r.date<=end).forEach(r=>add(out,i.currency,r.wht));
    });
    return out;
  }

  // Reconciliation status is scoped to the selected reporting period.
  // Include invoices issued in-period and invoices with payment-ledger activity
  // in-period; unrelated historic discrepancies must not contaminate this period.
  function reconciliationIssues(){
    const {start,end}=bounds(),{invoices}=data();
    return invoices.filter(i=>{
      if(!validTax(i))return false;
      const issuedInPeriod=date(i.invoice_date)>=start&&date(i.invoice_date)<=end;
      const paidInPeriod=receipts(i).some(r=>r.date&&r.date>=start&&r.date<=end);
      return issuedInPeriod||paidInPeriod;
    }).map(i=>({invoice:i,integrity:paymentIntegrity(i)}))
      .filter(x=>x.integrity.needsReconciliation);
  }

  // Authoritative expense policy: ONLY approved Manual Financial Transactions
  // classified as expenditure or drawing feed the Expenses KPI and reduce
  // dashboard cash. Payroll and the separate Expenses Module are operational
  // source records; they never post automatically to dashboard expenses/cash.
  // If a payment is intended to affect the dashboard, it must be manually
  // recorded once in Manual Financial Transactions.
  function periodExpenseBreakdown(){
    const {start,end}=bounds(),{manual}=data();
    const out={manual:{TZS:0},otherExpenditure:{TZS:0},drawings:{TZS:0},register:{TZS:0},payroll:{TZS:0}};
    manual.filter(t=>approved(t)&&date(t.date)>=start&&date(t.date)<=end&&String(t.status||'').toLowerCase()!=='cancelled'&&['expenditure','drawing'].includes(String(t.tx_type||'').toLowerCase()))
      .forEach(t=>{
        add(out.manual,t.currency,t.amount);
        add(String(t.tx_type).toLowerCase()==='drawing'?out.drawings:out.otherExpenditure,t.currency,t.amount);
      });
    // Kept as zero-valued compatibility buckets for existing detail consumers.
    // No expense-register or payroll source is read into this calculation.
    return out;
  }
  function periodExpenses(){
    const manual=periodExpenseBreakdown().manual;
    return {...manual};
  }

  function cashPosition(){
    const {start,end}=bounds(),{manual}=data();
    const previous=new Date(start+'T00:00:00');previous.setDate(previous.getDate()-1);
    const prior=previous.getFullYear()+'-'+String(previous.getMonth()+1).padStart(2,'0')+'-'+String(previous.getDate()).padStart(2,'0');
    const through=limit=>{
      const totals={TZS:0};
      data().invoices.filter(validTax).forEach(i=>receipts(i).filter(r=>!r.estimated&&r.date&&r.date<=limit).forEach(r=>add(totals,i.currency,r.cash)));
      manual.filter(t=>approved(t)&&date(t.date)&&date(t.date)<=limit&&String(t.status||'').toLowerCase()!=='cancelled').forEach(t=>{
        const type=String(t.tx_type||'').toLowerCase();
        if(type==='revenue'&&!t.client_receivable)add(totals,t.currency,t.amount);
        if(type==='loan')add(totals,t.currency,t.amount);
        if(type==='expenditure'||type==='drawing')add(totals,t.currency,-num(t.amount));
      });
      return totals;
    };
    return {openingByCur:through(prior),closingByCur:through(end),start,end,openingBalanceConfigured:false};
  }

  // Cash Available = selected-period cash collections + approved manual cash
  // inflows (where applicable) - approved manual expenditure and drawings.
  // Payroll and Expenses Module entries are deliberately excluded.
  function periodCashAvailable(collected,expenses){
    const out={TZS:0};
    const currencies=new Set([...Object.keys(collected||{}),...Object.keys(expenses||{}),'TZS']);
    currencies.forEach(c=>out[c]=num(collected?.[c])-num(expenses?.[c]));
    return out;
  }

  function metrics(){
    const rows=periodClientRows(),revenue=totals(rows,'revenue'),collected=periodCollections(),newReceivables=totals(rows,'outstanding'),expenses=periodExpenses(),cash=cashPosition(),cashAvailable=periodCashAvailable(collected,expenses);
    return {rows,revenue,collected,newReceivables,expenses,cash,cashAvailable,totalReceivables:totals(allReceivables(),'outstanding')};
  }

  function card(title,values,color,note,detailTarget){
    return `<div role="button" tabindex="0" data-finance-detail="${esc(detailTarget)}" aria-expanded="false" aria-label="View ${esc(title.toLowerCase())} breakdown" onclick="window.MOLMSFinanceV16&&window.MOLMSFinanceV16.showDetails('${esc(detailTarget)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}" style="display:block!important;visibility:visible!important;min-width:0;background:#fff;border:1px solid #e4e7ec;border-radius:12px;padding:16px;box-shadow:0 2px 8px rgba(16,24,40,.05);box-sizing:border-box;cursor:pointer"><div style="font-size:11px;font-weight:800;color:#667085;margin-bottom:5px;letter-spacing:.25px">${esc(title)}</div>${moneyLines(values).map((l,i)=>`<div style="font-size:${i?'13px':'25px'};font-weight:900;line-height:1.25;color:${color}">${esc(l.text)}</div>`).join('')}<div style="font-size:11px;color:#667085;margin-top:6px;line-height:1.4">${esc(note)}</div><div style="font-size:11px;font-weight:750;color:#1d4ed8;margin-top:9px">View breakdown ↗</div></div>`;
  }
  function detailRows(title,items){
    return `<section style="min-width:0"><h4 style="margin:0 0 8px;font-size:12px;color:#475467;text-transform:uppercase;letter-spacing:.45px">${esc(title)}</h4><div style="border:1px solid #eaecf0;border-radius:10px;overflow:hidden">${items.map((item,i)=>`<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:10px 12px;background:${i%2?'#fff':'#f9fafb'};border-bottom:${i===items.length-1?'0':'1px solid #eaecf0'}"><span style="font-size:12px;color:#475467;line-height:1.45">${esc(item.label)}</span><span style="font-size:12px;font-weight:750;color:#101828;text-align:right">${moneyLines(item.value||{TZS:0}).map(x=>esc(x.text)).join('<br>')}</span></div>`).join('')}</div></section>`;
  }
  function negateTotals(values){const out={};Object.keys(values||{}).forEach(k=>out[k]=-num(values[k]));return out}
  function showDetails(which){
    const host=q('fdKpiRow');if(!host)return;
    let panel=q('fdKpiDetailsPanel');
    if(panel&&panel.dataset.kind===which){panel.remove();host.querySelectorAll('[data-finance-detail]').forEach(el=>el.setAttribute('aria-expanded','false'));return}
    if(!panel){panel=document.createElement('div');panel.id='fdKpiDetailsPanel';host.appendChild(panel)}
    const m=metrics(),rows=periodClientRows(),invoiceRevenue=totals(rows.filter(r=>r.kind==='invoice'),'revenue'),manualRevenue=totals(rows.filter(r=>r.kind==='manual'),'revenue'),collected=periodCollections(),parts=periodExpenseBreakdown();
    const periodReceivables=totals(rows,'outstanding'),currentReceivables=totals(allReceivables(),'outstanding');
    let content='';
    if(which==='revenue')content=detailRows('Revenue breakdown',[
      {label:'Tax invoices issued in selected period',value:invoiceRevenue},{label:'Approved manual / other revenue',value:manualRevenue},{label:'TOTAL REVENUE',value:m.revenue}
    ])+detailRows('Cash and outstanding balances',[
      {label:'Cash recorded in selected period',value:collected},{label:'Outstanding on selected-period revenue',value:periodReceivables},{label:'Current total client receivables',value:currentReceivables}
    ]);
    else if(which==='expenses')content=detailRows('Expense calculation',[
      {label:'Approved manual Other Expenditure',value:parts.otherExpenditure},{label:'Approved manual Partner Drawings',value:parts.drawings},{label:'TOTAL EXPENSES — MANUAL TRANSACTIONS ONLY',value:m.expenses}
    ]);
    else content=detailRows('Cash available calculation',[
      {label:'Cash received from invoice payment ledger',value:collected},{label:'Less: approved manual Other Expenditure',value:negateTotals(parts.otherExpenditure)},{label:'Less: approved manual Partner Drawings',value:negateTotals(parts.drawings)},{label:'CASH AVAILABLE',value:m.cashAvailable}
    ]);
    panel.dataset.kind=which;
    panel.style.cssText='grid-column:1/-1;min-width:0;width:100%;box-sizing:border-box;padding:14px;background:#fff;border:1px solid #d0d5dd;border-radius:12px;box-shadow:0 4px 14px rgba(16,24,40,.06);margin-top:2px';
    panel.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px"><div><div style="font-size:14px;font-weight:800;color:#101828">${which==='revenue'?'Revenue details':which==='expenses'?'Expense details':'Cash available details'}</div><div style="font-size:11px;color:#667085;margin-top:3px">${esc(typeof fdPeriodLabel==='function'?fdPeriodLabel():'Selected period')} · figures grouped by currency</div></div><button type="button" data-close-finance-details style="border:1px solid #d0d5dd;background:#fff;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700;color:#344054;cursor:pointer">Close ×</button></div><div class="fd-detail-grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">${content}</div><div style="font-size:10px;color:#667085;margin-top:10px">Figures use the selected-period financial rules. Currency totals remain separate; expense components follow the dashboard duplicate-suppression rules.</div><style>@media(max-width:650px){#fdKpiDetailsPanel .fd-detail-grid{grid-template-columns:1fr!important}}</style>`;
    host.querySelectorAll('[data-finance-detail]').forEach(el=>el.setAttribute('aria-expanded',String(el.dataset.financeDetail===which)));
    panel.querySelector('[data-close-finance-details]').onclick=()=>{panel.remove();host.querySelectorAll('[data-finance-detail]').forEach(el=>el.setAttribute('aria-expanded','false'))};
    panel.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function renderKpis(){
    const host=q('fdKpiRow');if(!host)return;
    const m=metrics(),label=typeof fdPeriodLabel==='function'?fdPeriodLabel():'Selected period';
    const styleId='molms-financial-kpi-layout-v3';
    if(!document.getElementById(styleId)){const style=document.createElement('style');style.id=styleId;style.textContent='#page-findash #fdKpiRow{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:12px!important;align-items:stretch!important;padding:14px 20px!important;box-sizing:border-box!important}#page-findash #fdKpiRow>*{display:block!important;visibility:visible!important;min-width:0!important;width:auto!important;max-width:none!important;margin:0!important;box-sizing:border-box!important}@media(max-width:1050px){#page-findash #fdKpiRow{grid-template-columns:repeat(2,minmax(0,1fr))!important}}@media(max-width:560px){#page-findash #fdKpiRow{grid-template-columns:1fr!important}}';document.head.appendChild(style)}
    host.innerHTML=[
      card('TOTAL REVENUE',m.revenue,'#16803d',`Agreed and invoiced fees · ${label}`,'revenue'),
      card('TOTAL EXPENSES',m.expenses,'#b42318',`Recorded expenses · ${label}`,'expenses'),
      card('CASH AVAILABLE',m.cashAvailable||{TZS:0},num(m.cashAvailable?.TZS)>=0?'#167244':'#b42318',`Cash recorded less expenses · ${label}`,'cash')
    ].join('');
    // Reassert the approved order after each render, regardless of stale DOM order.
    const order=['TOTAL REVENUE','TOTAL EXPENSES','CASH AVAILABLE'];
    const cards=Array.from(host.children);
    cards.sort((a,b)=>{
      const labelOf=el=>String(el.textContent||'').toUpperCase();
      const rank=el=>{const t=labelOf(el);return order.findIndex(label=>t.includes(label))};
      return rank(a)-rank(b);
    }).forEach(el=>host.appendChild(el));
  }

  function renderReceivables(){
    const host=q('fdReceivablesCardV1')||q('fdReceivablesCardV2');if(!host)return;const rows=allReceivables(),tot=totals(rows,'outstanding');
    host.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:7px"><div><div style="font-size:11px;font-weight:800;color:var(--navy)">TOTAL CLIENT RECEIVABLES</div>${moneyLines(tot,false).map((l,i)=>`<div style="font-size:${i?'13px':'21px'};font-weight:900;color:#b45309;margin-top:2px">${esc(l.text)}</div>`).join('')}<div style="font-size:10px;color:var(--muted);margin-top:2px">All open recognised balances as at ${esc(localToday())}</div></div><div style="font-size:9px;color:var(--muted);text-align:right">${rows.length} source${rows.length===1?'':'s'} · live position</div></div><div>${rows.map(r=>`<button data-v16-kind="${r.kind}" data-v16-id="${esc(r.id)}" style="width:100%;display:grid;grid-template-columns:minmax(110px,1fr) repeat(3,minmax(95px,.6fr));gap:9px;align-items:center;border:0;border-top:1px solid var(--border);padding:7px 2px;background:transparent;text-align:left;cursor:pointer;color:var(--navy)"><span style="font-size:11px;font-weight:800">${esc(r.client)}<small style="display:block;color:var(--muted);font-weight:400">${esc(r.source)}</small></span><span style="font-size:10px;text-align:right">Agreed<br><b>${money(r.currency,r.revenue)}</b></span><span style="font-size:10px;text-align:right;color:#16803c">Paid<br><b>${money(r.currency,r.paid)}</b></span><span style="font-size:10px;text-align:right;color:#b42318">Outstanding<br><b>${money(r.currency,r.outstanding)}</b></span></button>`).join('')||'<div style="font-size:11px;color:var(--muted);padding:7px 0">No open receivables as at this date.</div>'}</div>`;
    host.onclick=e=>{const b=e.target.closest('[data-v16-kind]');if(b&&typeof fdOpenReceivableSourceV2==='function')fdOpenReceivableSourceV2(b.dataset.v16Kind,b.dataset.v16Id)};
  }

  function renderRevenueAnalytics(){
    const rows=periodClientRows(),tax=rows.filter(r=>r.kind==='invoice'),manual=rows.filter(r=>r.kind==='manual'),tzs=rows.filter(r=>r.currency==='TZS'),tzsTotal=tzs.reduce((s,r)=>s+r.revenue,0);
    const bar=(name,value)=>`<div><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px"><span>${esc(name)}</span><b>TZS ${short(value)} <small style="color:var(--muted);font-weight:400">(${tzsTotal?Math.round(value/tzsTotal*100):0}%)</small></b></div><div style="height:4px;background:#e5e7eb;border-radius:8px"><div style="height:100%;width:${tzsTotal?Math.round(value/tzsTotal*100):0}%;background:#1e40af;border-radius:8px"></div></div></div>`;
    const type=q('fdRevByType');if(type){const taxV=tax.filter(r=>r.currency==='TZS').reduce((s,r)=>s+r.revenue,0),manualV=manual.filter(r=>r.currency==='TZS').reduce((s,r)=>s+r.revenue,0),usd=rows.filter(r=>r.currency==='USD').reduce((s,r)=>s+r.revenue,0);type.innerHTML=bar('Tax Invoice',taxV)+bar('Agreed Client Fees',manualV)+(usd?`<div style="border-top:1px dashed var(--border);padding-top:6px">USD revenue shown separately <b style="float:right">USD ${usd.toLocaleString()}</b></div>`:'')}
    const clients=q('fdRevByClient');if(clients){const grouped={};tzs.forEach(r=>grouped[r.client]=(grouped[r.client]||0)+r.revenue);clients.innerHTML=Object.entries(grouped).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n,v],i)=>`<div style="display:flex;gap:6px"><b style="color:var(--muted)">${i+1}.</b><span style="flex:1">${esc(n)}</span><b style="color:#16803c">TZS ${short(v)}</b></div>`).join('')}
    const practice=q('fdRevByPractice');if(practice){
      const areas=[
        {key:'litigation',label:'Litigation',color:'#1d4ed8'},
        {key:'nonlitigation',label:'Non-Litigation',color:'#16803c'},
        {key:'general',label:'Other / General',color:'#64748b'}
      ];
      const classifyPractice=r=>{
        const matter=String(r.matter||r.matter_ref||r.matter_title||'').toUpperCase();
        if(/^LIT:|MOL\\/LIT\\//.test(matter))return 'litigation';
        if(/^NL:|MOL\\/NLT\\//.test(matter))return 'nonlitigation';
        return 'general';
      };
      const all=rows;
      const totalBy=(key,currency)=>all.filter(r=>classifyPractice(r)===key&&String(r.currency||'TZS').toUpperCase()===currency).reduce((s,r)=>s+num(r.revenue),0);
      practice.style.setProperty('display','grid','important');
      practice.style.setProperty('grid-template-columns','repeat(3,minmax(0,1fr))','important');
      practice.style.setProperty('gap','10px','important');
      practice.style.setProperty('width','100%','important');
      practice.style.setProperty('min-width','0','important');
      practice.innerHTML=areas.map(a=>{
        const tz=totalBy(a.key,'TZS'),usd=totalBy(a.key,'USD');
        return '<div class="fd-practice-mini-card" style="min-width:0;box-sizing:border-box;border:1px solid #e4ddd2;border-radius:10px;background:#faf9f6;padding:12px 14px;display:flex;flex-direction:column;gap:9px">'+
          '<div style="font-size:12px;font-weight:800;color:'+a.color+'">'+esc(a.label)+'</div>'+
          '<div><div style="font-size:9px;color:var(--muted);margin-bottom:2px">TZS REVENUE</div><div style="font-size:19px;line-height:1.2;font-weight:800;color:#172f69;overflow-wrap:anywhere">TZS '+esc(tz.toLocaleString())+'</div></div>'+
          '<div style="border-top:1px solid #e4ddd2;padding-top:7px"><div style="font-size:9px;color:var(--muted);margin-bottom:2px">USD REVENUE</div><div style="font-size:15px;line-height:1.2;font-weight:800;color:#172f69;overflow-wrap:anywhere">USD '+esc(usd.toLocaleString())+'</div></div>'+
        '</div>';
      }).join('');
    }
    const partner=q('fdRevByPartner');if(partner)partner.innerHTML='<div style="font-size:11px;color:var(--muted)">Partner attribution is shown only where the source is linked to a matter. Unlinked fees are not guessed.</div>';
  }

  function renderCollectionHealth(){
    const host=q('fdClientMatterRevenueV2');if(!host)return;const rows=periodClientRows(),rev=totals(rows,'revenue'),paid=totals(rows,'paid'),due=totals(rows,'outstanding'),ratio=num(rev.TZS)?Math.round(num(paid.TZS)/num(rev.TZS)*100):0;
    const open=rows.filter(r=>r.outstanding>.01),clients=new Set(open.map(r=>`${r.client}|${r.currency}`)).size;
    host.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><div style="font-size:12px;font-weight:900;color:var(--navy)">COLLECTION HEALTH</div><div style="font-size:9px;color:var(--muted);margin-top:2px">How effectively recognised fees are being collected</div></div><div style="font-size:24px;font-weight:900;color:${ratio>=80?'#16803c':ratio>=60?'#b45309':'#b42318'}">${ratio}%</div></div><div style="height:7px;background:#e5e7eb;border-radius:8px;margin:10px 0"><div style="height:100%;width:${ratio}%;background:${ratio>=80?'#16803c':ratio>=60?'#d97706':'#b42318'};border-radius:8px"></div></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:10px;margin-bottom:8px"><div>Recognised<br><b>${money('TZS',rev.TZS)}</b></div><div>Collected<br><b style="color:#16803c">${money('TZS',paid.TZS)}</b></div><div>Outstanding<br><b style="color:#b42318">${money('TZS',due.TZS)}</b></div></div><div style="font-size:9px;color:var(--muted);margin-bottom:5px">${clients} client${clients===1?'':'s'} with open selected-period balances${num(due.USD)?` · USD ${num(due.USD).toLocaleString()} also outstanding`:''}</div>${open.map(r=>`<button data-v16-kind="${r.kind}" data-v16-id="${esc(r.id)}" style="width:100%;display:grid;grid-template-columns:1fr repeat(3,minmax(74px,.55fr));gap:7px;border:0;border-top:1px solid var(--border);background:transparent;padding:7px 0;text-align:left;cursor:pointer;font-size:10px"><b>${esc(r.client)}</b><span style="text-align:right">Agreed<br><b>${money(r.currency,r.revenue)}</b></span><span style="text-align:right;color:#16803c">Paid<br><b>${money(r.currency,r.paid)}</b></span><span style="text-align:right;color:#b42318">Due<br><b>${money(r.currency,r.outstanding)}</b></span></button>`).join('')}`;
    host.onclick=e=>{const b=e.target.closest('[data-v16-kind]');if(b&&typeof fdOpenReceivableSourceV2==='function')fdOpenReceivableSourceV2(b.dataset.v16Kind,b.dataset.v16Id)};
  }

  function renderAttention(){
    const host=q('fdAlerts');if(!host)return;const {invoices}=data(),{start,end}=bounds(),rows=[];
    invoices.filter(i=>date(i.invoice_date)>=start&&date(i.invoice_date)<=end).forEach(i=>{const type=String(i.invoice_type||'').toLowerCase(),st=String(i.status||'').toLowerCase();if(type==='proforma'&&st==='issued')rows.push({client:i.client_name,amount:num(i.total_due),currency:i.currency||'TZS',label:'Proforma awaiting agreement'});else if(validTax(i)){const due=Math.max(0,num(i.total_due)-invoicePaidAsOf(i,end));if(due>.01)rows.push({client:i.client_name,amount:due,currency:i.currency||'TZS',label:'Collection required'})}});
    periodClientRows().filter(r=>r.kind==='manual'&&r.outstanding>.01).forEach(r=>rows.push({client:r.client,amount:r.outstanding,currency:r.currency,label:'Part payment outstanding'}));
    host.innerHTML=`<div style="font-size:11px;font-weight:800;color:${rows.length?'#b45309':'#16803c'}">${rows.length} item${rows.length===1?'':'s'} require follow-up</div>${rows.slice(0,4).map(r=>`<div style="display:flex;justify-content:space-between;gap:8px;border-top:1px solid var(--border);padding-top:6px"><span style="font-size:10px"><b>${esc(r.client||'Unknown client')}</b><br><small style="color:var(--muted)">${esc(r.label)}</small></span><b style="font-size:10px;color:#b42318">${money(r.currency,r.amount)}</b></div>`).join('')}<div style="font-size:9px;color:var(--muted);margin-top:5px">Open “View All” for totals, payments, balances and source records.</div>`;
  }

  function vatRecognitionDate(i){
    const firstReceipt=receipts(i)
      .filter(r=>num(r.cash)+num(r.wht)>0&&r.date)
      .map(r=>r.date)
      .sort()[0];
    return firstReceipt||date(i.invoice_date);
  }

  function vatPosition(){
    const {start,end}=bounds(),{invoices}=data(),payable={TZS:0},pipeline={TZS:0};
    let taxInvoiceCount=0,proformaCount=0;
    invoices.forEach(i=>{
      const amount=Math.max(0,num(i.vat_amount)),type=String(i.invoice_type||'').toLowerCase(),status=String(i.status||'').toLowerCase();
      if(type==='tax'&&!['draft','void','cancelled','superseded'].includes(status)){
        const recognitionDate=vatRecognitionDate(i);
        if(amount>0&&recognitionDate>=start&&recognitionDate<=end){
          add(payable,i.currency,amount);taxInvoiceCount++;
        }
      }else if(type==='proforma'&&status==='issued'&&amount>0&&date(i.invoice_date)>=start&&date(i.invoice_date)<=end){
        add(pipeline,i.currency,amount);proformaCount++;
      }
    });
    return {payable,pipeline,taxInvoiceCount,proformaCount};
  }

  function renderObligations(){
    const host=q('fdMonthlyObligationsStableV6')||q('fdMonthlyObligations');if(!host)return;
    // A draft/submitted payroll is a planning figure, not a final obligation.
    // Wrap the existing calculator once, preserving its VAT/statutory detail
    // while allowing only an approved or locked run to be treated as generated.
    try{
      if(typeof fdMonthlyObligations==='function'&&!fdMonthlyObligations.__v16Authoritative){
        const original=fdMonthlyObligations;
        const authoritative=function(){
          const o=original.apply(this,arguments)||{};
          const status=String(o.run?.status||'').toLowerCase();
          const finalised=['approved','locked'].includes(status);
          if(o.payrollGenerated&&!finalised)return {...o,payrollGenerated:false,run:null,netSalaries:0,paye:0,nssf:0,health:0,sdl:0,wcf:0,total:0};
          return o;
        };
        authoritative.__v16Authoritative=true;
        fdMonthlyObligations=authoritative;
      }
    }catch(e){}
    let o;try{o=fdMonthlyObligations()}catch(e){return}if(o.payrollGenerated)return;
    const month=new Date(o.month+'-01T00:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'}),vat=vatPosition(),vatLines=moneyLines(vat.payable,false),pipelineLines=moneyLines(vat.pipeline,false).filter(x=>x.value>0);
    const pendingRow=label=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:4px 0;font-size:12px"><span style="color:var(--muted)">${label}</span><span style="font-weight:700;color:#92400e">Pending payroll</span></div>`;
    host.innerHTML=`<div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:16px;margin:0">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:2px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.5px;color:var(--muted)">MONTHLY OBLIGATIONS</div>
        <span style="font-size:10px;font-weight:700;color:#92400e;background:#fef3c7;padding:2px 8px;border-radius:10px;white-space:nowrap">Payroll not generated</span>
      </div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:10px">${esc(month)}</div>
      <div style="font-size:18px;font-weight:900;color:var(--navy);margin-bottom:2px">${vatLines.map(x=>esc(x.text)).join(' · ')}</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:10px">Confirmed invoice VAT · payroll obligations pending</div>
      <div style="border-top:1px solid var(--border);padding-top:6px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:7px 8px;margin:0 -8px 4px;background:#f6f8fb;border-radius:8px;font-size:12px"><span style="font-weight:800;color:var(--navy)">Net Salaries</span><span style="font-weight:800;color:#92400e">Pending payroll</span></div>
        ${['PAYE','NSSF','Health Insurance','SDL','WCF'].map(pendingRow).join('')}
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:7px 0 4px;margin-top:4px;border-top:1px solid var(--border);font-size:12px"><span style="font-weight:800;color:var(--navy)">VAT on Tax Invoices</span><span style="font-weight:900;color:#1e40af">${vatLines.map(x=>esc(x.text)).join(' · ')}</span></div>
        <div style="font-size:9px;color:var(--muted);text-align:right">${vat.taxInvoiceCount} VAT-bearing tax invoice${vat.taxInvoiceCount===1?'':'s'} recognised in this period</div>
        ${pipelineLines.length?`<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:7px 0 3px;margin-top:5px;border-top:1px dashed var(--border);font-size:11px"><span style="color:var(--muted)">Proforma VAT — not yet payable</span><span style="font-weight:700;color:#64748b">${pipelineLines.map(x=>esc(x.text)).join(' · ')}</span></div><div style="font-size:9px;color:var(--muted)">Moves to invoice VAT automatically when payment converts the proforma to a tax invoice.</div>`:''}
      </div>
    </div>`;
  }

  function renderStatus(){
    const m=metrics(),periodRows=periodClientRows(),periodRevenue=totals(periodRows,'revenue'),periodSettled=totals(periodRows,'paid'),ratio=num(periodRevenue.TZS)?num(periodSettled.TZS)/num(periodRevenue.TZS):0,cashVerified=!!m.cashAvailable&&!m.cashAvailable.reconciliationPending&&Number.isFinite(Number(m.cashAvailable.TZS)),cash=cashVerified?num(m.cashAvailable.TZS):null;
    // Status priority: reconciliation exception > negative cash > collection quality.
    // Poor collection is not itself a ledger integrity failure.
    let level='Healthy',color='#16a34a',statusKey='healthy';
    const issues=reconciliationIssues();
    if(issues.length||paymentLedgerLoadError){level='Needs Reconciliation';color='#b45309';statusKey='reconciliation'}
    else if(!cashVerified){level='Needs Reconciliation';color='#b45309';statusKey='reconciliation'}
    else if(cash<0){level='Critical';color='#dc2626';statusKey='critical'}
    else if(num(m.revenue.TZS)>0&&ratio<0.6){level='Poor Collections';color='#ea580c';statusKey='poor'}
    else if(num(m.revenue.TZS)>0&&ratio<0.8){level='Watch';color='#ca8a04';statusKey='watch'}
    const statusLabel=`Financial Status: ${level} · ${typeof fdPeriodLabel==='function'?fdPeriodLabel():'Selected period'}`;
    const text=q('fdStatusText');
    if(text)text.textContent=statusLabel;
    let warning=q('fdPaymentReconciliationWarning');
    if(!warning&&typeof document.createElement==='function'){
      warning=document.createElement('div');warning.id='fdPaymentReconciliationWarning';
      const anchor=q('fdStatusIndicator')?.parentElement||q('fdKpiRow')?.parentElement;
      if(anchor)anchor.insertBefore(warning,anchor.firstChild);
    }
    if(warning)warning.innerHTML=(issues.length||paymentLedgerLoadError)?`<div style="padding:10px 12px;margin:8px 0;border:1px solid #f59e0b;border-radius:8px;background:#fffbeb;color:#92400e;font-size:12px"><b>Payment reconciliation required:</b> ${paymentLedgerLoadError?'The Invoice Module payment ledger could not be loaded. ':''}${issues.length?`${issues.length} invoice(s) have missing, inconsistent or estimated payment-ledger records. Their payment dates are excluded from period cash totals until verified.`:''}<div style="margin-top:5px;font-weight:700">${issues.slice(0,5).map(x=>esc(x.invoice.invoice_number||x.invoice.id)).join(', ')}${issues.length>5?' and '+(issues.length-5)+' more':''}</div></div>`:'';
    const box=q('fdStatusIndicator');if(box){
      box.style.color=color;
      box.style.background=statusKey==='healthy'?'#f0fdf4':statusKey==='critical'?'#fef2f2':statusKey==='poor'?'#fff7ed':statusKey==='watch'?'#fefce8':'#fffbeb';
      box.style.borderColor=statusKey==='healthy'?'#86efac':statusKey==='critical'?'#fca5a5':statusKey==='poor'?'#fdba74':statusKey==='watch'?'#fde047':'#fcd34d';
      box.setAttribute('data-financial-status',statusKey);
      // Preserve all existing status-pill children: the legacy dashboard also
      // updates timestamp/label nodes here. Only recolour the existing dot(s).
      const markers=[];
      box.querySelectorAll('*').forEach(node=>{
        if(node===box)return;
        const cs=window.getComputedStyle?window.getComputedStyle(node):null;
        const w=node.offsetWidth||parseFloat(cs?.width)||0,h=node.offsetHeight||parseFloat(cs?.height)||0;
        const radius=cs?.borderRadius||'';
        const round=radius==='50%'||radius==='9999px'||radius==='999px';
        const looksLikeDot=round&&w>=5&&h>=5&&w<=20&&h<=20&&node.children.length===0;
        if(looksLikeDot)markers.push(node);
      });
      let dot=markers.find(node=>node.id!=='fdStatusText'&&node.getAttribute('aria-hidden')==='true')||markers.find(node=>node.id!=='fdStatusText');
      if(!dot){
        dot=document.createElement('span');
        dot.setAttribute('aria-hidden','true');
        dot.style.cssText='display:inline-block!important;flex:0 0 10px!important;width:10px!important;height:10px!important;min-width:10px!important;border-radius:50%!important;margin:0 8px 0 0!important;box-shadow:none!important';
        box.insertBefore(dot,box.firstChild);
      }
      dot.style.setProperty('background',color,'important');
      dot.style.setProperty('background-color',color,'important');
      dot.style.setProperty('border-color',color,'important');
      dot.style.setProperty('display','inline-block','important');
      dot.style.setProperty('width','10px','important');
      dot.style.setProperty('height','10px','important');
      markers.filter(node=>node!==dot).forEach(node=>node.style.setProperty('display','none','important'));
      const oldDotStyle=document.getElementById('molms-financial-status-dot-style');
      if(oldDotStyle)oldDotStyle.remove();
      const cleanup=document.getElementById('molms-financial-status-dot-cleanup');
      if(cleanup)cleanup.remove();
    }
    const intel=q('fdIntelligence');if(intel)intel.innerHTML=`<b>${level}:</b> ${Math.round(ratio*100)}% of TZS recognised revenue collected. ${cashVerified?`Calculated cash after expenses (zero monthly opening balance) is <b>${money('TZS',cash)}</b>. This is transaction-based and is not a bank-statement-verified balance.`:'Cash available after expenses is <b>pending calculation</b>.'}`;
  }

  function render(){
    if(rendering)return;rendering=true;
    try{renderKpis();renderReceivables();renderRevenueAnalytics();renderCollectionHealth();renderAttention();renderObligations();renderStatus()}finally{rendering=false}
  }

  function installLedgerReceiptAdapter(){
    if(typeof window.fdInvoiceCashReceipts==='function'&&!window.fdInvoiceCashReceipts.__molmsLedgerOnly){
      const ledgerOnly=function(inv){
        return receipts(inv).filter(r=>!r.estimated&&r.date).map(r=>({
          date:r.date,amount:r.cash,currency:inv.currency||'TZS',invoice:inv,
          withholding_tax_amount:r.wht
        }));
      };
      ledgerOnly.__molmsLedgerOnly=true;
      window.fdInvoiceCashReceipts=ledgerOnly;
    }
  }

  async function loadPayments(){
    try{
      if(typeof sb==='undefined'||!sb)throw new Error('Invoice payment ledger connection unavailable');
      const {data:rows,error}=await sb.from('invoice_payments').select('id,invoice_id,payment_date,cash_amount,withholding_tax_amount,reference,created_at,entry_origin,payment_date_is_estimated');
      if(error)throw error;
      paymentRows=rows||[];
      paymentLedgerLoadError=false;
      installLedgerReceiptAdapter();
    }catch(e){
      console.warn('[MOLMS finance V16 payments]',e);
      paymentRows=[];
      paymentLedgerLoadError=true;
      installLedgerReceiptAdapter();
    }
  }

  async function loadAuthoritativeExpenseAndPayrollSources(){
    try{
      if(typeof sb==='undefined'||!sb)throw new Error('Finance database connection unavailable');
      const {start,end}=bounds();
      const [expenseResult,payrollResult]=await Promise.all([
        sb.from('expense_entries').select('id,date,category,description,amount,status,expense_register_id,expense_registers!inner(status)').gte('date',start).lte('date',end),
        sb.from('hr_payroll_runs').select('id,payroll_month,status,total_net,deleted_at').eq('payroll_month',start.slice(0,7)).is('deleted_at',null)
      ]);
      if(expenseResult.error)throw expenseResult.error;
      if(payrollResult.error)throw payrollResult.error;
      expenseRegisterRows=(expenseResult.data||[]).map(e=>({...e,register_status:e.expense_registers?.status||e.register_status||''}));
      authoritativePayrollRuns=payrollResult.data||[];
    }catch(e){console.warn('[MOLMS finance V16 expense/payroll sources]',e);expenseRegisterRows=[];authoritativePayrollRuns=[];}
  }

  async function refresh(){await Promise.all([loadPayments(),loadAuthoritativeExpenseAndPayrollSources()]);render();setTimeout(render,30);setTimeout(render,180)}
  const baseRefresh=window.fdRefresh;
  if(typeof baseRefresh==='function')window.fdRefresh=async function(){const result=await baseRefresh.apply(this,arguments);await refresh();return result};
  window.addEventListener('load',()=>{setTimeout(refresh,900);setTimeout(refresh,1800)});
  // The legacy application can repaint its executive snapshot after the V16
  // render. Enforce the approved three-card structure, not merely the old labels.
  const approvedKpiLabels=['TOTAL REVENUE','TOTAL EXPENSES','CASH AVAILABLE'];
  function executiveSnapshotIsCorrect(){
    const host=q('fdKpiRow');if(!host)return false;
    const cards=Array.from(host.children);
    return cards.length===3&&approvedKpiLabels.every(label=>cards.some(el=>String(el.textContent||'').toUpperCase().includes(label)));
  }
  let snapshotRepairQueued=false;
  function enforceExecutiveSnapshot(){
    if(executiveSnapshotIsCorrect()||snapshotRepairQueued)return;
    snapshotRepairQueued=true;
    queueMicrotask(()=>{snapshotRepairQueued=false;try{render()}catch(e){console.error('[MOLMS KPI snapshot repair]',e)}});
  }
  let lastDataSignature='';
  setInterval(()=>{
    const kpi=q('fdKpiRow'),client=q('fdClientMatterRevenueV2');
    if(!kpi&&!client)return;
    const d=data();
    const signature=[d.invoices.length,d.manual.length,d.entries.length,d.payroll.length,d.office.length,bounds().start,bounds().end].join('|');
    enforceExecutiveSnapshot();
    if(signature!==lastDataSignature){lastDataSignature=signature;refresh()}
  },500);
  if(typeof MutationObserver!=='undefined'){
    const snapshotObserver=new MutationObserver(()=>enforceExecutiveSnapshot());
    const observeSnapshot=()=>{const host=q('fdKpiRow');if(host&&!host.__molmsApprovedSnapshotObserver){snapshotObserver.observe(host,{childList:true,subtree:true,characterData:true});host.__molmsApprovedSnapshotObserver=true}};
    observeSnapshot();
    new MutationObserver(observeSnapshot).observe(document.documentElement,{childList:true,subtree:true});
  }
  window.MOLMSFinanceV16={metrics,periodClientRows,allReceivables,render,refresh,showDetails,
    setPaymentRowsForTest(rows){paymentRows=Array.isArray(rows)?rows:[];paymentLedgerLoadError=false},
    paymentIntegrity,
    audit:()=>{const m=metrics();return {version:18,period:bounds(),revenue:m.revenue,collected:m.collected,withholdingTax:periodWithholdingTax(),reconciliationIssues:reconciliationIssues().length,newReceivables:m.newReceivables,totalReceivables:m.totalReceivables,cash:m.cash.closingByCur,expenses:m.expenses,cashAvailable:m.cashAvailable,cashAvailablePolicy:'period cash received minus approved manual Other Expenditure and Partner Drawings; payroll and Expenses Module records excluded',vat:vatPosition(),paymentLedgerRows:paymentRows.length}}
  };
})();