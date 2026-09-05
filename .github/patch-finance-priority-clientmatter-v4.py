from pathlib import Path
p=Path('index.html')
s=p.read_text()
marker='MOLMS-FINANCE-PRIORITY-CLIENTMATTER-V4'
if marker in s:
    print('already patched'); raise SystemExit
patch=r'''
<style>
/* MOLMS-FINANCE-PRIORITY-CLIENTMATTER-V4 */
#fdPriorityRowV4{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(320px,.72fr)!important;gap:12px!important;align-items:start!important;margin:12px 0!important;width:100%!important}
#fdPriorityRowV4>*{min-width:0!important;margin:0!important;height:auto!important;min-height:0!important}
#fdPriorityRowV4 #fdReceivablesCardV1{padding:12px!important}
#fdObligationsCompactV4{background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px!important;box-shadow:none!important}
#fdObligationsCompactV4 table{font-size:10px!important;margin:0!important}
#fdObligationsCompactV4 td,#fdObligationsCompactV4 th{padding-top:3px!important;padding-bottom:3px!important}
#fdObligationsCompactV4 [style*="font-size:22px"],#fdObligationsCompactV4 [style*="font-size:24px"]{font-size:18px!important}
#fdPriorityRowV3:empty{display:none!important}
#fdClientMatterRevenueV2{height:auto!important;min-height:0!important}
#fdClientMatterRevenueV2 tbody tr[data-v4-source]{cursor:pointer}
#fdClientMatterRevenueV2 tbody tr[data-v4-source]:hover{background:#faf7ef}
@media(max-width:980px){#fdPriorityRowV4{grid-template-columns:1fr!important}}
</style>
<script>
(function(){
  const esc4=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const wait4=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  let applyingPriority=false, renderingCM=false, scheduled=false;

  function cardOf4(el){
    let p=el;
    while(p&&p.id!=='page-findash'){
      const st=p.getAttribute?.('style')||'';
      if((st.includes('background:#fff')||getComputedStyle(p).backgroundColor==='rgb(255, 255, 255)')&&(st.includes('border-radius:12px')||parseFloat(getComputedStyle(p).borderRadius)>=10))return p;
      p=p.parentElement;
    }
    return null;
  }
  function obligationsSource4(){
    const root=document.getElementById('page-findash'); if(!root)return null;
    const candidates=[...root.querySelectorAll('div,span')].filter(e=>/MONTHLY\s+OBLIGATIONS/i.test((e.textContent||'').trim())&&!e.closest('#fdObligationsCompactV4'));
    candidates.sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length);
    for(const e of candidates){const c=cardOf4(e);if(c&&c.id!=='fdReceivablesCardV1'&&c.id!=='fdObligationsCompactV4')return c;}
    return null;
  }
  function stripIds4(root){root.removeAttribute?.('id');root.querySelectorAll?.('[id]').forEach(e=>e.removeAttribute('id'));}

  function buildPriority4(){
    if(applyingPriority)return; applyingPriority=true;
    try{
      if(typeof fdRenderReceivablesCard==='function')try{fdRenderReceivablesCard();}catch(e){}
      const kpi=document.getElementById('fdKpiRow'),rec=document.getElementById('fdReceivablesCardV1'),source=obligationsSource4();
      if(!kpi||!rec||!source)return;
      let row=document.getElementById('fdPriorityRowV4');
      if(!row){row=document.createElement('div');row.id='fdPriorityRowV4';kpi.insertAdjacentElement('afterend',row);}
      if(rec.parentElement!==row)row.appendChild(rec);
      let compact=document.getElementById('fdObligationsCompactV4');
      const fresh=source.cloneNode(true);stripIds4(fresh);fresh.id='fdObligationsCompactV4';fresh.classList.add('fd-obligations-v4');
      if(compact)compact.replaceWith(fresh);else row.appendChild(fresh);
      source.style.display='none';source.dataset.fdObligationsSourceV4='1';
      // Remove any obsolete V3 placeholder once both live cards are owned by V4.
      const v3=document.getElementById('fdPriorityRowV3');if(v3&&v3!==row&&v3.children.length===0)v3.remove();
    }finally{applyingPriority=false;}
  }

  function parseMoney4(text){
    const t=String(text||'').trim();const m=t.match(/\b(TZS|USD|EUR|GBP)\b/i);const currency=m?m[1].toUpperCase():'TZS';
    const n=Number((t.replace(/[^0-9.-]/g,''))||0);return {currency,value:Number.isFinite(n)?n:0};
  }
  function registerRows4(){
    const body=document.getElementById('fdRegBody');if(!body)return [];
    const rows=[];
    [...body.querySelectorAll('tr')].forEach(tr=>{
      const td=[...tr.querySelectorAll('td')];if(td.length<9)return;
      const type=(td[4]?.textContent||'').trim();if(!/^tax$/i.test(type))return;
      const client=(td[1]?.textContent||'').trim()||'Unknown client';
      const source=(td[2]?.textContent||'').trim()||'—';
      const matter=(td[3]?.textContent||'').trim()||'General / Unlinked';
      const amount=parseMoney4(td[5]?.textContent),paid=parseMoney4(td[6]?.textContent),balance=parseMoney4(td[7]?.textContent);
      const status=(td[8]?.textContent||'').trim()||'issued';
      let id='';
      try{if(typeof _fdAllInvoices!=='undefined'&&Array.isArray(_fdAllInvoices)){const i=_fdAllInvoices.find(x=>String(x.invoice_number||'').trim()===source);if(i)id=i.id;}}catch(e){}
      rows.push({kind:'invoice',id,client,matter,source,currency:amount.currency,revenue:amount.value,paid:paid.value,outstanding:balance.value,status});
    });
    return rows;
  }
  function manualRows4(){
    const rows=[];
    try{
      const manual=(typeof _fdAllManual!=='undefined'&&Array.isArray(_fdAllManual))?_fdAllManual:[];
      manual.forEach(t=>{
        const st=String(t.status||(t.is_approved?'approved':'pending')).toLowerCase();
        if(st!=='approved'||t.tx_type!=='revenue'||(typeof fdInPeriod==='function'&&!fdInPeriod(t.date)))return;
        const revenue=t.client_receivable&&Number(t.agreed_amount||0)>0?Number(t.agreed_amount):Number(t.amount||0),paid=Number(t.amount||0),outstanding=t.client_receivable?Math.max(0,Number(t.outstanding_amount||0)):0;
        rows.push({kind:'manual',id:t.id||'',client:t.receivable_client_name||t.counterparty||'Other Revenue',matter:t.receivable_matter_ref||t.description||'General / Unlinked',source:t.reference||'Manual Revenue',currency:t.currency||'TZS',revenue,paid,outstanding,status:outstanding>0?'Part Paid':'Paid'});
      });
    }catch(e){}
    return rows;
  }
  function clientMatterRows4(){
    const inv=registerRows4(),manual=manualRows4();
    // The rendered Revenue & Collections Register is authoritative for invoice revenue.
    // Manual approved revenue is added from the approved manual ledger.
    return [...inv,...manual].sort((a,b)=>b.revenue-a.revenue);
  }
  function renderClientMatter4(){
    if(renderingCM)return;renderingCM=true;
    try{
      const card=document.getElementById('fdClientMatterRevenueV2');if(!card)return;
      const rows=clientMatterRows4();
      card.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:6px"><div><div style="font-size:11px;font-weight:800">CLIENT & MATTER REVENUE</div><div style="font-size:9px;color:var(--muted);margin-top:2px">Recognized invoice revenue plus approved manual client revenue</div></div><div style="font-size:9px;color:var(--muted)">${rows.length} source${rows.length===1?'':'s'}</div></div><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:10.5px"><thead><tr style="border-bottom:1px solid var(--border)"><th style="text-align:left;padding:6px">Client</th><th style="text-align:left;padding:6px">Matter / Source</th><th style="text-align:right;padding:6px">Revenue</th><th style="text-align:right;padding:6px">Paid</th><th style="text-align:right;padding:6px">Outstanding</th><th style="text-align:center;padding:6px">Status</th></tr></thead><tbody>${rows.length?rows.slice(0,10).map(r=>`<tr data-v4-source="${r.kind}" data-v4-id="${esc4(r.id)}" style="border-bottom:1px solid #eee8df"><td style="padding:6px;font-weight:700">${esc4(r.client)}</td><td style="padding:6px"><div>${esc4(r.matter)}</div><div style="font-size:9px;color:var(--muted)">${esc4(r.source)}</div></td><td style="padding:6px;text-align:right;font-weight:700">${esc4(r.currency)} ${Number(r.revenue||0).toLocaleString()}</td><td style="padding:6px;text-align:right;color:#16803c">${esc4(r.currency)} ${Number(r.paid||0).toLocaleString()}</td><td style="padding:6px;text-align:right;font-weight:700;color:${r.outstanding>0?'#b42318':'var(--muted)'}">${esc4(r.currency)} ${Number(r.outstanding||0).toLocaleString()}</td><td style="padding:6px;text-align:center">${esc4(r.status)}</td></tr>`).join(''):`<tr><td colspan="6" style="padding:8px;text-align:center;color:var(--muted)">No recognized client revenue in the selected period.</td></tr>`}</tbody></table></div>`;
      card.onclick=e=>{const tr=e.target.closest('tr[data-v4-source]');if(!tr||!tr.dataset.v4Id)return;if(typeof fdOpenReceivableSourceV2==='function')fdOpenReceivableSourceV2(tr.dataset.v4Source,tr.dataset.v4Id);};
    }finally{renderingCM=false;}
  }

  function apply4(){buildPriority4();renderClientMatter4();}
  function schedule4(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;apply4();});}
  const prevRefresh4=window.fdRefresh;
  if(typeof prevRefresh4==='function')window.fdRefresh=async function(){const r=await prevRefresh4.apply(this,arguments);apply4();return r;};
  window.addEventListener('load',()=>{
    [700,1200,1900,2800].forEach(ms=>setTimeout(apply4,ms));
    const attach=()=>{
      ['fdRegBody','fdManualBody','fdKpiRow'].forEach(id=>{const el=document.getElementById(id);if(el&&!el.dataset.v4Observed){el.dataset.v4Observed='1';new MutationObserver(schedule4).observe(el,{childList:true,subtree:true,characterData:true});}});
      const root=document.getElementById('page-findash');if(root&&!root.dataset.v4RootObserved){root.dataset.v4RootObserved='1';new MutationObserver(()=>{const row=document.getElementById('fdPriorityRowV4'),rec=document.getElementById('fdReceivablesCardV1');if(!row||rec?.parentElement!==row)schedule4();}).observe(root,{childList:true,subtree:true});}
    };
    attach();setTimeout(attach,1500);
  });
  window.fdFinanceV4Audit=function(){
    const row=document.getElementById('fdPriorityRowV4'),rec=document.getElementById('fdReceivablesCardV1'),obl=document.getElementById('fdObligationsCompactV4'),cm=document.getElementById('fdClientMatterRevenueV2');
    return {priorityRow:!!row,receivablesSide:!!row&&rec?.parentElement===row,obligationsSide:!!row&&obl?.parentElement===row,priorityColumns:row?getComputedStyle(row).gridTemplateColumns:'',clientMatterRows:cm?.querySelectorAll('tbody tr[data-v4-source]').length||0,registerTaxRows:registerRows4().length,manualRevenueRows:manualRows4().length};
  };
})();
</script>
'''
pos=s.lower().rfind('</body>')
if pos<0: raise SystemExit('no body')
s=s[:pos]+patch+s[pos:]
p.write_text(s)
print('patched')