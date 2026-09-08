/* MOLMS-MATTER-TIMELINE-INLINE-V1 */
(function(){
'use strict';
const getSb=()=>typeof sb!=='undefined'?sb:(window.supabaseClient||null);
function mergeReports(rows){
  if(typeof reports==='undefined'||!Array.isArray(reports)||!Array.isArray(rows))return;
  const map=new Map(reports.map(r=>[r.id,r]));
  rows.forEach(r=>{if(r&&r.id)map.set(r.id,{...(map.get(r.id)||{}),...r});});
  reports=Array.from(map.values());
}
function setButtonState(kind,text,disabled){
  const fn=kind==='cause'?'clViewAllReports()':'nlViewAllReports()';
  document.querySelectorAll('button').forEach(b=>{
    if((b.getAttribute('onclick')||'').includes(fn)){
      b.textContent=text;
      b.disabled=!!disabled;
      b.style.opacity=disabled?'.7':'';
    }
  });
}
async function loadAll(kind,id){
  const c=getSb();
  const field=kind==='cause'?'linked_case_id':'linked_nonlit_id';
  const render=kind==='cause'?(typeof clRenderTimeline==='function'?clRenderTimeline:null):(typeof nlRenderTimeline==='function'?nlRenderTimeline:null);
  if(!render)return;
  setButtonState(kind,'Loading reports…',true);
  try{
    if(c){
      const {data,error}=await c.from('daily_reports').select('*').eq(field,id).is('deleted_at',null).order('report_date',{ascending:false}).order('created_at',{ascending:false});
      if(error)throw error;
      mergeReports(data||[]);
    }
    render(id);
    setButtonState(kind,'All Daily Reports Shown',true);
    const el=document.getElementById(kind==='cause'?'clmTimeline':'nlmTimeline');
    if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'});
  }catch(e){
    setButtonState(kind,'View All Daily Reports',false);
    if(typeof notice==='function')notice('Could not load all matter reports: '+(e&&e.message?e.message:'Unknown error'),'err');
  }
}
function install(){
  if(typeof clViewAllReports==='function'){
    clViewAllReports=async function(){if(typeof _clActiveMatterId!=='undefined'&&_clActiveMatterId)await loadAll('cause',_clActiveMatterId)};
  }
  if(typeof nlViewAllReports==='function'){
    nlViewAllReports=async function(){if(typeof _nlActiveMatterId!=='undefined'&&_nlActiveMatterId)await loadAll('nonlit',_nlActiveMatterId)};
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();