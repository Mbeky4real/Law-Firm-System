/* MOLMS Financial Reconciliation Detail V1
 * Phase 3: add audit-focused export sheets for payment reconciliation,
 * receivables ageing, expense-source breakdown and exceptions.
 * Read-only reporting layer; never writes or mutates financial records.
 */
(function financialReconciliationDetailV1(){
 'use strict';
 if(typeof window.fdExportRows!=='function'||typeof window.fdMetrics!=='function')return;
 const baseRows=window.fdExportRows;
 const n=v=>Number(v||0), currency=r=>r?.currency||'TZS', date=v=>String(v||'').slice(0,10);
 const status=t=>String(t?.status||(t?.is_approved?'approved':'pending')).toLowerCase();
 const inPeriod=v=>typeof window.fdInPeriod==='function'&&fdInPeriod(v);
 const allInvoices=()=>Array.isArray(window._fdAllInvoices)?window._fdAllInvoices:[];
 const allManual=()=>Array.isArray(window._fdAllManual)?window._fdAllManual:(Array.isArray(window._fdManualTx)?window._fdManualTx:[]);
 const allEntries=()=>Array.isArray(window._fdAllEntries)?window._fdAllEntries:[];
 const byCurrency=rows=>rows.reduce((o,r)=>{const c=currency(r);o[c]=(o[c]||0)+n(r.amount);return o},{});
 const dateEnd=()=>{try{return fdGetPeriodDates().end}catch(_){return date(new Date().toISOString())}};
 const ageDays=(from,to)=>{if(!from)return '';const a=Date.parse(date(from)+'T00:00:00'),b=Date.parse(date(to)+'T00:00:00');return Number.isFinite(a)&&Number.isFinite(b)?Math.max(0,Math.floor((b-a)/86400000)):''};
 const bal=i=>Math.max(0,n(i.total_due)-n(i.amount_paid)-n(i.withholding_tax_amount));
 window.fdExportRows=function(){
  const rows=baseRows.apply(this,arguments),m=fdMetrics(),end=dateEnd();
  const invoices=allInvoices().filter(i=>date(i.invoice_date)&&date(i.invoice_date)<=end&&String(i.status||'').toLowerCase()!=='cancelled');
  const receipts=Array.isArray(m.invoiceCashReceipts)?m.invoiceCashReceipts:[];
  const receiptById={},receiptByRef={};
  receipts.forEach(r=>{const inv=r.invoice||{},key=inv.id||r.invoice_id;if(key)receiptById[key]=(receiptById[key]||0)+n(r.amount);const ref=inv.invoice_number||r.invoice_number;if(ref)receiptByRef[ref]=(receiptByRef[ref]||0)+n(r.amount)});
  const paymentRows=[['As At','Invoice Date','Client','Invoice Reference','Currency','Invoice Total','Cash Paid on Invoice','Receipt Ledger Cash','Difference (Ledger - Invoice)','WHT Recorded','Outstanding Balance','Reconciliation Status']];
  const exceptions=[['Severity','Exception','Invoice / Reference','Currency','Expected / Register Value','Compared / Calculated Value','Difference','Suggested Review']];
  invoices.forEach(i=>{
   const key=i.id,ref=i.invoice_number,ledger=key&&receiptById[key]!==undefined?receiptById[key]:(ref&&receiptByRef[ref]!==undefined?receiptByRef[ref]:null);
   const paid=n(i.amount_paid),difference=ledger===null?null:ledger-paid;
   let state=ledger===null?'NO MATCHING RECEIPT DETAIL':Math.abs(difference)<0.01?'MATCH':'REVIEW DIFFERENCE';
   paymentRows.push([end,date(i.invoice_date),i.client_name,ref,currency(i),n(i.total_due),paid,ledger===null?'Not available':ledger,difference===null?'Not calculable':difference,n(i.withholding_tax_amount),bal(i),state]);
   if(ledger===null)exceptions.push(['Review','Invoice cash payment could not be matched to receipt detail',ref,currency(i),paid,'No matching receipt rows','', 'Check invoice_payments and legacy payment notes; do not post a duplicate receipt.']);
   else if(Math.abs(difference)>=0.01)exceptions.push(['High','Invoice cash total differs from receipt detail',ref,currency(i),paid,ledger,difference,'Verify receipt ledger against invoice payment history before correcting either record.']);
   if(n(i.total_due)<0||n(i.amount_paid)<0||n(i.withholding_tax_amount)<0)exceptions.push(['High','Negative invoice amount detected',ref,currency(i),n(i.total_due),paid,'','Review source invoice/payment records.']);
   if(n(i.amount_paid)+n(i.withholding_tax_amount)>n(i.total_due)+0.01)exceptions.push(['Review','Cash plus WHT exceeds invoice total',ref,currency(i),n(i.total_due),paid+n(i.withholding_tax_amount),paid+n(i.withholding_tax_amount)-n(i.total_due),'Confirm credit notes, overpayment treatment and WHT allocation.']);
  });
  const ageing=[['As At','Client','Invoice Reference','Invoice Date','Due Date','Currency','Invoice Total','Cash Paid','WHT','Outstanding','Days Past Due / Age','Ageing Band','Status']];
  invoices.filter(i=>bal(i)>0.009).forEach(i=>{
   const due=date(i.due_date||i.payment_due_date||i.invoice_date),days=ageDays(due,end),band=days===''?'Unknown':days<=0?'Not overdue':days<=30?'1–30 days':days<=60?'31–60 days':days<=90?'61–90 days':'90+ days';
   ageing.push([end,i.client_name,i.invoice_number,date(i.invoice_date),due,currency(i),n(i.total_due),n(i.amount_paid),n(i.withholding_tax_amount),bal(i),days,band,i.status||'Outstanding']);
  });
  const expenseBreakdown=[['Source','Date','Category','Reference','Description','Currency','Amount','Status','In selected period?']];
  const expenses=allEntries();
  expenses.forEach(e=>expenseBreakdown.push(['Expense Entries',date(e.date),e.category||'Uncategorised',e.reference||'',e.description||'', 'TZS',n(e.amount),status(e),inPeriod(e.date)?'Yes':'No']));
  allManual().filter(t=>t.tx_type==='expenditure'||t.tx_type==='drawing').forEach(t=>expenseBreakdown.push([t.tx_type==='drawing'?'Partner Drawings':'Manual Expenditure',date(t.date),t.category||'Uncategorised',t.reference||'',t.description||'',currency(t),n(t.amount),status(t),inPeriod(t.date)?'Yes':'No']));
  (Array.isArray(window._fdAllOfficeExpenses)?window._fdAllOfficeExpenses:[]).forEach(e=>expenseBreakdown.push(['Office Expense Register',date(e.expense_date),e.category||e.expense_category||'Uncategorised',e.reference||e.id||'',e.description||e.notes||'','TZS',n(e.amount),e.archived_at?'archived':'active',inPeriod(e.expense_date)?'Yes':'No']));
  (Array.isArray(window._fdAllPayroll)?window._fdAllPayroll:[]).forEach(p=>{const pd=(p.payroll_month?String(p.payroll_month).slice(0,7)+'-01':date(p.created_at));expenseBreakdown.push(['Payroll',pd,'Payroll',p.reference||p.payroll_month||'',p.status||'','TZS',n(p.net_pay||p.total_net||p.gross_pay||p.amount||p.total_amount),status(p),inPeriod(pd)?'Yes':'No'])});
  const manual=allManual().filter(t=>inPeriod(t.date)),approved=manual.filter(t=>status(t)==='approved');
  const manualSummary=[['Transaction Type','Currency','Approved Amount (selected period)','Pending Amount (selected period)','Rejected / Cancelled Amount (selected period)']];
  ['revenue','expenditure','drawing','loan'].forEach(type=>{
   const currencies=[...new Set(manual.filter(t=>t.tx_type===type).map(currency))];if(!currencies.length)currencies.push('TZS');
   currencies.forEach(c=>{const group=manual.filter(t=>t.tx_type===type&&currency(t)===c);manualSummary.push([type,c,group.filter(t=>status(t)==='approved').reduce((s,t)=>s+n(t.amount),0),group.filter(t=>status(t)==='pending').reduce((s,t)=>s+n(t.amount),0),group.filter(t=>['rejected','cancelled'].includes(status(t))).reduce((s,t)=>s+n(t.amount),0)])});
  });
  if(!invoices.length)exceptions.push(['Info','No invoices found on or before report end date','', '',0,0,0,'Check the reporting date and invoice register if this is unexpected.']);
  if(!receipts.length)exceptions.push(['Review','Receipt detail unavailable in dashboard metrics','','','Receipt rows','0','','Payment reconciliation is limited; verify invoice_payments and legacy receipt records.']);
  rows['Invoice Payment Reconciliation']=paymentRows;
  rows['Receivables Ageing']=ageing;
  rows['Expense Source Breakdown']=expenseBreakdown;
  rows['Manual Transaction Status']=manualSummary;
  rows['Reconciliation Exceptions']=exceptions;
  return rows;
 };
 window.MOLMSFinancialReconciliationDetailV1={version:1,applied:true,audit:function(){
  const m=fdMetrics(),end=dateEnd(),invoices=allInvoices().filter(i=>date(i.invoice_date)&&date(i.invoice_date)<=end);
  return {asAt:end,invoicesAsAt:invoices.length,openReceivables:invoices.filter(i=>bal(i)>0.009).length,receiptDetailRows:(m.invoiceCashReceipts||[]).length,expenseEntries:allEntries().length,manualTransactions:allManual().length,readOnly:true};
 }};
})();