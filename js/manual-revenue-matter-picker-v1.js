/* MOLMS-MANUAL-REVENUE-MATTER-PICKER-V1 */
(function(){
'use strict';
const getSb=()=>typeof sb!=='undefined'?sb:(window.supabaseClient||null);
let matters=null,loading=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function loadMatters(){
  if(matters)return matters;
  if(loading)return loading;
  loading=(async()=>{
    const c=getSb();
    if(!c){matters=[];return matters;}
    const [cl,nl]=await Promise.all([
      c.from('cause_list_v2').select('id,matter_reference,case_number,title,client_name,status,deleted_at').is('deleted_at',null).order('title',{ascending:true}),
      c.from('non_litigations').select('id,matter_reference,title,client,status,deleted_at').is('deleted_at',null).order('title',{ascending:true})
    ]);
    if(cl.error)console.warn('Manual revenue Cause List matters:',cl.error.message);
    if(nl.error)console.warn('Manual revenue Non-Lit matters:',nl.error.message);
    const cause=(cl.data||[]).map(x=>({source:'Cause List',id:x.id,ref:(x.matter_reference||x.case_number||'').trim(),title:x.title||'',client:x.client_name||'',status:x.status||''}));
    const nonlit=(nl.data||[]).map(x=>({source:'Non-Litigation',id:x.id,ref:(x.matter_reference||'').trim(),title:x.title||'',client:x.client||'',status:x.status||''}));
    matters=[...cause,...nonlit].filter(x=>x.ref||x.title);
    return matters;
  })();
  return loading;
}
function findTarget(){
  const inputs=[...document.querySelectorAll('input')];
  return inputs.find(i=>/matter\s*\/\s*reference/i.test(i.placeholder||'')||/matter.*reference/i.test(i.getAttribute('aria-label')||''))||null;
}
function optionLabel(m){
  const head=m.ref?m.ref+' — ':'';
  const client=m.client?' · '+m.client:'';
  return head+m.title+client;
}
async function install(){
  const input=findTarget();
  if(!input||input.dataset.molmsMatterPicker==='1')return false;
  input.dataset.molmsMatterPicker='1';
  const select=document.createElement('select');
  select.id='fdManualRevenueMatterPickerV1';
  select.style.width='100%';
  select.innerHTML='<option value="">Loading matters…</option>';
  input.parentNode.insertBefore(select,input);
  input.style.display='none';
  const rows=await loadMatters();
  const current=(input.value||'').trim();
  const cause=rows.filter(x=>x.source==='Cause List');
  const nonlit=rows.filter(x=>x.source==='Non-Litigation');
  let html='<option value="">Select matter / reference…</option>';
  if(current&&!rows.some(x=>(x.ref||x.title)===current))html+='<option value="'+esc(current)+'">Current: '+esc(current)+'</option>';
  if(cause.length)html+='<optgroup label="Cause List">'+cause.map(m=>'<option value="'+esc(m.ref||m.title)+'" data-source="cause" data-id="'+esc(m.id)+'">'+esc(optionLabel(m))+'</option>').join('')+'</optgroup>';
  if(nonlit.length)html+='<optgroup label="Non-Litigation">'+nonlit.map(m=>'<option value="'+esc(m.ref||m.title)+'" data-source="nonlit" data-id="'+esc(m.id)+'">'+esc(optionLabel(m))+'</option>').join('')+'</optgroup>';
  select.innerHTML=html;
  if(current)select.value=current;
  select.addEventListener('change',()=>{
    input.value=select.value;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  const label=input.closest('div')?.querySelector('label');
  if(label&&/matter/i.test(label.textContent||''))label.textContent='Matter / Reference';
  return true;
}
function boot(){install();const obs=new MutationObserver(()=>install());obs.observe(document.body,{childList:true,subtree:true});let n=0,t=setInterval(()=>{install();if(++n>80)clearInterval(t)},250)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();