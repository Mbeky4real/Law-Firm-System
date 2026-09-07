from pathlib import Path
import re, hashlib
p=Path('index.html'); s=p.read_text(errors='surrogateescape')

# Lightweight JS function block extractor for named declarations.
def extract_functions(text):
    out=[]
    pat=re.compile(r'(?m)^\s*function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{')
    for m in pat.finditer(text):
        name=m.group(1); start=m.start(); brace=text.find('{',m.start(),m.end())
        i=brace+1; depth=1; quote=None; esc=False; template=False
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
        block=text[start:i]
        out.append((name,start,i,block))
    return out
funcs=extract_functions(s)
by={}
for x in funcs: by.setdefault(x[0],[]).append(x)

def line(pos): return s.count('\n',0,pos)+1

def norm(x): return re.sub(r'\s+',' ',x).strip()
report=['# MOLMS Runtime Duplicate Audit — 7 September 2026','']
for name,arr in sorted(by.items()):
    if len(arr)<2: continue
    report.append(f'## `{name}` — {len(arr)} declarations')
    hashes=[]
    for _,a,b,blk in arr:
        h=hashlib.sha256(norm(blk).encode()).hexdigest()[:12];hashes.append(h)
        first=' '.join(blk.split())[:500]
        report.append(f'- line {line(a)} · hash `{h}` · `{first}`')
    report.append(f'- identical normalized bodies: **{"yes" if len(set(hashes))==1 else "no"}**')
    report.append('')

# Static duplicate ids with snippets.
ids={}
for m in re.finditer(r'\bid=["\']([^"\']+)["\']',s): ids.setdefault(m.group(1),[]).append(m.start())
report.append('# Duplicate DOM IDs')
for idv,poss in sorted(ids.items()):
    if len(poss)<2 or '${' in idv: continue
    report.append(f'## `{idv}` — {len(poss)} occurrences')
    for pos in poss:
        a=max(0,s.rfind('\n',0,pos-300));b=s.find('\n',pos+300)
        snippet=' '.join(s[a:b if b!=-1 else pos+300].split())
        report.append(f'- line {line(pos)} · `{snippet[:700]}`')
    report.append('')
Path('SYSTEM-RUNTIME-DUPLICATE-AUDIT-20260907.md').write_text('\n'.join(report)+'\n')
print('wrote detailed runtime duplicate audit')
