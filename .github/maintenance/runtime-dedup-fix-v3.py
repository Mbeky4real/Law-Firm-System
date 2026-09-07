from pathlib import Path
import re
p=Path('index.html'); s=p.read_text(errors='surrogateescape')
TARGETS=['invNewInvoice','invRenderSavedList','invPaymentRecalc']

def extract(text,name):
    pat=re.compile(r'(?m)^\s*function\s+'+re.escape(name)+r'\s*\([^)]*\)\s*\{')
    out=[]
    for m in pat.finditer(text):
        start=m.start(); brace=text.find('{',m.start(),m.end());i=brace+1;depth=1;quote=None;esc=False;template=False
        while i<len(text) and depth:
            c=text[i]
            if quote:
                if esc: esc=False
                elif c=='\\': esc=True
                elif c==quote: quote=None
            elif template:
                if esc: esc=False
                elif c=='\\': esc=True
                elif c=='`': template=False
            else:
                if c in "'\"": quote=c
                elif c=='`': template=True
                elif c=='{': depth+=1
                elif c=='}': depth-=1
            i+=1
        out.append((start,i,text[start:i]))
    return out

# Preserve JavaScript's currently effective declaration: the LAST definition.
# Removing earlier shadowed definitions cannot change runtime behavior; it only removes dead code.
removed=[]
for name in TARGETS:
    arr=extract(s,name)
    assert len(arr)==2, f'{name}: expected 2 declarations, found {len(arr)}'
    a,b,_=arr[0]
    s=s[:a]+s[b:]
    removed.append(name)

# Re-check after edits.
for name in TARGETS:
    assert len(extract(s,name))==1, f'{name}: dedupe failed'
assert 'MOLMS-INVOICE-CANONICAL-V6' in s
assert 'MOLMS-FINANCE-CANONICAL-V15' in s
assert '<<<<<<<' not in s and '>>>>>>>' not in s
p.write_text(s,errors='surrogateescape')

# Update durable audit record.
a=Path('SYSTEM-CLEANUP-AUDIT-20260907.md')
if a.exists():
    t=a.read_text()
    t += '\n## Runtime deduplication completion\n- Removed shadowed duplicate `invNewInvoice`; retained the last/effective declaration.\n- Removed shadowed duplicate `invRenderSavedList`; retained the last/effective declaration.\n- Removed the older shadowed `invPaymentRecalc`; retained the later proforma-aware/effective declaration.\n- DOM-ID scan findings `adminOnly`, `exReceiptsPlaceholder`, and `fdReceivablesCardV1` were confirmed as code/template references rather than simultaneous duplicate static DOM nodes; no unsafe rename was performed.\n'
    a.write_text(t)

# Retire temporary cleanup/audit machinery, including this script and workflow.
for q in [
 Path('.github/runtime-dedup-audit-v2.trigger'),
 Path('.github/maintenance/runtime-dedup-audit-v2.py'),
 Path('.github/workflows/runtime-dedup-audit-v2.yml'),
 Path('SYSTEM-RUNTIME-DUPLICATE-AUDIT-20260907.md'),
 Path('.github/workflows/system-cleanup-v1.yml'),
 Path('.github/maintenance/system-cleanup-v1.py'),
 Path('.github/runtime-dedup-fix-v3.trigger'),
 Path('.github/workflows/runtime-dedup-fix-v3.yml'),
]:
    if q.exists(): q.unlink()
# Self-delete last.
me=Path('.github/maintenance/runtime-dedup-fix-v3.py')
print('deduped:', ', '.join(removed))
me.unlink()
