/* MOLMS-PARTNER-DRAWINGS-EXPENDITURE-V2 */
(function(){'use strict';
const EXPENSE_CATEGORIES=[
  'Transportation',
  'Utilities',
  'Stationery & Office Supplies',
  'Pantry Supplies',
  'Entertainment & Client Hospitality',
  'Training & Professional Development',
  'Petty Cash',
  'Rent & Office Management',
  'Loan Repayments & Reimbursements',
  'Salaries & Wages',
  'Monthly Office Expenses',
  'Taxes & Statutory Payments',
  'Licences, Permits & Registrations',
  'Professional Consultations',
  'Facilitation & Field Expenses',
  'Accommodation & Travel',
  'Court Filing & Legal Disbursements',
  'IT, Software & Equipment',
  'Internet & Telephone',
  'Repairs & Maintenance',
  'Insurance',
  'Bank Charges',
  'Marketing & Client Relations',
  'Staff Welfare',
  'Cleaning & Security',
  'Partner Drawings',
  'Other'
];
const SIGNATURE=['Transportation','Utilities','Stationery & Office Supplies','Pantry Supplies','Entertainment & Client Hospitality','Training & Professional Development','Petty Cash','Rent & Office Management','Other'];
function isExpenseCategorySelect(sel){
  if(!sel||sel.tagName!=='SELECT')return false;
  const labels=[...sel.options].map(o=>(o.textContent||'').trim());
  return SIGNATURE.filter(x=>labels.includes(x)).length>=5;
}
function refineSelect(sel){
  if(!isExpenseCategorySelect(sel))return;
  const existing=new Set([...sel.options].map(o=>(o.textContent||'').trim().toLowerCase()));
  const other=[...sel.options].find(o=>(o.textContent||'').trim().toLowerCase()==='other');
  const fragment=document.createDocumentFragment();
  EXPENSE_CATEGORIES.forEach(label=>{
    if(existing.has(label.toLowerCase()))return;
    const opt=document.createElement('option');
    opt.value=label;
    opt.textContent=label;
    fragment.appendChild(opt);
  });
  if(other)sel.insertBefore(fragment,other);else sel.appendChild(fragment);
}
function scan(){document.querySelectorAll('select').forEach(refineSelect)}
function boot(){
  scan();
  const mo=new MutationObserver(scan);
  mo.observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();