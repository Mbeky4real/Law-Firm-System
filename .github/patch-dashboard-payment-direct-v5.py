from pathlib import Path
p=Path('index.html')
s=p.read_text()
marker='MOLMS-DASHBOARD-PAYMENT-DIRECT-V5'
if marker in s:
    print('already patched')
    raise SystemExit
patch=r'''
<script>
/* MOLMS-DASHBOARD-PAYMENT-DIRECT-V5 */
(function(){
  let routing=false;
  const waitFrames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const hidePaymentModals=()=>document.querySelectorAll('[id="invPaymentModal"]').forEach(m=>m.style.display='none');

  function invoiceIdFromDashboardButton(btn){
    const raw=(btn.getAttribute('onclick')||'')+' '+(btn.dataset.invoiceId||'');
    const uuid=raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
    if(uuid) return uuid[0];
    const row=btn.closest('tr');
    const text=(row?.innerText||row?.textContent||'').replace(/\s+/g,' ').trim();
    const invoices=(typeof _fdAllInvoices!=='undefined'&&_fdAllInvoices?.length?_fdAllInvoices:(typeof _fdInvoices!=='undefined'?_fdInvoices:[]))||[];
    let inv=invoices.find(i=>i.invoice_number&&text.includes(i.invoice_number));
    if(inv) return inv.id;
    inv=invoices.find(i=>i.client_name&&text.includes(i.client_name)&&text.includes(Number(i.total_due||0).toLocaleString()));
    return inv?.id||null;
  }

  async function openInInvoiceModule(invoiceId){
    if(routing) return;
    routing=true;
    try{
      hidePaymentModals();
      if(typeof go==='function'){
        go('invoice');
        await waitFrames();
      }
      if(invoiceId&&typeof invLoadInvoice==='function'){
        await invLoadInvoice(invoiceId);
        await waitFrames();
      }
      if(typeof window.invRecordPayment==='function'){
        await window.invRecordPayment();
      }
    }finally{ routing=false; }
  }

  function isPaymentButton(btn){
    if(!btn) return false;
    const text=(btn.textContent||'').trim();
    const title=(btn.getAttribute('title')||'').toLowerCase();
    const aria=(btn.getAttribute('aria-label')||'').toLowerCase();
    const onclick=(btn.getAttribute('onclick')||'').toLowerCase();
    return text==='+'||title.includes('payment')||aria.includes('payment')||onclick.includes('payment');
  }

  document.addEventListener('click',function(e){
    if(typeof page==='undefined'||page!=='findash') return;
    const register=e.target.closest?.('#fdRegBody');
    if(!register) return;
    const btn=e.target.closest?.('button');
    if(!btn||!isPaymentButton(btn)) return;
    const invoiceId=invoiceIdFromDashboardButton(btn);
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    openInInvoiceModule(invoiceId);
  },true);
})();
</script>
'''
pos=s.lower().rfind('</body>')
if pos<0: raise SystemExit('no body')
s=s[:pos]+patch+s[pos:]
p.write_text(s)
print('patched')
