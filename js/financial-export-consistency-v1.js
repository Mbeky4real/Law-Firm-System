/* MOLMS Financial Export Consistency V1
 * Phase 2: harmonise Excel/PDF summary metrics and reporting-period filters.
 * Does not modify financial records or dashboard calculations.
 */
(function financialExportConsistencyV1(){
 'use strict';
 if(typeof window.fdMetrics!=='function'||typeof window.fdHealth!=='function')return;
 const escV=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const amount=(v)=>Number(v||0);
 const cur=(r)=>r.currency||'TZS';
 const inPeriod=(value)=>typeof window.fdInPeriod==='function'&&fdInPeriod(value);
 const balance=i=>Math.max(0,amount(i.total_due)-amount(i.amount_paid)-amount(i.withholding_tax_amount));
 const currencies=byCur=>Object.entries(byCur||{}).filter(([c,v])=>c==='TZS'||Number(v)!==0);
 const currencyText=byCur=>currencies(byCur).map(([c,v])=>c+' '+amount(v).toLocaleString()).join(' | ');
 window.fdExportRows=function(){
  const m=fdMetrics(),h=fdHealth(),dates=fdGetPeriodDates(),period=fdPeriodLabel();
  const budgets=(_fdAllBudgets||_fdBudgets||[]).filter(b=>inPeriod(String(b.budget_month||'')+'-01'));
  const manual=(_fdAllManual||_fdManualTx||[]).filter(t=>inPeriod(t.date));
  const approvedManual=manual.filter(t=>fdManualStatus(t)==='approved');
  const invoiceRows=m.invoices||[];
  const topClients=(()=>{const by={};invoiceRows.forEach(i=>{const key=(i.client_name||'Unknown')+'|'+cur(i);by[key]=(by[key]||0)+amount(i.total_due)});return Object.entries(by).map(([k,v])=>{const p=k.lastIndexOf('|');return[k.slice(0,p),k.slice(p+1),v]}).sort((a,b)=>b[2]-a[2])})();
  const manualRev=approvedManual.filter(t=>t.tx_type==='revenue').reduce((s,t)=>s+amount(t.amount),0);
  const manualExp=approvedManual.filter(t=>t.tx_type==='expenditure').reduce((s,t)=>s+amount(t.amount),0);
  const approvedBudget=budgets.reduce((s,b)=>s+amount(b.total_approved),0);
  const cashRows=currencies(m.cashByCur).map(([c,v])=>['Cash position ('+c+')',v]);
  const summary=[['Metric','Currency','Value'],['Reporting period','',period],['Period start','',dates.start],['Period end','',dates.end],['Financial status','',h.level]];
  currencies(m.revenueByCur).forEach(([c,v])=>summary.push(['Recognised revenue',c,v]));
  currencies(m.collectedByCur).forEach(([c,v])=>summary.push(['Collections recorded',c,v]));
  currencies(m.expensesByCur).forEach(([c,v])=>summary.push(['Expenses',c,v]));
  currencies(m.balanceByCur).forEach(([c,v])=>summary.push(['Net result (revenue less expenses)',c,v]));
  currencies(m.outstandingByCur).forEach(([c,v])=>summary.push(['Outstanding receivables',c,v]));
  cashRows.forEach(r=>summary.push(r));
  summary.push(['Approved budget (TZS)','TZS',approvedBudget],['Budget utilisation','',h.utilisation],['Recommended action','',h.action]);
  return {
   'Financial Summary':summary,
   'Revenue & Invoices':[['Invoice Date','Client','Invoice Reference','Matter','Invoice Type','Currency','Invoice Total','Cash Paid','Withholding Tax','Outstanding Balance','Status'],...invoiceRows.map(i=>[i.invoice_date,i.client_name,i.invoice_number,i.matter_title||i.matter_ref,i.invoice_type,cur(i),amount(i.total_due),amount(i.amount_paid),amount(i.withholding_tax_amount),balance(i),i.status])],
   'Payment Receipts':[['Receipt Date','Invoice Date','Client','Invoice Reference','Currency','Receipt Amount','Source'],...(m.invoiceCashReceipts||[]).map(r=>[r.date,r.invoice?.invoice_date,r.invoice?.client_name,r.invoice?.invoice_number,cur(r),amount(r.amount),r.invoice?.invoice_type||'Invoice payment'])],
   'Manual Transactions':[['Reference','Date','Type','Category','Description','Currency','Amount','Status','Counterparty','Payment Method','Remarks'],...manual.map(t=>[t.reference,t.date,t.tx_type,t.category,t.description,cur(t),amount(t.amount),fdManualStatus(t),t.counterparty,t.payment_method,t.remarks])],
   'Expense Entries':[['Date','Category','Amount (TZS)','Source'],...(m.entries||[]).map(e=>[e.date,e.category,amount(e.amount),'Expense entries'])],
   'Approved Manual Expenses':[['Date','Reference','Category','Description','Currency','Amount','Counterparty','Payment Method'],...approvedManual.filter(t=>t.tx_type==='expenditure').map(t=>[t.date,t.reference,t.category,t.description,cur(t),amount(t.amount),t.counterparty,t.payment_method])],
   'Budget Register':[['Budget Reference','Budget Month','Department','Approved Budget (TZS)'],...budgets.map(b=>[b.reference_number,b.budget_month,b.department,amount(b.total_approved)])],
   'Top Clients':[['Client','Currency','Recognised Invoice Revenue'],...topClients],
   'Matter Revenue':[['Matter','Client','Currency','Recognised Invoice Revenue'],...invoiceRows.map(i=>[i.matter_title||i.matter_ref,i.client_name,cur(i),amount(i.total_due)])],
   'Executive Ratios':[['Ratio','Currency','Value'],...currencies(m.revenueByCur).map(([c,v])=>['Collection / revenue',c,v?amount(m.collectedByCur[c])/v:0]),...currencies(m.expensesByCur).map(([c,v])=>['Expense / revenue',c,amount(m.revenueByCur[c])?v/amount(m.revenueByCur[c]):0]),['Budget utilisation','',h.utilisation]],
   'Cash Flow Summary':[['Metric','Currency','Value'],...currencies(m.collectedByCur).map(([c,v])=>['Recorded collections',c,v]),...currencies(m.expensesByCur).map(([c,v])=>['Expenses used in dashboard metric',c,v]),...currencies(m.cashByCur).map(([c,v])=>['Dashboard cash-position figure',c,v]),...currencies(m.balanceByCur).map(([c,v])=>['Net result (revenue less expenses)',c,v])],
   'Financial Assessment':[['Item','Value'],['Status',h.level],...(h.reasons||[]).map((r,i)=>['Assessment '+(i+1),r]),['Recommended action',h.action]]
  };
 };
 window.fdExportPDF=function(){
  try{
   const J=window.jspdf?.jsPDF;if(!J)throw new Error('PDF library is unavailable');
   const doc=new J({unit:'mm',format:'a4'}),m=fdMetrics(),h=fdHealth(),dates=fdGetPeriodDates(),period=fdPeriodLabel();
   let y=15;const page=()=>{doc.addPage();y=15};
   const line=(label,value)=>{if(y>280)page();doc.setFont('helvetica','bold');doc.text(String(label||''),15,y);doc.setFont('helvetica','normal');const lines=doc.splitTextToSize(String(value??''),120);doc.text(lines,70,y);y+=Math.max(7,lines.length*4.5)};
   const section=t=>{y+=3;if(y>275)page();doc.setFontSize(12);doc.setFont('helvetica','bold');doc.text(t,15,y);y+=7;doc.setFontSize(9)};
   const table=(headers,rows,widths)=>{
    if(y>255)page();const x0=10,available=190;let widthsUse=widths||headers.map(()=>available/headers.length);
    const drawHeader=()=>{doc.setFont('helvetica','bold');let x=x0;headers.forEach((h,i)=>{doc.text(String(h).slice(0,40),x,y);x+=widthsUse[i]});y+=5;doc.setFont('helvetica','normal');doc.line(x0,y-3,200,y-3)};
    drawHeader();
    rows.forEach(row=>{const cells=row.map(v=>String(v??'—'));const wrapped=cells.map((v,i)=>doc.splitTextToSize(v,Math.max(10,widthsUse[i]-2)));const h=Math.max(5,...wrapped.map(a=>a.length*4));if(y+h>285){page();drawHeader()}let x=x0;wrapped.forEach((lines,i)=>{doc.text(lines,x,y);x+=widthsUse[i]});y+=h+1});
   };
   doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text('M&O LAW OFFICE',15,y);y+=8;doc.setFontSize(12);doc.text('Partners Financial Report',15,y);y+=7;doc.setFontSize(9);
   line('Reporting period',period);line('Reporting dates',dates.start+' to '+dates.end);line('Generated',new Date().toLocaleString());line('Financial status',h.level);
   section('Executive Financial Summary');
   const summary=[];currencies(m.revenueByCur).forEach(([c,v])=>summary.push(['Recognised revenue',c,amount(v)]));currencies(m.collectedByCur).forEach(([c,v])=>summary.push(['Collections recorded',c,amount(v)]));currencies(m.expensesByCur).forEach(([c,v])=>summary.push(['Expenses',c,amount(v)]));currencies(m.balanceByCur).forEach(([c,v])=>summary.push(['Net result',c,amount(v)]));currencies(m.outstandingByCur).forEach(([c,v])=>summary.push(['Outstanding receivables',c,amount(v)]));currencies(m.cashByCur).forEach(([c,v])=>summary.push(['Dashboard cash-position figure',c,amount(v)]));
   table(['Metric','Currency','Amount'],summary,[90,35,65]);
   section('Revenue & Invoice Register — complete selected-period list');
   table(['Date','Client / Invoice','Currency','Total','Paid + WHT','Balance','Status'],(m.invoices||[]).map(i=>[(i.invoice_date||'').slice(0,10),(i.client_name||'—')+' / '+(i.invoice_number||'—'),cur(i),amount(i.total_due).toLocaleString(),(amount(i.amount_paid)+amount(i.withholding_tax_amount)).toLocaleString(),balance(i).toLocaleString(),i.status||'—']),[20,54,19,24,27,24,22]);
   section('Manual Transactions — complete selected-period list');
   const manual=(_fdAllManual||_fdManualTx||[]).filter(t=>inPeriod(t.date));
   table(['Date','Reference / Description','Type / Status','Currency','Amount'],manual.map(t=>[(t.date||'').slice(0,10),(t.reference||'—')+' / '+(t.description||t.category||'—'),(t.tx_type||'—')+' / '+fdManualStatus(t),cur(t),amount(t.amount).toLocaleString()]),[20,70,38,22,40]);
   section('Expense Entries — selected period');
   table(['Date','Category','Amount (TZS)'],(m.entries||[]).map(e=>[(e.date||'').slice(0,10),e.category||'—',amount(e.amount).toLocaleString()]),[35,95,60]);
   section('Financial Assessment');
   line('Reasons',(h.reasons||[]).join(' '));line('Recommended action',h.action||'—');
   if(y>270)page();y+=3;doc.setFontSize(7);doc.setTextColor(90);doc.text('Currency totals are kept separate. Dashboard cash-position figure follows the current dashboard calculation and is not a bank reconciliation or a statement of verified closing cash.',15,y,{maxWidth:180});
   doc.save('MOLMS_Financial_'+dates.monthStr+'.pdf');notice('PDF report exported successfully.','ok');
  }catch(e){notice('PDF export failed: '+(e?.message||e),'err')}
 };
 window.MOLMSFinancialExportConsistencyV1={version:1,applied:true};
})();