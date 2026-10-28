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
  // Disclosure state lives outside the DOM so unrelated legacy refreshes cannot collapse panels.
  const financialDisclosureState=new Set();
  let disclosureHandlerInstalled=false;

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
    const rows=receipts(i);
    // The payment ledger is preferred whenever it has rows. If it has no rows,
    // retain the invoice's recorded settlement fields for the live balance so
    // a missing detail row does not falsely resurrect a paid receivable.
    // paymentIntegrity() still flags the missing ledger detail for review.
    if(rows.length)return rows.reduce((s,r)=>s+r.cash+r.wht,0);
    return Math.max(0,num(i.amount_paid))+Math.max(0,num(i.withholding_tax_amount));
  }

  // Manual client receivables can carry a stale outstanding_amount after a
  // receipt is edited. When the agreed amount is known, derive the balance
  // from the authoritative agreed amount less recorded receipts; otherwise
  // preserve the explicitly recorded outstanding amount.
  function manualOutstanding(t){
    const agreed=num(t.agreed_amount);
    if(agreed>0)return Math.max(0,agreed-num(t.amount));
    return Math.max(0,num(t.outstanding_amount));
  }

  function periodClientRows(){
    const {start,end}=bounds(),{invoices,manual}=data(),rows=[];
    invoices.filter(i=>validTax(i)&&date(i.invoice_date)>=start&&date(i.invoice_date)<=end).forEach(i=>{
      const revenue=num(i.total_due),paid=invoiceSettledAsOf(i,end),outstanding=Math.max(0,revenue-paid);
      rows.push({kind:'invoice',id:i.id,client:i.client_name||'Unknown client',matter:i.matter_ref||i.matter_title||'General / Unlinked',source:i.invoice_number||'—',currency:i.currency||'TZS',revenue,paid,outstanding,status:paymentIntegrity(i).needsReconciliation?'Needs Reconciliation':outstanding<=.01?'Paid':paid>0?'Part Paid':'Unpaid'});
    });
    manual.filter(t=>approved(t)&&t.tx_type==='revenue'&&date(t.date)>=start&&date(t.date)<=end).forEach(t=>{
      const paid=num(t.amount),revenue=t.client_receivable&&num(t.agreed_amount)>0?num(t.agreed_amount):paid;
      const outstanding=t.client_receivable?manualOutstanding(t):0;
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
      const outstanding=manualOutstanding(t);if(outstanding<=.01)return;
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

  function reconciliationIssues(){
    const {invoices}=data();
    return invoices.filter(validTax).map(i=>({invoice:i,integrity:paymentIntegrity(i)}))
      .filter(x=>x.integrity.needsReconciliation);
  }

  // Total Expenses policy: only approved manual expenditure rows recorded
  // in Expenses Transactions are included. Payroll, office_expenses, expense
  // registers, drawings and loan principal are not auto-added to this KPI.
  // If a payroll/other cost should appear here, it must first be recorded
  // manually in the authoritative Expenses Transactions workflow.
  function periodExpenses(){
    const {start,end}=bounds(),{manual}=data(),out={TZS:0};
    manual.filter(t=>
      approved(t) &&
      date(t.date)>=start && date(t.date)<=end &&
      String(t.status||'').toLowerCase()!=='cancelled' &&
      String(t.tx_type||'').toLowerCase()==='expenditure'
    ).forEach(t=>add(out,t.currency,t.amount));
    return out;
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


  // Monthly opening balance is zero by the firm's stated policy: cash
  // available from the preceding month has been fully exhausted. Calculate
  // the selected month's net cash movement, keeping currencies separate.
  // Cash receipts exclude withholding tax; inter-account transfers are not
  // classified as revenue or expenditure in this calculation.
  function periodCashAvailable(){
    const {start,end}=bounds();
    const byCur={...periodCollections()};
    const {manual}=data();
    manual.filter(t=>
      approved(t) &&
      date(t.date)>=start && date(t.date)<=end &&
      String(t.status||'').toLowerCase()!=='cancelled'
    ).forEach(t=>{
      const type=String(t.tx_type||'').toLowerCase();
      if(type==='loan') add(byCur,t.currency,t.amount);
      if(type==='drawing') add(byCur,t.currency,-num(t.amount));
    });
    const expenses=periodExpenses();
    Object.entries(expenses).forEach(([currency,amount])=>add(byCur,currency,-num(amount)));
    return {
      reconciliationPending:false,
      openingBalanceByCurrency:{TZS:0},
      receiptsByCurrency:periodCollections(),
      expensesByCurrency:expenses,
      cashAvailableByCurrency:byCur,
      TZS:num(byCur.TZS),
      USD:num(byCur.USD),
      start,end,
      basis:'zero monthly opening balance; recorded cash receipts plus recorded loan proceeds less approved manual expenses and drawings'
    };
  }

  function metrics(){
    const rows=periodClientRows(),revenue=totals(rows,'revenue'),collected=periodCollections(),newReceivables=totals(rows,'outstanding'),expenses=periodExpenses(),cash=cashPosition(),cashAvailable=periodCashAvailable();
    return {rows,revenue,collected,newReceivables,expenses,cash,cashAvailable,totalReceivables:totals(allReceivables(),'outstanding')};
  }

  function card(title,values,color,note){
    return `<div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:9px 10px"><div style="font-size:9px;font-weight:800;color:var(--muted);margin-bottom:3px">${esc(title)}</div>${moneyLines(values).map((l,i)=>`<div style="font-size:${i?'12px':'16px'};font-weight:900;line-height:1.2;color:${color}">${esc(l.text)}</div>`).join('')}<div style="font-size:9px;color:var(--muted);margin-top:3px">${esc(note)}</div></div>`;
  }

  function renderKpis(){
    const host=q('fdKpiRow');if(!host)return;
    if(!document.getElementById('fdKpiCompactLayoutStyle')){
      const style=document.createElement('style');style.id='fdKpiCompactLayoutStyle';
      style.textContent=`#fdKpiRow.fd-kpi-compact-layout{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;width:100%!important;gap:10px!important;align-items:stretch}#fdKpiRow.fd-kpi-compact-layout>section{padding:15px 14px!important;min-width:0!important;min-height:170px;box-sizing:border-box}#fdKpiRow.fd-kpi-compact-layout>section:nth-child(3){grid-column:auto!important}#fdKpiRow.fd-kpi-compact-layout>section>div{overflow-wrap:anywhere}#fdKpiRow.fd-kpi-compact-layout>section>div:first-child{margin-bottom:6px!important}#fdKpiRow.fd-kpi-compact-layout>section>div:nth-child(2){font-size:20px!important;line-height:1.25!important}@media(max-width:640px){#fdKpiRow.fd-kpi-compact-layout{grid-template-columns:minmax(0,1fr)!important;gap:10px!important}#fdKpiRow.fd-kpi-compact-layout>section:nth-child(3){grid-column:auto!important}}`;
      document.head.appendChild(style);
    }
    host.classList.add('fd-kpi-compact-layout');
    // Preserve expanded disclosure panels across the legacy dashboard's frequent refreshes.
    // Without this, the 500ms reconciliation loop replaces innerHTML and collapses every <details>.
    const openDetails=financialDisclosureState;
    const m=metrics(),label=typeof fdPeriodLabel==='function'?fdPeriodLabel():'Selected period';
    const fmt=values=>moneyLines(values,false).map((l,i)=>`<div style="font-size:${i?'13px':'22px'};font-weight:900;line-height:1.25;color:#182230">${esc(l.text)}</div>`).join('');
    const detailRows=groups=>Object.entries(groups).filter(([,v])=>Object.values(v).some(x=>num(x)!==0)).sort((a,b)=>Object.values(b[1]).reduce((s,x)=>s+Math.abs(num(x)),0)-Object.values(a[1]).reduce((s,x)=>s+Math.abs(num(x)),0)).map(([name,values])=>`<div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid #edf0f2;font-size:11px"><span style="color:#344054;overflow-wrap:anywhere">${esc(name)}</span><span style="font-weight:800;text-align:right;white-space:nowrap">${moneyLines(values,false).map(x=>esc(x.text)).join('<br>')}</span></div>`).join('')||'<div style="font-size:11px;color:#667085">No entries for this period.</div>';
    const breakdown=(title,html)=>`<details style="margin-top:10px;border-top:1px solid #e4e7ec;padding-top:8px"><summary style="cursor:pointer;font-size:11px;font-weight:800;color:#344054">View ${title.toLowerCase()} breakdown</summary><div style="margin-top:7px">${html}</div></details>`;
    const panel=(title,values,accent,note,extra='')=>{const icon=title==='TOTAL REVENUE'?'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#217346" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17l6-6 4 3 7-8"/><path d="M14 6h6v6"/></svg>':'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#B42318" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/></svg>';return `<section style="min-width:0;background:#fff;border:1px solid #e4e7ec;border-radius:12px;padding:14px 15px;box-shadow:0 2px 8px rgba(16,24,40,.045);box-sizing:border-box"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px"><div style="font-size:11px;font-weight:900;letter-spacing:.35px;color:#667085">${esc(title)}</div><span style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;flex:0 0 34px;border-radius:9px;background:${title==='TOTAL REVENUE'?'#E8F5EC':'#FCECEC'}">${icon}</span></div>${fmt(values)}<div style="font-size:11px;color:#667085;margin-top:7px;line-height:1.35">${esc(note)}</div>${extra}</section>`};
    const revenueGroups={};
    m.rows.forEach(r=>{const key=r.kind==='invoice'?'Tax invoices':'Manual direct income';revenueGroups[key]=revenueGroups[key]||{};add(revenueGroups[key],r.currency,r.revenue)});
    const expenseGroups={};
    const {start:periodStart,end:periodEnd}=bounds();
    data().manual.filter(t=>approved(t)&&date(t.date)>=periodStart&&date(t.date)<=periodEnd&&String(t.status||'').toLowerCase()!=='cancelled'&&String(t.tx_type||'').toLowerCase()==='expenditure').forEach(t=>{const key=String(t.category||'Uncategorised');expenseGroups[key]=expenseGroups[key]||{};add(expenseGroups[key],t.currency,t.amount)});
    const revenueBreakdown=`<div style="margin-top:10px;border-top:1px solid #e4e7ec;padding-top:8px"><button type="button" data-fd-revenue-toggle aria-expanded="false" style="display:block;border:0;background:transparent;padding:0;cursor:pointer;font:inherit;font-size:11px;font-weight:800;color:#344054;text-align:left">＋ View revenue breakdown</button><div data-fd-revenue-content hidden style="margin-top:7px">${detailRows(revenueGroups)}</div></div>`;
    const expenseBreakdown=`<div style="margin-top:10px;border-top:1px solid #e4e7ec;padding-top:8px"><button type="button" data-fd-expense-toggle aria-expanded="false" style="display:block;border:0;background:transparent;padding:0;cursor:pointer;font:inherit;font-size:11px;font-weight:800;color:#344054;text-align:left">＋ View expenses breakdown</button><div data-fd-expense-content hidden style="margin-top:7px">${detailRows(expenseGroups)}</div></div>`;
    host.innerHTML=
      panel('TOTAL REVENUE',m.revenue,'#16803d',`Recognised legal fees and other eligible income · ${label}`,revenueBreakdown)+
      panel('TOTAL EXPENSES',m.expenses,'#b42318',`Approved expenses manually recorded in Expenses Transactions · ${label}`,expenseBreakdown)+
      `<section style="grid-column:auto;min-width:0;background:#fff;border:1px solid #b8d8c5;border-radius:12px;padding:14px 15px;box-shadow:0 3px 10px rgba(28,110,65,.07);box-sizing:border-box"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px"><div style="font-size:11px;font-weight:900;letter-spacing:.35px;color:#24633d">CASH AVAILABLE</div><span style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;flex:0 0 34px;border-radius:9px;background:#E8F1FC"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#245DA8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/></svg></span></div>${moneyLines(m.cashAvailable.cashAvailableByCurrency||{},false).map((l,i)=>`<div style="font-size:${i?'14px':'22px'};font-weight:900;line-height:1.25;color:${l.value<0?'#b42318':'#187044'}">${esc(l.text)}</div>`).join('')||'<div style="font-size:20px;font-weight:900;color:#187044">TZS 0</div>'}<div style="font-size:11px;color:#667085;margin-top:6px">${esc(label)} · Opening balance: TZS 0 / USD 0</div></section>`;
    host.setAttribute('aria-label','Financial dashboard summary');
    host.querySelectorAll('details').forEach(el=>{const summary=String(el.querySelector('summary')?.textContent||'').trim();el.open=openDetails.has(summary);});
    if(!disclosureHandlerInstalled){
      disclosureHandlerInstalled=true;
      host.addEventListener('click',e=>{
        const toggle=e.target.closest('[data-fd-revenue-toggle],[data-fd-expense-toggle]');
        if(!toggle||!host.contains(toggle))return;
        e.preventDefault();
        const kind=toggle.hasAttribute('data-fd-expense-toggle')?'expense':'revenue';
        const content=host.querySelector('[data-fd-'+kind+'-content]');
        if(!content)return;
        const opening=content.hidden;
        content.hidden=!opening;
        toggle.setAttribute('aria-expanded',String(opening));
        toggle.textContent=opening?(kind==='expense'?'− Hide expenses breakdown':'− Hide revenue breakdown'):(kind==='expense'?'＋ View expenses breakdown':'＋ View revenue breakdown');
      });
    }
  }

  function renderReceivables(){
    const host=q('fdReceivablesCardV1')||q('fdReceivablesCardV2');if(!host)return;
    const rows=allReceivables(),tot=totals(rows,'outstanding'),visibleCount=4;
    const rowHtml=r=>`<button data-v16-kind="${r.kind}" data-v16-id="${esc(r.id)}" style="width:100%;display:grid;grid-template-columns:minmax(0,1.4fr) repeat(2,minmax(0,1fr));gap:8px;align-items:center;border:0;border-top:1px solid #edf0f2;padding:7px 1px;background:transparent;text-align:left;cursor:pointer;color:var(--navy)"><span style="font-size:11px;font-weight:800;overflow-wrap:anywhere">${esc(r.client)}<small style="display:block;color:var(--muted);font-weight:400;font-size:9px">${esc(r.source)}</small></span><span style="font-size:9px;color:#16803c">Paid<b style="display:block;font-size:11px;color:#16803c;margin-top:2px">${money(r.currency,r.paid)}</b></span><span style="font-size:9px;color:#b42318">Outstanding<b style="display:block;font-size:11px;color:#b42318;margin-top:2px">${money(r.currency,r.outstanding)}</b></span></button>`;
    host.innerHTML=`<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:8px"><div style="min-width:0"><div style="font-size:11px;font-weight:800;color:var(--navy)">TOTAL CLIENT RECEIVABLES</div>${moneyLines(tot,false).map((l,i)=>`<div style="font-size:${i?'12px':'21px'};font-weight:900;color:#b45309;margin-top:2px;line-height:1.15">${esc(l.text)}</div>`).join('')}<div style="font-size:9px;color:var(--muted);margin-top:3px">Open balances · ${esc(localToday())}</div></div><div style="font-size:9px;color:var(--muted);text-align:right;white-space:nowrap">${rows.length} clients</div></div><div>${rows.slice(0,visibleCount).map(rowHtml).join('')||'<div style="font-size:11px;color:var(--muted);padding:8px 0">No open receivables.</div>'}<div data-v16-more-rows hidden>${rows.slice(visibleCount).map(rowHtml).join('')}</div>${rows.length>visibleCount?`<button type="button" data-v16-receivables-toggle style="width:100%;border:0;border-top:1px solid #e4e7ec;background:transparent;padding:8px 0 1px;text-align:left;color:#344054;font-size:10px;font-weight:800;cursor:pointer">＋ View all ${rows.length} receivables</button>`:''}</div>`;
    host.onclick=e=>{
      const toggle=e.target.closest('[data-v16-receivables-toggle]');
      if(toggle){const extra=host.querySelector('[data-v16-more-rows]');if(!extra)return;const opening=extra.hidden;extra.hidden=!opening;toggle.textContent=opening?'− Show fewer receivables':`＋ View all ${rows.length} receivables`;return;}
      const b=e.target.closest('[data-v16-kind]');if(b&&typeof fdOpenReceivableSourceV2==='function')fdOpenReceivableSourceV2(b.dataset.v16Kind,b.dataset.v16Id);
    };
  }

  function renderRevenueAnalytics(){
    const rows=periodClientRows(),tax=rows.filter(r=>r.kind==='invoice'),manual=rows.filter(r=>r.kind==='manual'),tzs=rows.filter(r=>r.currency==='TZS'),tzsTotal=tzs.reduce((s,r)=>s+r.revenue,0);
    const bar=(name,value)=>`<div><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px"><span>${esc(name)}</span><b>TZS ${short(value)} <small style="color:var(--muted);font-weight:400">(${tzsTotal?Math.round(value/tzsTotal*100):0}%)</small></b></div><div style="height:4px;background:#e5e7eb;border-radius:8px"><div style="height:100%;width:${tzsTotal?Math.round(value/tzsTotal*100):0}%;background:#1e40af;border-radius:8px"></div></div></div>`;
    const type=q('fdRevByType');if(type){const taxV=tax.filter(r=>r.currency==='TZS').reduce((s,r)=>s+r.revenue,0),manualV=manual.filter(r=>r.currency==='TZS').reduce((s,r)=>s+r.revenue,0),usd=rows.filter(r=>r.currency==='USD').reduce((s,r)=>s+r.revenue,0);type.innerHTML=bar('Tax Invoice',taxV)+bar('Agreed Client Fees',manualV)+(usd?`<div style="border-top:1px dashed var(--border);padding-top:6px">USD revenue shown separately <b style="float:right">USD ${usd.toLocaleString()}</b></div>`:'')}
    const clients=q('fdRevByClient');if(clients){const grouped={};tzs.forEach(r=>grouped[r.client]=(grouped[r.client]||0)+r.revenue);clients.innerHTML=Object.entries(grouped).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n,v],i)=>`<div style="display:flex;gap:6px"><b style="color:var(--muted)">${i+1}.</b><span style="flex:1">${esc(n)}</span><b style="color:#16803c">TZS ${short(v)}</b></div>`).join('')}
    const practice=q('fdRevByPractice');if(practice){const linked=tax.filter(r=>r.currency==='TZS'&&/^LIT:|^NL:/.test(r.matter)).reduce((s,r)=>s+r.revenue,0),general=tzsTotal-linked;practice.innerHTML=(linked?bar('Matter-linked',linked):'')+(general?bar('General / Unlinked',general):'')}
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
    const m=metrics(),ratio=num(m.revenue.TZS)?num(m.collected.TZS)/num(m.revenue.TZS):0,cashVerified=!!m.cashAvailable&&!m.cashAvailable.reconciliationPending&&Number.isFinite(Number(m.cashAvailable.TZS)),cash=cashVerified?num(m.cashAvailable.TZS):null,payrollPending=!(()=>{try{return fdMonthlyObligations().payrollGenerated}catch(e){return false}})();
    let level='Healthy',color='#16a34a';if(cashVerified&&cash<0){level='Critical';color='#dc2626'}else if(!cashVerified||ratio<.8||payrollPending){level='Needs Reconciliation';color='#b45309'}
    const issues=reconciliationIssues();
    if(issues.length||paymentLedgerLoadError){level='Needs Reconciliation';color='#b45309'}
    const text=q('fdStatusText');if(text)text.textContent=`Financial Status: ${level} · ${typeof fdPeriodLabel==='function'?fdPeriodLabel():'Selected period'}`;
    let warning=q('fdPaymentReconciliationWarning');
    if(!warning&&typeof document.createElement==='function'){
      warning=document.createElement('div');warning.id='fdPaymentReconciliationWarning';
      const anchor=q('fdStatusIndicator')?.parentElement||q('fdKpiRow')?.parentElement;
      if(anchor)anchor.insertBefore(warning,anchor.firstChild);
    }
    if(warning)warning.innerHTML=(issues.length||paymentLedgerLoadError)?`<div style="padding:10px 12px;margin:8px 0;border:1px solid #f59e0b;border-radius:8px;background:#fffbeb;color:#92400e;font-size:12px"><b>Payment reconciliation required:</b> ${paymentLedgerLoadError?'The Invoice Module payment ledger could not be loaded. ':''}${issues.length?`${issues.length} invoice(s) have missing, inconsistent or estimated payment-ledger records. Their payment dates are excluded from period cash totals until verified.`:''}<div style="margin-top:5px;font-weight:700">${issues.slice(0,5).map(x=>esc(x.invoice.invoice_number||x.invoice.id)).join(', ')}${issues.length>5?' and '+(issues.length-5)+' more':''}</div></div>`:'';
    const box=q('fdStatusIndicator');if(box){box.style.color=color;box.style.background=level==='Healthy'?'#f0fdf4':level==='Critical'?'#fef2f2':'#fffbeb'}
    const intel=q('fdIntelligence');if(intel)intel.innerHTML=`<b>${level}:</b> ${Math.round(ratio*100)}% of TZS recognised revenue collected. ${cashVerified?`Calculated cash after expenses (zero monthly opening balance) is <b>${money('TZS',cash)}</b>. This is transaction-based and is not a bank-statement-verified balance.`:'Cash available after expenses is <b>pending calculation</b>.'}${payrollPending?' Payroll obligations are pending calculation.':''}`;
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
  // The legacy application renders again after authentication and after its
  // asynchronous financial queries complete. Reconcile after those paints so
  // the canonical figures cannot be replaced by the old dashboard output.
  // Refresh only when the underlying source collection signature changes.
  // Do not force-render based on legacy text elsewhere in the page: the previous
  // heuristic matched hidden/adjacent legacy panels and repeatedly replaced #fdKpiRow,
  // interrupting native <details> disclosure interactions.
  let lastDataSignature='';
  let refreshInFlight=false;
  let lastPeriodSignature='';
  setInterval(()=>{
    const kpi=q('fdKpiRow');
    if(!kpi)return;
    const d=data();
    const b=bounds();
    const signature=[d.invoices.length,d.manual.length,d.entries.length,d.payroll.length,d.office.length,b.start,b.end].join('|');
    if(signature!==lastDataSignature){
      lastDataSignature=signature;
      if(!refreshInFlight){
        refreshInFlight=true;
        refresh().finally(()=>{refreshInFlight=false});
      }
    }
  },1500);
  window.MOLMSFinanceV16={metrics,periodClientRows,allReceivables,render,refresh,
    setPaymentRowsForTest(rows){paymentRows=Array.isArray(rows)?rows:[];paymentLedgerLoadError=false},
    paymentIntegrity,
    audit:()=>{const m=metrics();return {version:18,period:bounds(),revenue:m.revenue,collected:m.collected,withholdingTax:periodWithholdingTax(),reconciliationIssues:reconciliationIssues().length,newReceivables:m.newReceivables,totalReceivables:m.totalReceivables,cash:m.cash.closingByCur,expenses:m.expenses,cashAvailable:m.cashAvailable,cashAvailablePolicy:'reconciliation pending until verified bank and office-cash balances are available',vat:vatPosition(),paymentLedgerRows:paymentRows.length}}
  };
})();