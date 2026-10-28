/* MOLMS Phase 5 — Dashboard Reconciliation Audit
 * Read-only audit sheet. It does not alter source data or dashboard KPIs.
 */
(function financialDashboardReconciliationAuditV1(){
 'use strict';
 if(typeof window.fdExportRows!=='function'||typeof window.fdMetrics!=='function')return;
 const previous=window.fdExportRows,n=v=>Number(v||0),date=v=>String(v||'').slice(0,10),cur=r=>r?.currency||'TZS';
 const period=()=>{try{return {...fdGetPeriodDates(),label:fdPeriodLabel()}}catch(_){return {start:'',end:'',label:'Selected period'}}};
 const inPeriod=v=>typeof window.fdInPeriod==='function'&&fdInPeriod(v);
 const allManual=()=>Array.isArray(window._fdAllManual)?window._fdAllManual:(Array.isArray(window._fdManualTx)?window._fdManualTx:[]);
 const status=t=>String(t?.status||(t?.is_approved?'approved':'pending')).toLowerCase();
 const add=(arr,check,source,expected,compared,difference,result,note)=>arr.push([check,source,expected,compared,difference,result,note]);
 const totals=obj=>Object.entries(obj||{}).filter(([c,v])=>c==='TZS'||n(v)!==0);
 window.fdExportRows=function(){
  const rows=previous.apply(this,arguments),m=fdMetrics(),p=period();
  const out=[['Reporting Period',p.label],['Period Start',p.start],['Period End',p.end],['Audit Mode','Read-only; no financial records changed']];
  const checks=[['Control Check','Source / Register','Expected / Basis','Compared / Observed','Difference','Result','Recommended Review']];
  totals(m.revenueByCur).forEach(([c,v])=>add(checks,'Dashboard recognised revenue ('+c+')','Invoice Register',n(v),'fdMetrics recognised invoice revenue',0,'BASELINE','Use this canonical dashboard metric for same-period report comparison.'));
  totals(m.collectedByCur).forEach(([c,v])=>add(checks,'Dashboard collections ('+c+')','Payment ledger + approved manual revenue',n(v),'fdMetrics recorded collections',0,'BASELINE','Cash collections exclude WHT and estimated-date receipt rows.'));
  totals(m.expensesByCur).forEach(([c,v])=>add(checks,'Dashboard expenses ('+c+')','Approved manual expenditure',n(v),'fdMetrics expense KPI',0,'BASELINE','Per dashboard policy, payroll, office expenses, drawings and other registers are not automatically added to this KPI.'));
  totals(m.balanceByCur).forEach(([c,v])=>add(checks,'Dashboard net result ('+c+')','Recognised revenue less dashboard expenses',n(v),'fdMetrics net result',0,'BASELINE','Do not compare to bank balance or profit after unposted expenses.'));
  totals(m.outstandingByCur).forEach(([c,v])=>add(checks,'Period receivables ('+c+')','Selected-period invoices',n(v),'fdMetrics outstanding balances',0,'BASELINE','This is period invoice balance; the live receivables card may cover a different date range.'));
  totals(m.cashByCur).forEach(([c,v])=>add(checks,'Dashboard cash position ('+c+')','Dashboard cash-position formula',n(v),'fdMetrics cash position',0,'DISCLOSURE','Not a bank-reconciled closing balance. Confirm source cash records and opening balance policy.'));
  const invoiceRows=Array.isArray(m.invoices)?m.invoices:[],receiptRows=Array.isArray(m.invoiceCashReceipts)?m.invoiceCashReceipts:[];
  const receiptByInvoice={};receiptRows.forEach(r=>{const i=r.invoice||{},id=i.id||r.invoice_id||r.payment?.invoice_id;if(id)receiptByInvoice[id]=(receiptByInvoice[id]||0)+n(r.amount)});
  let receiptMatched=0,missingReceipt=0,fullySettled=0,negativeValues=0,overSettled=0;
  invoiceRows.forEach(i=>{
   const paid=n(i.amount_paid),wht=n(i.withholding_tax_amount),total=n(i.total_due),balance=total-paid-wht,ledger=receiptByInvoice[i.id];
   if(ledger!==undefined){receiptMatched++;if(Math.abs(ledger-paid)>.01)add(checks,'Invoice payment vs receipt detail','Invoice '+(i.invoice_number||i.id),paid,ledger,ledger-paid,'REVIEW','Verify payment ledger rows against invoice amount_paid before correcting either register.')}
   else if(paid>.01||wht>.01){missingReceipt++;add(checks,'Receipt detail coverage','Invoice '+(i.invoice_number||i.id),'Detailed receipt row','No matching receipt detail','','REVIEW','Absence of detailed receipt rows is not proof the payment was not received. Check payment ledger and legacy records.')}
   if(Math.abs(balance)<=.01)fullySettled++;
   if(balance<-.01){overSettled++;add(checks,'Invoice settlement exceeds total','Invoice '+(i.invoice_number||i.id),total,paid+wht,paid+wht-total,'REVIEW','Check WHT allocation, credit notes and overpayment treatment.')}
   if(total<-.01||paid<-.01||wht<-.01){negativeValues++;add(checks,'Negative invoice/payment value','Invoice '+(i.invoice_number||i.id),'Non-negative amounts',JSON.stringify({total,paid,wht}),'','REVIEW','Inspect source records; do not auto-correct amounts.')}
  });
  out.push(['Invoices in selected period',invoiceRows.length],['Detailed receipt rows exposed',receiptRows.length],['Invoices with payment detail matched',receiptMatched],['Invoices with paid/WHT but no matched receipt detail',missingReceipt],['Fully settled invoices in selected period',fullySettled],['Invoices with settlement greater than total',overSettled],['Invoices with negative invoice/payment values',negativeValues]);
  const manual=allManual().filter(t=>inPeriod(t.date)),pending=manual.filter(t=>status(t)!=='approved');
  out.push(['Manual transactions in selected period',manual.length],['Manual transactions not approved (excluded from approved KPI)',pending.length],['Expenses source policy','Only approved manual expenditure enters dashboard expense KPI'],['Cash position disclosure','Dashboard-calculated figure; not a bank reconciliation']);
  add(checks,'Receipt detail coverage','Selected-period invoices',invoiceRows.filter(i=>n(i.amount_paid)>.01||n(i.withholding_tax_amount)>.01).length+' invoices with settlements',missingReceipt+' without matching receipt detail',missingReceipt,missingReceipt?'REVIEW':'PASS',missingReceipt?'Reconcile receipt-detail coverage before relying on receipt-level analysis.':'No paid invoices were found missing detailed receipt rows in this period.');
  add(checks,'Invoice settlement integrity','Selected-period invoices','No negative or over-settled invoices',negativeValues+' negative; '+overSettled+' over-settled',negativeValues+overSettled,negativeValues+overSettled?'REVIEW':'PASS','Check invoice-level findings; do not auto-change financial records.');
  add(checks,'Fully settled invoice balances','Selected-period invoices','Settled invoices have zero balance',fullySettled+' fully settled',0,'INFO','Compare with live receivables card; it uses all dates through today and excludes balances at or below 0.01.');
  rows['Dashboard Reconciliation Audit']=out;rows['Dashboard Reconciliation Checks']=checks;return rows;
 };
 window.MOLMSFinancialDashboardReconciliationAuditV1={version:1,applied:true,readOnly:true,audit:function(){const m=fdMetrics(),p=period(),invoices=Array.isArray(m.invoices)?m.invoices:[],receipts=Array.isArray(m.invoiceCashReceipts)?m.invoiceCashReceipts:[];return {period:p.label,invoices:invoices.length,receiptRows:receipts.length,readOnly:true}}};
})();