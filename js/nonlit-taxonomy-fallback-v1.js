/* MOLMS NON-LITIGATION TAXONOMY FALLBACK V1 */
(function(){
  'use strict';
  if(window.__molmsNonLitTaxonomyFallbackV1)return;
  window.__molmsNonLitTaxonomyFallbackV1=true;

  const MATTER_TYPES = [
    'Administrative / Regulatory',
    'Arbitration',
    'Banking / Financial Services',
    'Business Registration / BRELA',
    'Commercial / Corporate',
    'Compliance / Regulatory',
    'Contract / Agreement',
    'Employment / Labour',
    'Family / Matrimonial',
    'Immigration',
    'Insurance',
    'Intellectual Property',
    'Land / Property',
    'Licensing / Permits',
    'Mining / Natural Resources',
    'Probate / Administration of Estate',
    'Tax / TRA',
    'Debt Recovery',
    'Dispute Resolution / Mediation',
    'Government / Public Authority',
    'Police / Criminal Investigation Follow-up',
    'Prison / Custodial Matter',
    'Company Secretarial',
    'Due Diligence',
    'General Legal Advisory',
    'Other'
  ];

  const AUTHORITIES = [
    'BRELA',
    'TRA',
    'Tanzania Immigration Services Department',
    'Ministry of Lands / Land Registry',
    'Ministry of Labour',
    'OSHA',
    'NSSF',
    'WCF',
    'NHIF',
    'Tanzania Revenue Authority',
    'Tanzania Police Force',
    'Prisons Department',
    'Tanzania Communications Regulatory Authority (TCRA)',
    'Fair Competition Commission (FCC)',
    'Mining Commission',
    'Energy and Water Utilities Regulatory Authority (EWURA)',
    'Capital Markets and Securities Authority (CMSA)',
    'Bank of Tanzania (BoT)',
    'National Environment Management Council (NEMC)',
    'Local Government Authority / Municipal Council',
    'Court / Tribunal Registry',
    'Commissioner for Oaths / Notary',
    'Registrar / Government Registry',
    'Other Government / Regulatory Authority'
  ];

  function fill(id, items, placeholder){
    const el=document.getElementById(id);
    if(!el)return;
    const old=el.value||'';
    const meaningful=[...el.options].filter(o=>String(o.value||o.textContent||'').trim() && !/^--/.test(String(o.textContent||'')));
    if(meaningful.length)return;
    el.innerHTML='';
    const p=document.createElement('option');
    p.value='';
    p.textContent=placeholder;
    el.appendChild(p);
    items.forEach(v=>{
      const o=document.createElement('option');
      o.value=v;
      o.textContent=v;
      el.appendChild(o);
    });
    if(old){
      let found=[...el.options].find(o=>o.value===old);
      if(!found){
        const o=document.createElement('option');
        o.value=old;o.textContent=old;el.appendChild(o);
      }
      el.value=old;
    }
  }

  function repair(){
    fill('nlNature',MATTER_TYPES,'-- Select Matter Type --');
    fill('nlInstitution',AUTHORITIES,'-- Select Authority / Institution --');
  }

  repair();
  const observer=new MutationObserver(repair);
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(repair,100);
  setTimeout(repair,500);
  setTimeout(repair,1500);
  setTimeout(repair,3000);
})();