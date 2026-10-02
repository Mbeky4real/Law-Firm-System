/* MOLMS HR Archive Fix V2
 * Restores visible Archive / Permanent Delete actions in HR employee list.
 * Keeps employee.status within the production CHECK constraint (active/inactive).
 */
(function(){
  'use strict';

  const client=()=>typeof sb!=='undefined'?sb:(window.supabaseClient||null);
  const canManage=()=>typeof authRole!=='undefined' && ['partner','admin','hr_officer'].includes(String(authRole).toLowerCase());

  async function archiveHrEmployeeFixed(id){
    if(!canManage()){ if(typeof notice==='function') notice('Only HR Officers and partners can archive employees.','err'); return; }
    if(!id){ if(typeof notice==='function') notice('Employee record not found.','err'); return; }
    if(!confirm('Archive this employee? Payroll history, leave records, and employment data will be preserved.')) return;
    const c=client();
    if(!c){ if(typeof notice==='function') notice('Supabase connection required.','err'); return; }

    const now=new Date().toISOString();
    const uid=(typeof authUser!=='undefined'&&authUser)?authUser.id:null;
    try{
      const {data,error}=await c.from('hr_employees').update({
        status:'inactive', deleted_at:now, deleted_by:uid,
        archived_at:now, archived_by:uid, updated_at:now, updated_by:uid
      }).eq('id',id).select('id,full_name,status,deleted_at,archived_at');
      if(error) throw error;
      if(!data||!data.length) throw new Error('Permission denied or employee record was not found.');
      if(typeof loadHrData==='function') await loadHrData();
      if(typeof renderHrEmployees==='function') renderHrEmployees();
      if(typeof renderHrDashboard==='function') renderHrDashboard();
      setTimeout(decorateEmployeeActions,150);
      if(typeof notice==='function') notice('Employee archived. All payroll and leave history has been preserved.');
    }catch(e){
      console.error('Archive employee failed:',e);
      if(typeof notice==='function') notice('Archive failed: '+(e.message||e),'err');
    }
  }

  function trashSvg(){
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>';
  }

  function decorateEmployeeActions(){
    try{
      if(!canManage()) return;
      const list=document.getElementById('hrList');
      if(!list) return;
      const employees=(typeof _hrEmployees!=='undefined'&&Array.isArray(_hrEmployees))?_hrEmployees:[];
      list.querySelectorAll('tr').forEach(tr=>{
        const no=tr.querySelector('td:first-child')?.textContent?.trim();
        const employee=employees.find(e=>(e.employee_number||'')===no);
        if(!employee||!employee.id) return;
        const cell=tr.querySelector('td:last-child');
        if(!cell) return;
        const inactive=!!employee.deleted_at||String(employee.status||'').toLowerCase()!=='active';

        if(!inactive&&!cell.querySelector('[data-molms-hr-archive-action]')){
          const b=document.createElement('button');
          b.type='button'; b.dataset.molmsHrArchiveAction='1'; b.className='btn out small';
          b.textContent='Archive'; b.title='Archive employee';
          b.onclick=e=>{e.preventDefault();e.stopPropagation();archiveHrEmployeeFixed(employee.id);};
          cell.appendChild(document.createTextNode(' ')); cell.appendChild(b);
        }
        if(inactive&&!cell.querySelector('[data-molms-permanent-delete="employee"]')){
          const b=document.createElement('button');
          b.type='button'; b.dataset.molmsPermanentDelete='employee';
          b.dataset.targetId=employee.id; b.dataset.targetName=employee.full_name||employee.employee_number||'this employee';
          b.title='Permanently delete employee'; b.setAttribute('aria-label','Permanently delete employee');
          b.innerHTML=trashSvg();
          b.style.cssText='display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;margin-left:6px;padding:0;border:1px solid #b42318;border-radius:6px;background:#fff;color:#b42318;cursor:pointer;';
          cell.appendChild(document.createTextNode(' ')); cell.appendChild(b);
        }
      });
    }catch(e){ console.error('HR employee action decoration failed:',e); }
  }

  function install(){
    if(typeof window.archiveHrEmployee==='function'&&!window.__molmsHrArchiveWrapped){
      window.__molmsHrArchiveWrapped=true;
      window.archiveHrEmployee=archiveHrEmployeeFixed;
    }else if(typeof window.archiveHrEmployee!=='function'){
      window.archiveHrEmployee=archiveHrEmployeeFixed;
    }
  }

  install();
  setTimeout(install,300); setTimeout(install,1000);
  setTimeout(decorateEmployeeActions,700);
  setInterval(decorateEmployeeActions,1200);
  window.molmsHrArchiveFixV1={archiveHrEmployee:archiveHrEmployeeFixed,decorateEmployeeActions};
})();