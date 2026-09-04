from pathlib import Path
import re
p=Path('index.html')
s=p.read_text(encoding='utf-8')
reps=[
('<div><label>Member Type</label><select id="memRole"><option value="staff">Ordinary Member</option><option value="partner">Partner (Admin)</option></select></div>','<div><label>Member Type</label><select id="memRole"><option value="staff">Ordinary Member</option><option value="office_manager">Office Manager</option><option value="hr_officer">HR Officer</option><option value="partner">Partner (Admin)</option></select></div>'),
("    role:r.role==='partner'?'partner':'ordinary',\n        position:r.position||(r.role==='partner'?'Partner / Admin':'Ordinary Member'),","    role:r.role==='partner'?'partner':(r.role==='office_manager'||r.role==='hr_officer')?r.role:'ordinary',\n        position:r.position||(r.role==='partner'?'Partner / Admin':r.role==='office_manager'?'Office Manager':r.role==='hr_officer'?'HR Officer':'Ordinary Member'),"),
("if($('memRole')) $('memRole').value=m.role==='partner'?'partner':'staff';","if($('memRole')) $('memRole').value=['staff','office_manager','hr_officer','partner'].includes(m.role)?m.role:(m.role==='admin'?'partner':'staff');"),
("function prIsPrivileged(){ return authRole==='partner'||authRole==='hr_officer'; }","function prIsPrivileged(){ return authRole==='partner'||authRole==='hr_officer'||authRole==='office_manager'; }"),
("function prCanGenerate(){ return authRole==='partner'||authRole==='hr_officer'; }","function prCanGenerate(){ return authRole==='partner'||authRole==='hr_officer'||authRole==='office_manager'; }"),
("function exCanClose(){ return authRole==='partner'||authRole==='office_manager'; }","function exCanClose(){ return authRole==='partner'; }"),
]
for old,new in reps:
    assert s.count(old)==1,(old[:80],s.count(old))
    s=s.replace(old,new,1)
old='''  const memberCard=(m,active)=>{\n    const actions=admin?`<div class="member-actions"><button class="btn out small" onclick="editMember('${m.id}')" style="margin-right:4px">Edit</button><button class="btn ${active?'red':'green'} small" onclick="removeMemberRole('${m.id}')">${active?'Deactivate':'Reactivate'}</button></div>`:'';\n    return `<div class="item"><span class="pill ${m.role==='partner'?'green':'gold'}">${m.role==='partner'?'Partner/Admin':'Ordinary Member'}</span> <span class="pill ${active?'green':'red'}">${active?'Active':'Inactive'}</span><div class="item-title">${esc(m.name)}</div><div class="item-meta"><b>Position:</b> ${esc(m.position||'—')}<br><b>Email:</b> ${esc(m.email||'—')} · <b>Phone:</b> ${esc(m.phone||'—')}</div>${actions}</div>`;\n  };'''
new='''  const roleBadge=(role)=>{\n    if(role==='partner') return ['green','Partner/Admin'];\n    if(role==='office_manager') return ['gold','Office Manager'];\n    if(role==='hr_officer') return ['gold','HR Officer'];\n    return ['gold','Ordinary Member'];\n  };\n  const memberCard=(m,active)=>{\n    const actions=admin?`<div class="member-actions"><button class="btn out small" onclick="editMember('${m.id}')" style="margin-right:4px">Edit</button><button class="btn ${active?'red':'green'} small" onclick="removeMemberRole('${m.id}')">${active?'Deactivate':'Reactivate'}</button></div>`:'';\n    const [badgeCol,badgeLabel]=roleBadge(m.role);\n    return `<div class="item"><span class="pill ${badgeCol}">${badgeLabel}</span> <span class="pill ${active?'green':'red'}">${active?'Active':'Inactive'}</span><div class="item-title">${esc(m.name)}</div><div class="item-meta"><b>Position:</b> ${esc(m.position||'—')}<br><b>Email:</b> ${esc(m.email||'—')} · <b>Phone:</b> ${esc(m.phone||'—')}</div>${actions}</div>`;\n  };'''
assert s.count(old)==1,s.count(old)
s=s.replace(old,new,1)
required=["function prCanApprove() { return authRole==='partner'; }","function invCanIssue(){  return authRole==='partner'; }","function exCanClose(){ return authRole==='partner'; }","function prIsPrivileged(){ return authRole==='partner'||authRole==='hr_officer'||authRole==='office_manager'; }"]
for x in required: assert x in s,x
p.write_text(s,encoding='utf-8')
scripts=re.findall(r'<script(?:\\s[^>]*)?>(.*?)</script>',s,flags=re.S|re.I)
Path('/tmp/molms-inline.js').write_text('\n'.join(scripts),encoding='utf-8')
print('patch assertions PASS')
