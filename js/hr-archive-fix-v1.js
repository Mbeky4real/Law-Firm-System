/* MOLMS HR Archive Fix V1
 * Keeps employee.status within the production CHECK constraint (active/inactive).
 * Archive is represented by deleted_at/deleted_by + archived_at/archived_by.
 */
(function(){
  'use strict';

  const client=()=>typeof sb!=='undefined'?sb:(window.supabaseClient||null);
  const canManage=()=>typeof authRole!=='undefined' && ['partner','admin','hr_officer'].includes(authRole);

  async function archiveHrEmployeeFixed(id){
    if(!canManage()){
      if(typeof notice==='function') notice('Only HR Officers and partners can archive employees.','err');
      return;
    }
    if(!id){
      if(typeof notice==='function') notice('Employee record not found.','err');
      return;
    }
    if(!confirm('Archive this employee? Payroll history, leave records, and employment data will be preserved.')) return;

    const c=client();
    if(!c){
      if(typeof notice==='function') notice('Supabase connection required.','err');
      return;
    }

    const now=new Date().toISOString();
    const updates={
      status:'inactive',
      deleted_at:now,
      deleted_by:(typeof authUser!=='undefined'&&authUser)?authUser.id:null,
      archived_at:now,
      archived_by:(typeof authUser!=='undefined'&&authUser)?authUser.id:null,
      updated_at:now,
      updated_by:(typeof authUser!=='undefined'&&authUser)?authUser.id:null
    };

    try{
      const {data,error}=await c.from('hr_employees')
        .update(updates)
        .eq('id',id)
        .select('id,full_name,status,deleted_at,archived_at');

      if(error) throw error;
      if(!data||!data.length) throw new Error('Permission denied or employee record was not found.');

      if(typeof loadHrData==='function') await loadHrData();
      if(typeof renderHrEmployees==='function') renderHrEmployees();
      if(typeof renderHrDashboard==='function') renderHrDashboard();

      if(typeof notice==='function') notice('Employee archived. All payroll and leave history has been preserved.');
    }catch(e){
      console.error('Archive employee failed:',e);
      if(typeof notice==='function') notice('Archive failed: '+(e.message||e),'err');
    }
  }

  function install(){
    if(typeof window.archiveHrEmployee==='function' && !window.__molmsHrArchiveWrapped){
      window.__molmsHrArchiveWrapped=true;
      window.archiveHrEmployee=archiveHrEmployeeFixed;
    } else if(typeof window.archiveHrEmployee!=='function'){
      window.archiveHrEmployee=archiveHrEmployeeFixed;
    }
  }

  install();
  setTimeout(install,300);
  setTimeout(install,1000);
  window.molmsHrArchiveFixV1={archiveHrEmployee:archiveHrEmployeeFixed};
})();