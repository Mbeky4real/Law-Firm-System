from pathlib import Path
import re
p=Path('index.html')
s=p.read_text(encoding='utf-8')
old="function prCanAccess()  { return authRole==='partner'||authRole==='hr_officer'; }"
new="function prCanAccess()  { return true; } // all authenticated staff may access own payroll self-service"
assert s.count(old)==1,(old,s.count(old))
s=s.replace(old,new,1)
assert "function prIsPrivileged(){ return authRole==='partner'||authRole==='hr_officer'; }" in s
assert "function prCanGenerate(){ return authRole==='partner'||authRole==='hr_officer'; }" in s
assert "function prCanApprove() { return authRole==='partner'; }" in s
assert "async function prRenderSelfService()" in s
p.write_text(s,encoding='utf-8')
scripts=re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>',s,flags=re.S|re.I)
Path('/tmp/molms-inline.js').write_text('\n'.join(scripts),encoding='utf-8')
print('Payroll self-service RBAC patch PASS')
