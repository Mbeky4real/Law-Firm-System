from pathlib import Path
import hashlib,re
p=Path('index.html'); s=p.read_text(errors='surrogateescape')
MARK='MOLMS-FINANCE-HIERARCHY-V10'
if MARK in s: raise SystemExit('Already patched')
required=['sb.auth.signInWithPassword',"const url='https://myjkthjgnmzabmuwprqp.supabase.co';",'<nav class="bottom-nav hidden">','function _setBottomNavHidden','MOLMS-FINANCE-SIDEBAR-V9','id="page-findash"','id="fdKpiRow"']
for x in required: assert x in s, f'Missing stable marker: {x}'
assert s.count('id="page-findash"')==1
pa='w.prDownloadPayslipPDF=()=>'; pe='async function prClosePeriod'
assert pa in s and pe in s
a=s.index(pa); b=s.index(pe,a); before=hashlib.sha256(s[a:b].encode('utf-8','surrogatepass')).hexdigest()
m=re.search(r'</body>\s*</html>\s*$',s,re.I|re.S); assert m
ui=r'''<style>/* MOLMS-FINANCE-HIERARCHY-V10 */
#page-findash .fdv10-band{margin:12px 24px 6px;font-size:10px;font-weight:900;letter-spacing:.11em;text-transform:uppercase;color:var(--muted)}#page-findash .fdv10-details{margin:10px 24px 14px;border:1px solid var(--border);border-radius:14px;background:#fff;overflow:hidden;box-shadow:0 3px 12px rgba(15,36,64,.035)}#page-findash .fdv10-details>summary{list-style:none;cursor:pointer;padding:13px 15px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-weight:900;color:var(--navy)}#page-findash .fdv10-details>summary::-webkit-details-marker{display:none}#page-findash .fdv10-details>summary:after{content:'Show';font-size:10px;color:var(--gold);text-transform:uppercase;letter-spacing:.08em}#page-findash .fdv10-details[open]>summary:after{content:'Hide'}#page-findash .fdv10-sub{display:block;font-size:10px;font-weight:500;color:var(--muted);margin-top:3px;letter-spacing:0;text-transform:none}#page-findash .fdv10-body{padding:0 12px 12px}#page-findash .fdv10-body>.card{margin:0 0 10px!important}@media(max-width:700px){#page-findash .fdv10-band,#page-findash .fdv10-details{margin-left:12px;margin-right:12px}}</style>
<script>/* MOLMS-FINANCE-HIERARCHY-V10 runtime */(function(){const q=id=>document.getElementById(id),root=()=>q('page-findash');function band(id,text,before){if(q(id)||!before)return;const d=document.createElement('div');d.id=id;d.className='fdv10-band';d.textContent=text;before.parentNode.insertBefore(d,before)}function wrap(id,title,sub,nodes){nodes=(nodes||[]).filter(Boolean);if(!nodes.length)return;let d=q(id);if(!d){d=document.createElement('details');d.id=id;d.className='fdv10-details';d.innerHTML='<summary><span>'+title+'<span class="fdv10-sub">'+sub+'</span></span></summary><div class="fdv10-body"></div>';nodes[0].parentNode.insertBefore(d,nodes[0])}const b=d.querySelector('.fdv10-body');nodes.forEach(n=>{if(n&&n!==d&&n.parentNode!==b)b.appendChild(n)})}function apply(){if(!root())return;const k=q('fdKpiRow');if(!k)return;const pri=q('fdPriorityRowV7')||q('fdPriorityRowV4')||q('fdPriorityRowV3');band('fdV10PriorityBand','Management priorities',pri);const cm=q('fdClientMatterRevenueV2');if(cm)wrap('fdV10ClientMatter','Client & matter performance','Open when you need to compare revenue and collections by client or matter.',[cm]);const reg=q('fdRegBody')?.closest('.card'),man=q('fdManualBody')?.closest('.card');if(reg||man)wrap('fdV10Registers','Detailed financial registers','Underlying entries remain available for review without crowding the management view.',[reg,man])}window.addEventListener('load',()=>[300,800,1500,2600].forEach(t=>setTimeout(apply,t)));new MutationObserver(()=>setTimeout(apply,40)).observe(document.documentElement,{subtree:true,childList:true})})();</script>'''
pos=m.start(); s=s[:pos]+ui+s[pos:]
a2=s.index(pa); b2=s.index(pe,a2); after=hashlib.sha256(s[a2:b2].encode('utf-8','surrogatepass')).hexdigest()
assert before==after
assert s.count('MOLMS-FINANCE-HIERARCHY-V10 runtime')==1
assert 'sb.auth.signInWithPassword' in s and '<nav class="bottom-nav hidden">' in s
p.write_text(s,errors='surrogateescape')
print('V10 hierarchy patch applied safely')
