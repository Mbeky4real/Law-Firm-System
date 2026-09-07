from pathlib import Path
p=Path('index.html'); s=p.read_text(errors='surrogateescape')
MARK='MOLMS-FINANCE-KPI-COPY-V12'
if MARK in s: raise SystemExit('Already patched')
assert 'MOLMS-FINANCE-PERIOD-OUTLOOK-V11' in s
assert 'id="fdKpiRow"' in s
insert=r'''
<style>/* MOLMS-FINANCE-KPI-COPY-V12 */
#page-findash .fdv12-note{font-size:9px;color:var(--muted);margin-top:5px;line-height:1.25}
</style>
<script>/* MOLMS-FINANCE-KPI-COPY-V12 runtime */
(function(){
 function apply(){
  const row=document.getElementById('fdKpiRow'); if(!row)return;
  const cards=[...row.children].filter(x=>x.style.display!=='none'); if(cards.length<5)return;
  const notes=['Revenue recorded this period.','Cash received this period.','Unpaid from this period’s invoices.','Operating expenses this period.',null];
  cards.slice(0,5).forEach((c,i)=>{
    [...c.querySelectorAll('.fdv12-note')].forEach(n=>n.remove());
    // V11/canonical cards can leave multiple small period-mechanics lines. Keep values, remove explanatory repetition.
    [...c.querySelectorAll('div')].forEach((d,idx)=>{
      if(idx===0)return;
      const t=(d.textContent||'').trim();
      if(/Month to Date|Quarter to Date|Half-Year to Date|Year to Date|Opening balance carried forward|Includes opening cash carried forward|Selected period/i.test(t)) d.style.display='none';
    });
    const n=document.createElement('div');n.className='fdv12-note';
    if(i===4){
      let asof='';const pos=document.getElementById('fdV11PositionLabel');
      if(pos){const m=(pos.textContent||'').match(/as at\s+(.+)$/i);if(m)asof=m[1];}
      n.textContent=asof?'Cash available as at '+asof+'.':'Cash available at period end.';
    }else n.textContent=notes[i];
    c.appendChild(n);
  });
 }
 const kick=()=>[0,80,250,700].forEach(t=>setTimeout(apply,t));
 window.addEventListener('load',kick);
 new MutationObserver(()=>setTimeout(apply,30)).observe(document.documentElement,{subtree:true,childList:true});
})();
</script>
'''
pos=s.lower().rfind('</body>'); assert pos>=0
s=s[:pos]+insert+s[pos:]
p.write_text(s,errors='surrogateescape')
print('V12 concise KPI copy applied')
