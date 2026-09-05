from pathlib import Path
p=Path('index.html')
s=p.read_text()
marker='MOLMS-INVOICE-PAYMENT-ROUTER-V4'
if marker in s:
    print('already patched'); raise SystemExit
patch=r'''
<script>
/* MOLMS-INVOICE-PAYMENT-ROUTER-V4 */
(function(){
  let routing=false;
  const baseRecord=window.invRecordPayment;
  const waitFrames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const hideAllPaymentModals=()=>document.querySelectorAll('[id="invPaymentModal"]').forEach(m=>{m.style.display='none';});

  async function routePaymentToInvoiceModule(invoiceId, reopen=true){
    if(routing) return;
    routing=true;
    try{
      hideAllPaymentModals();
      if(typeof page!=='undefined' && page!=='invoice' && typeof go==='function'){
        go('invoice');
        await waitFrames();
      }
      if(invoiceId && typeof invLoadInvoice==='function' && (typeof _invActiveId==='undefined' || _invActiveId!==invoiceId)){
        await invLoadInvoice(invoiceId);
        await waitFrames();
      }
      if(reopen && typeof baseRecord==='function'){
        await baseRecord.call(window);
      }
    }finally{
      routing=false;
    }
  }

  // Authoritative route for the normal Invoice-module button and any other caller.
  if(typeof baseRecord==='function'){
    window.invRecordPayment=async function(){
      const invoiceId=(typeof _invActiveId!=='undefined'&&_invActiveId)||_invPaymentCtx?.invoiceId||null;
      if(typeof page!=='undefined' && page!=='invoice'){
        await routePaymentToInvoiceModule(invoiceId,true);
        return;
      }
      return baseRecord.apply(this,arguments);
    };
  }

  // Defensive guard for legacy/dashboard handlers and duplicate modal nodes.
  // If any payment modal is made visible outside Invoices, capture the invoice,
  // close it in that context, route to Invoices and reopen there.
  function guardModal(modal){
    if(!modal || modal.dataset.paymentRouterV4==='1') return;
    modal.dataset.paymentRouterV4='1';
    const obs=new MutationObserver(async()=>{
      const visible=modal.style.display && modal.style.display!=='none';
      if(!visible || routing) return;
      if(typeof page!=='undefined' && page!=='invoice'){
        const invoiceId=_invPaymentCtx?.invoiceId || (typeof _invActiveId!=='undefined'?_invActiveId:null);
        modal.style.display='none';
        await routePaymentToInvoiceModule(invoiceId,true);
      }
    });
    obs.observe(modal,{attributes:true,attributeFilter:['style','class']});
  }
  document.querySelectorAll('[id="invPaymentModal"]').forEach(guardModal);

  // Also catch any duplicate modal inserted later.
  const bodyObs=new MutationObserver(muts=>muts.forEach(m=>m.addedNodes.forEach(n=>{
    if(!(n instanceof Element)) return;
    if(n.id==='invPaymentModal') guardModal(n);
    n.querySelectorAll?.('[id="invPaymentModal"]').forEach(guardModal);
  })));
  if(document.body) bodyObs.observe(document.body,{childList:true,subtree:true});
})();
</script>
'''
pos=s.lower().rfind('</body>')
if pos<0: raise SystemExit('no body')
s=s[:pos]+patch+s[pos:]
p.write_text(s)
print('patched')
