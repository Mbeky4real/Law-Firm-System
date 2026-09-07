from pathlib import Path
import re, json
root=Path('.')
removed=[]

# 1. Remove one-shot patch machinery that has already been applied to production source.
for p in list((root/'.github').glob('patch-*.py')):
    if p.exists(): p.unlink(); removed.append(str(p))
for p in [root/'.github/restore-stable-sidebar.py']:
    if p.exists(): p.unlink(); removed.append(str(p))
for p in list((root/'.github').glob('*.trigger')):
    if p.exists(): p.unlink(); removed.append(str(p))

wf=root/'.github/workflows'
if wf.exists():
    patterns=['patch-*.yml','refine-*.yml','redesign-*.yml','reintegrate-*.yml','restore-*.yml','remove-*.yml']
    for pat in patterns:
        for p in list(wf.glob(pat)):
            if p.exists(): p.unlink(); removed.append(str(p))
    for name in ['auth-emergency-hotfix.yml','invoice-architecture-v6.yml','invoice-email-v7.yml','finance-dashboard-canonical-v15.yml']:
        p=wf/name
        if p.exists(): p.unlink(); removed.append(str(p))

# Retired module-specific maintenance script after canonical finance runtime was embedded.
p=root/'.github/maintenance/finance-dashboard-canonical-v15.py'
if p.exists(): p.unlink(); removed.append(str(p))

# 2. Remove stale root-level source snapshots/backups now protected by Git history and backup branches.
for p in list(root.iterdir()):
    if not p.is_file(): continue
    n=p.name
    stale=(n.startswith('Create backup ') or n.startswith('back before ') or n.startswith('back up before ') or
           re.fullmatch(r'MOLMS_v3_.*\.html',n) is not None or
           re.fullmatch(r'STABLE_REDEPLOY_.*\.txt',n) is not None)
    if stale:
        p.unlink(); removed.append(str(p))

# 3. Static audit of live source. Report possible debt; do not blindly rewrite runtime logic.
idx=root/'index.html'
text=idx.read_text(errors='surrogateescape') if idx.exists() else ''
ids=re.findall(r'\bid=["\']([^"\']+)["\']',text)
id_counts={x:ids.count(x) for x in set(ids) if ids.count(x)>1}
funcs=re.findall(r'(?m)^\s*function\s+([A-Za-z_$][\w$]*)\s*\(',text)
func_counts={x:funcs.count(x) for x in set(funcs) if funcs.count(x)>1}
markers=re.findall(r'MOLMS-[A-Z0-9_-]+',text)
marker_counts={x:markers.count(x) for x in set(markers) if markers.count(x)>1}
merge_markers=[m for m in ['<<<<<<<','=======','>>>>>>>'] if m in text]

report=[]
report.append('# MOLMS System Cleanup Audit — 7 September 2026')
report.append('')
report.append('This audit removed obsolete one-shot patch infrastructure and stale repository snapshots while preserving the current production runtime and data architecture. Runtime code was not deleted merely because it is old; only clearly superseded maintenance machinery and repository backups were removed automatically.')
report.append('')
report.append(f'## Removed artifacts\n\nTotal removed: **{len(removed)}**')
for x in sorted(removed): report.append(f'- `{x}`')
report.append('')
report.append('## Static integrity scan')
report.append(f'- Duplicate DOM IDs detected: **{len(id_counts)}**')
for k,v in sorted(id_counts.items()): report.append(f'  - `{k}` × {v}')
report.append(f'- Duplicate top-level-style function declarations detected: **{len(func_counts)}**')
for k,v in sorted(func_counts.items()): report.append(f'  - `{k}` × {v}')
report.append(f'- Repeated MOLMS runtime markers detected: **{len(marker_counts)}**')
for k,v in sorted(marker_counts.items()): report.append(f'  - `{k}` × {v}')
report.append(f'- Merge-conflict markers present: **{"yes" if merge_markers else "no"}**')
report.append('')
report.append('## Cleanup policy going forward')
report.append('- Do not commit ad-hoc root-level backup copies of `index.html`; use a Git branch/tag instead.')
report.append('- Do not leave one-shot patch workflows active after a successful production commit.')
report.append('- Prefer editing canonical module code directly. If a temporary patch is unavoidable, retire its script/workflow immediately after consolidation.')
report.append('- Treat duplicate IDs/functions reported above as review items, not automatic deletion targets, because some may be intentionally scoped or compatibility shims.')
(root/'SYSTEM-CLEANUP-AUDIT-20260907.md').write_text('\n'.join(report)+'\n')

# 4. Hard safety checks.
assert idx.exists(), 'index.html missing'
assert '<html' in text.lower() and '</html>' in text.lower(), 'index.html malformed'
assert not merge_markers, 'merge conflict markers found in index.html'
assert 'MOLMS-FINANCE-CANONICAL-V15' in text, 'canonical finance runtime missing'
assert 'MOLMS-INVOICE-CANONICAL-V6' in text, 'canonical invoice runtime missing'
print(json.dumps({'removed':len(removed),'duplicate_ids':len(id_counts),'duplicate_functions':len(func_counts),'duplicate_markers':len(marker_counts)},indent=2))
