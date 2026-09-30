/* MOLMS Payroll Statutory Controls V1
 * Adds statutory eligibility/allocation controls to Payroll Settings.
 * Core payroll calculation remains in the PostgreSQL RPC.
 */
(function(){
  'use strict';

  const getSb=()=>typeof sb!=='undefined'?sb:(window.supabaseClient||null);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>Number(v||0).toLocaleString('en-US');

  let _statCfg=null;
  let _wrapped=false;

  function isPartner(){ return typeof authRole!=='undefined' && (authRole==='partner'||authRole==='admin'); }
  function canEdit(){ return typeof authRole!=='undefined' && (authRole==='partner'||authRole==='admin'||authRole==='hr_officer'); }

  async function loadCfg(){
    const client=getSb();
    if(!client) return null;
    const {data,error}=await client.from('hr_statutory_configs')
      .select('id,version_label,effective_date,status,nssf_employee_rate,nssf_employer_rate,sdl_rate,sdl_employee_threshold,wcf_rate,paye_bands,nssf_employee_share_bearer,health_insurance_cost_bearer')
      .eq('status','active')
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    if(error){ console.error('[MOLMS payroll statutory]',error.message); return null; }
    _statCfg=data||null;
    return _statCfg;
  }

  async function activeEmployeeCount(){
    const client=getSb();
    if(!client) return 0;
    const {count,error}=await client.from('hr_employees')
      .select('id',{count:'exact',head:true})
      .eq('status','active');
    if(error){ console.error('[MOLMS payroll employee count]',error.message); return 0; }
    return Number(count||0);
  }

  function ensureStyles(){
    if(document.getElementById('molmsPayrollStatStyles')) return;
    const s=document.createElement('style');
    s.id='molmsPayrollStatStyles';
    s.textContent=`
      .pr-stat-card{margin-top:18px;border:1px solid var(--border);border-radius:14px;padding:14px;background:#fdfaf7}
      .pr-stat-title{font-size:13px;font-weight:800;color:var(--navy);margin-bottom:4px}
      .pr-stat-sub{font-size:11px;color:var(--muted);line-height:1.45;margin-bottom:12px}
      .pr-stat-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .pr-stat-rule{border:1px solid var(--border);background:#fff;border-radius:10px;padding:10px}
      .pr-stat-rule .k{font-size:10px;color:var(--muted);font-weight:700}
      .pr-stat-rule .v{font-size:12px;color:var(--navy);font-weight:800;margin-top:3px}
      .pr-stat-badge{display:inline-block;border-radius:999px;padding:3px 8px;font-size:10px;font-weight:800}
      .pr-stat-badge.ok{background:#d1fae5;color:#065f46}
      .pr-stat-badge.off{background:#f1f5f9;color:#64748b}
      .pr-stat-note{font-size:10px;color:var(--muted);margin-top:8px;line-height:1.45}
      @media(max-width:700px){.pr-stat-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  async function render(){
    const pane=document.getElementById('prpane-settings');
    if(!pane) return;

    ensureStyles();
    let box=document.getElementById('prStatutoryControls');
    if(!box){
      box=document.createElement('div');
      box.id='prStatutoryControls';
      box.className='pr-stat-card';
      pane.appendChild(box);
    }

    box.innerHTML='<div class="pr-stat-title">Statutory Contributions & Cost Allocation</div><div class="pr-stat-sub">The payroll engine applies these rules automatically when a payroll run is generated. Changes affect new payroll runs only; locked payroll remains unchanged.</div><div style="padding:12px;text-align:center;color:var(--muted);font-size:12px">Loading statutory configuration…</div>';

    const [cfg,count]=await Promise.all([loadCfg(),activeEmployeeCount()]);
    if(!cfg){
      box.innerHTML='<div class="pr-stat-title">Statutory Contributions & Cost Allocation</div><div class="pr-stat-sub">Unable to load the active statutory configuration.</div>';
      return;
    }

    const threshold=Number(cfg.sdl_employee_threshold||10);
    const sdlOn=count>=threshold;
    const editable=canEdit();
    const nssfBearer=cfg.nssf_employee_share_bearer==='employer'?'employer':'employee';
    const healthBearer=cfg.health_insurance_cost_bearer==='employee'?'employee':'employer';

    box.innerHTML=`
      <div class="pr-stat-title">Statutory Contributions & Cost Allocation</div>
      <div class="pr-stat-sub">Current active configuration: <b>${esc(cfg.version_label||'—')}</b> · Effective ${esc(cfg.effective_date||'—')}</div>

      <div class="pr-stat-grid">
        <div class="pr-stat-rule">
          <div class="k">SDL — Skills Development Levy</div>
          <div class="v"><span class="pr-stat-badge ${sdlOn?'ok':'off'}">${sdlOn?'ACTIVE':'NOT APPLICABLE'}</span> ${count} active employee${count===1?'':'s'} / threshold ${threshold}</div>
          <div class="pr-stat-note">SDL is calculated only when the active employee count reaches the configured threshold. Until then, SDL = TZS 0.</div>
        </div>

        <div class="pr-stat-rule">
          <div class="k">SDL payer</div>
          <div class="v">Employer only</div>
          <div class="pr-stat-note">The system does not deduct SDL from employee net pay.</div>
        </div>

        <div class="pr-stat-rule">
          <div class="k">NSSF employee share — who bears it?</div>
          <div class="v">
            <select id="pr_nssf_bearer" ${editable?'':'disabled'} style="width:100%;margin-top:5px">
              <option value="employee" ${nssfBearer==='employee'?'selected':''}>Employee — 10% employee + 10% employer</option>
              <option value="employer" ${nssfBearer==='employer'?'selected':''}>Employer — employer bears the full 20%</option>
            </select>
          </div>
          <div class="pr-stat-note">NSSF remains a 20% joint contribution. The employer may elect to bear the employee share; the employee share must not exceed 10%.</div>
        </div>

        <div class="pr-stat-rule">
          <div class="k">WCF — Workers Compensation Fund</div>
          <div class="v">Employer only · ${Number(cfg.wcf_rate||0)*100}%</div>
          <div class="pr-stat-note">WCF is kept outside employee deductions.</div>
        </div>

        <div class="pr-stat-rule">
          <div class="k">PAYE</div>
          <div class="v">Employee tax — withheld by employer</div>
          <div class="pr-stat-note">PAYE remains an employee tax and is withheld/remitted by the employer.</div>
        </div>

        <div class="pr-stat-rule">
          <div class="k">Health Insurance — cost bearer</div>
          <div class="v">
            <select id="pr_health_bearer" ${editable?'':'disabled'} style="width:100%;margin-top:5px">
              <option value="employer" ${healthBearer==='employer'?'selected':''}>Employer</option>
              <option value="employee" ${healthBearer==='employee'?'selected':''}>Employee</option>
            </select>
          </div>
          <div class="pr-stat-note">Applies to the optional health-insurance setting on each employee record.</div>
        </div>
      </div>

      <div style="margin-top:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <span class="pr-stat-note" style="margin:0">${editable?'Changes are saved to the active statutory configuration and apply to future payroll runs.':'Only Partners/HR Officers can change payroll statutory settings.'}</span>
        ${editable?'<button class="btn gold small" id="prSaveStatutory">Save Statutory Settings</button>':''}
      </div>
      <div id="prStatMsg" style="margin-top:8px"></div>
    `;

    document.getElementById('prSaveStatutory')?.addEventListener('click',save);
  }

  async function save(){
    if(!canEdit()){ notice('Only Partners/HR Officers can change statutory payroll settings.','err'); return; }
    const client=getSb();
    if(!client||!_statCfg){ notice('Statutory configuration is unavailable.','err'); return; }

    const nssf=document.getElementById('pr_nssf_bearer')?.value||'employee';
    const health=document.getElementById('pr_health_bearer')?.value||'employer';

    if(!['employee','employer'].includes(nssf)||!['employee','employer'].includes(health)){
      notice('Invalid statutory cost allocation.','err'); return;
    }

    const btn=document.getElementById('prSaveStatutory');
    if(btn){btn.disabled=true;btn.textContent='Saving…';}

    const {error}=await client.from('hr_statutory_configs')
      .update({
        nssf_employee_share_bearer:nssf,
        health_insurance_cost_bearer:health,
        updated_by:authUser?.id,
        updated_at:new Date().toISOString()
      })
      .eq('id',_statCfg.id)
      .eq('status','active');

    if(error){
      notice('Statutory settings save failed: '+error.message,'err');
    }else{
      notice('Statutory payroll settings saved.');
      await render();
    }
    if(btn){btn.disabled=false;btn.textContent='Save Statutory Settings';}
  }

  function wrap(){
    if(_wrapped) return;
    _wrapped=true;
    const original=window.prLoadSettings;
    window.prLoadSettings=async function(){
      if(typeof original==='function') original();
      await render();
    };
  }

  wrap();
  ensureStyles();
  window.molmsPayrollStatutoryV1={render,loadCfg};
})();
