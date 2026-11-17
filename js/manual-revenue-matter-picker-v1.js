/* MOLMS MANUAL REVENUE MATTER PICKER V3
 * The revenue form is a document-level modal, not a child of #page-findash.
 * Use the existing live Cause List and Non-Litigation tables and retain the
 * selected matter reference in the exact field consumed by fdSaveManual.
 */
(function(){
  'use strict';
  if(window.MOLMSManualRevenueMatterPickerV3)return;

  const getSb=()=>typeof sb!=='undefined'&&sb?sb:(window.supabaseClient||window.sb||null);
  const clean=value=>String(value??'').trim();
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
  let matters=null;
  let loading=null;

  async function loadMatters(force){
    if(matters&&!force)return matters;
    if(loading)return loading;
    loading=(async()=>{
      const client=getSb();
      if(!client)throw new Error('MOLMS database client is not ready.');

      const [causeResult,nonlitResult]=await Promise.all([
        client.from('cause_list_v2')
          .select('id,matter_reference,case_number,title,client_name,status,deleted_at')
          .is('deleted_at',null)
          .order('title',{ascending:true}),
        client.from('non_litigations')
          .select('id,matter_reference,title,client,status,deleted_at')
          .is('deleted_at',null)
          .order('title',{ascending:true})
      ]);

      if(causeResult.error)console.error('[MOLMS matter picker] Cause List query failed:',causeResult.error);
      if(nonlitResult.error)console.error('[MOLMS matter picker] Non-Litigation query failed:',nonlitResult.error);
      if(causeResult.error&&nonlitResult.error){
        throw new Error('Could not load matters from either register. '+causeResult.error.message+'; '+nonlitResult.error.message);
      }

      const cause=(causeResult.data||[]).map(row=>({
        source:'Cause List',
        id:row.id,
        ref:clean(row.matter_reference)||clean(row.case_number),
        title:clean(row.title),
        client:clean(row.client_name),
        status:clean(row.status)
      }));
      const nonlit=(nonlitResult.data||[]).map(row=>({
        source:'Non-Litigation',
        id:row.id,
        ref:clean(row.matter_reference),
        title:clean(row.title),
        client:clean(row.client),
        status:clean(row.status)
      }));

      matters=[...cause,...nonlit].filter(row=>row.ref||row.title);
      return matters;
    })().finally(()=>{loading=null;});
    return loading;
  }

  function optionLabel(row){
    const parts=[];
    if(row.ref)parts.push(row.ref);
    if(row.title&&row.title!==row.ref)parts.push(row.title);
    if(row.client)parts.push(row.client);
    if(row.status)parts.push(row.status);
    return parts.join(' — ')||row.source;
  }

  function targetField(){
    // This is the actual field created by the client-receivable workflow.
    // It is outside #page-findash because fdManualModal is mounted on body.
    const exact=document.getElementById('fdReceivableMatter');
    if(exact)return exact;

    const modal=document.getElementById('fdManualModal')||document;
    return Array.from(modal.querySelectorAll('input,select')).find(el=>{
      const hint=[el.id,el.name,el.placeholder,el.getAttribute('aria-label')].filter(Boolean).join(' ');
      return /matter.*reference|reference.*matter/i.test(hint);
    })||null;
  }

  function addOption(select,value,label,attrs){
    const option=document.createElement('option');
    option.value=value;
    option.textContent=label;
    if(attrs){
      if(attrs.source)option.dataset.source=attrs.source;
      if(attrs.id)option.dataset.matterId=attrs.id;
    }
    select.appendChild(option);
    return option;
  }

  async function install(){
    const field=targetField();
    if(!field)return false;
    if(field.dataset.molmsMatterPickerV3==='1')return true;

    const current=clean(field.value);
    let select=field;

    if(field.tagName!=='SELECT'){
      select=document.createElement('select');
      select.id=field.id||'fdReceivableMatter';
      select.name=field.name||'receivable_matter_ref';
      select.className=field.className||'search';
      select.style.cssText=field.style.cssText||'';
      select.style.width='100%';
      select.setAttribute('aria-label','Matter / reference (optional)');
      select.dataset.molmsMatterPickerV3='1';
      field.replaceWith(select);
    }

    select.disabled=true;
    select.replaceChildren();
    addOption(select,'', 'Loading matters…');
    if(current)addOption(select,current,'Current reference — '+current,{source:'existing'});

    try{
      const rows=await loadMatters();
      const cause=rows.filter(row=>row.source==='Cause List');
      const nonlit=rows.filter(row=>row.source==='Non-Litigation');

      select.replaceChildren();
      addOption(select,'','Select matter / reference (optional)');
      if(current&&!rows.some(row=>row.ref===current)){
        addOption(select,current,'Existing reference — '+current,{source:'existing'});
      }
      if(cause.length){
        const group=document.createElement('optgroup');
        group.label='Cause List';
        cause.forEach(row=>{
          const option=document.createElement('option');
          option.value=row.ref||row.title;
          option.textContent=optionLabel(row);
          option.dataset.source='cause';
          option.dataset.matterId=row.id||'';
          group.appendChild(option);
        });
        select.appendChild(group);
      }
      if(nonlit.length){
        const group=document.createElement('optgroup');
        group.label='Non-Litigation';
        nonlit.forEach(row=>{
          const option=document.createElement('option');
          option.value=row.ref||row.title;
          option.textContent=optionLabel(row);
          option.dataset.source='nonlit';
          option.dataset.matterId=row.id||'';
          group.appendChild(option);
        });
        select.appendChild(group);
      }
      if(!cause.length&&!nonlit.length){
        addOption(select,'','No matters found in either register');
      }

      if(current)select.value=current;
      select.disabled=false;
      select.dataset.molmsMatterPickerV3='1';

      if(!select.dataset.molmsMatterPickerListenerV3){
        select.addEventListener('change',()=>{
          const chosen=select.options[select.selectedIndex];
          select.dataset.matterSource=chosen?.dataset.source||'';
          select.dataset.matterId=chosen?.dataset.matterId||'';
          // The select keeps the original fdReceivableMatter ID. Dispatch
          // normal events so the existing save/edit workflow reads its value.
          select.dispatchEvent(new Event('input',{bubbles:true}));
          select.dispatchEvent(new Event('change',{bubbles:true}));
        },{once:true});
        select.dataset.molmsMatterPickerListenerV3='1';
      }
      return true;
    }catch(error){
      console.error('[MOLMS matter picker V3]',error);
      select.disabled=false;
      select.replaceChildren();
      addOption(select,current,current?'Existing reference — '+current:'','existing');
      addOption(select,'','Could not load matters — refresh and try again');
      select.dataset.molmsMatterPickerError='1';
      return false;
    }
  }

  function ensureCurrentReference(value){
    const select=document.getElementById('fdReceivableMatter');
    const reference=clean(value);
    if(!select||select.tagName!=='SELECT'||!reference)return;
    if(!Array.from(select.options).some(option=>option.value===reference)){
      const option=document.createElement('option');
      option.value=reference;
      option.textContent='Existing reference — '+reference;
      option.dataset.source='existing';
      select.appendChild(option);
    }
    select.value=reference;
  }

  function boot(){
    install();
    const observer=new MutationObserver(()=>install());
    observer.observe(document.body,{childList:true,subtree:true});

    // The edit workflow fills this field after loading the transaction.
    const originalEdit=window.fdEditManual;
    if(typeof originalEdit==='function'&&!originalEdit.__molmsMatterPickerV3){
      const wrappedEdit=async function(id){
        const result=await originalEdit.apply(this,arguments);
        const transaction=(typeof _fdAllManual!=='undefined'&&Array.isArray(_fdAllManual))
          ?_fdAllManual.find(row=>row.id===id):null;
        if(transaction)ensureCurrentReference(transaction.receivable_matter_ref);
        return result;
      };
      wrappedEdit.__molmsMatterPickerV3=true;
      window.fdEditManual=wrappedEdit;
    }

    let attempts=0;
    const timer=setInterval(()=>{
      install();
      if(++attempts>=80)clearInterval(timer);
    },250);
  }

  window.MOLMSManualRevenueMatterPickerV3={
    loadMatters,
    install,
    audit:()=>({
      fieldFound:!!document.getElementById('fdReceivableMatter'),
      fieldTag:document.getElementById('fdReceivableMatter')?.tagName||null,
      loadedMatters:matters?.length??null,
      causeList:matters?.filter(row=>row.source==='Cause List').length??null,
      nonLitigation:matters?.filter(row=>row.source==='Non-Litigation').length??null
    })
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
