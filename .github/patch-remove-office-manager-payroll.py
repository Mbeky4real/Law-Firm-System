from pathlib import Path
import re
p=Path('index.html')
s=p.read_text(encoding='utf-8')
reps=[
("function prCanAccess()  { return true; } // all staff: self-service or management","function prCanAccess()  { return authRole==='partner'||authRole==='hr_officer'; }"),
("function prIsPrivileged(){ return authRole==='partner'||authRole==='hr_officer'||authRole==='office_manager'; }","function prIsPrivileged(){ return authRole==='partner'||authRole==='hr_officer'; }"),
("function prCanGenerate(){ return authRole==='partner'||authRole==='hr_officer'||authRole==='office_manager'; }","function prCanGenerate(){ return authRole==='partner'||authRole==='hr_officer'; }"),
]
for old,new in reps:
    assert s.count(old)==1,(old,s.count(old))
    s=s.replace(old,new,1)
for forbidden in [
"function prIsPrivileged(){ return authRole==='partner'||authRole==='hr_officer'||authRole==='office_manager'; }",
"function prCanGenerate(){ return authRole==='partner'||authRole==='hr_officer'||authRole==='office_manager'; }"
]: assert forbidden not in s
p.write_text(s,encoding='utf-8')
scripts=re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>',s,flags=re.S|re.I)
Path('/tmp/molms-inline.js').write_text('\n'.join(scripts),encoding='utf-8')
print('Office Manager payroll removal assertions PASS')
