from pathlib import Path
p=Path('index.html')
s=p.read_text()
marker='MOLMS-FINANCE-UI-V3'
if marker in s:
    print('already patched'); raise SystemExit
patch=r'''
<style>
/* MOLMS-FINANCE-UI-V3 */
#fdPriorityRowV3{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(360px,.92fr);gap:12px;align-items:start;margin:12px 0}
#fdPriorityRowV3>*{min-width:0}
#fdPriorityRowV3 #fdReceivablesCardV1{margin:0!important;padding:12px!important}
#fdPriorityRowV3 .fd-obligations-v3{margin:0!important;padding:12px!important}
#fdPriorityRowV3 .fd-obligations-v3 table{font-size:10px!important}
#fdPriorityRowV3 .fd-obligations-v3 td,#fdPriorityRowV3 .fd-obligations-v3 th{padding-top:3px!important;padding-bottom:3px!important}
#fdClientMatterRevenueV2{min-height:0!important;height:auto!important}
#fdClientMatterRevenueV2 tbody tr[data-source-kind]{cursor:pointer}
#fdClientMatterRevenueV2 tbody tr[data-source-kind]:hover{background:#faf7ef}
@media(max-width:980px){#fdPriorityRowV3{grid-template-columns:1fr}}
</style>
<script>
(function(){
  const esc3=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money3=(c,v)=>`${esc3(c||'TZS')} ${Number(v||0).toLocaleString()}`;
  const wait3=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  function cardOf3(el){let p=el;while(p&&p.id!=='page-findash'){const st=p.getAttribute?.('style')||'';if(st.includes('background:#fff')&&st.includes('border-radius:12px'))return p;p=p.parentElement;}return null;}
  function headingCard3(text){const root=document.getElementById('page-findash');if(!root)return null;const leaf=[...root.querySelectorAll('div,span')].find(e=>e.children.length===0&&e.textContent.trim()===text);return leaf?cardOf3(leaf):null;}

  function buildPriorityRowV3(){
    if(typeof fdRenderReceivablesCard==='function')try{fdRenderReceivablesCard();}catch(e){}
    const kpi=document.getElementById('fdKpiRow'),rec=document.getElementById('fdReceivablesCardV1'),obl=headingCard3('MONTHLY OBLIGATIONS');
    if(!kpi||!rec||!obl)return;
    let row=document.getElementById('fdPriorityRowV3');if(!row){row=document.createElement('div');row.id='fdPriorityRowV3';kpi.insertAdjacentElement('afterend',row);}
    rec.style.height='auto';rec.style.minHeight='0';
    obl.classList.add('fd-obligations-v3');obl.style.height='auto';obl.style.minHeight='0';
    if(rec.parentElement!==row)row.appendChild(rec);if(obl.parentElement!==row)row.appendChild(obl);
  }

  function revenueRowsV3(){
    const rows=[];
    let invs=[];
    try{const m=typeof fdMetrics==='function'?fdMetrics():null;invs=Array.isArray(m?.invoices)?m.invoices:[];}catch(e){}
    if(!invs.length&&typeof _fdInvoices!=='undefined'&&Array.isArray(_fdInvoices))invs=_fdInvoices.filter(i=>typeof fdIsRecognizedRevenue!=='function'||fdIsRecognizedRevenue(i));
    invs.forEach(i=>{const revenue=Number(i.total_due||0),paid=Number(i.amount_paid||0)+Number(i.withholding_tax_amount||0),outstanding=Math.max(0,revenue-paid);rows.push({kind:'invoice',id:i.id,client:i.client_name||'Unknown client',matter:i.matter_ref||i.matter_title||'General / Unlinked',source:i.invoice_number||'—',currency:i.currency||'TZS',revenue,paid,outstanding,status:i.status||'issued'});});
    let manual=[];try{manual=typeof fdApprovedManual==='function'?fdApprovedManual('revenue'):[];}catch(e){}
    manual.forEach(t=>{const revenue=t.client_receivable&&Number(t.agreed_amount||0)>0?Number(t.agreed_amount):Number(t.amount||0),paid=Number(t.amount||0),outstanding=t.client_receivable?Math.max(0,Number(t.outstanding_amount||0)):0;rows.push({kind:'manual',id:t.id,client:t.receivable_client_name||t.counterparty||'Other Revenue',matter:t.receivable_matter_ref||t.description||'General / Unlinked',source:t.reference||'Manual Revenue',currency:t.currency||'TZS',revenue,paid,outstanding,status:outstanding>0?'part paid':'paid'});});
    return rows.sort((a,b)=>b.revenue-a.revenue);
  }

  function renderClientMatterV3(){
    const card=document.getElementById('fdClientMatterRevenueV2');if(!card)return;
    const rows=revenueRowsV3();
    card.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:6px"><div><div style="font-size:11px;font-weight:800">CLIENT & MATTER REVENUE</div><div style="font-size:9px;color:var(--muted);margin-top:2px">Client performance with underlying matter/source</div></div><div style="font-size:9px;color:var(--muted)">${rows.length} source${rows.length===1?'':'s'}</div></div><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:10.5px"><thead><tr style="border-bottom:1px solid var(--border)"><th style="text-align:left;padding:6px">Client</th><th style="text-align:left;padding:6px">Matter / Source</th><th style="text-align:right;padding:6px">Revenue</th><th style="text-align:right;padding:6px">Paid</th><th style="text-align:right;padding:6px">Outstanding</th><th style="text-align:center;padding:6px">Status</th></tr></thead><tbody>${rows.length?rows.slice(0,8).map(r=>`<tr data-source-kind="${r.kind}" data-source-id="${r.id}" style="border-bottom:1px solid #eee8df"><td style="padding:6px;font-weight:700">${esc3(r.client)}</td><td style="padding:6px"><div>${esc3(r.matter)}</div><div style="font-size:9px;color:var(--muted)">${esc3(r.source)}</div></td><td style="padding:6px;text-align:right;font-weight:700">${money3(r.currency,r.revenue)}</td><td style="padding:6px;text-align:right;color:#16803c">${money3(r.currency,r.paid)}</td><td style="padding:6px;text-align:right;font-weight:700;color:${r.outstanding>0?'#b42318':'var(--muted)'}">${money3(r.currency,r.outstanding)}</td><td style="padding:6px;text-align:center">${esc3(String(r.status).replaceAll('_',' '))}</td></tr>`).join(''):`<tr><td colspan="6" style="padding:8px;text-align:center;color:var(--muted)">No selected-period client revenue.</td></tr>`}</tbody></table></div>`;
    card.onclick=e=>{const tr=e.target.closest('tr[data-source-kind]');if(!tr)return;const kind=tr.dataset.sourceKind,id=tr.dataset.sourceId;if(typeof fdOpenReceivableSourceV2==='function')fdOpenReceivableSourceV2(kind,id);};
  }

  function attentionItemsV3(){
    const out=[];let selected=[];try{selected=(typeof _fdInvoices!=='undefined'&&Array.isArray(_fdInvoices))?_fdInvoices:[];}catch(e){}
    selected.forEach(i=>{const type=String(i.invoice_type||'tax').toLowerCase(),st=String(i.status||'').toLowerCase();if(type==='tax'&&!['void','cancelled','superseded','paid'].includes(st)){const bal=Math.max(0,Number(i.total_due||0)-Number(i.amount_paid||0)-Number(i.withholding_tax_amount||0));if(bal>0)out.push({kind:'invoice',id:i.id,type:'Tax Invoice',client:i.client_name||'Unknown client',matter:i.matter_ref||i.matter_title||'No matter linked',source:i.invoice_number||'—',date:i.invoice_date||'',due:i.due_date||'',currency:i.currency||'TZS',total:Number(i.total_due||0),paid:Number(i.amount_paid||0)+Number(i.withholding_tax_amount||0),balance:bal,status:i.status||'issued',action:'Collect the outstanding balance.'});}if(type==='proforma'&&st==='issued')out.push({kind:'invoice',id:i.id,type:'Proforma',client:i.client_name||'Unknown client',matter:i.matter_ref||i.matter_title||'No matter linked',source:i.invoice_number||'—',date:i.invoice_date||'',due:i.due_date||'',currency:i.currency||'TZS',total:Number(i.total_due||0),paid:0,balance:Number(i.total_due||0),status:i.status||'issued',action:'Await client agreement/payment and convert to Tax Invoice when appropriate.'});});
    let manual=[];try{manual=typeof fdApprovedManual==='function'?fdApprovedManual('revenue'):[];}catch(e){}
    manual.filter(t=>t.client_receivable&&Number(t.outstanding_amount||0)>0).forEach(t=>out.push({kind:'manual',id:t.id,type:'Manual Client Receivable',client:t.receivable_client_name||t.counterparty||'Unknown client',matter:t.receivable_matter_ref||t.description||'No matter linked',source:t.reference||'—',date:t.date||'',due:'',currency:t.currency||'TZS',total:Number(t.agreed_amount||t.amount||0),paid:Number(t.amount||0),balance:Number(t.outstanding_amount||0),status:'outstanding',action:'Follow up and record the remaining client payment.'}));
    return out;
  }
  function openAttentionV3(){
    let m=document.getElementById('fdAttentionDetailV3');if(!m){m=document.createElement('div');m.id='fdAttentionDetailV3';m.style='display:none;position:fixed;inset:0;background:rgba(15,36,64,.45);z-index:950;align-items:center;justify-content:center;padding:18px';m.innerHTML='<div style="background:#fff;border-radius:14px;width:min(920px,96vw);max-height:86vh;overflow:auto;padding:16px"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:10px"><div><b style="font-size:14px">ATTENTION REQUIRED — DETAILS</b><div id="fdAttnSubV3" style="font-size:10px;color:var(--muted);margin-top:2px"></div></div><button class="btn out" id="fdAttnCloseV3" style="padding:5px 10px">Close</button></div><div id="fdAttnListV3"></div></div>';document.body.appendChild(m);m.querySelector('#fdAttnCloseV3').onclick=()=>m.style.display='none';m.addEventListener('click',e=>{if(e.target===m)m.style.display='none'});m.querySelector('#fdAttnListV3').onclick=e=>{const b=e.target.closest('[data-open-kind]');if(!b)return;m.style.display='none';if(typeof fdOpenReceivableSourceV2==='function')fdOpenReceivableSourceV2(b.dataset.openKind,b.dataset.openId);};}
    const rows=attentionItemsV3();m.querySelector('#fdAttnSubV3').textContent=`${typeof fdPeriodLabel==='function'?fdPeriodLabel():'Selected period'} · ${rows.length} item${rows.length===1?'':'s'} requiring follow-up`;m.querySelector('#fdAttnListV3').innerHTML=rows.length?rows.map(r=>`<div style="border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><div style="font-size:11px;font-weight:800">${esc3(r.type)} · ${esc3(r.client)}</div><div style="font-size:10px;color:var(--muted);margin-top:2px">${esc3(r.matter)}</div><div style="font-size:9px;color:var(--muted);margin-top:2px">${esc3(r.source)} · ${esc3(r.date)}${r.due?' · due '+esc3(r.due):''}</div></div><div style="text-align:right"><div style="font-size:11px;font-weight:800;color:#b42318">${money3(r.currency,r.balance)}</div><div style="font-size:9px;color:var(--muted)">${esc3(r.status)}</div></div></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px;font-size:10px"><div>Total<br><b>${money3(r.currency,r.total)}</b></div><div>Settled<br><b>${money3(r.currency,r.paid)}</b></div><div>Outstanding<br><b>${money3(r.currency,r.balance)}</b></div></div><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:8px;padding-top:7px;border-top:1px solid #eee8df"><span style="font-size:10px"><b>Next action:</b> ${esc3(r.action)}</span><button class="btn out" data-open-kind="${r.kind}" data-open-id="${r.id}" style="font-size:10px;padding:4px 8px;white-space:nowrap">Open Source</button></div></div>`).join(''):'<div style="font-size:11px;color:var(--muted);padding:8px">No specific follow-up items for this period.</div>';m.style.display='flex';
  }
  const baseViewAll3=window.fdViewAll;window.fdViewAll=function(section){if(section==='attention'){openAttentionV3();return;}return typeof baseViewAll3==='function'?baseViewAll3.apply(this,arguments):undefined;};

  function applyV3(){buildPriorityRowV3();renderClientMatterV3();}
  const prevRefresh3=window.fdRefresh;if(typeof prevRefresh3==='function')window.fdRefresh=async function(){const r=await prevRefresh3.apply(this,arguments);applyV3();return r;};
  window.addEventListener('load',()=>{setTimeout(applyV3,800);setTimeout(applyV3,1600);});
  window.fdFinanceUiAuditV3=function(){const row=document.getElementById('fdPriorityRowV3'),cm=document.getElementById('fdClientMatterRevenueV2');return {priorityRow:!!row,receivablesInPriority:!!row?.querySelector('#fdReceivablesCardV1'),obligationsInPriority:!!row?.querySelector('.fd-obligations-v3'),clientMatterRows:cm?.querySelectorAll('tbody tr[data-source-kind]').length||0,attentionOverride:window.fdViewAll!==baseViewAll3};};
})();
</script>
'''
pos=s.lower().rfind('</body>')
if pos<0: raise SystemExit('no body')
s=s[:pos]+patch+s[pos:]
p.write_text(s)
print('patched')