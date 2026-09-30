/* MOLMS Payroll — Employee-Specific Statutory Treatment V2
 * Firm-wide statutory rules remain informational here.
 * PAYE/NSSF/health cost allocation is configured per employee.
 * Only Partner/Admin may view and change employee payroll treatment.
 */
(function(){
  'use strict';

  const getSb=()=>typeof sb!=='undefined'?sb:(window.supabaseClient||null);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>Number(v||0).toLocaleString('en-US');
  let _cfg=null;

  const isPartnerAdmin=()=>typeof authRole!=='undefined' && (authRole==='partner'||authRole==='admin');

  async function loadCfg(){
    const client=getSb();
    if(!client) return null;
    const {data,error}=await client.from('hr_statutory_configs')
      .select('id,version_label,effective_date,status,nssf_employee_rate,nssf_employer_rate,sdl_rate,sdl_employee_threshold,wcf_rate')
      .eq('status','active').order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(error){ console.error('[MOLMS payroll config]',error.message); return null; }
    _cfg=data||null; return _cfg;
  }

  async function loadEmployees(){
    const client=getSb();
    if(!client) return {data:[],error:new Error('Supabase client unavailable')};
    const {data,error}=await client.from('hr_employees')
      .select('id,employee_number,full_name,position,status,agreed_net_pay')
      .order('employee_number',{ascending:true});
    return {data:data||[],error};
  }

  async function loadTreatments(){
    const client=getSb();
    if(!client) return {data:[],error:new Error('Supabase client unavailable')};
    const {data,error}=await client.from('hr_employee_payroll_settings')
      .select('employee_id,salary_basis,paye_bearer,nssf_employee_share_bearer,health_insurance_cost_bearer,effective_from,notes,updated_at,updated_by')
      .order('updated_at',{ascending:false});
    return {data:data||[],error};
  }

  function ensureStyles(){
    if(document.getElementById('molmsPayrollEmployeeStyles')) return;
    const s=document.createElement('style');
    s.id='molmsPayrollEmployeeStyles';
    s.textContent=`
      .pr-emp-card{margin-top:18px;border:1px solid var(--border);border-radius:14px;padding:14px;background:#fdfaf7}
      .pr-emp-title{font-size:13px;font-weight:800;color:var(--navy);margin-bottom:4px}
      .pr-emp-sub{font-size:11px;color:var(--muted);line-height:1.5;margin-bottom:12px}
      .pr-emp-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px}
      .pr-emp-rule{border:1px solid var(--border);background:#fff;border-radius:10px;padding:10px}
      .pr-emp-rule .k{font-size:10px;color:var(--muted);font-weight:700}
      .pr-emp-rule .v{font-size:12px;color:var(--navy);font-weight:800;margin-top:3px}
      .pr-emp-table-wrap{overflow:auto;border:1px solid var(--border);border-radius:10px;background:#fff}
      .pr-emp-table{width:100%;border-collapse:collapse;min-width:820px}
      .pr-emp-table th,.pr-emp-table td{padding:9px 10px;border-bottom:1px solid var(--border);font-size:11px;text-align:left;vertical-align:middle}
      .pr-emp-table th{font-size:10px;text-transform:uppercase;letter-spacing:.03em;color:var(--muted);background:#faf8f4}
      .pr-emp-table tr:last-child td{border-bottom:0}
      .pr-emp-pill{display:inline-flex;align-items:center;border-radius:999px;padding:3px 7px;font-size:10px;font-weight:800;background:#f1f5f9;color:#334155;white-space:nowrap}
      .pr-emp-pill.employer{background:#ecfdf5;color:#047857}
      .pr-emp-pill.employee{background:#fff7ed;color:#9a3412}
      .pr-emp-edit{white-space:nowrap}
      .pr-emp-modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:99999;display:flex;align-items:center;justify-content:center;padding:18px}
      .pr-emp-modal{width:min(720px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 20px 70px rgba(0,0,0,.25);padding:18px}
      .pr-emp-modal h3{margin:0 0 4px;color:var(--navy);font-size:16px}
      .pr-emp-modal .hint{font-size:11px;color:var(--muted);line-height:1.5;margin-bottom:14px}
      .pr-emp-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .pr-emp-field{display:flex;flex-direction:column;gap:5px}
      .pr-emp-field.full{grid-column:1/-1}
      .pr-emp-field label{font-size:10px;font-weight:800;color:var(--navy)}
      .pr-emp-field small{font-size:10px;color:var(--muted);line-height:1.35}
      .pr-emp-field select,.pr-emp-field input,.pr-emp-field textarea{width:100%;box-sizing:border-box}
      .pr-emp-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
      @media(max-width:760px){.pr-emp-meta{grid-template-columns:1fr}.pr-emp-form{grid-template-columns:1fr}.pr-emp-field.full{grid-column:auto}}
    `;
    document.head.appendChild(s);
  }

  const pill=(value,labels)=>{
    const cls=value==='employer'?'employer':'employee';
    return '<span class="pr-emp-pill '+cls+'">'+esc(labels[value]||value)+'</span>';
  };

  async function render(){
    const pane=document.getElementById('prpane-settings');
    if(!pane) return;
    ensureStyles();

    let box=document.getElementById('prEmployeePayrollTreatment');
    if(!box){
      box=document.createElement('div');
      box.id='prEmployeePayrollTreatment';
      box.className='pr-emp-card';
      pane.appendChild(box);
    }

    if(!isPartnerAdmin()){
      box.innerHTML='<div class="pr-emp-title">Employee-Specific Payroll Treatment</div><div class="pr-emp-sub">Salary treatment settings are restricted to Partners and Admins because they determine how each employee\'s negotiated salary is treated for payroll. No firm-wide PAYE/NSSF cost-allocation setting is used.</div>';
      return;
    }

    box.innerHTML='<div class="pr-emp-title">Employee-Specific Payroll Treatment</div><div class="pr-emp-sub">Each employee is configured separately. The negotiated salary can be treated as <b>Net / protected take-home</b> or <b>Gross / subject to deductions</b>. PAYE, the employee share of NSSF, and health insurance can then be borne by the employee or covered by the employer according to the employee\'s arrangement.</div><div style="padding:12px;text-align:center;color:var(--muted);font-size:12px">Loading employee payroll settings…</div>';

    const [cfgRes,empRes,setRes]=await Promise.all([loadCfg(),loadEmployees(),loadTreatments()]);
    _cfg=cfgRes;
    if(empRes.error||setRes.error){
      box.innerHTML='<div class="pr-emp-title">Employee-Specific Payroll Treatment</div><div class="pr-emp-sub">Unable to load employee payroll treatment. '+esc((empRes.error||setRes.error)?.message||'Unknown error')+'</div>';
      return;
    }

    const employees=empRes.data||[];
    const settings=new Map((setRes.data||[]).map(x=>[x.employee_id,x]));
    const active=employees.filter(e=>e.status==='active').length;
    const threshold=Number(_cfg?.sdl_employee_threshold||10);
    const sdlOn=active>=threshold;

    box.innerHTML=`
      <div class="pr-emp-title">Employee-Specific Payroll Treatment</div>
      <div class="pr-emp-sub">Changes apply to future payroll runs. A generated/locked payroll keeps its own snapshot. <b>Only Partners/Admins can change these settings.</b></div>
      <div class="pr-emp-meta">
        <div class="pr-emp-rule"><div class="k">SDL</div><div class="v">${sdlOn?'Active':'Not applicable'} · ${active} active / threshold ${threshold}</div></div>
        <div class="pr-emp-rule"><div class="k">WCF</div><div class="v">Employer only · ${Number(_cfg?.wcf_rate||0)*100}%</div></div>
        <div class="pr-emp-rule"><div class="k">NSSF statutory total</div><div class="v">${Number(_cfg?.nssf_employee_rate||.10)*100}% employee share + ${Number(_cfg?.nssf_employer_rate||.10)*100}% employer share</div></div>
      </div>
      <div class="pr-emp-table-wrap">
        <table class="pr-emp-table">
          <thead><tr>
            <th>Employee</th><th>Agreed Salary</th><th>Basis</th><th>PAYE</th><th>NSSF employee share</th><th>Health</th><th>Action</th>
          </tr></thead>
          <tbody id="prEmpTreatmentBody">
            ${employees.map(e=>{
              const s=settings.get(e.id)||{};
              const basis=s.salary_basis||'net';
              const paye=s.paye_bearer||'employee';
              const nssf=s.nssf_employee_share_bearer||'employee';
              const health=s.health_insurance_cost_bearer||'employer';
              return `<tr>
                <td><b>${esc(e.employee_number||'')}</b><br>${esc(e.full_name)}</td>
                <td>TZS ${money(e.agreed_net_pay)}</td>
                <td>${basis==='net'?'Net / protected':'Gross / deducted'}</td>
                <td>${pill(paye,{employee:'Employee bears',employer:'Employer covers'})}</td>
                <td>${pill(nssf,{employee:'Employee 10%',employer:'Employer full 20%'})}</td>
                <td>${pill(health,{employee:'Employee bears',employer:'Employer covers'})}</td>
                <td class="pr-emp-edit"><button class="btn gold small" data-pr-emp-edit="${esc(e.id)}">Configure</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    box.querySelectorAll('[data-pr-emp-edit]').forEach(btn=>{
      btn.addEventListener('click',()=>openEditor(btn.getAttribute('data-pr-emp-edit'),employees,settings));
    });
  }

  function openEditor(employeeId,employees,settings){
    if(!isPartnerAdmin()){ notice('Only Partners/Admins can change employee payroll treatment.','err'); return; }
    const e=employees.find(x=>x.id===employeeId);
    if(!e) return;
    const s=settings.get(employeeId)||{};
    const basis=s.salary_basis||'net';
    const paye=s.paye_bearer||'employee';
    const nssf=s.nssf_employee_share_bearer||'employee';
    const health=s.health_insurance_cost_bearer||'employer';
    const backdrop=document.createElement('div');
    backdrop.className='pr-emp-modal-backdrop';
    backdrop.id='prEmpModal';
    backdrop.innerHTML=`
      <div class="pr-emp-modal" role="dialog" aria-modal="true">
        <h3>${esc(e.full_name)} <span style="font-size:11px;color:var(--muted)">(${esc(e.employee_number||'')})</span></h3>
        <div class="hint">Configure this employee independently of every other employee. This does not change the employee\'s agreed amount; it changes how MOLMS calculates gross salary, employee deductions and employer-borne statutory costs for future payroll runs.</div>
        <div class="pr-emp-form">
          <div class="pr-emp-field">
            <label>Agreed salary basis</label>
            <select id="prEmpBasis">
              <option value="net" ${basis==='net'?'selected':''}>Net / protected take-home</option>
              <option value="gross" ${basis==='gross'?'selected':''}>Gross / subject to deductions</option>
            </select>
            <small>Net means MOLMS gross-ups where necessary to preserve the agreed take-home. Gross means PAYE/NSSF employee deductions reduce the agreed amount when the employee bears them.</small>
          </div>
          <div class="pr-emp-field">
            <label>PAYE treatment</label>
            <select id="prEmpPaye">
              <option value="employee" ${paye==='employee'?'selected':''}>Employee — PAYE deducted from employee pay</option>
              <option value="employer" ${paye==='employer'?'selected':''}>Employer — PAYE covered without reducing employee pay</option>
            </select>
            <small>PAYE remains the employee's tax liability and is withheld/remitted by the employer; this setting controls the negotiated salary treatment/gross-up in MOLMS.</small>
          </div>
          <div class="pr-emp-field">
            <label>NSSF employee share</label>
            <select id="prEmpNssf">
              <option value="employee" ${nssf==='employee'?'selected':''}>Employee — 10% employee + 10% employer</option>
              <option value="employer" ${nssf==='employer'?'selected':''}>Employer — employer covers full 20%</option>
            </select>
            <small>NSSF's current official guidance permits the employer to remit the full 20% without deducting the employee share.</small>
          </div>
          <div class="pr-emp-field">
            <label>Health insurance cost</label>
            <select id="prEmpHealth">
              <option value="employer" ${health==='employer'?'selected':''}>Employer — covered by employer</option>
              <option value="employee" ${health==='employee'?'selected':''}>Employee — deducted from employee pay</option>
            </select>
            <small>Applies only where Health Insurance is active on this employee record.</small>
          </div>
          <div class="pr-emp-field">
            <label>Effective from</label>
            <input id="prEmpEffective" type="date" value="${esc(s.effective_from||new Date().toISOString().slice(0,10))}">
          </div>
          <div class="pr-emp-field full">
            <label>Payroll note</label>
            <textarea id="prEmpNotes" rows="3" maxlength="2000" placeholder="Optional note on the employee's negotiated salary treatment">${esc(s.notes||'')}</textarea>
          </div>
        </div>
        <div class="pr-emp-modal-actions">
          <button class="btn small" id="prEmpCancel">Cancel</button>
          <button class="btn gold small" id="prEmpSave">Save Employee Treatment</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);

    const close=()=>backdrop.remove();
    backdrop.addEventListener('click',ev=>{if(ev.target===backdrop)close();});
    backdrop.querySelector('#prEmpCancel').addEventListener('click',close);
    backdrop.querySelector('#prEmpSave').addEventListener('click',async()=>{
      const client=getSb();
      if(!client||!isPartnerAdmin()){notice('Only Partners/Admins can save employee payroll treatment.','err');return;}
      const btn=backdrop.querySelector('#prEmpSave');
      btn.disabled=true;btn.textContent='Saving…';
      const payload={
        employee_id:employeeId,
        salary_basis:backdrop.querySelector('#prEmpBasis').value,
        paye_bearer:backdrop.querySelector('#prEmpPaye').value,
        nssf_employee_share_bearer:backdrop.querySelector('#prEmpNssf').value,
        health_insurance_cost_bearer:backdrop.querySelector('#prEmpHealth').value,
        effective_from:backdrop.querySelector('#prEmpEffective').value||new Date().toISOString().slice(0,10),
        notes:backdrop.querySelector('#prEmpNotes').value.trim()||null,
        updated_by:typeof authUser!=='undefined'&&authUser?authUser.id:null,
        updated_at:new Date().toISOString()
      };
      const {error}=await client.from('hr_employee_payroll_settings').upsert(payload,{onConflict:'employee_id'});
      if(error){
        notice('Employee payroll treatment save failed: '+error.message,'err');
        btn.disabled=false;btn.textContent='Save Employee Treatment';
        return;
      }
      notice('Employee payroll treatment saved.');
      close();
      await render();
    });
  }

  function wrap(){
    const original=window.prLoadSettings;
    if(window.__molmsPayrollEmployeeTreatmentWrapped) return;
    window.__molmsPayrollEmployeeTreatmentWrapped=true;
    window.prLoadSettings=async function(){
      if(typeof original==='function') await original();
      await render();
    };
  }

  wrap();
  ensureStyles();
  window.molmsPayrollEmployeeTreatmentV2={render,loadEmployees,loadTreatments};
})();
