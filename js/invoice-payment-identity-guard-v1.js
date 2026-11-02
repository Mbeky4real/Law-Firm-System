/* MOLMS invoice payment identity guard v1.
 * Resolve and verify the invoice UUID immediately before the payment RPC.
 * If a stale/mismatched context ID is present, recover by the immutable invoice
 * number displayed in the active invoice form. Never write payment data here.
 */
(function(){
  'use strict';
  if(window.__molmsInvoicePaymentIdentityGuardV1) return;
  window.__molmsInvoicePaymentIdentityGuardV1 = true;
  const original = window.invSubmitPayment;
  if(typeof original !== 'function'){
    console.error('[MOLMS payment identity guard] invSubmitPayment is unavailable at load time.');
    return;
  }
  window.invSubmitPayment = async function(){
    try{
      const ctx = typeof _invPaymentCtx !== 'undefined' ? _invPaymentCtx : null;
      if(!ctx) return original.apply(this, arguments);
      const client = window.sb || window.supabaseClient;
      if(!client) throw new Error('Payment database connection is unavailable. Refresh and try again.');
      const formNumber = String(document.getElementById('invNumber')?.value || '').trim();
      const requestedId = String(ctx.invoiceId || (typeof _invActiveId !== 'undefined' ? _invActiveId : '') || '').trim();
      let invoice = null;
      if(requestedId){
        const byId = await client.from('invoices').select('id,invoice_number,status,invoice_type,total_due').eq('id',requestedId).maybeSingle();
        if(byId.error) throw byId.error;
        invoice = byId.data || null;
      }
      if(!invoice && formNumber){
        const byNumber = await client.from('invoices').select('id,invoice_number,status,invoice_type,total_due').eq('invoice_number',formNumber).maybeSingle();
        if(byNumber.error) throw byNumber.error;
        invoice = byNumber.data || null;
      }
      if(!invoice){
        throw new Error('The selected invoice could not be matched to a saved invoice record. Re-select the invoice from the saved-invoices list and retry. No payment was recorded.');
      }
      if(formNumber && invoice.invoice_number !== formNumber){
        throw new Error('The selected invoice reference does not match the active form. Re-select the intended invoice before recording payment. No payment was recorded.');
      }
      if(!['issued','part_paid','overdue','paid'].includes(invoice.status)){
        throw new Error('Only an issued tax invoice can receive payment. No payment was recorded.');
      }
      if(invoice.invoice_type !== 'tax'){
        throw new Error('A proforma must be converted through the approved conversion workflow before payment allocation.');
      }
      ctx.invoiceId = invoice.id;
      if(typeof _invActiveId !== 'undefined') _invActiveId = invoice.id;
      return await original.apply(this, arguments);
    }catch(error){
      const box=document.getElementById('invPayError');
      if(box){ box.textContent='Payment record failed: '+(error?.message||String(error)); box.style.display=''; }
      else if(typeof window.notice==='function') window.notice('Payment record failed: '+(error?.message||String(error)),'err');
      console.error('[MOLMS invoice payment identity guard]',error);
    }
  };
})();
