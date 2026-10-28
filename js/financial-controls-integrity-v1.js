/* MOLMS Financial Controls & Integrity V1
 * Phase 4: read-only duplicate candidates, WHT checks and source-linked audit trail.
 * Findings are review flags only; no records are edited, deleted, or auto-reconciled.
 */
(function financialControlsIntegrityV1(){
 'use strict';
 if(typeof window.fdExportRows!=='function'||typeof window.fdMetrics!=='function')return;
 const previous=window.fdExportRows;
 const n=v=>Number(v||0), d=v=>String(v||'').slice(0,10), cur=r=>r?.currency||'TZS';
 const norm=v=>String(v??'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 const status=t=>String(t?.status||(t?.is_approved?'approved':'pending')).toLowerCase();
 const periodCheck=v=>typeof window.fdInPeriod==='function'&&fdInPeriod(v);
 const allManual=()=>Array.isArray(window._fdAllManual)?window._fdAllManual:(Array.isArray(window._fdManualTx)?window._fdManualTx:[]);
 const allEntries=()=>Array.isArray(window._fdAllEntries)?window._fdAllEntries:[];
 const allInvoices=()=>Array.isArray(window._fdAllInvoices)?window._fdAllInvoices:[];
 const allOffice=()=>Array.isArray(window._fdAllOfficeExpenses)?window._fdAllOfficeExpenses:[];
 const allPayroll=()=>Array.isArray(window._fdAllPayroll)?window._fdAllPayroll:[];
 const asAt=()=>{try{return fdGetPeriodDates().end}catch(_){return d(new Date().toISOString())}};
 const dateInPeriod=v=>periodCheck(v);
 const duplicateGroups=(items,keyFn)=>{const groups=new Map();items.forEach(item=>{const key=keyFn(item);if(!key)return;const a=groups.get(key)||[];a.push(item);groups.set(key,a)});return [...groups.entries()].filter(([,a])=>a.length>1)};
 window.fdExportRows=function(){
  const rows=previous.apply(this,arguments),m=fdMetrics(),end=asAt();
  const audit=[['Severity','Control','Source Register','Record Reference','Record Date','Currency','Amount','Related Record / Source','Reason for Flag','Recommended Review']];
  const duplicateRows=[['Duplicate Type','Severity','Source Register','Reference','Date','Currency','Amount','Description','Matching Record(s)','Reason / Review Required']];
  const whtRows=[['Invoice Date','Client','Invoice Reference','Currency','Invoice Total','Cash Paid','WHT Recorded','Cash + WHT','Calculated Balance','Control Result','Review Note']];
  const receiptRows=Array.isArray(m.invoiceCashReceipts)?m.invoiceCashReceipts:[];
  const invoices=allInvoices().filter(i=>d(i.invoice_date)&&d(i.invoice_date)<=end&&String(i.status||'').toLowerCase()!=='cancelled');
  const addAudit=(severity,control,source,ref,date,currency,amount,related,reason,review)=>audit.push([severity,control,source,ref||'',d(date),currency||'TZS',amount??'',related||'',reason,review]);
  const addDuplicate=(type,severity,source,ref,date,currency,amount,description,match,reason,review)=>duplicateRows.push([type,severity,source,ref||'',d(date),currency||'TZS',amount??'',description||'',match||'',reason+' '+review]);
  // WHT checks are performed against invoice totals; no tax amount is changed.
  invoices.forEach(i=>{
   const total=n(i.total_due),cash=n(i.amount_paid),wht=n(i.withholding_tax_amount),settled=cash+wht,balance=total-settled;
   let result='OK',note='Cash and recorded WHT do not exceed invoice total.';
   if(wht<0){result='REVIEW: NEGATIVE WHT';note='Recorded withholding tax is negative; inspect the source invoice/payment records.'}
   else if(settled>total+0.01){result='REVIEW: OVER-SETTLED';note='Cash plus WHT exceeds invoice total; check allocation, credit notes or overpayment treatment.'}
   else if(total>0&&wht>total){result='REVIEW: WHT EXCEEDS TOTAL';note='Recorded withholding tax exceeds the invoice total.'}
   else if(wht>0&&cash===0){result='CHECK SUPPORT';note='WHT is recorded but cash paid is zero; confirm the withholding certificate and payment allocation.'}
   whtRows.push([d(i.invoice_date),i.client_name||'',i.invoice_number||i.id||'',cur(i),total,cash,wht,settled,Math.max(0,balance),result,note]);
   if(result!=='OK'){addAudit(result.startsWith('REVIEW')?'High':'Review','Withholding tax / settlement', 'Invoice Register',i.invoice_number||i.id,d(i.invoice_date),cur(i),wht,'Invoice total '+total+'; cash '+cash,note,'Verify source documentation before changing invoice values.')}
  });
  // Exact duplicate manual-transaction signatures: candidates only, never automatic deletions.
  const manuals=allManual().filter(t=>dateInPeriod(t.date));
  const manualGroups=duplicateGroups(manuals,t=>[d(t.date),t.tx_type||'',cur(t),n(t.amount).toFixed(2),norm(t.reference)||norm(t.description),norm(t.counterparty)].join('|'));
  manualGroups.forEach(([key,items])=>items.forEach((t,idx)=>{
   const refs=items.filter((_,j)=>j!==idx).map(x=>x.reference||x.id||'record').join(', ');
   const reason='Same date, transaction type, currency, amount and identifying text as another manual transaction.';
   addDuplicate('Potential duplicate manual transaction','Review','Manual Transactions',t.reference||t.id,t.date,cur(t),n(t.amount),t.description,refs,reason,'Compare source receipts/invoices and approval history; do not delete based on this flag alone.');
   addAudit('Review','Potential duplicate manual transaction','Manual Transactions',t.reference||t.id,t.date,cur(t),n(t.amount),refs,reason,'Confirm whether this is a legitimate separate transaction.');
  }));
  // Receipt candidates: same invoice, receipt date and cash amount.
  const receiptGroups=duplicateGroups(receiptRows,r=>{const i=r.invoice||{};return [i.id||r.invoice_id||i.invoice_number||'',d(r.date||r.payment_date),cur(r),n(r.amount).toFixed(2)].join('|')});
  receiptGroups.forEach(([key,items])=>items.forEach((r,idx)=>{
   const i=r.invoice||{},ref=i.invoice_number||r.invoice_id||i.id||'Invoice';
   const matches=items.filter((_,j)=>j!==idx).map(x=>x.id||x.reference||'receipt row').join(', ');
   const reason='Same invoice, receipt date, currency and cash amount appears more than once in the available receipt details.';
   addDuplicate('Potential duplicate receipt','High','Payment Receipts',ref,r.date||r.payment_date,cur(r),n(r.amount),'Invoice cash receipt',matches,reason,'Compare invoice_payments and source receipts before treating as duplicate.');
   addAudit('High','Potential duplicate receipt','Payment Receipts',ref,r.date||r.payment_date,cur(r),n(r.amount),matches,reason,'Verify against source receipt and payment ledger.');
  }));
  // Build expense-source records with the minimum common fields available across modules.
  const expenseRecords=[];
  allEntries().filter(e=>dateInPeriod(e.date)).forEach(e=>expenseRecords.push({source:'Expense Entries',ref:e.reference||e.id,date:d(e.date),currency:'TZS',amount:n(e.amount),description:e.description||e.category||'',category:e.category||''}));
  manuals.filter(t=>t.tx_type==='expenditure'||t.tx_type==='drawing').forEach(t=>expenseRecords.push({source:t.tx_type==='drawing'?'Partner Drawings':'Manual Transactions',ref:t.reference||t.id,date:d(t.date),currency:cur(t),amount:n(t.amount),description:t.description||t.category||'',category:t.category||'',status:status(t)}));
  allOffice().filter(e=>dateInPeriod(e.expense_date)&&!e.archived_at).forEach(e=>expenseRecords.push({source:'Office Expense Register',ref:e.reference||e.id,date:d(e.expense_date),currency:'TZS',amount:n(e.amount),description:e.description||e.notes||e.category||e.expense_category||'',category:e.category||e.expense_category||''}));
  allPayroll().forEach(p=>{const pd=p.payroll_month?String(p.payroll_month).slice(0,7)+'-01':d(p.created_at);if(dateInPeriod(pd)&&!['cancelled','rejected','draft'].includes(status(p)))expenseRecords.push({source:'Payroll',ref:p.reference||p.payroll_month||p.id,date:pd,currency:'TZS',amount:n(p.net_pay||p.total_net||p.gross_pay||p.amount||p.total_amount),description:'Payroll '+(p.payroll_month||''),category:'Payroll',status:status(p)})});
  // Cross-source matching is intentionally conservative: exact date/currency/amount plus matching normalized wording.
  const crossPairs=[];
  for(let i=0;i<expenseRecords.length;i++)for(let j=i+1;j<expenseRecords.length;j++){
   const a=expenseRecords[i],b=expenseRecords[j];if(a.source===b.source||!a.date||a.date!==b.date||a.currency!==b.currency||Math.abs(a.amount-b.amount)>0.009||a.amount<=0)continue;
   const aa=norm(a.description),bb=norm(b.description),ac=norm(a.category),bc=norm(b.category);
   const words=s=>new Set(s.split(' ').filter(w=>w.length>2));
   const wa=words(aa),wb=words(bb),overlap=[...wa].filter(w=>wb.has(w)).length;
   const sameText=aa&&bb&&(aa===bb||overlap>=2),sameCategory=ac&&bc&&ac===bc;
   if(sameText||sameCategory)crossPairs.push([a,b]);
  }
  crossPairs.forEach(([a,b])=>{
   const reason='Different expense sources contain the same date, currency and amount with matching description/category; may be legitimate but could be double-counted.';
   addDuplicate('Potential cross-source expense duplicate','Review',a.source,a.ref,a.date,a.currency,a.amount,a.description,b.source+' / '+(b.ref||''),reason,'Check whether both entries represent the same underlying payment and whether dashboard metrics include both.');
   addAudit('Review','Potential cross-source expense duplicate',a.source,a.ref,a.date,a.currency,a.amount,b.source+' / '+(b.ref||''),reason,'Trace both entries to source evidence and confirm which register is authoritative.');
  });
  // Surface unsupported/unmatched data as an explicit limitation rather than fabricating a match.
  if(!receiptRows.length&&invoices.some(i=>n(i.amount_paid)>0))addAudit('Review','Receipt-detail coverage','Payment Receipts','','', '', '', 'Invoice Register','Invoices have recorded cash paid but no detailed receipt rows were exposed to this report.','Check invoice_payments and legacy payment notes; absence of detail is not proof of a missing payment.');
  rows['Duplicate & Integrity Checks']=duplicateRows;
  rows['WHT & Settlement Checks']=whtRows;
  rows['Financial Control Audit Trail']=audit;
  return rows;
 };
 window.MOLMSFinancialControlsIntegrityV1={version:1,applied:true,audit:function(){
  const rows=window.fdExportRows(),checks=rows['Duplicate & Integrity Checks']||[],wht=rows['WHT & Settlement Checks']||[],trail=rows['Financial Control Audit Trail']||[];
  return {asAt:asAt(),duplicateCandidates:Math.max(0,checks.length-1),whtInvoicesChecked:Math.max(0,wht.length-1),auditFlags:Math.max(0,trail.length-1),readOnly:true};
 }};
})();