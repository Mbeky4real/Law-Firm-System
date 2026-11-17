/* MOLMS MANUAL REVENUE MATTER PICKER V2
 * Uses the existing Cause List and Non-Litigation records.
 * Preserves the form's existing value field and stores the selected matter reference.
 */
(function(){
  'use strict';
  if(window.MOLMSManualRevenueMatterPickerV2)return;
  const getSb=()=>typeof sb!=='undefined'&&sb?sb:(window.supabaseClient||window.sb||null);
  let matters=null,loading=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clean=s=>String(s??'').trim();

  async function loadMatters(){
    if(matters)return matters;
    if(loading)return loading;
    loading=(async()=>{
      const client=getSb();
      if(!client)throw new Error('Database client is not available in the Document frame.');
      const [causeResult,nonlitResult]=await Promise.all([
        client.from('cause_list_v2')
          .select('id,matter_reference,case_number,title,client_name,status,deleted_at')
          .is('deleted_at',null).order('title',{ascending:true}),
        client.from('non_litigations')
          .select('id,matter_reference,title,client,status,deleted_at')
          .is('deleted_at',null).order('title',{ascending:true})
      ]);
      if(causeResult.error)console.warn('[MOLMS revenue matter picker] Cause List:',causeResult.error.message);
      if(nonlitResult.error)console.warn('[MOLMS revenue matter picker] Non-Litigation:',nonlitResult.error.message);
      if(causeResult.error&&nonlitResult.error)throw new Error(causeResult.error.message+'; '+nonlitResult.error.message);

      const cause=(causeResult.data||[]).map(x=>({
        source:'Cause List',id:x.id,ref:clean(x.matter_reference)||clean(x.case_number)||clean(x.title),
        title:clean(x.title),client:clean(x.client_name),status:clean(x.status)
      }));
      const nonlit=(nonlitResult.data||[]).map(x=>({
        source:'Non-Litigation',id:x.id,ref:clean(x.matter_reference)||clean(x.title),
        title:clean(x.title),client:clean(x.client),status:clean(x.status)
      }));
      matters=[...cause,...nonlit].filter(x=>x.ref||x.title);
      return matters;
    })().catch(error=>{loading=null;throw error});
    return loading;
  }

  function isMatterControl(el){
    if(!el)return false;
    const hint=[el.placeholder,el.getAttribute('aria-label'),el.name,el.id].filter(Boolean).join(' ');
    if(/matter.*reference|reference.*matter/i.test(hint))return true;
    if(el.tagName==='SELECT'){
      return [...el.options].some(o=>/select matter.*reference|matter.*reference/i.test(clean(o.textContent)));
    }
    return false;
  }

  function findTarget(){
    const page=document.getElementById('page-findash')||document;
    const controls=[...page.querySelectorAll('input,select')].filter(isMatterControl);
    return controls.find(el=>el.offsetParent!==null)||controls[0]||null;
  }

  function optionLabel(m){
    const head=m.ref?m.ref+' — ':'';
    const title=m.title&&m.title!==m.ref?m.title:'';
    const client=m.client?' · '+m.client:'';
    const status=m.status?' · '+m.status:'';
    return head+title+client+status||m.source;
  }

  async function install(){
    const control=findTarget();
    if(!control||control.dataset.molmsMatterPickerV2==='1')return false;
    const isSelect=control.tagName==='SELECT';
    let select=control;
    let backingInput=null;

    if(!isSelect){
      backingInput=control;
      select=document.createElement('select');
      select.id='fdManualRevenueMatterPickerV2';
      select.className=control.className||'';
      select.style.cssText=control.style.cssText||'';
      select.style.width='100%';
      select.setAttribute('aria-label','Matter / Reference');
      control.parentNode.insertBefore(select,control);
      control.style.display='none';
    }

    const current=clean(isSelect?select.value:backingInput.value);
    select.disabled=true;
    select.innerHTML='<option value="">Loading matters…</option>';
    try{
      const rows=await loadMatters();
      const cause=rows.filter(x=>x.source==='Cause List');
      const nonlit=rows.filter(x=>x.source==='Non-Litigation');
      let html='<option value="">Select matter / reference…</option>';
      if(current&&!rows.some(x=>x.ref===current)){
        html+='<option value="'+esc(current)+'">Existing reference — '+esc(current)+'</option>';
      }
      if(cause.length)html+='<optgroup label="Cause List">'+cause.map(m=>
        '<option value="'+esc(m.ref)+'" data-source="cause" data-id="'+esc(m.id)+'">'+esc(optionLabel(m))+'</option>'
      ).join('')+'</optgroup>';
      if(nonlit.length)html+='<optgroup label="Non-Litigation">'+nonlit.map(m=>
        '<option value="'+esc(m.ref)+'" data-source="nonlit" data-id="'+esc(m.id)+'">'+esc(optionLabel(m))+'</option>'
      ).join('')+'</optgroup>';
      if(!cause.length&&!nonlit.length)html+='<option value="" disabled>No active matters available</option>';
      select.innerHTML=html;
      if(current)select.value=current;
      select.disabled=false;
      const sync=()=>{
        const chosen=select.options[select.selectedIndex];
        if(backingInput){
          backingInput.value=select.value;
          backingInput.dispatchEvent(new Event('input',{bubbles:true}));
          backingInput.dispatchEvent(new Event('change',{bubbles:true}));
        }
        select.dataset.matterSource=chosen?.dataset.source||'';
        select.dataset.matterId=chosen?.dataset.id||'';
        select.dispatchEvent(new CustomEvent('molms:matter-selected',{bubbles:true,detail:{
          reference:select.value,source:select.dataset.matterSource,matterId:select.dataset.matterId
        }}));
      };
      select.addEventListener('change',sync);
      if(current)sync();
      select.dataset.molmsMatterPickerV2='1';
      if(backingInput)backingInput.dataset.molmsMatterPickerV2='1';
      return true;
    }catch(error){
      console.error('[MOLMS revenue matter picker]',error);
      select.disabled=false;
      select.innerHTML='<option value="">Unable to load matters — refresh and try again</option>';
      return false;
    }
  }

  function boot(){
    install();
    const observer=new MutationObserver(()=>install());
    observer.observe(document.body,{childList:true,subtree:true});
    let attempts=0;
    const timer=setInterval(()=>{install();if(++attempts>=80)clearInterval(timer)},250);
  }
  window.MOLMSManualRevenueMatterPickerV2={loadMatters,install};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();