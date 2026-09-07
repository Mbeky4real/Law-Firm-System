from pathlib import Path
p=Path('index.html'); s=p.read_text(errors='surrogateescape')
MARK='MOLMS-FINANCE-KPI-UNIFORMITY-V14'
if MARK in s: raise SystemExit('Already patched')
assert 'MOLMS-FINANCE-PERIOD-INTEGRITY-V13B' in s
insert=r'''
<script>/* MOLMS-FINANCE-KPI-UNIFORMITY-V14 */
(function(){
 const COPY={
  'REVENUE':'Revenue recorded this period.',
  'PAYMENTS RECEIVED':'Cash received this period.',
  'OUTSTANDING PAYMENTS':'Unpaid from this period’s invoices.',
  'EXPENSES':'Operating expenses this period.'
 };
 function applyUniformKpiCopy(){
  const row=document.getElementById('fdKpiRow'); if(!row)return;
  [...row.children].forEach(card=>{
   const title=(card.firstElementChild?.textContent||'').trim().toUpperCase();
   const note=card.querySelector('.fdv12-note');
   if(note&&COPY[title]) note.textContent=COPY[title];
  });
 }
 const base=window.fdRenderKpi;
 if(typeof base==='function') window.fdRenderKpi=function(){const r=base.apply(this,arguments);setTimeout(applyUniformKpiCopy,0);return r;};
 document.addEventListener('change',e=>{if(e.target?.id==='fdPeriod'||e.target?.id==='fdMonth')setTimeout(applyUniformKpiCopy,100);});
 window.addEventListener('load',()=>[300,800,1600].forEach(t=>setTimeout(applyUniformKpiCopy,t)));
})();
</script>
'''
pos=s.lower().rfind('</body>'); assert pos>=0
s=s[:pos]+insert+s[pos:]
p.write_text(s,errors='surrogateescape')
print('V14 KPI wording uniformity applied')
