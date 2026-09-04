from pathlib import Path
import re
p=Path('index.html')
s=p.read_text(encoding='utf-8')
old="const role=val('memRole')==='partner'?'partner':'staff';"
assert s.count(old)==2, f'expected 2 collapsing role assignments, found {s.count(old)}'
s=s.replace(old,"const role=val('memRole');")
allowed="['staff','office_manager','hr_officer','partner']"
# Defensive validation: UI should never send arbitrary role strings.
s=s.replace("  const position=val('memPosition');\n  const phone=val('memPhone');\n  const msg=$('memberCreateMsg');", "  if(!['staff','office_manager','hr_officer','partner'].includes(role)){ notice('Invalid member role.','err'); return; }\n  const position=val('memPosition');\n  const phone=val('memPhone');\n  const msg=$('memberCreateMsg');", 1)
# Second occurrence is update path; insert validation after role assignment.
needle="  const role=val('memRole');\n  const msg=$('memberCreateMsg');"
assert s.count(needle)==1, s.count(needle)
s=s.replace(needle,"  const role=val('memRole');\n  if(!['staff','office_manager','hr_officer','partner'].includes(role)){ notice('Invalid member role.','err'); return; }\n  const msg=$('memberCreateMsg');",1)
# Required delegated-access invariants.
required=[
"function prIsPrivileged(){ return authRole==='partner'||authRole==='hr_officer'||authRole==='office_manager'; }",
"function prCanGenerate(){ return authRole==='partner'||authRole==='hr_officer'||authRole==='office_manager'; }",
"function prCanApprove() { return authRole==='partner'; }",
"function invCanIssue(){  return authRole==='partner'; }",
"function exCanClose(){ return authRole==='partner'; }",
"<option value=\"office_manager\">Office Manager</option>",
"<option value=\"hr_officer\">HR Officer</option>"
]
for x in required: assert x in s, x
p.write_text(s,encoding='utf-8')
scripts=re.findall(r'<script(?:\\s[^>]*)?>(.*?)</script>',s,flags=re.S|re.I)
Path('/tmp/molms-inline.js').write_text('\n'.join(scripts),encoding='utf-8')
print('member role persistence patch PASS')