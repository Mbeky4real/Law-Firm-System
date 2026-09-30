/* MOLMS HR Employee Identity & Emergency Details V1
 * Adds confidential TIN, NIDA/NIN and emergency-contact fields.
 * View access: Partner / HR Officer / Admin.
 * Editing follows the existing HR write permission.
 */
(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const client=()=>typeof sb!=='undefined'?sb:(window.supabaseClient||null);
  const canView=()=>typeof authRole!=='undefined' && ['partner','hr_officer','admin'].includes(authRole);

  function styles(){
    if($('molmsHrIdentityStyles')) return;
    const s=document.createElement('style'); s.id='molmsHrIdentityStyles';
    s.textContent=`
      .hr-id-section{border:1px solid var(--border);border-radius:10px;padding:12px;margin-top:10px;background:#fffdf9}
      .hr-id-title{font-size:11px;font-weight:800;letter-spacing:.04em;color:var(--navy);margin-bottom:9px}
      .hr-id-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .hr-id-grid .full{grid-column:1/-1}
      .hr-id-grid label{display:block;font-size:10px;font-weight:700;color:var(--muted);margin-bottom:4px}
      .hr-id-grid input{width:100%;box-sizing:border-box}
      .hr-sensitive-badge{display:inline-block;font-size:9px;font-weight:800;padding:2px 6px;border-radius:999px;background:#fff3cd;color:#8a5a00;margin-left:5px}
      .hr-detail-backdrop{position:fixed;inset:0;background:rgba(15,36,64,.55);z-index:99999;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:28px 14px}
      .hr-detail-modal{width:min(720px,100%);background:#fff;border-radius:16px;box-shadow:0 20px 70px rgba(0,0,0,.25);padding:20px}
      .hr-detail-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:16px}
      .hr-detail-head h3{margin:0;color:var(--navy);font-size:17px}
      .hr-detail-sub{font-size:11px;color:var(--muted);margin-top:3px}
      .hr-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .hr-detail-box{border:1px solid var(--border);border-radius:10px;padding:11px;background:#fffdf9}
      .hr-detail-box.full{grid-column:1/-1}
      .hr-detail-k{font-size:10px;color:var(--muted);font-weight:700}
      .hr-detail-v{font-size:13px;color:var(--navy);font-weight:700;margin-top:4px;word-break:break-word}
      .hr-detail-section-title{grid-column:1/-1;font-size:11px;font-weight:900;color:var(--navy);margin-top:7px}
      @media(max-width:700px){.hr-id-grid,.hr-detail-grid{grid-template-columns:1fr}.hr-id-grid .full,.hr-detail-box.full,.hr-detail-section-title{grid-column:auto}}
    `;
    document.head.appendChild(s);
  }

  function addFormFields(){
    const form=$('hrFormWrap'); if(!form || $('hrf_tin')) return;
    const payroll=form.querySelector('[id="hrf_loan_active"]')?.closest('div[style*="border"]');
    const section=document.createElement('div');
    section.className='hr-id-section';
    section.innerHTML=`
      <div class="hr-id-title">IDENTIFICATION & EMERGENCY CONTACT <span class="hr-sensitive-badge">CONFIDENTIAL</span></div>
      <div class="hr-id-grid">
        <div><label>TIN Number</label><input id="hrf_tin" placeholder="Tanzania Revenue Authority TIN" autocomplete="off"></div>
        <div><label>NIDA / NIN Number</label><input id="hrf_nida" placeholder="National Identification Number" autocomplete="off"></div>
        <div><label>Emergency Contact Person</label><input id="hrf_emergency_name" placeholder="Full name"></div>
        <div><label>Relationship</label><input id="hrf_emergency_relation" placeholder="e.g. Spouse, Parent, Sibling"></div>
        <div><label>Emergency Contact Phone</label><input id="hrf_emergency_phone" type="tel" placeholder="+255..."></div>
      </div>`;
    if(payroll) payroll.insertAdjacentElement('beforebegin',section);
    else form.appendChild(section);
  }

  function wrapForm(){
    if(window.__molmsHrIdentityFormWrapped) return;
    window.__molmsHrIdentityFormWrapped=true;
    const originalClear=window.hrClearForm;
    window.hrClearForm=function(){
      if(typeof originalClear==='function') originalClear();
      addFormFields();
    };

    const originalValidate=window.hrValidate;
    if(typeof originalValidate==='function'){
      window.hrValidate=function(){
        const payload=originalValidate();
        if(!payload) return payload;
        payload.tin_number=( $('hrf_tin')?.value||'').trim()||null;
        payload.nida_number=( $('hrf_nida')?.value||'').trim()||null;
        payload.emergency_contact_name=( $('hrf_emergency_name')?.value||'').trim()||null;
        payload.emergency_contact_relation=( $('hrf_emergency_relation')?.value||'').trim()||null;
        payload.emergency_contact_phone=( $('hrf_emergency_phone')?.value||'').trim()||null;
        return payload;
      };
    }

    const originalOpenEdit=window.hrOpenEdit;
    if(typeof originalOpenEdit==='function'){
      window.hrOpenEdit=async function(id){
        await originalOpenEdit(id);
        addFormFields();
        const c=client(); if(!c||!id) return;
        const {data,error}=await c.from('hr_employees')
          .select('tin_number,nida_number,emergency_contact_name,emergency_contact_relation,emergency_contact_phone')
          .eq('id',id).maybeSingle();
        if(error){console.error('HR identity details:',error.message);return;}
        if(data){
          const set=(fid,v)=>{const el=$(fid);if(el)el.value=v??'';};
          set('hrf_tin',data.tin_number);
          set('hrf_nida',data.nida_number);
          set('hrf_emergency_name',data.emergency_contact_name);
          set('hrf_emergency_relation',data.emergency_contact_relation);
          set('hrf_emergency_phone',data.emergency_contact_phone);
        }
      };
    }
  }

  function detailBox(k,v,full){
    return '<div class="hr-detail-box'+(full?' full':'')+'"><div class="hr-detail-k">'+esc(k)+'</div><div class="hr-detail-v">'+esc(v||'—')+'</div></div>';
  }

  async function viewDetails(id){
    if(!canView()){ if(typeof notice==='function') notice('Only HR and Partners can view confidential employee details.','err'); return; }
    const c=client(); if(!c){notice('Supabase connection required.','err');return;}
    const {data:e,error}=await c.from('hr_employees')
      .select('id,employee_number,full_name,position,department,employment_type,start_date,contract_end_date,phone,email,tin_number,nida_number,emergency_contact_name,emergency_contact_relation,emergency_contact_phone,status')
      .eq('id',id).maybeSingle();
    if(error||!e){notice('Could not load employee details: '+(error?.message||'record not found'),'err');return;}
    const b=document.createElement('div'); b.className='hr-detail-backdrop';
    b.innerHTML=`
      <div class="hr-detail-modal" role="dialog" aria-modal="true">
        <div class="hr-detail-head">
          <div><h3>${esc(e.full_name)}</h3><div class="hr-detail-sub">${esc(e.employee_number||'')} · ${esc(e.position||'')} · Confidential HR Record</div></div>
          <button class="btn out small" id="hrDetailClose">Close</button>
        </div>
        <div class="hr-detail-grid">
          <div class="hr-detail-section-title">EMPLOYMENT</div>
          ${detailBox('Department',e.department)}
          ${detailBox('Employment Type',e.employment_type)}
          ${detailBox('Start Date',e.start_date)}
          ${detailBox('Contract End Date',e.contract_end_date)}
          ${detailBox('Status',e.status)}
          <div class="hr-detail-section-title">CONTACT</div>
          ${detailBox('Phone',e.phone)}
          ${detailBox('Email',e.email)}
          <div class="hr-detail-section-title">IDENTIFICATION</div>
          ${detailBox('TIN Number',e.tin_number)}
          ${detailBox('NIDA / NIN Number',e.nida_number)}
          <div class="hr-detail-section-title">EMERGENCY CONTACT</div>
          ${detailBox('Contact Person',e.emergency_contact_name)}
          ${detailBox('Relationship',e.emergency_contact_relation)}
          ${detailBox('Emergency Phone',e.emergency_contact_phone)}
        </div>
      </div>`;
    document.body.appendChild(b);
    const close=()=>b.remove();
    b.querySelector('#hrDetailClose').onclick=close;
    b.addEventListener('click',e=>{if(e.target===b)close();});
    document.addEventListener('keydown',function onKey(ev){if(ev.key==='Escape'){close();document.removeEventListener('keydown',onKey);}});
  }

  async function enhanceList(){
    if(!canView()) return;
    const list=$('hrList'); if(!list) return;
    list.querySelectorAll('tr').forEach(tr=>{
      if(tr.dataset.hrIdentityEnhanced) return;
      const no=tr.querySelector('td:first-child')?.textContent?.trim();
      if(!no||no==='—') return;
      const employee=(typeof _hrEmployees!=='undefined' ? _hrEmployees : []).find(e=>(e.employee_number||'')===no);
      if(!employee) return;
      const cell=tr.querySelector('td:last-child'); if(!cell)return;
      const btn=document.createElement('button');
      btn.className='btn out small';
      btn.textContent='View Details';
      btn.onclick=()=>viewDetails(employee.id);
      cell.appendChild(document.createTextNode(' ')); cell.appendChild(btn);
      tr.dataset.hrIdentityEnhanced='1';
    });
  }

  function wrapRender(){
    if(window.__molmsHrIdentityRenderWrapped) return;
    const original=window.hrRender;
    if(typeof original!=='function') return;
    window.__molmsHrIdentityRenderWrapped=true;
    window.hrRender=async function(){
      const r=await original();
      await enhanceList();
      return r;
    };
  }

  function boot(){
    styles(); wrapForm(); wrapRender();
    setTimeout(()=>{styles();wrapForm();wrapRender();enhanceList();},400);
  }
  boot();
  window.molmsHrIdentityEmergencyV1={viewDetails,enhanceList};
})();