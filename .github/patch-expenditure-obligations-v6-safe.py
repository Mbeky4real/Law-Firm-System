from pathlib import Path
p=Path('index.html')
s=p.read_text()
marker='MOLMS-EXPENDITURE-OBLIGATIONS-V6-SAFE'
if marker in s:
    print('already patched'); raise SystemExit
patch=r'''
<style>
/* MOLMS-EXPENDITURE-OBLIGATIONS-V6-SAFE */
#fdPriorityRowV4{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(330px,.72fr)!important;gap:12px!important;align-items:start!important;width:100%!important}
#fdPriorityRowV4>#fdReceivablesCardV1,#fdPriorityRowV4>#fdMonthlyObligationsStableV6{min-width:0!important;margin:0!important;height:auto!important;min-height:0!important}
#fdMonthlyObligationsStableV6{background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px;box-shadow:none}
#fdMonthlyObligationsStableV6 .fd-ob-row{display:flex;justify-content:space-between;gap:12px;padding:3px 0;border-top:1px solid #eee8df;font-size:10px}
#fdMonthlyObligations,#fdObligationsCompactV4{display:none!important}
#fdManualModal[data-fd-mode-v6="expenditure"] #fdClientReceivableWrap{display:none!important}
#fdManualModeHintV6{font-size:10px;color:var(--muted);background:#f8f6f2;border:1px solid var(--border);border-radius:8px;padding:7px 9px;margin:-6px 0 2px}
@media(max-width:980px){#fdPriorityRowV4{grid-template-columns:1fr!important}}
</style>
<script>
(function(){
  const fmt6=n=>'TZS '+Number(n||0).toLocaleString();
  function label6(id){const e=document.getElementById(id);return e?.parentElement?.querySelector('label')||null;}
  function hint6(){const t=document.getElementById('fdManualModalTitle');if(!t)return null;let h=document.getElementById('fdManualModeHintV6');if(!h){h=document.createElement('div');h.id='fdManualModeHintV6';t.insertAdjacentElement('afterend',h);}return h;}
  function applyManualMode6(mode){
    const modal=document.getElementById('fdManualModal');if(!modal)return;
    mode=mode==='expenditure'?'expenditure':'revenue';modal.dataset.fdModeV6=mode;
    const title=document.getElementById('fdManualModalTitle'),h=hint6(),desc=document.getElementById('fdManualDesc'),cp=document.getElementById('fdManualCounterparty'),cat=document.getElementById('fdManualCategory');
    const save=[...modal.querySelectorAll('button')].find(b=>/save transaction|save expenditure|save revenue/i.test(b.textContent||''));
    if(mode==='expenditure'){
      if(title&&!/Edit Transaction/i.test(title.textContent||''))title.textContent='Record Other Expenditure';
      if(h)h.textContent='Record an outgoing payment not already captured in the Expense Register or another MOLMS module.';
      const dl=label6('fdManualDesc');if(dl)dl.textContent='Purpose / Expense Description *';if(desc)desc.placeholder='What was this expenditure for?';
      const cl=label6('fdManualCounterparty');if(cl)cl.textContent='Paid To / Supplier';if(cp)cp.placeholder='Supplier, landlord, authority or other payee';
      const cal=label6('fdManualCategory');if(cal)cal.textContent='Expense Category *';
      const rec=document.getElementById('fdClientReceivable');if(rec)rec.checked=false;
      const rf=document.getElementById('fdClientReceivableFields');if(rf)rf.style.display='none';
      if(save)save.textContent='Save Expenditure';
    }else{
      if(title&&!/Edit Transaction/i.test(title.textContent||''))title.textContent='Record Other Revenue';
      if(h)h.textContent='Record exceptional income not already originating from the Invoice Module or another MOLMS module.';
      const dl=label6('fdManualDesc');if(dl)dl.textContent='Description *';if(desc)desc.placeholder='Brief description of revenue';
      const cl=label6('fdManualCounterparty');if(cl)cl.textContent='Received From';if(cp)cp.placeholder='Client, person or organisation';
      const cal=label6('fdManualCategory');if(cal)cal.textContent='Revenue Category *';
      if(save)save.textContent='Save Revenue';
    }
  }

  const open6=window.fdOpenManualModal;
  if(typeof open6==='function')window.fdOpenManualModal=function(txType){const r=open6.apply(this,arguments);setTimeout(()=>applyManualMode6(txType==='expenditure'?'expenditure':'revenue'),0);return r;};

  const edit6=window.fdEditManual;
  if(typeof edit6==='function')window.fdEditManual=async function(id){
    const tx=(typeof _fdAllManual!=='undefined'&&Array.isArray(_fdAllManual))?_fdAllManual.find(x=>x.id===id):null;
    const r=await edit6.apply(this,arguments);
    if(tx&&['expenditure','drawing'].includes(String(tx.tx_type||'').toLowerCase())){
      const hidden=document.getElementById('fdManualTxType');if(hidden)hidden.value='expenditure';
      const sel=document.getElementById('fdManualCategory');
      if(sel&&typeof FD_EXPENSE_CATS!=='undefined'){
        sel.innerHTML=FD_EXPENSE_CATS.map(c=>`<option value="${typeof esc==='function'?esc(c):c}">${typeof esc==='function'?esc(c):c}</option>`).join('');
        sel.value=tx.category||'';
      }
      applyManualMode6('expenditure');
    }else applyManualMode6('revenue');
    return r;
  };

  const save6=window.fdSaveManual;
  if(typeof save6==='function')window.fdSaveManual=async function(){
    if(document.getElementById('fdManualTxType')?.value==='expenditure'){
      const rec=document.getElementById('fdClientReceivable');if(rec)rec.checked=false;
      ['fdReceivableClient','fdReceivableMatter','fdAgreedAmount'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
    }
    return save6.apply(this,arguments);
  };

  function renderObligations6(){
    const kpi=document.getElementById('fdKpiRow'),rec=document.getElementById('fdReceivablesCardV1');
    if(!kpi||!rec||typeof fdMonthlyObligations!=='function')return;
    let o;try{o=fdMonthlyObligations();}catch(e){console.warn('[V6 obligations]',e);return;}
    let row=document.getElementById('fdPriorityRowV4');if(!row){row=document.createElement('div');row.id='fdPriorityRowV4';kpi.insertAdjacentElement('afterend',row);}
    if(rec.parentElement!==row)row.appendChild(rec);
    let card=document.getElementById('fdMonthlyObligationsStableV6');if(!card){card=document.createElement('div');card.id='fdMonthlyObligationsStableV6';row.appendChild(card);}
    const monthLabel=new Date(o.month+'-01T00:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'});
    const badge=o.payrollGenerated?'<span style="font-size:9px;font-weight:700;color:#166534;background:#dcfce7;padding:2px 7px;border-radius:10px">Payroll generated</span>':'<span style="font-size:9px;font-weight:700;color:#92400e;background:#fef3c7;padding:2px 7px;border-radius:10px">Payroll not generated</span>';
    const items=[['PAYE',o.paye],['NSSF',o.nssf],['Health Insurance',o.health],['SDL',o.sdl],['WCF',o.wcf],['VAT on Issued Tax Invoices',o.vat]];
    card.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><div style="font-size:10px;font-weight:800;letter-spacing:.4px;color:var(--muted)">MONTHLY OBLIGATIONS</div><div style="font-size:10px;color:var(--muted);margin-top:2px">${monthLabel}</div></div>${badge}</div><div style="font-size:19px;font-weight:900;color:var(--navy);margin:8px 0 1px">${fmt6(o.total)}</div><div style="font-size:9px;color:var(--muted);margin-bottom:7px">Total to Provide For</div>${items.map(([n,v])=>`<div class="fd-ob-row"><span>${n}</span><strong>${fmt6(v)}</strong></div>`).join('')}`;
    document.getElementById('fdObligationsCompactV4')?.setAttribute('aria-hidden','true');
  }

  const refresh6=window.fdRefresh;
  if(typeof refresh6==='function')window.fdRefresh=async function(){const r=await refresh6.apply(this,arguments);renderObligations6();return r;};
  window.addEventListener('load',()=>{setTimeout(renderObligations6,900);setTimeout(renderObligations6,1800);});

  window.fdFinanceV6Audit=function(){const row=document.getElementById('fdPriorityRowV4'),rec=document.getElementById('fdReceivablesCardV1'),obl=document.getElementById('fdMonthlyObligationsStableV6');return {receivablesSide:!!row&&rec?.parentElement===row,monthlyObligationsSide:!!row&&obl?.parentElement===row,obligationsText:obl?.textContent?.includes('MONTHLY OBLIGATIONS')||false,noV6Observer:true,expenditureMode:document.getElementById('fdManualModal')?.dataset.fdModeV6||null};};
})();
</script>
'''
pos=s.lower().rfind('</body>')
if pos<0: raise SystemExit('no body')
s=s[:pos]+patch+s[pos:]
p.write_text(s)
print('patched')