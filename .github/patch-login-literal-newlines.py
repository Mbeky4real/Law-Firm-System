from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')
needle = r'\n\n<style>/* MOLMS-FINANCE-HIERARCHY-V10 */'
replacement = '\n\n<style>/* MOLMS-FINANCE-HIERARCHY-V10 */'
count = s.count(needle)
assert count == 1, f'Expected exactly one visible literal newline artifact, found {count}'
s = s.replace(needle, replacement, 1)
assert needle not in s
assert 'MOLMS-FINANCE-HIERARCHY-V10' in s
assert 'sb.auth.signInWithPassword' in s
p.write_text(s, encoding='utf-8')
print('Removed literal \\n\\n text before finance hierarchy style block')
