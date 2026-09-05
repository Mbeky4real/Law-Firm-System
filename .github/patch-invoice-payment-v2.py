from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')
marker = 'MOLMS-INVOICE-PAYMENT-V2'
if marker in text:
    print('Patch already present')
    raise SystemExit(0)

patch = r'''
<script>
// MOLMS-INVOICE-PAYMENT-V2
// Keeps payment recording inside the Invoice module and routes all settlements
// through the database RPC so Proforma conversion, payment ledger and dashboard
// figures stay consistent.
async function invRecordPayment(){
  if(!_invActiveId){ notice('Save the invoice first.','err'); return; }
  const {data:inv,error}=await sb.from('invoices').select('id,invoice_number,invoice_type,status,total_due,subtotal,vat_rate,amount_paid,withholding_tax_amount,client_name,converted_tax_invoice_id').eq('id',_invActiveId).maybeSingle();
  if(error||!inv){ notice('Invoice could not be loaded.','err'); return; }
  if(inv.status==='superseded'&&inv.converted_tax_invoice_id){ await invLoadInvoice(inv.converted_tax_invoice_id); return invRecordPayment(); }
  if(['draft','void','cancelled','superseded'].includes(inv.status)){ notice('Only an issued invoice can receive payment.','err'); return; }

  const currentCash=Number(inv.amount_paid||0), currentWht=Number(inv.withholding_tax_amount||0);
  const originalTotal=Number(inv.total_due||0), originalSubtotal=Number(inv.subtotal||0);
  const isProforma=inv.invoice_type==='proforma';
  _invPaymentCtx={invoiceId:inv.id,invoiceType:inv.invoice_type,originalTotal,originalSubtotal,vatRate:Number(inv.vat_rate||0),currentCash,currentWht,total:originalTotal,subtotal:originalSubtotal};
  _invPaymentSubmitting=false;

  let panel=$('invPayConversionPanel');
  if(isProforma){
    if(!panel){
      panel=document.createElement('div');
      panel.id='invPayConversionPanel';
      panel.style.cssText='margin:0 0 14px;padding:12px;border:1px solid #ecd081;border-radius:10px;background:#fff8e8';
      $('invPayHeader').insertAdjacentElement('afterend',panel);
    }
    panel.style.display='block';
    panel.innerHTML=`<div style="font-size:11px;font-weight:800;color:#775000;margin-bottom:8px">PROFORMA → TAX INVOICE</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:8px">The original Proforma will be preserved as Superseded. A separate Tax Invoice will be created before this payment is allocated.</div>
      <label style="font-size:11px;font-weight:700;color:var(--muted)">Final Agreed Total *</label>
      <input id="invPayAgreedTotal" type="number" min="0.01" step="0.01" class="search" value="${originalTotal}" oninput="invPaymentRecalc()" style="width:100%;margin-top:4px;font-size:12px">
      <label style="font-size:11px;font-weight:700;color:var(--muted);margin-top:8px">Reason for revision (optional)</label>
      <input id="invPayConversionReason" class="search" placeholder="e.g. Client renegotiated final professional fee" style="width:100%;margin-top:4px;font-size:12px">`;
  }else if(panel){ panel.style.display='none'; panel.innerHTML=''; }

  const cur=val('invCurrency')||'TZS';
  $('invPayHeader').innerHTML=`Client: <b style="color:var(--text)">${esc(inv.client_name||invGetClientName()||'—')}</b><br>${isProforma?'Proforma':'Invoice'}: <b style="color:var(--text)">${esc(inv.invoice_number||val('invNumber')||'Draft')}</b><br>${isProforma?'Proforma Total':'Invoice Total'}: <b style="color:var(--text)">${cur} ${originalTotal.toLocaleString()}</b><br>Previously Settled: <b style="color:var(--text)">${cur} ${(currentCash+currentWht).toLocaleString()}</b>`;
  $('invPayCash').value='';
  $('invPayDate').value=new Date().toISOString().slice(0,10);
  $('invPayMethod').value='Bank Transfer';
  $('invPayReference').value='';
  $('invPayWhtRate').value='5';
  $('invPayError').style.display='none';
  invPaymentWhtToggle(false);
  invPaymentRecalc();
  $('invPaymentModal').style.display='flex';
}

function invPaymentRecalc(){
  if(!_invPaymentCtx) return;
  const isProforma=_invPaymentCtx.invoiceType==='proforma';
  let total=isProforma?Number(val('invPayAgreedTotal')):Number(_invPaymentCtx.originalTotal||0);
  if(!Number.isFinite(total)||total<0) total=0;
  const vatRate=Number(_invPaymentCtx.vatRate||0);
  const subtotal=vatRate>0?Math.round((total/(1+vatRate/100))*100)/100:total;
  _invPaymentCtx.total=total; _invPaymentCtx.subtotal=subtotal;
  const currentCash=Number(_invPaymentCtx.currentCash||0), currentWht=Number(_invPaymentCtx.currentWht||0);
  const cur=val('invCurrency')||'TZS';
  const whtOn=$('invPayWhtSection')?.dataset.active==='1';
  const cash=Number(val('invPayCash'))||0;
  let wht=0;
  if(whtOn){
    const rate=Number(val('invPayWhtRate'))||0;
    wht=Math.round((subtotal*rate/100)*100)/100;
    if($('invPayWhtAmountDisplay')) $('invPayWhtAmountDisplay').value=`${cur} ${wht.toLocaleString()}`;
  }
  if($('invPayWhtBase')) $('invPayWhtBase').textContent=`${cur} ${subtotal.toLocaleString()}`;
  const newCashTotal=currentCash+cash, newWhtTotal=currentWht+wht;
  const settled=newCashTotal+newWhtTotal;
  const outstanding=Math.max(0,total-settled);
  const overshoot=settled>total+0.01;
  const tbl=$('invPaySummaryTable');
  if(tbl){
    const row=(l,v,bold)=>`<tr><td style="padding:3px 0;color:${bold?'var(--navy)':'var(--muted)'};font-weight:${bold?800:600}">${l}</td><td style="padding:3px 0;text-align:right;font-weight:${bold?800:600};color:${bold?'var(--navy)':'var(--text)'}">${cur} ${v.toLocaleString()}</td></tr>`;
    tbl.innerHTML=row(isProforma?'Final Tax Invoice Total':'Invoice Total',total,false)+row('Cash Received',newCashTotal,false)+(newWhtTotal>0?row('WHT Deducted',newWhtTotal,false):'')+row('Total Settled',settled,false)+row('Balance Remaining',outstanding,true);
  }
  const badge=$('invPayStatusBadge');
  if(badge){
    if(overshoot){ badge.style.background='#fef2f2'; badge.style.color='#991b1b'; badge.textContent='OVER-SETTLEMENT — NOT VALID'; }
    else if(outstanding<=0.01&&settled>0){ badge.style.background='#dcfce7'; badge.style.color='#166534'; badge.textContent='FULLY PAID'; }
    else if(settled>0){ badge.style.background='#fef3c7'; badge.style.color='#92400e'; badge.textContent=`PARTIALLY PAID — ${cur} ${outstanding.toLocaleString()} REMAINING`; }
    else { badge.style.background='#f1f5f9'; badge.style.color='#475569'; badge.textContent=isProforma?'WILL CONVERT TO TAX INVOICE':'NO PAYMENT ENTERED'; }
  }
  return {cash,wht,newCashTotal,newWhtTotal,settled,outstanding,overshoot,total,subtotal};
}

async function invSubmitPayment(){
  if(_invPaymentSubmitting||!_invPaymentCtx) return;
  const showError=(msg)=>{ const el=$('invPayError'); el.textContent=msg; el.style.display=''; };
  $('invPayError').style.display='none';
  const cash=Number(val('invPayCash'));
  const date=val('invPayDate');
  const whtOn=$('invPayWhtSection')?.dataset.active==='1';
  const rate=whtOn?Number(val('invPayWhtRate')):null;
  const isProforma=_invPaymentCtx.invoiceType==='proforma';
  const agreedTotal=isProforma?Number(val('invPayAgreedTotal')):null;
  const reason=isProforma?(val('invPayConversionReason')||'').trim():null;
  if(!date){ showError('Payment date is required.'); return; }
  if(!Number.isFinite(cash)||cash<0){ showError('Cash amount cannot be negative.'); return; }
  if(isProforma&&(!Number.isFinite(agreedTotal)||agreedTotal<=0)){ showError('Enter the final agreed total before converting the Proforma.'); return; }
  if(whtOn&&(!Number.isFinite(rate)||rate<0)){ showError('Enter a valid WHT rate.'); return; }
  const calc=invPaymentRecalc();
  if(!calc||calc.overshoot){ showError('Payment exceeds the final invoice total.'); return; }
  if(calc.cash===0&&calc.wht===0){ showError('Enter a cash amount or a WHT deduction.'); return; }

  _invPaymentSubmitting=true;
  const submitBtn=$('invPaySubmitBtn');
  if(submitBtn){ submitBtn.disabled=true; submitBtn.textContent=isProforma?'Convert & Record Payment…':'Recording…'; }
  try{
    const methodRef=[val('invPayMethod'),(val('invPayReference')||'').trim()].filter(Boolean).join(' — ');
    const {data,error}=await sb.rpc('record_invoice_payment',{
      p_invoice_id:_invPaymentCtx.invoiceId,
      p_cash:calc.cash,
      p_payment_date:date,
      p_method_ref:methodRef||null,
      p_wht_rate:whtOn?rate:null,
      p_agreed_total:isProforma?agreedTotal:null,
      p_conversion_reason:isProforma?(reason||null):null
    });
    if(error){ showError('Payment record failed: '+error.message); return; }
    const result=data||{};
    invClosePaymentModal();
    const taxId=result.invoice_id||_invPaymentCtx?.invoiceId;
    if(taxId){ await invLoadInvoice(taxId); }
    await invRenderKpi();
    if(typeof fdRefresh==='function'&&fdCanAccess()) await fdRefresh();
    const cur=val('invCurrency')||'TZS';
    if(result.converted){
      notice(`Proforma converted to Tax Invoice. ${cur} ${calc.cash.toLocaleString()} recorded; ${cur} ${Number(result.outstanding||0).toLocaleString()} remains outstanding.`,'ok');
    }else{
      notice(calc.wht>0?`Recorded: Cash ${cur} ${calc.cash.toLocaleString()} + WHT ${cur} ${calc.wht.toLocaleString()}. Status: ${result.status||'updated'}.`:`Payment of ${cur} ${calc.cash.toLocaleString()} recorded. Status: ${result.status||'updated'}.`,'ok');
    }
  }finally{
    _invPaymentSubmitting=false;
    if(submitBtn){ submitBtn.disabled=false; submitBtn.textContent='Record Payment'; }
  }
}
</script>
'''

pos = text.lower().rfind('</body>')
if pos < 0:
    raise SystemExit('Could not find </body> in index.html')
text = text[:pos] + patch + '\n' + text[pos:]
path.write_text(text, encoding='utf-8')
print('Invoice payment V2 patch inserted')
