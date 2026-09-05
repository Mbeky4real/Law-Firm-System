from pathlib import Path
import re

p=Path('index.html')
s=p.read_text()
orig=s

# --- 1. Monthly Obligations: Net Salaries is the first obligation ---
old="""  const paye=run?Number(run.total_paye||0):0;
  const nssf=run?Number(run.total_employee_nssf||0)+Number(run.total_employer_nssf||0):0;"""
new="""  // Management budgeting: the first obligation is the actual net amount
  // payable to employees for the selected payroll month. Statutory items
  // remain separate below so nothing is hidden or double-counted.
  const netSalaries=run?Number(run.total_net||0):0;
  const paye=run?Number(run.total_paye||0):0;
  const nssf=run?Number(run.total_employee_nssf||0)+Number(run.total_employer_nssf||0):0;"""
assert old in s, 'monthly obligations payroll anchor not found'
s=s.replace(old,new,1)

old="""  const total=paye+nssf+health+sdl+wcf+vat;
  return {month,run,paye,nssf,health,sdl,wcf,vat,vatByCur,total,payrollGenerated:!!run};"""
new="""  const total=netSalaries+paye+nssf+health+sdl+wcf+vat;
  return {month,run,netSalaries,paye,nssf,health,sdl,wcf,vat,vatByCur,total,payrollGenerated:!!run};"""
assert old in s, 'monthly obligations total anchor not found'
s=s.replace(old,new,1)

old="""      <div style=\"border-top:1px solid var(--border);padding-top:6px\">
        ${row('PAYE',o.paye)}"""
new="""      <div style=\"border-top:1px solid var(--border);padding-top:6px\">
        <div style=\"display:flex;justify-content:space-between;align-items:center;padding:7px 8px;margin:0 -8px 4px;background:#f6f8fb;border-radius:8px;font-size:12px\"><span style=\"font-weight:800;color:var(--navy)\">Net Salaries</span><span style=\"font-weight:900;color:var(--navy)\">${FinanceUtils.fmtTZS(o.netSalaries)}</span></div>
        ${row('PAYE',o.paye)}"""
assert old in s, 'monthly obligations render anchor not found'
s=s.replace(old,new,1)

# --- 2. Budget Summary calculation: selected-period operating budget only ---
start=s.index('function fdRenderBudget(){')
end=s.index('\n\n\n\n\nfunction fdRenderAlerts()',start)
old_budget=s[start:end]
new_budget=r'''function fdRenderBudget(){
  const tbody=$('fdBudgetBody'); if(!tbody) return;
  const budgets=Array.isArray(_fdBudgets)?_fdBudgets:[];
  if(!budgets.length){
    tbody.innerHTML='<tr><td colspan="5" style="padding:12px;text-align:center;color:var(--muted)">No approved office budget for the selected period.</td></tr>';
    const g=$('fdBudgetGrand'); if(g) g.textContent=fdFmt(0);
    return;
  }

  // Budget Summary is deliberately an operating-budget control only.
  // Payroll, partner drawings and manual financial transactions are not
  // charged here; they have their own dashboard treatment. Expense Register
  // entries are the consumption side of the Office Budget.
  const byMonth={};
  budgets.forEach(b=>{
    const m=b.budget_month||'—';
    if(!byMonth[m]) byMonth[m]={approved:0,docs:0};
    byMonth[m].approved+=Number(b.total_approved||0);
    byMonth[m].docs++;
  });
  const usedByMonth={};
  (_fdEntries||[]).forEach(e=>{
    const m=(e.date||'').slice(0,7); if(!m) return;
    usedByMonth[m]=(usedByMonth[m]||0)+Number(e.amount||0);
  });

  let gApproved=0,gUsed=0;
  const months=Object.keys(byMonth).sort().reverse();
  tbody.innerHTML=months.map(m=>{
    const d=new Date(m+'-01T00:00:00');
    const lbl=d.toLocaleDateString('en-US',{month:'long',year:'numeric'});
    const approved=byMonth[m].approved;
    const used=usedByMonth[m]||0;
    const remaining=approved-used;
    const pct=approved>0?Math.round(used/approved*100):0;
    gApproved+=approved;gUsed+=used;
    const pc=pct>=100?'#b42318':pct>=85?'#b45309':'#16803c';
    return `<tr style="border-bottom:1px solid #f0ece6">
      <td style="padding:7px 4px;font-size:11px;font-weight:700">${lbl}</td>
      <td style="padding:7px 4px;font-size:11px;text-align:right">${approved.toLocaleString()}</td>
      <td style="padding:7px 4px;font-size:11px;text-align:right">${used.toLocaleString()}</td>
      <td style="padding:7px 4px;font-size:11px;text-align:right;font-weight:700;color:${remaining<0?'#b42318':'var(--text)'}">${remaining.toLocaleString()}</td>
      <td style="padding:7px 4px;font-size:11px;text-align:right;font-weight:800;color:${pc}">${pct}%</td>
    </tr>`;
  }).join('');

  const gRemaining=gApproved-gUsed;
  const gPct=gApproved>0?Math.round(gUsed/gApproved*100):0;
  tbody.innerHTML+=`<tr style="border-top:2px solid var(--border);font-weight:800">
    <td style="padding:7px 4px;font-size:11px">Selected Period</td>
    <td style="padding:7px 4px;font-size:11px;text-align:right">${gApproved.toLocaleString()}</td>
    <td style="padding:7px 4px;font-size:11px;text-align:right">${gUsed.toLocaleString()}</td>
    <td style="padding:7px 4px;font-size:11px;text-align:right;color:${gRemaining<0?'#b42318':'#16803c'}">${gRemaining.toLocaleString()}</td>
    <td style="padding:7px 4px;font-size:11px;text-align:right;color:${gPct>=100?'#b42318':gPct>=85?'#b45309':'#16803c'}">${gPct}%</td>
  </tr>`;
  const t=$('fdBudgetGrand'); if(t) t.textContent=fdFmt(gApproved);
}'''
s=s[:start]+new_budget+s[end:]

# --- 3. Precise Budget Summary "View All" detail ---
# Add a single on-demand detail function. No observer and no background refresh.
marker='/* MOLMS-BUDGET-SUMMARY-DETAIL-V12 */'
assert marker not in s, 'budget summary V12 already present'
insert=r'''
<script>
/* MOLMS-BUDGET-SUMMARY-DETAIL-V12 */
(function(){
  const money=n=>'TZS '+Number(n||0).toLocaleString();
  const htmlEsc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const catMap={
    'transport':'Transportation','transportation':'Transportation',
    'office supplies':'Stationery & Office Supplies','stationery':'Stationery & Office Supplies','stationery & office supplies':'Stationery & Office Supplies',
    'utilities':'Utilities','pantry supplies':'Pantry Supplies','entertainment':'Entertainment & Client Hospitality','entertainment & client hospitality':'Entertainment & Client Hospitality',
    'training':'Training & Professional Development','training & professional development':'Training & Professional Development',
    'petty cash':'Petty Cash','rent':'Rent & Office Management','office management':'Rent & Office Management','rent & office management':'Rent & Office Management','other':'Other'
  };
  const normCat=v=>catMap[String(v||'Other').trim().toLowerCase()]||String(v||'Other').trim();

  function monthsInRange(start,end){
    const out=[];let d=new Date(start+'T00:00:00');const last=new Date(end+'T00:00:00');
    d=new Date(d.getFullYear(),d.getMonth(),1);
    while(d<=last){out.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);d=new Date(d.getFullYear(),d.getMonth()+1,1);}
    return out;
  }
  function modal(){
    let m=document.getElementById('fdBudgetDetailV12');
    if(m)return m;
    m=document.createElement('div');m.id='fdBudgetDetailV12';m.style='display:none;position:fixed;inset:0;background:rgba(15,36,64,.46);z-index:980;align-items:center;justify-content:center;padding:16px';
    m.innerHTML=`<div style="background:#fff;width:min(900px,96vw);max-height:88vh;overflow:auto;border-radius:14px;padding:16px">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px"><div><div style="font-size:14px;font-weight:900;color:var(--navy)">BUDGET SUMMARY — DETAILS</div><div id="fdBudgetDetailPeriodV12" style="font-size:10px;color:var(--muted);margin-top:2px"></div></div><button class="btn out" id="fdBudgetDetailCloseV12" style="padding:5px 10px">Close</button></div>
      <div id="fdBudgetDetailBodyV12"><div style="padding:18px;color:var(--muted);font-size:12px">Loading budget detail…</div></div>
    </div>`;
    document.body.appendChild(m);
    m.querySelector('#fdBudgetDetailCloseV12').onclick=()=>m.style.display='none';
    m.addEventListener('click',e=>{if(e.target===m)m.style.display='none'});
    return m;
  }

  async function openBudgetDetail(){
    const m=modal(),body=m.querySelector('#fdBudgetDetailBodyV12'),period=m.querySelector('#fdBudgetDetailPeriodV12');
    m.style.display='flex';body.innerHTML='<div style="padding:18px;color:var(--muted);font-size:12px">Loading budget detail…</div>';
    const {start,end}=fdGetPeriodDates();const months=monthsInRange(start,end);period.textContent=`${fdPeriodLabel()} · Office Budget vs Expense Register`;
    if(!sb){body.innerHTML='<div class="notice err">Budget details require the live database connection.</div>';return;}
    try{
      const {data:docs,error:de}=await sb.from('budget_documents_summary').select('id,reference_number,budget_month,department,title,computed_status,stored_status,total_requested,total_approved,line_count').in('budget_month',months);
      if(de)throw de;
      const approvedDocs=(docs||[]).filter(d=>String(d.computed_status||d.stored_status||'').toLowerCase()==='approved');
      const docIds=approvedDocs.map(d=>d.id);
      let lines=[],regs=[],expenses=[];
      if(docIds.length){
        const lr=await sb.from('budget_lines').select('id,budget_document_id,category,description,reason,requested_amount,status').in('budget_document_id',docIds);if(lr.error)throw lr.error;lines=lr.data||[];
        const rr=await sb.from('expense_registers').select('id,budget_document_id,status').in('budget_document_id',docIds);if(rr.error)throw rr.error;regs=rr.data||[];
        const regIds=regs.map(r=>r.id);
        if(regIds.length){const er=await sb.from('expense_entries').select('id,expense_register_id,date,category,description,amount,paid_to,status,receipt_number').in('expense_register_id',regIds).gte('date',start).lte('date',end).neq('status','cancelled').order('date',{ascending:false});if(er.error)throw er.error;expenses=er.data||[];}
      }

      const approved=approvedDocs.reduce((s,d)=>s+Number(d.total_approved||0),0);
      const used=expenses.reduce((s,e)=>s+Number(e.amount||0),0);
      const remaining=approved-used,pct=approved>0?Math.round(used/approved*100):0;
      const budgetByCat={};lines.filter(l=>String(l.status||'').toLowerCase()==='approved').forEach(l=>{const c=normCat(l.category);budgetByCat[c]=(budgetByCat[c]||0)+Number(l.requested_amount||0);});
      const spentByCat={};expenses.forEach(e=>{const c=normCat(e.category);spentByCat[c]=(spentByCat[c]||0)+Number(e.amount||0);});
      const cats=[...new Set([...Object.keys(budgetByCat),...Object.keys(spentByCat)])].sort((a,b)=>(budgetByCat[b]||0)-(budgetByCat[a]||0));
      const stat=(label,value,note,col)=>`<div style="border:1px solid var(--border);border-radius:10px;padding:10px"><div style="font-size:9px;color:var(--muted);font-weight:800;letter-spacing:.4px">${label}</div><div style="font-size:16px;font-weight:900;color:${col||'var(--navy)'};margin-top:3px">${value}</div><div style="font-size:9px;color:var(--muted);margin-top:2px">${note||''}</div></div>`;
      const docHtml=approvedDocs.length?approvedDocs.map(d=>`<div style="border-top:1px solid #eee8df;padding:8px 0;display:flex;justify-content:space-between;gap:12px"><div><div style="font-size:11px;font-weight:800">${htmlEsc(d.title||'Office Budget')}</div><div style="font-size:9px;color:var(--muted);margin-top:2px">${htmlEsc(d.reference_number||'—')} · ${htmlEsc(d.department||'—')} · ${htmlEsc(d.budget_month||'')}</div></div><div style="text-align:right"><div style="font-size:11px;font-weight:900">${money(d.total_approved)}</div><div style="font-size:9px;color:#16803c">Approved</div></div></div>`).join(''):'<div style="font-size:11px;color:var(--muted);padding:8px 0">No approved budget document for this period.</div>';
      const catHtml=cats.length?cats.map(c=>{const a=budgetByCat[c]||0,u=spentByCat[c]||0,r=a-u;const unbudgeted=a===0&&u>0;return `<div style="border-top:1px solid #eee8df;padding:8px 0"><div style="display:flex;justify-content:space-between;gap:12px"><div style="font-size:11px;font-weight:800">${htmlEsc(c)}${unbudgeted?' <span style="font-size:9px;color:#b42318">UNBUDGETED</span>':''}</div><div style="font-size:11px;font-weight:900;color:${r<0?'#b42318':'var(--navy)'}">${money(r)} remaining</div></div><div style="display:flex;gap:14px;font-size:9.5px;color:var(--muted);margin-top:3px"><span>Approved <b style="color:var(--text)">${money(a)}</b></span><span>Used <b style="color:var(--text)">${money(u)}</b></span></div></div>`;}).join(''):'<div style="font-size:11px;color:var(--muted);padding:8px 0">No approved budget allocation found.</div>';
      const expHtml=expenses.length?expenses.slice(0,12).map(e=>`<div style="border-top:1px solid #eee8df;padding:7px 0;display:flex;justify-content:space-between;gap:12px"><div><div style="font-size:11px;font-weight:700">${htmlEsc(e.description||e.category||'Expense')}</div><div style="font-size:9px;color:var(--muted);margin-top:2px">${htmlEsc(e.date||'')} · ${htmlEsc(normCat(e.category))}${e.paid_to?' · '+htmlEsc(e.paid_to):''}${e.receipt_number?' · Receipt '+htmlEsc(e.receipt_number):''}</div></div><div style="font-size:11px;font-weight:900;color:#b42318;white-space:nowrap">${money(e.amount)}</div></div>`).join(''):'<div style="font-size:11px;color:var(--muted);padding:8px 0">No Expense Register spending recorded for this period.</div>';

      body.innerHTML=`
        <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px">${stat('APPROVED',money(approved),'Approved office budget')}${stat('USED',money(used),'Expense Register spending','#b42318')}${stat(remaining<0?'OVER BUDGET':'REMAINING',money(Math.abs(remaining)),remaining<0?'Spending above approved budget':'Still available',remaining<0?'#b42318':'#16803c')}${stat('UTILISATION',pct+'%',approved?'Used ÷ approved':'No approved budget',pct>=100?'#b42318':pct>=85?'#b45309':'#16803c')}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="border:1px solid var(--border);border-radius:10px;padding:11px"><div style="font-size:10px;font-weight:900;color:var(--navy)">APPROVED BUDGET DOCUMENTS</div>${docHtml}</div>
          <div style="border:1px solid var(--border);border-radius:10px;padding:11px"><div style="font-size:10px;font-weight:900;color:var(--navy)">ALLOCATION & USAGE BY CATEGORY</div>${catHtml}</div>
        </div>
        <div style="border:1px solid var(--border);border-radius:10px;padding:11px;margin-top:12px"><div style="display:flex;justify-content:space-between;gap:12px"><div style="font-size:10px;font-weight:900;color:var(--navy)">ACTUAL EXPENDITURE</div><div style="font-size:9px;color:var(--muted)">${expenses.length} transaction${expenses.length===1?'':'s'}</div></div>${expHtml}${expenses.length>12?`<div style="font-size:9px;color:var(--muted);padding-top:7px">Showing the latest 12 transactions. Open Expense Register for the complete record.</div>`:''}</div>
        <div style="background:#f8f6f2;border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-top:12px"><div style="font-size:10px;font-weight:900;color:var(--navy);margin-bottom:4px">HOW THIS SUMMARY IS CALCULATED</div><div style="font-size:10px;line-height:1.5;color:var(--muted)"><b>Approved</b> is the approved amount in Office Budget documents for the selected period. <b>Used</b> is actual non-cancelled spending recorded in the Expense Register linked to those approved budgets. <b>Remaining</b> is Approved less Used. Payroll/salaries, partner drawings and manual financial transactions are intentionally excluded from Budget Summary to prevent duplication.</div></div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn out" id="fdBudgetOpenExpenseV12">Open Expense Register</button><button class="btn gold" id="fdBudgetOpenBudgetV12">Open Office Budget</button></div>`;
      body.querySelector('#fdBudgetOpenExpenseV12').onclick=()=>{m.style.display='none';if(typeof go==='function')go('expenses');};
      body.querySelector('#fdBudgetOpenBudgetV12').onclick=()=>{m.style.display='none';if(typeof go==='function')go('budget');};
    }catch(err){console.error('[Budget Summary detail]',err);body.innerHTML=`<div class="notice err">Unable to load the budget detail: ${htmlEsc(err.message||String(err))}</div>`;}
  }
  window.fdOpenBudgetDetailV12=openBudgetDetail;
})();
</script>
'''

# Insert immediately before the first Finance UI V3 style block, keeping this
# independent of the old layout patches and without any MutationObserver.
pos=s.index('<style>\n/* MOLMS-FINANCE-UI-V3 */')
s=s[:pos]+insert+'\n'+s[pos:]

# Extend the existing single View All router rather than stacking another wrapper.
old_router="""  const baseViewAll3=window.fdViewAll;window.fdViewAll=function(section){if(section==='attention'){openAttentionV3();return;}return typeof baseViewAll3==='function'?baseViewAll3.apply(this,arguments):undefined;};"""
new_router="""  const baseViewAll3=window.fdViewAll;window.fdViewAll=function(section){if(section==='attention'){openAttentionV3();return;}if(section==='budget'&&typeof window.fdOpenBudgetDetailV12==='function'){window.fdOpenBudgetDetailV12();return;}return typeof baseViewAll3==='function'?baseViewAll3.apply(this,arguments):undefined;};"""
assert old_router in s, 'existing View All router anchor not found'
s=s.replace(old_router,new_router,1)

# Audit whether a Budget Summary View All trigger exists. If not, fail instead
# of inventing a second control in an unknown card structure.
assert re.search(r"fdViewAll\(['\"]budget['\"]\)",s), 'Budget Summary View All trigger not found'

# Final structural guards.
assert 'const netSalaries=run?Number(run.total_net||0):0;' in s
assert "${FinanceUtils.fmtTZS(o.netSalaries)}" in s
assert s.count(marker)==1
assert 'MutationObserver' not in insert
assert "section==='budget'" in s
assert len(s)>900000

p.write_text(s)
print({'before':len(orig),'after':len(s),'delta':len(s)-len(orig)})
