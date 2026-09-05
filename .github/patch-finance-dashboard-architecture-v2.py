from pathlib import Path
import re
p=Path('index.html')
s=p.read_text()
# Remove the previous heuristic client/matter refinement completely.
s=re.sub(r'\n<script>\n/\* MOLMS-RECEIVABLES-CLIENT-MATTER-V1 \*/.*?</script>\n', '\n', s, flags=re.S)
marker='MOLMS-FINANCE-DASHBOARD-ARCHITECTURE-V2'
if marker in s:
    print('already patched'); raise SystemExit
patch=r'''
<style>
/* MOLMS-FINANCE-DASHBOARD-ARCHITECTURE-V2 */
#page-findash .fd-v2-card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px;margin:0;min-height:0!important;height:auto!important}
#fdClientMatterRevenueV2 table{table-layout:auto}
#fdClientMatterRevenueV2 th,#fdClientMatterRevenueV2 td{padding:6px 7px;vertical-align:top}
#fdReceivablesCardV1{min-height:0!important;height:auto!important;padding:12px!important}
#fdReceivablesCardV1 .fd-rec-row:hover{background:#faf7ef}
#page-findash [data-fd-v2-hidden="1"]{display:none!important}
@media(max-width:900px){#fdClientMatterRevenueV2 table{min-width:680px}}
</style>
<script>
(function(){
  const escV2=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cashV2=(c,v)=>`${escV2(c||'TZS')} ${Number(v||0).toLocaleString()}`;
  const normV2=v=>String(v||'').trim().toLowerCase();
  const waitV2=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

  function cardOf(el){
    let p=el;
    while(p&&p.id!=='page-findash'){
      const st=p.getAttribute?.('style')||'';
      if(st.includes('background:#fff')&&st.includes('border-radius:12px')) return p;
      p=p.parentElement;
    }
    return null;
  }
  function headingCard(text){
    const root=document.getElementById('page-findash'); if(!root)return null;
    const leaf=[...root.querySelectorAll('div,span')].find(e=>e.children.length===0&&e.textContent.trim()===text);
    return leaf?cardOf(leaf):null;
  }
  function hideCard(el){if(el){el.dataset.fdV2Hidden='1';el.style.display='none';}}

  function sourcesV2(){
    const rows=[];
    const invs=(typeof _fdAllInvoices!=='undefined'&&Array.isArray(_fdAllInvoices))?_fdAllInvoices:[];
    invs.forEach(i=>{
      if(String(i.invoice_type||'tax').toLowerCase()!=='tax')return;
      if(['paid','void','cancelled','superseded','draft'].includes(String(i.status||'').toLowerCase()))return;
      const amount=Math.max(0,Number(i.total_due||0)-Number(i.amount_paid||0)-Number(i.withholding_tax_amount||0));
      if(amount<=0)return;
      rows.push({kind:'invoice',id:i.id,client:i.client_name||'Unnamed client',currency:i.currency||'TZS',amount,reference:i.invoice_number||'—',matter:i.matter_ref||i.matter_title||'—',date:i.invoice_date||''});
    });
    const manual=(typeof _fdAllManual!=='undefined'&&Array.isArray(_fdAllManual))?_fdAllManual:[];
    manual.forEach(t=>{
      const st=String(t.status||(t.is_approved?'approved':'pending')).toLowerCase();
      if(st!=='approved'||!t.client_receivable)return;
      const amount=Math.max(0,Number(t.outstanding_amount||0)); if(amount<=0)return;
      rows.push({kind:'manual',id:t.id,client:t.receivable_client_name||t.counterparty||'Unnamed client',currency:t.currency||'TZS',amount,reference:t.reference||'—',matter:t.receivable_matter_ref||'—',date:t.date||''});
    });
    return rows;
  }

  function sourceModalV2(client,rows){
    let modal=document.getElementById('fdReceivableSourceModalV2');
    if(!modal){
      modal=document.createElement('div'); modal.id='fdReceivableSourceModalV2';
      modal.style='display:none;position:fixed;inset:0;background:rgba(15,36,64,.42);z-index:900;align-items:center;justify-content:center;padding:16px';
      modal.innerHTML='<div style="background:#fff;border-radius:14px;width:620px;max-width:96vw;max-height:82vh;overflow:auto;padding:16px"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px"><div><b style="font-size:13px">OUTSTANDING SOURCES</b><div id="fdRecModalSubV2" style="font-size:10px;color:var(--muted);margin-top:2px"></div></div><button class="btn out" id="fdRecModalCloseV2" style="padding:5px 10px">Close</button></div><div id="fdRecModalListV2"></div></div>';
      document.body.appendChild(modal);
      modal.querySelector('#fdRecModalCloseV2').onclick=()=>modal.style.display='none';
      modal.addEventListener('click',e=>{if(e.target===modal)modal.style.display='none'});
      modal.querySelector('#fdRecModalListV2').addEventListener('click',e=>{const b=e.target.closest('[data-source-kind]');if(!b)return;modal.style.display='none';openSourceV2(b.dataset.sourceKind,b.dataset.sourceId);});
    }
    modal.querySelector('#fdRecModalSubV2').textContent=`${client} · ${rows.length} open source${rows.length===1?'':'s'}`;
    modal.querySelector('#fdRecModalListV2').innerHTML=rows.map(r=>`<button data-source-kind="${r.kind}" data-source-id="${r.id}" style="width:100%;text-align:left;background:#fff;border:1px solid var(--border);border-radius:10px;padding:9px 10px;margin-bottom:7px;cursor:pointer;color:var(--navy)"><div style="display:flex;justify-content:space-between;gap:12px"><strong>${escV2(r.kind==='invoice'?'Invoice':'Manual Revenue')} · ${escV2(r.reference)}</strong><strong>${cashV2(r.currency,r.amount)}</strong></div><div style="font-size:10px;color:var(--muted);margin-top:3px">${escV2(r.matter)} · ${escV2(r.date)}</div></button>`).join('');
    modal.style.display='flex';
  }

  async function openSourceV2(kind,id){
    if(kind==='invoice'){
      if(typeof go==='function')go('invoice'); await waitV2();
      if(typeof invLoadInvoice==='function')await invLoadInvoice(id);
      return;
    }
    if(kind==='manual'){
      if(typeof go==='function')go('findash'); await waitV2();
      if(typeof fdEditManual==='function')await fdEditManual(id);
    }
  }
  window.fdOpenReceivableSourceV2=openSourceV2;

  function renderReceivablesV2(){
    let card=document.getElementById('fdReceivablesCardV1');
    if(!card){
      card=document.createElement('div');card.id='fdReceivablesCardV1';card.className='card';
      const k=document.getElementById('fdKpiRow'); if(k)k.insertAdjacentElement('afterend',card);
    }
    const src=sourcesV2(), groups={};
    src.forEach(r=>{const k=normV2(r.client)+'|'+r.currency;if(!groups[k])groups[k]={client:r.client,currency:r.currency,amount:0,sources:[]};groups[k].amount+=r.amount;groups[k].sources.push(r);});
    const rows=Object.values(groups).sort((a,b)=>b.amount-a.amount), totals={};rows.forEach(r=>totals[r.currency]=(totals[r.currency]||0)+r.amount);
    const totalText=Object.entries(totals).map(([c,v])=>cashV2(c,v)).join(' · ')||'TZS 0';
    card.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:6px"><div><div style="font-size:10px;font-weight:800;color:var(--muted);letter-spacing:.04em">RECEIVABLES</div><div style="font-size:20px;font-weight:900;margin-top:2px">${totalText}</div><div style="font-size:10px;color:var(--muted);margin-top:2px">Open balances · click a client to trace the source</div></div><div style="font-size:9px;color:var(--muted)">Collection control</div></div><div id="fdRecRowsV2">${rows.length?rows.slice(0,8).map((r,i)=>`<button class="fd-rec-row" data-rec-index="${i}" style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:14px;background:transparent;border:0;border-top:1px solid var(--border);padding:6px 2px;cursor:pointer;text-align:left;color:var(--navy)"><span style="font-size:11px;font-weight:600">${escV2(r.client)}</span><span style="font-size:11px;font-weight:800">${cashV2(r.currency,r.amount)} &rsaquo;</span></button>`).join(''):'<div style="padding:7px 0;font-size:11px;color:var(--muted)">No open receivables.</div>'}</div>`;
    card._fdRecGroupsV2=rows;
    const list=card.querySelector('#fdRecRowsV2');
    list.onclick=e=>{const b=e.target.closest('[data-rec-index]');if(!b)return;const r=card._fdRecGroupsV2?.[Number(b.dataset.recIndex)];if(!r)return;if(r.sources.length===1)openSourceV2(r.sources[0].kind,r.sources[0].id);else sourceModalV2(r.client,r.sources);};
  }
  window.fdRenderReceivablesCard=renderReceivablesV2;

  function revenueRowsV2(){
    const rows=[];
    const invs=(typeof _fdInvoices!=='undefined'&&Array.isArray(_fdInvoices))?_fdInvoices:[];
    invs.forEach(i=>{
      if(typeof fdIsRecognizedRevenue==='function'&&!fdIsRecognizedRevenue(i))return;
      const revenue=Number(i.total_due||0),paid=Number(i.amount_paid||0)+Number(i.withholding_tax_amount||0),outstanding=Math.max(0,revenue-paid);
      rows.push({client:i.client_name||'Unknown client',matter:i.matter_ref||i.matter_title||'—',source:i.invoice_number||'—',currency:i.currency||'TZS',revenue,paid,outstanding,status:i.status||'issued'});
    });
    const manual=(typeof _fdAllManual!=='undefined'&&Array.isArray(_fdAllManual))?_fdAllManual:[];
    manual.forEach(t=>{
      const st=String(t.status||(t.is_approved?'approved':'pending')).toLowerCase();
      if(st!=='approved'||t.tx_type!=='revenue'||(typeof fdInPeriod==='function'&&!fdInPeriod(t.date)))return;
      const revenue=t.client_receivable&&Number(t.agreed_amount||0)>0?Number(t.agreed_amount):Number(t.amount||0),paid=Number(t.amount||0),outstanding=t.client_receivable?Math.max(0,Number(t.outstanding_amount||0)):0;
      rows.push({client:t.receivable_client_name||t.counterparty||'Other Revenue',matter:t.receivable_matter_ref||'—',source:t.reference||'Manual Revenue',currency:t.currency||'TZS',revenue,paid,outstanding,status:outstanding>0?'part paid':'paid'});
    });
    return rows.sort((a,b)=>b.revenue-a.revenue);
  }

  function removeLegacyClientMatter(){
    const root=document.getElementById('page-findash');if(!root)return;
    [...root.querySelectorAll('div')].filter(e=>e.children.length===0&&e.textContent.trim()==='CLIENT & MATTER REVENUE').forEach(h=>{const c=cardOf(h);if(c&&c.id!=='fdClientMatterRevenueV2')c.remove();});
    hideCard(cardOf(document.getElementById('fdTopClients')));
    hideCard(cardOf(document.getElementById('fdMatterLeaderboard')));
  }

  function renderClientMatterV2(){
    removeLegacyClientMatter();
    let card=document.getElementById('fdClientMatterRevenueV2');
    if(!card){card=document.createElement('div');card.id='fdClientMatterRevenueV2';card.className='fd-v2-card';}
    const rows=revenueRowsV2();
    card.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:6px"><div><div style="font-size:11px;font-weight:800">CLIENT & MATTER REVENUE</div><div style="font-size:9px;color:var(--muted);margin-top:2px">Client performance with the underlying matter/source</div></div><div style="font-size:9px;color:var(--muted)">${rows.length} source${rows.length===1?'':'s'}</div></div><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:10.5px"><thead><tr style="border-bottom:1px solid var(--border)"><th style="text-align:left">Client</th><th style="text-align:left">Matter / Source</th><th style="text-align:right">Revenue</th><th style="text-align:right">Paid</th><th style="text-align:right">Outstanding</th><th style="text-align:center">Status</th></tr></thead><tbody>${rows.length?rows.slice(0,8).map(r=>`<tr style="border-bottom:1px solid #eee8df"><td style="font-weight:700">${escV2(r.client)}</td><td><div>${escV2(r.matter)}</div><div style="font-size:9px;color:var(--muted)">${escV2(r.source)}</div></td><td style="text-align:right;font-weight:700">${cashV2(r.currency,r.revenue)}</td><td style="text-align:right;color:#16803c">${cashV2(r.currency,r.paid)}</td><td style="text-align:right;font-weight:700;color:${r.outstanding>0?'#b42318':'var(--muted)'}">${cashV2(r.currency,r.outstanding)}</td><td style="text-align:center">${escV2(String(r.status).replaceAll('_',' '))}</td></tr>`).join(''):`<tr><td colspan="6" style="padding:8px;text-align:center;color:var(--muted)">No selected-period client revenue.</td></tr>`}</tbody></table></div>`;
    const exp=headingCard('EXPENDITURE ANALYTICS');
    if(exp&&exp.parentElement){const parent=exp.parentElement;parent.style.gridTemplateColumns='minmax(0,1.35fr) minmax(260px,.65fr)';if(card.parentElement!==parent)parent.insertBefore(card,exp);}
    else {const manualCard=cardOf(document.getElementById('fdManualBody'));if(manualCard&&manualCard.parentElement)manualCard.insertAdjacentElement('afterend',card);}
  }

  function redesignLayoutV2(){
    // Timeline is not a permanent management card; reports retain historical detail.
    hideCard(cardOf(document.getElementById('fdTimeline')));
    // Health narrative duplicates the top status pill and Attention Required.
    hideCard(cardOf(document.getElementById('fdIntelligence')));
    // Monthly Expense Summary duplicates the Expense KPI + Expenditure Analytics.
    const monthly=headingCard('MONTHLY EXPENSE SUMMARY'); if(monthly){const parent=monthly.parentElement;hideCard(monthly);if(parent)parent.style.gridTemplateColumns='minmax(0,1fr) minmax(300px,1fr)';}
    // Keep practice performance compact; remove inherited stretch from timeline column.
    const practice=headingCard('PRACTICE PERFORMANCE');if(practice){practice.style.minHeight='0';practice.style.height='auto';const p=practice.parentElement;if(p)p.style.gridTemplateColumns='1fr';}
    // Any finance dashboard cards should size to content unless their own component requires otherwise.
    document.querySelectorAll('#page-findash [style*="border-radius:12px"]').forEach(c=>{if(c.dataset.fdV2Hidden!=='1'){c.style.minHeight='0';c.style.height='auto';}});
  }

  function auditV2(){
    const root=document.getElementById('page-findash');if(!root)return;
    const cm=[...root.querySelectorAll('div')].filter(e=>e.children.length===0&&e.textContent.trim()==='CLIENT & MATTER REVENUE'&&e.offsetParent!==null);
    console.info('[MOLMS finance audit v2]',{clientMatterVisible:cm.length,receivables:!!document.getElementById('fdReceivablesCardV1'),timelineVisible:document.getElementById('fdTimeline')?.offsetParent!==null});
    if(cm.length!==1)console.warn('[finance audit] expected exactly one visible Client & Matter Revenue card, found',cm.length);
  }
  window.fdFinanceDashboardAuditV2=auditV2;

  function applyV2(){renderReceivablesV2();renderClientMatterV2();redesignLayoutV2();setTimeout(auditV2,20);}
  const prevRefresh=window.fdRefresh;
  if(typeof prevRefresh==='function')window.fdRefresh=async function(){const r=await prevRefresh.apply(this,arguments);applyV2();return r;};
  window.addEventListener('load',()=>{setTimeout(applyV2,700);setTimeout(applyV2,1400);});
})();
</script>
'''
pos=s.lower().rfind('</body>')
if pos<0: raise SystemExit('no body')
s=s[:pos]+patch+s[pos:]
p.write_text(s)
print('patched architecture v2')