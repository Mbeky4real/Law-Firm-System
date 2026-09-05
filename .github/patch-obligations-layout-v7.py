from pathlib import Path
import re

p=Path('index.html')
s=p.read_text()
marker='MOLMS-OBLIGATIONS-LAYOUT-V7'
if marker in s:
    print('already patched')
    raise SystemExit

# Disable legacy layout ownership only. Keep V3 attention details and V4 client/matter logic intact.
s,n1=re.subn(r"  function buildPriorityRowV3\(\)\{.*?\n  \}\n\n  function revenueRowsV3", "  function buildPriorityRowV3(){}\n\n  function revenueRowsV3", s, count=1, flags=re.S)
s,n2=re.subn(r"  function buildPriority4\(\)\{.*?\n  \}\n\n  function parseMoney4", "  function buildPriority4(){}\n\n  function parseMoney4", s, count=1, flags=re.S)
s,n3=re.subn(r"  function renderObligations6\(\)\{.*?\n  \}\n\n  const refresh6=", "  function renderObligations6(){}\n\n  const refresh6=", s, count=1, flags=re.S)
if (n1,n2,n3)!=(1,1,1):
    raise SystemExit(f'legacy neutralization failed: v3={n1}, v4={n2}, v6={n3}')

patch=r'''
<style>
/* MOLMS-OBLIGATIONS-LAYOUT-V7 */
#fdPriorityRowV3,#fdPriorityRowV4,#fdMonthlyObligationsStableV6,#fdObligationsCompactV4{display:none!important}
#fdPriorityRowV7{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(330px,.72fr)!important;gap:12px!important;align-items:start!important;margin:12px 0!important;width:100%!important}
#fdPriorityRowV7>#fdReceivablesCardV1,#fdPriorityRowV7>#fdMonthlyObligations{display:block!important;min-width:0!important;margin:0!important;height:auto!important;min-height:0!important}
#fdPriorityRowV7>#fdMonthlyObligations>div{display:block!important;margin:0!important;padding:12px!important;height:auto!important;min-height:0!important}
#fdPriorityRowV7>#fdMonthlyObligations table{font-size:10px!important;margin:0!important}
#fdPriorityRowV7>#fdMonthlyObligations td,#fdPriorityRowV7>#fdMonthlyObligations th{padding-top:3px!important;padding-bottom:3px!important}
#fdPriorityRowV7>#fdMonthlyObligations [style*="font-size:22px"]{font-size:18px!important}
@media(max-width:980px){#fdPriorityRowV7{grid-template-columns:1fr!important}}
</style>
<script>
(function(){
  let busy7=false;
  function layout7(){
    if(busy7)return;busy7=true;
    try{
      if(typeof fdRenderReceivablesCard==='function')try{fdRenderReceivablesCard();}catch(e){console.warn('[V7 receivables]',e);}
      if(typeof fdRenderMonthlyObligations==='function')try{fdRenderMonthlyObligations();}catch(e){console.warn('[V7 obligations]',e);}
      const kpi=document.getElementById('fdKpiRow');
      const rec=document.getElementById('fdReceivablesCardV1');
      const obl=document.getElementById('fdMonthlyObligations');
      if(!kpi||!rec||!obl)return;
      let row=document.getElementById('fdPriorityRowV7');
      if(!row){row=document.createElement('div');row.id='fdPriorityRowV7';kpi.insertAdjacentElement('afterend',row);}
      if(rec.parentElement!==row)row.appendChild(rec);
      if(obl.parentElement!==row)row.appendChild(obl);
      obl.style.display='block';
      const card=obl.firstElementChild;
      if(card){card.style.display='block';card.style.margin='0';card.style.height='auto';card.style.minHeight='0';}
      document.getElementById('fdPriorityRowV3')?.remove();
      document.getElementById('fdPriorityRowV4')?.remove();
      document.getElementById('fdMonthlyObligationsStableV6')?.remove();
      document.getElementById('fdObligationsCompactV4')?.remove();
    }finally{busy7=false;}
  }
  const refresh7=window.fdRefresh;
  if(typeof refresh7==='function')window.fdRefresh=async function(){const r=await refresh7.apply(this,arguments);layout7();return r;};
  window.addEventListener('load',()=>{setTimeout(layout7,700);setTimeout(layout7,1500);setTimeout(layout7,2600);});
  window.fdFinanceV7Audit=function(){
    const row=document.getElementById('fdPriorityRowV7'),rec=document.getElementById('fdReceivablesCardV1'),obl=document.getElementById('fdMonthlyObligations');
    return {priorityRow:!!row,receivablesSide:!!row&&rec?.parentElement===row,monthlyObligationsSide:!!row&&obl?.parentElement===row,monthlyObligationsVisible:!!obl&&getComputedStyle(obl).display!=='none',monthlyObligationsRendered:!!obl?.textContent?.includes('MONTHLY OBLIGATIONS'),legacyRowsGone:!document.getElementById('fdPriorityRowV3')&&!document.getElementById('fdPriorityRowV4'),legacyCloneGone:!document.getElementById('fdMonthlyObligationsStableV6')&&!document.getElementById('fdObligationsCompactV4')};
  };
})();
</script>
'''
pos=s.lower().rfind('</body>')
if pos<0: raise SystemExit('no body')
s=s[:pos]+patch+s[pos:]
p.write_text(s)
print('patched v7')
