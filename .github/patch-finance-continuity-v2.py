from pathlib import Path
p=Path('index.html')
s=p.read_text()
marker='MOLMS-FINANCE-CONTINUITY-V2'
if marker in s:
    print('already patched'); raise SystemExit
patch=r'''
<script>
/* MOLMS-FINANCE-CONTINUITY-V2 */
(function(){
  const approved=t=>fdManualStatus(t)==='approved';
  const add=(o,c,v)=>{c=c||'TZS';o[c]=(o[c]||0)+Number(v||0);};
  const allCurrencies=o=>{if(o.TZS===undefined)o.TZS=0;return o;};
  function dateLE(v,end){return !!v&&String(v).slice(0,10)<=end;}
  function canonicalPayroll(rows){
    const precedence={locked:3,approved:2,submitted:1,draft:0,rejected:-1};
    const byMonth={};
    (rows||[]).forEach(r=>{const m=r.payroll_month||String(r.created_at||'').slice(0,7);if(!m)return;const cur=byMonth[m];if(!cur){byMonth[m]=r;return;}const rp=precedence[r.status]??-1,cp=precedence[cur.status]??-1;if(rp>cp||(rp===cp&&new Date(r.created_at||0)>new Date(cur.created_at||0)))byMonth[m]=r;});
    return Object.values(byMonth);
  }
  function cashThrough(end){
    const inflow={},outflow={};
    (_fdAllInvoices||[]).flatMap(fdInvoiceCashReceipts).filter(r=>dateLE(r.date,end)).forEach(r=>add(inflow,r.currency,r.amount));
    (_fdAllManual||[]).filter(t=>approved(t)&&dateLE(t.date,end)).forEach(t=>{
      if(t.tx_type==='revenue'||t.tx_type==='loan')add(inflow,t.currency,t.amount);
      if(t.tx_type==='expenditure'||t.tx_type==='drawing')add(outflow,t.currency,t.amount);
    });
    (_fdAllEntries||[]).filter(e=>dateLE(e.date,end)).forEach(e=>add(outflow,'TZS',e.amount));
    canonicalPayroll(_fdAllPayroll||[]).filter(r=>dateLE(fdPayrollDate(r),end)).forEach(r=>add(outflow,'TZS',Number(r.net_pay||r.total_net||r.gross_pay||r.amount||r.total_amount||0)));
    (_fdAllOfficeExpenses||[]).filter(e=>dateLE(e.expense_date,end)).forEach(e=>add(outflow,'TZS',e.amount));
    const nativeMonths=new Set(canonicalPayroll(_fdAllPayroll||[]).map(r=>r.payroll_month));
    (_fdAllHistPayroll||[]).filter(h=>!nativeMonths.has(h.period_month)&&dateLE((h.period_month||'')+'-01',end)).forEach(h=>add(outflow,'TZS',h.amount));
    const result={};new Set([...Object.keys(inflow),...Object.keys(outflow),'TZS']).forEach(c=>result[c]=(inflow[c]||0)-(outflow[c]||0));
    return allCurrencies(result);
  }
  window.fdCashContinuity=function(){
    const {start,end}=fdGetPeriodDates();
    if((val('fdPeriod')||'month')==='all')return {openingByCur:{TZS:0},closingByCur:cashThrough(end),start,end};
    const d=new Date(start+'T00:00:00');d.setDate(d.getDate()-1);const prior=d.toISOString().slice(0,10);
    return {openingByCur:cashThrough(prior),closingByCur:cashThrough(end),start,end};
  };
  function receivablesAsOf(end){
    const byClient={};
    (_fdAllInvoices||[]).filter(i=>i.invoice_type==='tax'&&i.invoice_date<=end&&!['draft','void','cancelled','superseded'].includes(i.status)).forEach(i=>{
      const receipts=fdInvoiceCashReceipts(i).filter(r=>dateLE(r.date,end)).reduce((s,r)=>s+Number(r.amount||0),0);
      let wht=0; const re=/\[Payment\s+(\d{4}-\d{2}-\d{2})\].*?WHT\s+([\d,]+(?:\.\d+)?)/gi; let m;
      while((m=re.exec(String(i.notes||'')))!==null){if(m[1]<=end)wht+=Number(m[2].replace(/,/g,''))||0;}
      if(!wht&&i.status==='paid'&&i.invoice_date<=end)wht=Number(i.withholding_tax_amount||0);
      const bal=Math.max(0,Number(i.total_due||0)-receipts-wht);if(bal>0){const k=i.client_name||'Unnamed client';byClient[k]=(byClient[k]||0)+bal;}
    });
    (_fdAllManual||[]).filter(t=>approved(t)&&t.client_receivable&&dateLE(t.date,end)&&Number(t.outstanding_amount||0)>0).forEach(t=>{const k=t.receivable_client_name||t.counterparty||'Unnamed client';byClient[k]=(byClient[k]||0)+Number(t.outstanding_amount||0);});
    return byClient;
  }
  window.fdRenderReceivablesCard=function(){
    const kpis=document.getElementById('fdKpiRow');if(!kpis)return;
    let host=document.getElementById('fdReceivablesCardV2');if(!host){host=document.createElement('div');host.id='fdReceivablesCardV2';host.className='card';host.style='margin:12px 0;padding:14px';kpis.insertAdjacentElement('afterend',host);}
    const {end}=fdGetPeriodDates(),rows=receivablesAsOf(end),list=Object.entries(rows).sort((a,b)=>b[1]-a[1]),total=list.reduce((s,x)=>s+x[1],0);
    host.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px"><div><div style="font-size:10px;font-weight:800;letter-spacing:.5px;color:var(--muted)">RECEIVABLES</div><div style="font-size:22px;font-weight:900;color:var(--navy);margin-top:2px">TZS ${Number(total).toLocaleString()}</div><div style="font-size:10px;color:var(--muted)">Open balances as at ${end}</div></div><div style="font-size:10px;color:var(--muted);text-align:right">Who owes the firm</div></div><div style="margin-top:9px">${list.slice(0,5).map(([n,v])=>`<div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-top:1px solid var(--border);font-size:12px"><span>${esc(n)}</span><strong>TZS ${Number(v).toLocaleString()}</strong></div>`).join('')||'<div style="padding-top:8px;font-size:12px;color:var(--muted)">No open receivables.</div>'}</div>`;
  };
  const baseMetrics=window.fdMetrics;
  window.fdMetrics=function(){
    const m=baseMetrics.apply(this,arguments),c=fdCashContinuity();
    m.openingCashByCur=c.openingByCur;m.cashByCur=c.closingByCur;m.cash=c.closingByCur.TZS||0;
    return m;
  };
  const baseKpi=window.fdRenderKpi;
  window.fdRenderKpi=function(){baseKpi.apply(this,arguments);const c=fdCashContinuity(),cards=document.querySelectorAll('#fdKpiRow>div');if(cards[5]){const lines=fdCurrencyLines(c.closingByCur,true).map((l,i)=>`<div style="font-size:${i===0?'16px':'12px'};font-weight:900;line-height:1.2;color:${l.value>=0?'#16a34a':'#dc2626'}">${l.text}</div>`).join('');cards[5].innerHTML=`<div style="font-size:9px;font-weight:700;color:var(--muted);margin-bottom:3px">AVAILABLE CASH</div>${lines}<div style="font-size:9px;color:var(--muted);margin-top:2px">Opening balance carried forward · ${fdPeriodLabel()}</div>`;}fdRenderReceivablesCard();};
})();
</script>
'''
pos=s.lower().rfind('</body>')
if pos<0: raise SystemExit('no body')
s=s[:pos]+patch+s[pos:]
p.write_text(s)
print('patched')
# trigger: continuity_v2_20260905
