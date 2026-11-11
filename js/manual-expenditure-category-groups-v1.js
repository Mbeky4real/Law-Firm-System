/* MOLMS MANUAL EXPENDITURE CATEGORY GROUPS V1 */
(function(){
'use strict';
const groups=[
 {label:'Office Premises & Utilities',items:['Rent & Office Management','Electricity','Water','Internet & Telephone','Security Services','Cleaning & Hygiene','Repairs & Maintenance']},
 {label:'Office Administration',items:['Stationery & Office Supplies','Printing, Photocopying & Binding','Pantry Supplies','Computer, Software & IT','Office Equipment & Furniture','Postage & Courier']},
 {label:'Transport & Travel',items:['Transportation','Fuel & Vehicle Expenses','Vehicle Repairs & Maintenance','Local Travel','Accommodation & Meals']},
 {label:'Professional & Regulatory',items:['Court Filing & Registry Fees','Professional Fees & Consultants','Professional Subscriptions & Licences','Training & Professional Development','Legal Research & Publications']},
 {label:'Business Development & Client Relations',items:['Marketing & Advertising','Entertainment & Client Hospitality','Client Meetings & Events']},
 {label:'General & Other',items:['Bank Charges','Insurance','Staff Welfare','Petty Cash','Taxes & Statutory Charges','Other']}
];
function enhance(){
 const original=window.fdOpenManualModal;
 if(!original||window.__fdExpenseCategoryGroupedV1)return;
 window.__fdExpenseCategoryGroupedV1=true;
 window.fdOpenManualModal=function(txType){
  const result=original.apply(this,arguments);
  if(txType==='expenditure'){
   const sel=document.getElementById('fdManualCategory');
   if(sel){
    const current=sel.value;
    sel.innerHTML=groups.map(g=>'<optgroup label="'+g.label+'">'+g.items.map(v=>'<option value="'+v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')+'">'+v+'</option>').join('')+'</optgroup>').join('');
    if(current&&[...sel.options].some(o=>o.value===current))sel.value=current;
    else sel.value='Transportation';
   }
  }
  return result;
 };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});
else enhance();
setTimeout(enhance,500);setTimeout(enhance,1500);
})();