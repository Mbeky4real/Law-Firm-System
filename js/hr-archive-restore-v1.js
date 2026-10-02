/* MOLMS HR Archived Employees & Restore V1
 * Shows archived/inactive employees and restores them without touching payroll/leave history.
 */
(function(){
  'use strict';

  const client=()=>typeof sb!=='undefined'?sb:(window.supabaseClient||null);
  const canManage=()=>typeof authRole!=='undefined' && ['partner','admin','hr_officer'].includes(String(authRole).toLowerCase());
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const noticeSafe=(m,t)=>{if(typeof notice==='function') notice(m,t);};

  function styles(){
    if(document.getElementById('molmsHrArchiveRestoreStyles')) return;
    const s=document.createElement('style');
    s.id='molmsHrArchiveRestoreStyles';
    s.textContent=`
      .molms-hr-archive-bar{display:flex;align-items:center;gap:8px;margin:8px 0 10px}
      .molms-hr-archive-btn{display:inline-flex;align-items:center;gap:6px}
      .molms-hr-archive-count{font-size:10px;color:var(--muted,#667085)}
      .molms-hr-archive-backdrop{position:fixed;inset:0;background:rgba(15,36,64,.55);z-index:100000;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:28px 14px}
      .molms-hr-archive-modal{width:min(820px,100%);background:#fff;border-radius:16px;box-shadow:0 20px 70px rgba(0,0,0,.25);padding:20px}
      .molms-hr-archive-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}
      .molms-hr-archive-head h3{margin:0;color:var(--navy,#17324d);font-size:17px}
      .molms-hr-archive-sub{font-size:11px;color:var(--muted,#667085);margin-top:4px}
      .molms-hr-archive-list{display:grid;gap:8px}
      .molms-hr-archive-row{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid var(--border,#e5e7eb);border-radius:10px;padding:11px 12px;background:#fffdf9}
      .molms-hr-archive-name{font-size:13px;font-weight:800;color:var(--navy,#17324d)}
      .molms-hr-archive-meta{font-size:10px;color:var(--muted,#667085);margin-top:3px}
      .molms-hr-restore{white-space:nowrap}
      @media(max-width:650px){.molms-hr-archive-row{align-items:flex-start;flex-direction:column}.molms-hr-restore{width:100%}}
    `;
    document.head.appendChild(s);
  }

  async function getArchived(){
    const c=client();
    if(!c) throw new Error('Supabase connection required.');
    const {data,error}=await c.from('hr_employees')
      .select('id,employee_number,full_name,position,department,status,deleted_at,archived_at')
      .or('deleted_at.not.is.null,status.neq.active')
      .order('archived_at',{ascending:false});
    if(error) throw error;
    return data||[];
  }

  async function restoreEmployee(id,name){
    if(!canManage()){noticeSafe('Only HR Officers and partners can restore employees.','err');return;}
    if(!id) return;
    if(!confirm('Restore '+(name||'this employee')+'? The employee will become active again. Payroll, leave and employment history will be preserved.')) return;
    const c=client();
    if(!c){noticeSafe('Supabase connection required.','err');return;}
    try{
      const now=new Date().toISOString();
      const uid=(typeof authUser!=='undefined'&&authUser)?authUser.id:null;
      const {data,error}=await c.from('hr_employees').update({
        status:'active',
        deleted_at:null,
        deleted_by:null,
        archived_at:null,
        archived_by:null,
        updated_at:now,
        updated_by:uid
      }).eq('id',id).select('id,full_name,status,deleted_at,archived_at');
      if(error) throw error;
      if(!data||!data.length) throw new Error('Permission denied or employee record was not found.');
      if(typeof loadHrData==='function') await loadHrData();
      if(typeof renderHrEmployees==='function') renderHrEmployees();
      if(typeof renderHrDashboard==='function') renderHrDashboard();
      closeModal();
      setTimeout(enhance,250);
      noticeSafe('Employee restored and returned to Active Employees. Historical payroll and leave records were preserved.');
    }catch(e){
      console.error('Restore employee failed:',e);
      noticeSafe('Restore failed: '+(e.message||e),'err');
    }
  }

  let modal=null;
  function closeModal(){if(modal){modal.remove();modal=null;}}

  async function openArchived(){
    if(!canManage()){noticeSafe('Only HR Officers and partners can view archived employees.','err');return;}
    try{
      const rows=await getArchived();
      modal=document.createElement('div');
      modal.className='molms-hr-archive-backdrop';
      modal.innerHTML=`
        <div class="molms-hr-archive-modal" role="dialog" aria-modal="true">
          <div class="molms-hr-archive-head">
            <div><h3>Archived Employees</h3><div class="molms-hr-archive-sub">Archived records remain available so payroll, leave and employment history is not lost.</div></div>
            <button type="button" class="btn out small" data-close>Close</button>
          </div>
          <div class="molms-hr-archive-list"></div>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelector('[data-close]').onclick=closeModal;
      modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
      const list=modal.querySelector('.molms-hr-archive-list');
      if(!rows.length){
        list.innerHTML='<div style="font-size:12px;color:var(--muted,#667085);padding:12px 0">No archived employees.</div>';
      }else{
        rows.forEach(e=>{
          const row=document.createElement('div');
          row.className='molms-hr-archive-row';
          row.innerHTML=`
            <div>
              <div class="molms-hr-archive-name">${esc(e.full_name||'Unnamed employee')}</div>
              <div class="molms-hr-archive-meta">${esc(e.employee_number||'')} · ${esc(e.position||'')} · ${esc(e.department||'')} · Archived ${esc(e.archived_at?new Date(e.archived_at).toLocaleDateString():'—')}</div>
            </div>
            <button type="button" class="btn small molms-hr-restore">Restore</button>`;
          row.querySelector('.molms-hr-restore').onclick=()=>restoreEmployee(e.id,e.full_name);
          list.appendChild(row);
        });
      }
    }catch(e){
      console.error('Load archived employees failed:',e);
      noticeSafe('Could not load archived employees: '+(e.message||e),'err');
    }
  }

  function enhance(){
    if(!canManage()) return;
    const list=document.getElementById('hrList');
    if(!list) return;
    const host=list.closest('section, .card, .panel, .module-card') || list.parentElement;
    if(!host) return;
    if(host.querySelector('[data-molms-hr-archived]')) return;

    const bar=document.createElement('div');
    bar.className='molms-hr-archive-bar';
    bar.dataset.molmsHrArchived='1';
    bar.innerHTML='<button type="button" class="btn out small molms-hr-archive-btn">Archived Employees</button><span class="molms-hr-archive-count">View and restore archived employee records</span>';
    bar.querySelector('button').onclick=openArchived;

    const anchor=list.closest('table') || list;
    if(anchor.parentElement) anchor.parentElement.insertBefore(bar,anchor);
  }

  function boot(){
    styles();
    setTimeout(enhance,500);
    setInterval(enhance,1200);
  }
  boot();
  window.molmsHrArchiveRestoreV1={openArchived,restoreEmployee,enhance};
})();
