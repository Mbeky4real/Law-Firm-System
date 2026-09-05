from pathlib import Path
import re

p=Path('index.html')
s=p.read_text()
orig=s

# 1) Remove the experimental contextual sidebar DOM card only.
s=re.sub(r'\n\s*<div class="sb-v9b-context" id="sidebarV9BContext">.*?</div>\s*</div>\s*(?=\n\s*<div class="sb-clock">)', '\n', s, count=1, flags=re.S)

# 2) Remove every V9B sidebar CSS+runtime block, including malformed variants
# containing literal backslash-n sequences introduced by prior patching.
while 'MOLMS-FINANCE-SIDEBAR-V9B' in s:
    m=s.find('MOLMS-FINANCE-SIDEBAR-V9B')
    start=s.rfind('<style', 0, m)
    if start < 0:
        # tolerate literal escaped prefix such as \\n<style>
        start=max(0, s.rfind('\\n<style', 0, m))
    runtime=s.find('MOLMS-FINANCE-SIDEBAR-V9B runtime', m)
    if runtime < 0:
        end=s.find('</style>', m)
        if end < 0: break
        end += len('</style>')
    else:
        end=s.find('</script>', runtime)
        if end < 0: break
        end += len('</script>')
    s=s[:start]+s[end:]

# 3) Remove motivational-sidebar-only presentation refinements.
while 'MOLMS-SIDEBAR-MOTIVATION-V11B' in s:
    m=s.find('MOLMS-SIDEBAR-MOTIVATION-V11B')
    start=s.rfind('<style', 0, m)
    end=s.find('</style>', m)
    if start < 0 or end < 0: break
    end += len('</style>')
    s=s[:start]+s[end:]

# 4) Remove orphaned escaped newline tokens left directly between top-level tags.
# Do not touch JS string literals; only clean the known document-tail artifact pattern.
s=s.replace('</script>\\n<style>', '</script>\n<style>')
s=s.replace('</style>\\n<script>', '</style>\n<script>')
s=s.replace('</script>\\n</body>', '</script>\n</body>')
s=s.replace('\\n</body>', '\n</body>')

# 5) Guardrails: original navigation remains; experimental sidebar is gone.
assert 'sidebarV9BContext' not in s
assert 'MOLMS-FINANCE-SIDEBAR-V9B' not in s
assert 'MOLMS-SIDEBAR-MOTIVATION-V11B' not in s
for nav in ['dashboard','cause','nonlit','reports','diary','documents','chat','budget','expenses','invoice','findash','payroll','hr','members','settings']:
    assert f'data-nav="{nav}"' in s, f'missing nav item {nav}'
assert s.count('</body>')==1 and s.count('</html>')==1
assert len(s)>500000

p.write_text(s)
print({'before':len(orig),'after':len(s),'removed':len(orig)-len(s)})
