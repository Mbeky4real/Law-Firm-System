/* MOLMS-DIARY-MANUAL-EVENTS-V1 */
(function(){
'use strict';
const $id=id=>document.getElementById(id);
const getSb=()=>typeof sb!=='undefined'?sb:(window.supabaseClient||null);
function escx(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function sourceValue(){return $id('oeSourceV1')?$id('oeSourceV1').value:'general'}
function linkedId(){return $id('oeMatterV1')?$id('oeMatterV1').value:''}
function populateMatterOptions(){
  const sel=$id('oeMatterV1');if(!sel)return;
  const src=sourceValue();let rows=[];
  if(src==='cause'&&typeof cases!=='undefined'&&Array.isArray(cases))rows=cases.filter(x=>!x.deleted_at).map(x=>({id:x.id,label:[x.case_number,x.title||x.case_title].filter(Boolean).join(' — ')||'Cause List Matter'}));
  if(src==='nonlit'&&typeof nonlits!=='undefined'&&Array.isArray(nonlits))rows=nonlits.filter(x=>!x.deleted_at).map(x=>({id:x.id,label:[x.matter_reference,x.title].filter(Boolean).join(' — ')||'Non-Litigation Matter'}));
  sel.innerHTML='<option value="">Select matter…</option>'+rows.map(x=>'<option value="'+x.id+'">'+escx(x.label)+'</option>').join('');
  const wrap=$id('oeMatterWrapV1');if(wrap)wrap.style.display=src==='general'?'none':'block';
}
function installUI(){
  const title=$id('oeTitle');if(!title||$id('oeSourceV1'))return false;
  const type=$id('oeType');
  if(type){type.innerHTML=['Hearing','Deadline','Meeting','Appointment','Follow-up','Filing','Mention','Ruling/Judgment','Client Meeting','Internal Review','Training','Regulatory','Holiday','General','Other'].map(v=>'<option value="'+v+'">'+v+'</option>').join('');type.value='General';}
  const titleWrap=title.closest('div');if(!titleWrap)return false;
  const src=document.createElement('div');src.innerHTML='<label>Calendar Entry</label><select id="oeSourceV1"><option value="general">General / Internal Calendar</option><option value="cause">Cause List Matter</option><option value="nonlit">Non-Litigation Matter</option></select>';
  titleWrap.parentNode.insertBefore(src,titleWrap);
  const matter=document.createElement('div');matter.id='oeMatterWrapV1';matter.style.display='none';matter.innerHTML='<label>Linked Matter</label><select id="oeMatterV1"><option value="">Select matter…</option></select>';
  src.parentNode.insertBefore(matter,titleWrap);
  const desc=$id('oeDescription');if(desc){const dw=desc.closest('div');const loc=document.createElement('div');loc.innerHTML='<label>Location / Venue</label><input id="oeLocationV1" placeholder="Court, client office, boardroom, online, etc.">';dw.parentNode.insertBefore(loc,dw);}
  $id('oeSourceV1').addEventListener('change',populateMatterOptions);
  const modal=$id('oeFormTitle');if(modal)modal.textContent='New Diary Entry';
  const save=$id('oeSaveBtn');if(save)save.textContent='Save Diary Entry';
  const note=title.closest('.card')?.querySelector('p.muted.small')||$id('oeFormTitle')?.parentElement?.parentElement?.querySelector('p.muted.small');if(note)note.textContent='Add a hearing, deadline, meeting, appointment, follow-up or other calendar entry. Link it to a Cause List or Non-Litigation matter where applicable.';
  const page=$id('page-diary');if(page){const btn=Array.from(page.querySelectorAll('button')).find(b=>(b.textContent||'').includes('New Internal Event'));if(btn)btn.textContent='+ New Diary Entry';}
  return true;
}
function clearExtra(){if($id('oeSourceV1'))$id('oeSourceV1').value='general';if($id('oeMatterV1'))$id('oeMatterV1').value='';if($id('oeLocationV1'))$id('oeLocationV1').value='';populateMatterOptions()}
function patchReset(){if(typeof resetOfficeEventForm!=='function'||resetOfficeEventForm.__diaryV1)return;const base=resetOfficeEventForm;resetOfficeEventForm=function(){const r=base.apply(this,arguments);setTimeout(()=>{installUI();clearExtra();if($id('oeFormTitle'))$id('oeFormTitle').textContent='New Diary Entry';if($id('oeSaveBtn'))$id('oeSaveBtn').textContent='Save Diary Entry';},0);return r};resetOfficeEventForm.__diaryV1=true}
function patchEdit(){if(typeof editOfficeEvent!=='function'||editOfficeEvent.__diaryV1)return;const base=editOfficeEvent;editOfficeEvent=function(id){const r=base.apply(this,arguments);setTimeout(()=>{installUI();const e=typeof officeEvents!=='undefined'?officeEvents.find(x=>x.id===id):null;if(!e)return;const src=e.linked_case_id?'cause':e.linked_nonlit_id?'nonlit':'general';$id('oeSourceV1').value=src;populateMatterOptions();$id('oeMatterV1').value=e.linked_case_id||e.linked_nonlit_id||'';if($id('oeLocationV1'))$id('oeLocationV1').value=e.location||'';if($id('oeFormTitle'))$id('oeFormTitle').textContent='Edit Diary Entry';if($id('oeSaveBtn'))$id('oeSaveBtn').textContent='Save Changes';},0);return r};editOfficeEvent.__diaryV1=true}
function patchSave(){
  if(typeof addOfficeEvent!=='function'||addOfficeEvent.__diaryV1)return false;
  addOfficeEvent=async function(){
    const title=(($id('oeTitle')&&$id('oeTitle').value)||'').trim(),event_date=$id('oeDate')?.value||'',src=sourceValue(),mid=linkedId();
    if(!title){notice('Title is required.','err');return}if(!event_date){notice('Date is required.','err');return}if(src!=='general'&&!mid){notice('Select the matter this diary entry relates to.','err');return}
    const payload={title,description:($id('oeDescription')?.value||'').trim()||null,event_date,event_time:$id('oeTime')?.value||null,type:$id('oeType')?.value||'General',location:($id('oeLocationV1')?.value||'').trim()||null,matter_type:src==='general'?null:src,linked_case_id:src==='cause'?mid:null,linked_nonlit_id:src==='nonlit'?mid:null,is_firm_wide:true,created_by:authUser?authUser.id:null,updated_at:new Date().toISOString()};
    const c=getSb();try{
      if(c){let q;if(typeof oeEditId!=='undefined'&&oeEditId!==null){q=c.from('office_events').update(payload).eq('id',oeEditId).select('*').single()}else{q=c.from('office_events').insert(payload).select('*').single()}const {error}=await q;if(error)throw error;if(typeof oeEditId!=='undefined')oeEditId=null;if(typeof loadOfficeEvents==='function')await loadOfficeEvents();}
      else if(typeof officeEvents!=='undefined'){const row={...payload,id:typeof uid==='function'?uid():String(Date.now()),created_at:new Date().toISOString()};officeEvents.push(row);if(typeof saveLocal==='function')saveLocal();}
      if(typeof resetOfficeEventForm==='function')resetOfficeEventForm();if(typeof renderOfficeEvents==='function')renderOfficeEvents();if(typeof renderCalendar==='function')renderCalendar();notice('Diary entry saved.');
    }catch(e){notice('Diary entry failed: '+(e?.message||'Unknown error'),'err')}
  };addOfficeEvent.__diaryV1=true;return true;
}
function patchOpen(){if(typeof oeOpenAddModal!=='function'||oeOpenAddModal.__diaryV1)return;const base=oeOpenAddModal;oeOpenAddModal=function(){const r=base.apply(this,arguments);setTimeout(()=>{installUI();clearExtra();if($id('oeFormTitle'))$id('oeFormTitle').textContent='New Diary Entry';if($id('oeSaveBtn'))$id('oeSaveBtn').textContent='Save Diary Entry';},0);return r};oeOpenAddModal.__diaryV1=true}
function boot(){installUI();patchReset();patchEdit();patchOpen();patchSave();let n=0;const t=setInterval(()=>{installUI();patchReset();patchEdit();patchOpen();patchSave();if(++n>30)clearInterval(t)},250)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();