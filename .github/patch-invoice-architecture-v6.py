from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
MARK='MOLMS-INVOICE-CANONICAL-V6'
if MARK in s:
    print('already patched')
    raise SystemExit(0)

def remove_script_with(marker):
    global s
    while marker in s:
        m=s.index(marker)
        a=s.rfind('<script',0,m)
        b=s.find('</script>',m)
        if a<0 or b<0:
            raise SystemExit(f'Could not isolate legacy script {marker}')
        b+=len('</script>')
        s=s[:a]+s[b:]

for legacy in [
    'MOLMS-INVOICE-PAYMENT-CONTEXT-V3',
    'MOLMS-INVOICE-PAYMENT-ROUTER-V4',
    'MOLMS-DASHBOARD-PAYMENT-DIRECT-V5',
]:
    remove_script_with(legacy)

if s.count('MOLMS-INVOICE-PAYMENT-V2') != 1:
    raise SystemExit(f'Expected exactly one core payment V2 implementation; found {s.count("MOLMS-INVOICE-PAYMENT-V2")}')

patch=r'''
<!-- MOLMS-INVOICE-CANONICAL-V6 -->
<div id="invEmailModal" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,.42);z-index:10020;align-items:center;justify-content:center;padding:18px">
  <div style="width:min(620px,96vw);max-height:90vh;overflow:auto;background:#fff;border-radius:14px;box-shadow:0 24px 60px rgba(15,23,42,.25);padding:18px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px">
      <div><div style="font-size:16px;font-weight:900;color:var(--navy,#0f2744)">Send Invoice by Email</div><div id="invEmailMeta" style="font-size:11px;color:var(--muted,#64748b);margin-top:3px"></div></div>
      <button type="button" onclick="invCloseEmailModal()" style="border:0;background:transparent;font-size:22px;line-height:1;cursor:pointer">×</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div><label style="font-size:11px;font-weight:700">To *</label><input id="invEmailTo" type="email" class="search" style="width:100%;margin-top:4px"></div>
      <div><label style="font-size:11px;font-weight:700">CC</label><input id="invEmailCc" type="email" class="search" style="width:100%;margin-top:4px"></div>
    </div>
    <div style="margin-top:10px"><label style="font-size:11px;font-weight:700">Subject *</label><input id="invEmailSubject" class="search" style="width:100%;margin-top:4px"></div>
    <div style="margin-top:10px"><label style="font-size:11px;font-weight:700">Message *</label><textarea id="invEmailMessage" class="search" rows="8" style="width:100%;margin-top:4px;resize:vertical"></textarea></div>
    <div style="margin-top:8px;font-size:10px;color:var(--muted,#64748b)">The official PDF is generated server-side from the saved invoice record and attached automatically.</div>
    <div id="invEmailError" style="display:none;margin-top:10px;padding:9px 10px;border-radius:8px;background:#fef2f2;color:#991b1b;font-size:11px;font-weight:600"></div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
      <button type="button" onclick="invCloseEmailModal()" style="padding:8px 13px;border:1px solid var(--border,#ddd);border-radius:8px;background:#fff;cursor:pointer">Cancel</button>
      <button id="invEmailSendBtn" type="button" onclick="invSendEmail()" style="padding:8px 14px;border:0;border-radius:8px;background:var(--navy,#0f2744);color:#fff;font-weight:800;cursor:pointer">Send Invoice</button>
    </div>
  </div>
</div>
<script>
/* MOLMS-INVOICE-CANONICAL-V6 */
(function(){
  const corePayment=window.invRecordPayment;
  let paymentOpening=false;
  let emailCtx=null;

  const nextTick=()=>new Promise(resolve=>setTimeout(resolve,0));

  window.invOpenPayment=async function(invoiceId){
    if(paymentOpening) return;
    paymentOpening=true;
    try{
      const id=invoiceId || (typeof _invActiveId!=='undefined'?_invActiveId:null);
      if(!id){ notice('Select an issued invoice first.','err'); return; }
      if(typeof page!=='undefined' && page!=='invoice' && typeof go==='function'){
        go('invoice');
        await nextTick();
      }
      if(typeof invLoadInvoice==='function' && (typeof _invActiveId==='undefined' || _invActiveId!==id)){
        await invLoadInvoice(id);
      }
      if(typeof corePayment!=='function') throw new Error('Invoice payment engine is unavailable.');
      return await corePayment.call(window);
    }catch(err){
      console.error('invOpenPayment',err);
      notice(err?.message||'Could not open payment workflow.','err');
    }finally{ paymentOpening=false; }
  };

  // One authoritative public entry point. Existing Invoice buttons may keep
  // calling invRecordPayment(); they now delegate to the same canonical flow.
  window.invRecordPayment=function(){
    const id=(typeof _invActiveId!=='undefined'?_invActiveId:null);
    return window.invOpenPayment(id);
  };

  function dashboardInvoiceId(btn){
    const raw=(btn?.getAttribute('onclick')||'')+' '+(btn?.dataset?.invoiceId||'');
    const uuid=raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
    if(uuid) return uuid[0];
    const row=btn?.closest('tr');
    const text=(row?.innerText||row?.textContent||'').replace(/\s+/g,' ').trim();
    let invoices=[];
    try{ invoices=(typeof _fdAllInvoices!=='undefined'&&Array.isArray(_fdAllInvoices)&&_fdAllInvoices.length)?_fdAllInvoices:((typeof _fdInvoices!=='undefined'&&Array.isArray(_fdInvoices))?_fdInvoices:[]); }catch(_e){}
    const byNo=invoices.find(i=>i.invoice_number&&text.includes(i.invoice_number));
    if(byNo) return byNo.id;
    const byClient=invoices.find(i=>i.client_name&&text.includes(i.client_name));
    return byClient?.id||null;
  }

  document.addEventListener('click',function(e){
    const btn=e.target.closest?.('button');
    if(!btn) return;
    const invoicePage=btn.closest('#page-invoice');
    const txt=((btn.textContent||'')+' '+(btn.getAttribute('title')||'')+' '+(btn.getAttribute('aria-label')||'')+' '+(btn.getAttribute('onclick')||'')).toLowerCase();

    // Revive any existing dormant Invoice email control without depending on
    // its legacy onclick implementation.
    if(invoicePage && txt.includes('email')){
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      window.invOpenEmailModal();
      return;
    }

    // Financial Dashboard may offer payment as a convenience, but the
    // transaction itself always belongs to Invoices.
    if(typeof page!=='undefined' && page==='findash' && btn.closest('#fdRegBody') && (txt.includes('payment') || (btn.textContent||'').trim()==='+')){
      const id=dashboardInvoiceId(btn);
      if(id){
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        window.invOpenPayment(id);
      }
    }
  },true);

  window.invOpenEmailModal=async function(){
    const id=(typeof _invActiveId!=='undefined'?_invActiveId:null);
    if(!id){ notice('Select an issued invoice first.','err'); return; }
    const errEl=$('invEmailError'); if(errEl){errEl.style.display='none';errEl.textContent='';}
    const {data:inv,error}=await sb.from('invoices').select('id,invoice_number,invoice_type,status,client_id,client_name,attention,matter_title').eq('id',id).maybeSingle();
    if(error||!inv){ notice('Invoice could not be loaded.','err'); return; }
    if(['draft','void','cancelled'].includes(inv.status)){ notice('Only an issued invoice may be emailed.','err'); return; }
    let recipient='';
    if(inv.client_id){
      const r=await sb.from('members').select('email').eq('id',inv.client_id).maybeSingle();
      recipient=(r.data?.email||'').trim();
    }
    const kind=inv.invoice_type==='proforma'?'Proforma Invoice':'Tax Invoice';
    const subject=`M&O Law Office – ${kind} ${inv.invoice_number||''}`;
    const greeting=inv.attention||inv.client_name||'Client';
    const message=`Dear ${greeting},\n\nPlease find attached our ${kind} ${inv.invoice_number||''}${inv.matter_title?` in respect of ${inv.matter_title}`:''}.\n\nKindly let us know should you require any clarification.\n\nRegards,\nM&O Law Office`;
    emailCtx={invoiceId:id,invoiceNumber:inv.invoice_number||''};
    $('invEmailTo').value=recipient;
    $('invEmailCc').value='';
    $('invEmailSubject').value=subject;
    $('invEmailMessage').value=message;
    $('invEmailMeta').textContent=`${kind} ${inv.invoice_number||''} · PDF attached automatically`;
    $('invEmailModal').style.display='flex';
    setTimeout(()=>$('invEmailTo')?.focus(),0);
  };

  window.invCloseEmailModal=function(){
    const m=$('invEmailModal'); if(m)m.style.display='none';
    emailCtx=null;
  };

  window.invSendEmail=async function(){
    if(!emailCtx) return;
    const to=(val('invEmailTo')||'').trim(), cc=(val('invEmailCc')||'').trim(), subject=(val('invEmailSubject')||'').trim(), message=(val('invEmailMessage')||'').trim();
    const errEl=$('invEmailError');
    const showErr=(m)=>{errEl.textContent=m;errEl.style.display='block';};
    errEl.style.display='none';
    if(!to||!subject||!message){showErr('Recipient, subject and message are required.');return;}
    const btn=$('invEmailSendBtn'); btn.disabled=true; btn.textContent='Sending…';
    try{
      const {data,error}=await sb.functions.invoke('send-invoice-email',{body:{invoice_id:emailCtx.invoiceId,recipient_email:to,cc_email:cc||null,subject,message}});
      if(error) throw error;
      if(data?.error) throw new Error(data.error);
      const invoiceNo=emailCtx.invoiceNumber;
      invCloseEmailModal();
      notice(`Invoice ${invoiceNo} emailed successfully to ${to}.`,'ok');
    }catch(err){
      console.error('invSendEmail',err);
      const msg=err?.context?.body?.error||err?.message||'Email could not be sent.';
      showErr(msg);
    }finally{ btn.disabled=false;btn.textContent='Send Invoice'; }
  };
})();
</script>
'''

pos=s.lower().rfind('</body>')
if pos<0: raise SystemExit('Could not find </body>')
s=s[:pos]+patch+'\n'+s[pos:]
p.write_text(s,encoding='utf-8')
print('canonical invoice architecture v6 applied')
