from pathlib import Path
p=Path('index.html')
s=p.read_text()
marker='MOLMS-RECEIVABLES-CLIENT-MATTER-V1'
if marker in s:
    print('already patched'); raise SystemExit
patch=r'''
<script>
/* MOLMS-RECEIVABLES-CLIENT-MATTER-V1 */
(function(){
  const escHtml=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=(cur,v)=>`${escHtml(cur||'TZS')} ${Number(v||0).toLocaleString()}`;
  const norm=(v)=>String(v||'').trim().toLowerCase();

  function receivableSources(){
    const out=[];
    const invs=Array.isArray(window._fdAllInvoices)?window._fdAllInvoices:[];
    invs.forEach(i=>{
      if(String(i.invoice_type||'tax').toLowerCase()!=='tax') return;
      if(['void','cancelled','superseded'].includes(String(i.status||'').toLowerCase())) return;
      const bal=Math.max(0,Number(i.total_due||0)-Number(i.amount_paid||0)-Number(i.withholding_tax_amount||0));
      if(bal<=0) return;
      out.push({kind:'invoice',id:i.id,client:i.client_name||'Unknown Client',currency:i.currency||'TZS',amount:bal,reference:i.invoice_number||'—',matter:i.matter_ref||i.matter_title||'—',date:i.invoice_date||'',status:i.status||'issued'});
    });
    const manual=Array.isArray(window._fdAllManual)?window._fdAllManual:[];
    manual.forEach(t=>{
      const approved=String(t.status||(t.is_approved?'approved':'pending')).toLowerCase()==='approved';
      if(!approved || !t.client_receivable) return;
      const bal=Math.max(0,Number(t.outstanding_amount||0));
      if(bal<=0) return;
      out.push({kind:'manual',id:t.id,client:t.receivable_client_name||t.counterparty||'Unknown Client',currency:t.currency||'TZS',amount:bal,reference:t.reference||'—',matter:t.receivable_matter_ref||'—',date:t.date||'',status:'outstanding'});
    });
    return out;
  }

  function ensureReceivableModal(){
    let m=document.getElementById('fdReceivableSourceModalV1');
    if(m) return m;
    m=document.createElement('div');
    m.id='fdReceivableSourceModalV1';
    m.style='display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:800;align-items:center;justify-content:center;padding:16px';
    m.innerHTML=`<div style="background:#fff;border-radius:14px;width:620px;max-width:96vw;max-height:85vh;overflow:auto;padding:18px">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:10px"><div><div style="font-size:14px;font-weight:800;color:var(--navy)">RECEIVABLE SOURCES</div><div id="fdReceivableSourceSubV1" style="font-size:11px;color:var(--muted);margin-top:2px"></div></div><button class="btn out" style="padding:5px 10px" onclick="document.getElementById('fdReceivableSourceModalV1').style.display='none'">Close</button></div>
      <div id="fdReceivableSourceListV1"></div></div>`;
    document.body.appendChild(m); return m;
  }

  window.fdOpenReceivableSourceV1=async function(kind,id){
    if(kind==='invoice'){
      if(typeof go==='function') go('invoice');
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      if(typeof invLoadInvoice==='function') await invLoadInvoice(id);
      return;
    }
    if(kind==='manual'){
      if(typeof go==='function') go('findash');
      await new Promise(r=>requestAnimationFrame(r));
      if(typeof fdEditManual==='function') fdEditManual(id);
    }
  };

  window.fdOpenClientReceivablesV1=function(client){
    const rows=receivableSources().filter(x=>norm(x.client)===norm(client));
    if(rows.length===1){ fdOpenReceivableSourceV1(rows[0].kind,rows[0].id); return; }
    const m=ensureReceivableModal();
    document.getElementById('fdReceivableSourceSubV1').textContent=`${client} · ${rows.length} outstanding source${rows.length===1?'':'s'}`;
    document.getElementById('fdReceivableSourceListV1').innerHTML=rows.length?rows.map(r=>`<button onclick="fdOpenReceivableSourceV1('${r.kind}','${r.id}');document.getElementById('fdReceivableSourceModalV1').style.display='none'" style="width:100%;text-align:left;background:#fff;border:1px solid var(--border);border-radius:10px;padding:10px;margin:0 0 8px;cursor:pointer;color:var(--navy)"><div style="display:flex;justify-content:space-between;gap:12px"><b>${escHtml(r.kind==='invoice'?'Invoice':'Manual Revenue')} · ${escHtml(r.reference)}</b><b>${money(r.currency,r.amount)}</b></div><div style="font-size:11px;color:var(--muted);margin-top:3px">Matter: ${escHtml(r.matter)} · ${escHtml(r.date||'')}</div></button>`).join(''):'<div style="color:var(--muted);font-size:12px">No open receivable source found.</div>';
    m.style.display='flex';
  };

  function renderReceivables(){
    const old=window.fdRenderReceivablesCard;
    if(typeof old==='function') try{ old(); }catch(e){}
    let card=document.getElementById('fdReceivablesCardV1');
    if(!card) return;
    const src=receivableSources();
    const grouped={};
    src.forEach(r=>{const k=norm(r.client)+'|'+r.currency; if(!grouped[k]) grouped[k]={client:r.client,currency:r.currency,amount:0}; grouped[k].amount+=r.amount;});
    const rows=Object.values(grouped).sort((a,b)=>b.amount-a.amount);
    const totalByCur={}; rows.forEach(r=>totalByCur[r.currency]=(totalByCur[r.currency]||0)+r.amount);
    const totals=Object.entries(totalByCur).map(([c,v])=>money(c,v)).join(' · ')||'TZS 0';
    card.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:8px"><div><div style="font-size:11px;font-weight:800;color:var(--navy)">RECEIVABLES</div><div style="font-size:21px;font-weight:900;color:var(--navy);margin-top:2px">${totals}</div><div style="font-size:10px;color:var(--muted);margin-top:2px">Click a client to open the exact outstanding source</div></div><div style="font-size:9px;color:var(--muted);text-align:right">Who owes the firm</div></div><div>${rows.length?rows.map(r=>`<button onclick="fdOpenClientReceivablesV1('${String(r.client).replace(/'/g,"\\'")}')" style="width:100%;display:flex;justify-content:space-between;gap:12px;align-items:center;background:transparent;border:0;border-top:1px solid var(--border);padding:7px 0;cursor:pointer;text-align:left;color:var(--navy)"><span style="font-size:11px">${escHtml(r.client)}</span><span style="font-size:11px;font-weight:800">${money(r.currency,r.amount)} ›</span></button>`).join(''):'<div style="font-size:11px;color:var(--muted);padding:6px 0">No open receivables.</div>'}</div>`;
  }

  function revenueRows(){
    const rows=[];
    const invs=Array.isArray(window._fdInvoices)?window._fdInvoices:[];
    invs.forEach(i=>{
      if(typeof fdIsRecognizedRevenue==='function' && !fdIsRecognizedRevenue(i)) return;
      const rev=Number(i.total_due||0), paid=Number(i.amount_paid||0)+Number(i.withholding_tax_amount||0), out=Math.max(0,rev-paid);
      rows.push({client:i.client_name||'Unknown Client',source:i.invoice_number||'—',matter:i.matter_ref||i.matter_title||'—',currency:i.currency||'TZS',revenue:rev,paid,out,status:i.status||'issued',kind:'invoice',id:i.id});
    });
    const manual=Array.isArray(window._fdAllManual)?window._fdAllManual:[];
    manual.filter(t=>{const st=String(t.status||(t.is_approved?'approved':'pending')).toLowerCase();return st==='approved'&&t.tx_type==='revenue'&&(typeof fdInPeriod!=='function'||fdInPeriod(t.date));}).forEach(t=>{
      const rev=t.client_receivable&&Number(t.agreed_amount||0)>0?Number(t.agreed_amount):Number(t.amount||0), paid=Number(t.amount||0), out=t.client_receivable?Math.max(0,Number(t.outstanding_amount||0)):0;
      rows.push({client:t.receivable_client_name||t.counterparty||'Other Revenue',source:t.reference||'Manual Revenue',matter:t.receivable_matter_ref||'—',currency:t.currency||'TZS',revenue:rev,paid,out,status:out>0?'part_paid':'paid',kind:'manual',id:t.id});
    });
    return rows.sort((a,b)=>b.revenue-a.revenue);
  }

  function findCardByHeading(text){
    const els=[...document.querySelectorAll('#page-findash div')];
    const h=els.find(e=>e.children.length===0&&e.textContent.trim()===text);
    if(!h) return null;
    let p=h.parentElement;
    while(p&&p.id!=='page-findash'){
      if((p.getAttribute('style')||'').includes('border-radius:12px')&&(p.getAttribute('style')||'').includes('background:#fff')) return p;
      p=p.parentElement;
    }
    return null;
  }

  function renderClientMatterCard(){
    const top=findCardByHeading('TOP CLIENTS');
    if(!top) return;
    const rows=revenueRows();
    top.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div><div style="font-size:12px;font-weight:800;color:var(--navy)">CLIENT & MATTER REVENUE</div><div style="font-size:10px;color:var(--muted);margin-top:2px">Client performance with underlying matter/source in one view</div></div></div><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr style="border-bottom:2px solid var(--border)"><th style="padding:6px;text-align:left">Client</th><th style="padding:6px;text-align:left">Matter / Source</th><th style="padding:6px;text-align:right">Revenue</th><th style="padding:6px;text-align:right">Paid</th><th style="padding:6px;text-align:right">Outstanding</th><th style="padding:6px;text-align:center">Status</th></tr></thead><tbody>${rows.length?rows.slice(0,10).map(r=>`<tr style="border-bottom:1px solid var(--border)"><td style="padding:7px 6px;font-weight:700">${escHtml(r.client)}</td><td style="padding:7px 6px"><div>${escHtml(r.matter)}</div><div style="font-size:9px;color:var(--muted)">${escHtml(r.source)}</div></td><td style="padding:7px 6px;text-align:right;font-weight:700">${money(r.currency,r.revenue)}</td><td style="padding:7px 6px;text-align:right;color:#16a34a">${money(r.currency,r.paid)}</td><td style="padding:7px 6px;text-align:right;color:${r.out>0?'#dc2626':'var(--muted)'};font-weight:700">${money(r.currency,r.out)}</td><td style="padding:7px 6px;text-align:center">${escHtml(String(r.status||'').replace('_',' '))}</td></tr>`).join(''):`<tr><td colspan="6" style="padding:10px;text-align:center;color:var(--muted)">No selected-period client revenue.</td></tr>`}</tbody></table></div>`;

    const matter=findCardByHeading('MATTER REVENUE LEADERBOARD');
    if(matter){
      const parent=matter.parentElement;
      matter.style.display='none';
      if(parent && parent.style) parent.style.gridTemplateColumns='1fr';
    }
  }

  function apply(){ try{renderReceivables();renderClientMatterCard();}catch(e){console.warn('[finance refinement]',e);} }
  const baseRefresh=window.fdRefresh;
  if(typeof baseRefresh==='function') window.fdRefresh=async function(){const r=await baseRefresh.apply(this,arguments);apply();return r;};
  const baseRenderKpi=window.fdRenderKpi;
  if(typeof baseRenderKpi==='function') window.fdRenderKpi=function(){const r=baseRenderKpi.apply(this,arguments);setTimeout(apply,0);return r;};
  window.addEventListener('load',()=>setTimeout(apply,800));
})();
</script>
'''
pos=s.lower().rfind('</body>')
if pos<0: raise SystemExit('no body')
s=s[:pos]+patch+s[pos:]
p.write_text(s)
print('patched')
