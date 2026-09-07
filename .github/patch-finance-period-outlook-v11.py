from pathlib import Path
import re
p=Path('index.html')
s=p.read_text(errors='surrogateescape')
MARK='MOLMS-FINANCE-PERIOD-OUTLOOK-V11'
if MARK in s:
    print('Already patched')
    raise SystemExit(0)
for x in ['id="page-findash"','id="fdKpiRow"','function fdGetPeriodDates()','function fdInitMonthSelector()','MOLMS-FINANCE-HIERARCHY-V10']:
    assert x in s, f'Missing stable marker: {x}'
assert s.count('id="page-findash"')==1
m=re.search(r'</body>\s*</html>\s*$',s,re.I|re.S)
assert m, 'No closing body/html'
ui=r'''
<style>/* MOLMS-FINANCE-PERIOD-OUTLOOK-V11 */
#page-findash #fdKpiRow{grid-template-columns:repeat(5,minmax(0,1fr))!important}
#page-findash #fdKpiRow>div:nth-child(1){order:1}
#page-findash #fdKpiRow>div:nth-child(4){order:2}
#page-findash #fdKpiRow>div:nth-child(5){order:3}
#page-findash #fdKpiRow>div:nth-child(2){order:4}
#page-findash #fdKpiRow>div:nth-child(6){order:5}
#page-findash #fdKpiRow>div:nth-child(3){display:none!important}
#page-findash .fdv11-context{margin:10px 24px 7px;padding:9px 12px;border:1px solid var(--border);border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
#page-findash .fdv11-context-title{font-size:12px;font-weight:900;color:var(--navy)}
#page-findash .fdv11-context-sub{font-size:10px;color:var(--muted);margin-top:2px}
#page-findash .fdv11-position{font-size:10px;font-weight:800;color:var(--muted);white-space:nowrap}
#page-findash .fdv11-scope{font-size:9px;color:var(--muted);margin-top:3px;font-weight:500}
@media(max-width:980px){#page-findash #fdKpiRow{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
@media(max-width:620px){#page-findash #fdKpiRow{grid-template-columns:1fr!important}#page-findash .fdv11-context{margin-left:12px;margin-right:12px}}
</style>
<script>/* MOLMS-FINANCE-PERIOD-OUTLOOK-V11 runtime */
(function(){
  const q=id=>document.getElementById(id);
  const localDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const todayLocal=()=>localDate(new Date());
  const parseMonth=v=>{const [y,m]=(v||todayLocal().slice(0,7)).split('-').map(Number);return {y,m};};
  const fmtDate=s=>{if(!s)return '';const d=new Date(s+'T00:00:00');return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});};
  function rawPeriodBounds(){
    const period=(q('fdPeriod')?.value||'month');
    const {y,m}=parseMonth(q('fdMonth')?.value);
    let start,end;
    if(period==='month'){
      start=new Date(y,m-1,1);end=new Date(y,m,0);
    }else if(period==='quarter'){
      const qi=Math.floor((m-1)/3);start=new Date(y,qi*3,1);end=new Date(y,qi*3+3,0);
    }else if(period==='half'){
      const hi=m<=6?0:1;start=new Date(y,hi*6,1);end=new Date(y,hi*6+6,0);
    }else if(period==='year'){
      start=new Date(y,0,1);end=new Date(y,11,31);
    }else{
      start=new Date(2020,0,1);end=new Date();
    }
    const today=new Date();today.setHours(0,0,0,0);end.setHours(0,0,0,0);
    if(end>today)end=today;
    return {start:localDate(start),end:localDate(end),monthStr:`${y}-${String(m).padStart(2,'0')}`};
  }
  window.fdGetPeriodDates=function(){return rawPeriodBounds();};

  function currentAnchor(period){
    const n=new Date(),y=n.getFullYear(),m=n.getMonth()+1;
    if(period==='quarter')return `${y}-${String(Math.floor((m-1)/3)*3+1).padStart(2,'0')}`;
    if(period==='half')return `${y}-${m<=6?'01':'07'}`;
    if(period==='year')return `${y}-01`;
    return `${y}-${String(m).padStart(2,'0')}`;
  }
  function buildAnchorOptions(period,preserve){
    const sel=q('fdMonth');if(!sel)return;
    const prior=preserve||sel.value||currentAnchor(period);const {y:py,m:pm}=parseMonth(prior);
    const now=new Date(),cy=now.getFullYear(),cm=now.getMonth()+1;let opts=[];
    if(period==='month'){
      for(let i=0;i<60;i++){const d=new Date(cy,cm-1-i,1);const y=d.getFullYear(),m=d.getMonth()+1;opts.push({v:`${y}-${String(m).padStart(2,'0')}`,l:d.toLocaleDateString('en-US',{month:'long',year:'numeric'})});}
    }else if(period==='quarter'){
      for(let y=cy;y>=2020;y--){for(let qi=3;qi>=0;qi--){const sm=qi*3+1;if(y===cy&&sm>cm)continue;opts.push({v:`${y}-${String(sm).padStart(2,'0')}`,l:`Q${qi+1} ${y}`});}}
    }else if(period==='half'){
      for(let y=cy;y>=2020;y--){if(!(y===cy&&cm<7))opts.push({v:`${y}-07`,l:`H2 ${y} · Jul–Dec`});opts.push({v:`${y}-01`,l:`H1 ${y} · Jan–Jun`});}
    }else if(period==='year'){
      for(let y=cy;y>=2020;y--)opts.push({v:`${y}-01`,l:String(y)});
    }else{
      opts=[{v:`${cy}-01`,l:'All available records'}];
    }
    let target;
    if(period==='month')target=`${py}-${String(pm).padStart(2,'0')}`;
    else if(period==='quarter')target=`${py}-${String(Math.floor((pm-1)/3)*3+1).padStart(2,'0')}`;
    else if(period==='half')target=`${py}-${pm<=6?'01':'07'}`;
    else if(period==='year')target=`${py}-01`;
    else target=opts[0].v;
    if(!opts.some(o=>o.v===target))target=currentAnchor(period);
    sel.innerHTML=opts.map(o=>`<option value="${o.v}"${o.v===target?' selected':''}>${o.l}</option>`).join('');
    sel.disabled=period==='all';
  }
  function enhanceSelectors(initial){
    const per=q('fdPeriod'),month=q('fdMonth');if(!per||!month)return;
    const wanted=[['month','Monthly'],['quarter','Quarterly'],['half','Semi-Annual'],['year','Yearly'],['all','All Time']];
    const current=per.value||'month';
    per.innerHTML=wanted.map(([v,l])=>`<option value="${v}"${v===current?' selected':''}>${l}</option>`).join('');
    if(initial&&!per.dataset.fdv11){per.value='month';buildAnchorOptions('month',currentAnchor('month'));}
    else buildAnchorOptions(per.value,month.value);
    if(!per.dataset.fdv11){
      per.dataset.fdv11='1';
      per.addEventListener('change',()=>{const anchor=month.value;buildAnchorOptions(per.value,anchor);setTimeout(()=>{if(typeof fdRefresh==='function')fdRefresh();},0);});
      month.addEventListener('change',()=>setTimeout(applyOutlook,0));
    }
  }
  window.fdPeriodLabel=function(){
    const period=q('fdPeriod')?.value||'month';const {y,m}=parseMonth(q('fdMonth')?.value);const {end}=rawPeriodBounds();const today=todayLocal();const live=end===today;
    if(period==='month'){const d=new Date(y,m-1,1);return d.toLocaleDateString('en-US',{month:'long',year:'numeric'})+(live?' · Month to Date':'');}
    if(period==='quarter')return `Q${Math.floor((m-1)/3)+1} ${y}`+(live?' · Quarter to Date':'');
    if(period==='half')return `H${m<=6?1:2} ${y}`+(live?' · Half-Year to Date':'');
    if(period==='year')return `${y}`+(live?' · Year to Date':'');
    return 'All Time';
  };
  function ensureScope(card,text){if(!card)return;let x=card.querySelector(':scope>.fdv11-scope');if(!x){x=document.createElement('div');x.className='fdv11-scope';card.appendChild(x);}x.textContent=text;}
  function relabel(){
    const cards=[...document.querySelectorAll('#fdKpiRow>div')];if(cards.length<6)return;
    const labels={0:'REVENUE',1:'EXPENSES',3:'PAYMENTS RECEIVED',4:'OUTSTANDING PAYMENTS',5:'CASH AVAILABLE'};
    Object.entries(labels).forEach(([i,t])=>{const c=cards[Number(i)],h=c?.firstElementChild;if(h)h.textContent=t;});
    const pl=window.fdPeriodLabel();const end=rawPeriodBounds().end;
    ensureScope(cards[0],pl);ensureScope(cards[1],pl);ensureScope(cards[3],pl);ensureScope(cards[4],pl);ensureScope(cards[5],`As at ${fmtDate(end)} · Includes opening cash carried forward`);
  }
  function receivables(){
    const rec=q('fdReceivablesCardV2')||q('fdReceivablesCardV1');if(!rec)return;
    const leaves=[...rec.querySelectorAll('div,span')];const title=leaves.find(x=>/^RECEIVABLES$/i.test((x.textContent||'').trim())||/^TOTAL CLIENT RECEIVABLES$/i.test((x.textContent||'').trim()));if(title)title.textContent='TOTAL CLIENT RECEIVABLES';
    const sub=leaves.find(x=>/Open balances as at|All unpaid client balances as at/i.test(x.textContent||''));if(sub)sub.textContent=`All unpaid client balances as at ${fmtDate(rawPeriodBounds().end)} · Includes previous periods`;
  }
  function context(){
    const k=q('fdKpiRow');if(!k)return;let c=q('fdV11PeriodContext');if(!c){c=document.createElement('div');c.id='fdV11PeriodContext';c.className='fdv11-context';k.parentNode.insertBefore(c,k);}
    c.innerHTML=`<div><div class="fdv11-context-title">${window.fdPeriodLabel()}</div><div class="fdv11-context-sub">Period activity: Revenue · Payments Received · Outstanding Payments · Expenses</div></div><div class="fdv11-position">Financial position as at ${fmtDate(rawPeriodBounds().end)}</div>`;
  }
  function applyOutlook(){enhanceSelectors(false);relabel();receivables();context();}
  const baseKpi=window.fdRenderKpi;if(typeof baseKpi==='function')window.fdRenderKpi=function(){const r=baseKpi.apply(this,arguments);setTimeout(applyOutlook,0);return r;};
  const baseRec=window.fdRenderReceivablesCard;if(typeof baseRec==='function')window.fdRenderReceivablesCard=function(){const r=baseRec.apply(this,arguments);setTimeout(applyOutlook,0);return r;};
  window.addEventListener('load',()=>{setTimeout(()=>{enhanceSelectors(true);applyOutlook();},500);[1200,2400].forEach(t=>setTimeout(applyOutlook,t));});
})();
</script>
'''
pos=m.start();s=s[:pos]+ui+s[pos:]
assert s.count('MOLMS-FINANCE-PERIOD-OUTLOOK-V11 runtime')==1
assert "['month','Monthly'],['quarter','Quarterly'],['half','Semi-Annual'],['year','Yearly'],['all','All Time']" in s
assert "#page-findash #fdKpiRow>div:nth-child(3){display:none!important}" in s
assert 'OUTSTANDING PAYMENTS' in s and 'PAYMENTS RECEIVED' in s and 'TOTAL CLIENT RECEIVABLES' in s
p.write_text(s,errors='surrogateescape')
print('V11 financial period outlook applied safely')
