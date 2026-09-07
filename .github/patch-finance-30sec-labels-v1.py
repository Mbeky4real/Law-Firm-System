from pathlib import Path
p=Path('index.html')
s=p.read_text()
marker='MOLMS-FINANCE-30SEC-LABELS-V1'
if marker in s:
    print('already patched'); raise SystemExit
patch=r'''
<script>
/* MOLMS-FINANCE-30SEC-LABELS-V1 */
(function(){
  const periodEndLabel=()=>{
    try{
      const p=fdGetPeriodDates();
      const d=new Date(p.end+'T00:00:00');
      return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
    }catch(e){return '';}
  };
  function apply30SecondLabels(){
    const cards=[...document.querySelectorAll('#fdKpiRow>div')];
    if(cards.length<6)return;
    const labels=['REVENUE','EXPENSES',null,'PAYMENTS RECEIVED','UNPAID THIS PERIOD','CASH AVAILABLE'];
    cards.forEach((card,i)=>{
      const label=card.querySelector('div');
      if(!label)return;
      if(i===2){
        const txt=(card.textContent||'');
        const negative=/(-\s*TZS|-\s*USD|deficit)/i.test(txt);
        label.textContent=negative?'DEFICIT':'SURPLUS';
      }else if(labels[i]) label.textContent=labels[i];
    });
    // Clarify period scope without changing any financial calculation.
    const unpaid=cards[4];
    if(unpaid){
      const small=[...unpaid.querySelectorAll('div')].find(x=>x!==unpaid.firstElementChild&&((x.textContent||'').trim().length>0));
      if(small && !/unpaid from/i.test(small.textContent||'')) small.textContent=(small.textContent||'').trim();
    }
    const cash=cards[5];
    if(cash){
      const nodes=[...cash.querySelectorAll('div')];
      const last=nodes[nodes.length-1];
      if(last && periodEndLabel()) last.textContent='As at '+periodEndLabel()+' · Opening balance carried forward';
    }
    const rec=document.getElementById('fdReceivablesCardV2');
    if(rec){
      const title=[...rec.querySelectorAll('div')].find(x=>(x.textContent||'').trim()==='RECEIVABLES');
      if(title) title.textContent='TOTAL CLIENT RECEIVABLES';
      const subs=[...rec.querySelectorAll('div')];
      const sub=subs.find(x=>/Open balances as at/i.test(x.textContent||''));
      if(sub) sub.textContent='All unpaid client balances as at '+periodEndLabel()+' · Includes previous periods';
    }
  }
  const baseKpi=window.fdRenderKpi;
  if(typeof baseKpi==='function') window.fdRenderKpi=function(){const r=baseKpi.apply(this,arguments);setTimeout(apply30SecondLabels,0);return r;};
  const baseRefresh=window.fdRefresh;
  if(typeof baseRefresh==='function') window.fdRefresh=async function(){const r=await baseRefresh.apply(this,arguments);setTimeout(apply30SecondLabels,0);return r;};
  window.addEventListener('load',()=>setTimeout(apply30SecondLabels,900));
})();
</script>
'''
pos=s.lower().rfind('</body>')
if pos<0: raise SystemExit('no body')
s=s[:pos]+patch+s[pos:]
p.write_text(s)
print('patched')
