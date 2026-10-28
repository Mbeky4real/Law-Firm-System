/* MOLMS Financial Report Consistency V1
 * Phase 1: align Print Financial Report with the canonical selected-period
 * dashboard metrics. Presentation/reporting only; no ledger data is changed.
 */
(function financialReportConsistencyV1(){
  'use strict';
  if(typeof window.fdMetrics!=='function' || typeof window.fdHealth!=='function') return;

  const escHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=(currency,value)=>escHtml(currency||'TZS')+' '+Number(value||0).toLocaleString();
  const currencyLines=byCur=>Object.entries(byCur||{})
    .filter(([currency,value])=>currency==='TZS'||Number(value)!==0)
    .map(([currency,value])=>'<div><strong>'+escHtml(currency)+'</strong> '+Number(value||0).toLocaleString()+'</div>').join('');

  window.fdPrintReport=function(){
    try{
      const m=fdMetrics(),h=fdHealth(),period=fdPeriodLabel(),dates=fdGetPeriodDates();
      const invoiceRows=(m.invoices||[]).map(i=>{
        const paid=Number(i.amount_paid||0)+Number(i.withholding_tax_amount||0);
        const balance=Math.max(0,Number(i.total_due||0)-paid);
        return '<tr><td>'+escHtml((i.invoice_date||'').slice(0,10))+'</td><td>'+escHtml(i.client_name||'—')+'</td><td>'+escHtml(i.invoice_number||'—')+'</td><td>'+escHtml(i.matter_title||i.matter_ref||'—')+'</td><td>'+escHtml(i.invoice_type||'Tax')+'</td><td class="num">'+money(i.currency,i.total_due)+'</td><td class="num">'+money(i.currency,paid)+'</td><td class="num">'+money(i.currency,balance)+'</td><td>'+escHtml(i.status||'—')+'</td></tr>';
      }).join('');
      const selectedManual=(_fdAllManual||[]).filter(t=>fdInPeriod(t.date));
      const manualRows=selectedManual.map(t=>'<tr><td>'+escHtml(t.date||'—')+'</td><td>'+escHtml(t.reference||'—')+'</td><td>'+escHtml(t.tx_type||'—')+'</td><td>'+escHtml(t.category||'—')+'</td><td>'+escHtml(t.description||'—')+'</td><td class="num">'+money(t.currency,t.amount)+'</td><td>'+escHtml(fdManualStatus(t))+'</td></tr>').join('');
      const expenseRows=(m.entries||[]).map(e=>'<tr><td>'+escHtml(e.date||'—')+'</td><td>'+escHtml(e.category||'—')+'</td><td class="num">'+money('TZS',e.amount)+'</td></tr>').join('');
      const w=window.open('','_blank','width=1100,height=850');
      if(!w){notice('Print report was blocked by the browser. Allow pop-ups and retry.','err');return;}
      w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>M&O LAW OFFICE — Financial Report — '+escHtml(period)+'</title><style>'+
        'body{font-family:Arial,sans-serif;font-size:11px;color:#172033;margin:24px}h1{font-family:Georgia,serif;font-size:22px;margin:0 0 4px;color:#0f2440}h2{font-size:14px;margin:20px 0 8px;padding-bottom:5px;border-bottom:1px solid #c9b9a7;color:#0f2440}.meta{color:#667085;font-size:10px;margin:4px 0 14px}.kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:14px 0}.card{border:1px solid #ddd4c8;border-radius:7px;padding:9px}.label{font-size:10px;color:#667085;margin-bottom:5px}.value{font-weight:700;font-size:14px}table{width:100%;border-collapse:collapse;margin-bottom:14px}th{background:#f5f0e8;text-align:left;font-size:9px}th,td{padding:5px;border-bottom:1px solid #e6e8eb;vertical-align:top}.num{text-align:right;white-space:nowrap}.empty{color:#667085;font-style:italic}.note{font-size:9px;color:#667085;margin-top:14px}@media print{body{margin:10mm}h2{break-after:avoid}tr{break-inside:avoid}}'+
        '</style></head><body><h1>M&O LAW OFFICE</h1><div><strong>Partners Financial Report</strong> · '+escHtml(period)+'</div>'+
        '<div class="meta">Reporting dates: '+escHtml(dates.start)+' to '+escHtml(dates.end)+' · Generated: '+escHtml(new Date().toLocaleString())+' · Prepared by: '+escHtml(window.authFullName||'Partner')+' · Status: '+escHtml(h.level)+'</div>'+
        '<div class="kpis">'+
        '<div class="card"><div class="label">RECOGNISED REVENUE</div><div class="value">'+currencyLines(m.revenueByCur)+'</div></div>'+
        '<div class="card"><div class="label">EXPENSES</div><div class="value">'+currencyLines(m.expensesByCur)+'</div></div>'+
        '<div class="card"><div class="label">NET RESULT</div><div class="value">'+currencyLines(m.balanceByCur)+'</div></div>'+
        '<div class="card"><div class="label">COLLECTIONS</div><div class="value">'+currencyLines(m.collectedByCur)+'</div></div>'+
        '<div class="card"><div class="label">OUTSTANDING RECEIVABLES</div><div class="value">'+currencyLines(m.outstandingByCur)+'</div></div>'+
        '<div class="card"><div class="label">CASH POSITION (DASHBOARD BASIS)</div><div class="value">'+currencyLines(m.cashByCur)+'</div></div></div>'+
        '<h2>Revenue & Invoice Register — Selected Period</h2><table><thead><tr><th>Date</th><th>Client</th><th>Invoice Ref</th><th>Matter</th><th>Type</th><th class="num">Invoice Total</th><th class="num">Settled</th><th class="num">Balance</th><th>Status</th></tr></thead><tbody>'+
        (invoiceRows||'<tr><td class="empty" colspan="9">No recognised tax invoices for this period.</td></tr>')+'</tbody></table>'+
        '<h2>Manual Transactions — Selected Period</h2><p class="meta">Statuses are shown as recorded. Only approved transactions are included in dashboard metrics.</p><table><thead><tr><th>Date</th><th>Reference</th><th>Type</th><th>Category</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead><tbody>'+
        (manualRows||'<tr><td class="empty" colspan="7">No manual transactions for this period.</td></tr>')+'</tbody></table>'+
        '<h2>Expense Entries — Selected Period</h2><table><thead><tr><th>Date</th><th>Category</th><th class="num">Amount</th></tr></thead><tbody>'+
        (expenseRows||'<tr><td class="empty" colspan="3">No expense entries for this period.</td></tr>')+'</tbody></table>'+
        '<h2>Financial Assessment</h2><p><strong>Status:</strong> '+escHtml(h.level)+'</p><p><strong>Assessment:</strong> '+escHtml((h.reasons||[]).join(' '))+'</p><p><strong>Recommended action:</strong> '+escHtml(h.action||'—')+'</p>'+
        '<div class="note">Figures use the Financial Dashboard selected-period metrics. Currency totals are displayed separately and must not be added across currencies. This management report does not replace statutory accounts or the underlying ledgers.</div></body></html>');
      w.document.close();w.focus();w.print();
      notice('Financial report prepared for printing.','ok');
    }catch(error){notice('Print report failed: '+(error?.message||error),'err');}
  };
  window.MOLMSFinancialReportConsistencyV1={version:1,applied:true};
})();