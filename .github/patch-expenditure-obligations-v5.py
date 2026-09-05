from pathlib import Path
p=Path('index.html')
s=p.read_text()
marker='MOLMS-EXPENDITURE-OBLIGATIONS-V5'
if marker in s:
    print('already patched'); raise SystemExit
patch=r'''
<style>
/* MOLMS-EXPENDITURE-OBLIGATIONS-V5 */
#fdPriorityRowV4{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(340px,.72fr)!important;gap:12px!important;align-items:start!important;margin:12px 0!important;width:100%!important}
#fdPriorityRowV4>#fdReceivablesCardV1,#fdPriorityRowV4>#fdMonthlyObligations{min-width:0!important;margin:0!important;height:auto!important;min-height:0!important}
#fdPriorityRowV4>#fdMonthlyObligations>div{margin:0!important;padding:12px!important;height:auto!important;min-height:0!important}
#fdPriorityRowV4>#fdMonthlyObligations table{font-size:10px!important;margin:0!important}
#fdPriorityRowV4>#fdMonthlyObligations td,#fdPriorityRowV4>#fdMonthlyObligations th{padding-top:3px!important;padding-bottom:3px!important}
#fdPriorityRowV4>#fdMonthlyObligations [style*="font-size:22px"]{font-size:18px!important}
#fdObligationsCompactV4{display:none!important}
#fdManualModal[data-fd-mode-v5="expenditure"] #fdClientReceivableWrap{display:none!important}
#fdManualModeHintV5{font-size:10px;color:var(--muted);background:#f8f6f2;border:1px solid var(--border);border-radius:8px;padding:7px 9px;margin:-6px 0 2px}
@media(max-width:980px){#fdPriorityRowV4{grid-template-columns:1fr!important}}
</style>
<script>
(function(){
  const wait5=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  function labelFor5(id){const el=document.getElementById(id);return el?.parentElement?.querySelector('label')||null;}
  function ensureModeHint5(){
    const title=document.getElementById('fdManualModalTitle');if(!title)return null;
    let h=document.getElementById('fdManualModeHintV5');if(!h){h=document.createElement('div');h.id='fdManualModeHintV5';title.insertAdjacentElement('afterend',h);}return h;
  }
  function applyManualMode5(mode){
    const modal=document.getElementById('fdManualModal');if(!modal)return;
    mode=mode==='expenditure'?'expenditure':'revenue';modal.dataset.fdModeV5=mode;
    const title=document.getElementById('fdManualModalTitle'),hint=ensureModeHint5(),desc=document.getElementById('fdManualDesc'),cp=document.getElementById('fdManualCounterparty'),cat=document.getElementById('fdManualCategory'),save=[...modal.querySelectorAll('button')].find(b=>/save transaction|save expenditure|save revenue/i.test(b.textContent||''));
    if(mode==='expenditure'){
      if(title&&!/Edit Transaction/i.test(title.textContent||''))title.textContent='Record Other Expenditure';
      if(hint)hint.textContent='Record an outgoing payment not already captured in the Expense Register or another MOLMS module.';
      const dl=labelFor5('fdManualDesc');if(dl)dl.textContent='Purpose / Expense Description *';if(desc)desc.placeholder='What was this expenditure for?';
      const cl=labelFor5('fdManualCounterparty');if(cl)cl.textContent='Paid To / Supplier';if(cp)cp.placeholder='Supplier, landlord, authority or other payee';
      const cal=labelFor5('fdManualCategory');if(cal)cal.textContent='Expense Category *';
      const rec=document.getElementById('fdClientReceivable');if(rec)rec.checked=false;
      if(document.getElementById('fdClientReceivableFields'))document.getElementById('fdClientReceivableFields').style.display='none';
      if(save)save.textContent='Save Expenditure';
    }else{
      if(title&&!/Edit Transaction/i.test(title.textContent||''))title.textContent='Record Other Revenue';
      if(hint)hint.textContent='Record exceptional income not already originating from the Invoice Module or another MOLMS module.';
      const dl=labelFor5('fdManualDesc');if(dl)dl.textContent='Description *';if(desc)desc.placeholder='Brief description of revenue';
      const cl=labelFor5('fdManualCounterparty');if(cl)cl.textContent='Received From';if(cp)cp.placeholder='Client, person or organisation';
      const cal=labelFor5('fdManualCategory');if(cal)cal.textContent='Revenue Category *';
      if(save)save.textContent='Save Revenue';
    }
  }

  const openPrev5=window.fdOpenManualModal;
  if(typeof openPrev5==='function')window.fdOpenManualModal=function(txType){const r=openPrev5.apply(this,arguments);setTimeout(()=>applyManualMode5(txType==='expenditure'?'expenditure':'revenue'),0);return r;};

  const editPrev5=window.fdEditManual;
  if(typeof editPrev5==='function')window.fdEditManual=async function(id){
    const tx=(typeof _fdAllManual!=='undefined'&&Array.isArray(_fdAllManual))?_fdAllManual.find(x=>x.id===id):null;
    const r=await editPrev5.apply(this,arguments);
    if(tx&&['expenditure','drawing'].includes(String(tx.tx_type||'').toLowerCase())){
      const hidden=document.getElementById('fdManualTxType');if(hidden)hidden.value='expenditure';
      const sel=document.getElementById('fdManualCategory');if(sel&&typeof FD_EXPENSE_CATS!=='undefined'){
        sel.innerHTML=FD_EXPENSE_CATS.map(c=>`<option value="${typeof esc==='function'?esc(c):c}">${typeof esc==='function'?esc(c):c}</option>`).join('');sel.value=tx.category||'';
      }
      applyManualMode5('expenditure');
    }else applyManualMode5('revenue');
    return r;
  };

  const savePrev5=window.fdSaveManual;
  if(typeof savePrev5==='function')window.fdSaveManual=async function(){
    const mode=document.getElementById('fdManualTxType')?.value==='expenditure'?'expenditure':'revenue';
    if(mode==='expenditure'){
      const rec=document.getElementById('fdClientReceivable');if(rec)rec.checked=false;
      ['fdReceivableClient','fdReceivableMatter','fdAgreedAmount'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
    }
    return savePrev5.apply(this,arguments);
  };

  let priorityBusy5=false;
  async function buildPriority5(){
    if(priorityBusy5)return;priorityBusy5=true;
    try{
      const kpi=document.getElementById('fdKpiRow'),rec=document.getElementById('fdReceivablesCardV1'),obl=document.getElementById('fdMonthlyObligations');
      if(!kpi||!rec||!obl)return;
      // Restore the authoritative obligations component if an older clone/move patch detached or hid its rendered card.
      if(typeof fdRenderMonthlyObligations==='function')try{fdRenderMonthlyObligations();}catch(e){}
      obl.style.display='block';obl.querySelectorAll('[data-fd-obligations-source-v4]').forEach(e=>{e.style.display='block';delete e.dataset.fdObligationsSourceV4;});
      document.getElementById('fdObligationsCompactV4')?.remove();
      let row=document.getElementById('fdPriorityRowV4');if(!row){row=document.createElement('div');row.id='fdPriorityRowV4';kpi.insertAdjacentElement('afterend',row);}
      if(rec.parentElement!==row)row.appendChild(rec);
      if(obl.parentElement!==row)row.appendChild(obl);
      const v3=document.getElementById('fdPriorityRowV3');if(v3&&v3.children.length===0)v3.remove();
    }finally{priorityBusy5=false;}
  }

  const refreshPrev5=window.fdRefresh;
  if(typeof refreshPrev5==='function')window.fdRefresh=async function(){const r=await refreshPrev5.apply(this,arguments);await wait5();await buildPriority5();return r;};

  window.addEventListener('load',()=>{
    const attach=()=>{buildPriority5();const obl=document.getElementById('fdMonthlyObligations');if(obl&&!obl.dataset.v5Observed){obl.dataset.v5Observed='1';new MutationObserver(()=>{if(!priorityBusy5)buildPriority5();}).observe(obl,{childList:true,subtree:true});}};
    setTimeout(attach,700);setTimeout(attach,1500);setTimeout(attach,2500);
  });

  window.fdFinanceV5Audit=function(){
    const row=document.getElementById('fdPriorityRowV4'),rec=document.getElementById('fdReceivablesCardV1'),obl=document.getElementById('fdMonthlyObligations');
    return {receivablesSide:!!row&&rec?.parentElement===row,monthlyObligationsSide:!!row&&obl?.parentElement===row,monthlyObligationsVisible:!!obl&&getComputedStyle(obl).display!=='none'&&!!obl.textContent.trim(),cloneRemoved:!document.getElementById('fdObligationsCompactV4'),expenditureReceivableHidden:document.getElementById('fdManualModal')?.dataset.fdModeV5==='expenditure'?getComputedStyle(document.getElementById('fdClientReceivableWrap')||document.body).display==='none':true};
  };
})();
</script>
'''
pos=s.lower().rfind('</body>')
if pos<0: raise SystemExit('no body')
s=s[:pos]+patch+s[pos:]
p.write_text(s)
print('patched')