from pathlib import Path
import re
p=Path('index.html')
s=p.read_text()
marker='MOLMS-EXPENSE-CATEGORIES-20260905'
if marker in s:
    print('already patched')
    raise SystemExit
cats=[
  'Transportation',
  'Utilities',
  'Stationery & Office Supplies',
  'Pantry Supplies',
  'Entertainment & Client Hospitality',
  'Training & Professional Development',
  'Petty Cash',
  'Rent & Office Management',
  'Other',
]
arr='[\n'+',\n'.join("  '"+c.replace("'","\\'")+"'" for c in cats)+'\n]'
patterns={
 'BD_CATEGORIES':r"const BD_CATEGORIES\s*=\s*\[(?:.|\n)*?\];",
 'EX_CATEGORIES':r"const EX_CATEGORIES\s*=\s*\[(?:.|\n)*?\];",
 'FD_EXPENSE_CATS':r"const FD_EXPENSE_CATS\s*=\s*\[(?:.|\n)*?\];",
}
for name,pat in patterns.items():
    repl=f"const {name} = {arr};"
    s,n=re.subn(pat,repl,s,count=1)
    if n!=1:
        raise SystemExit(f'failed to replace {name}: {n}')
# Keep historical category colours intact, but add visual mappings for new categories.
color_marker="const CAT_COLORS={"
if color_marker in s:
    s=s.replace(color_marker,color_marker+"\n    'Transportation':'#dbeafe','Utilities':'#fef3c7','Stationery & Office Supplies':'#ede9fe',\n    'Pantry Supplies':'#d1fae5','Entertainment & Client Hospitality':'#fce7f3',\n    'Training & Professional Development':'#e0f2fe','Petty Cash':'#fff3cd',\n    'Rent & Office Management':'#fee2e2','Other':'#f3f4f6',",1)
s=s.replace('</head>',f"<!-- {marker}: standardized practical office spending groups -->\n</head>",1)
p.write_text(s)
print('patched')