/* MOLMS-DOCUMENT-DELETE-V1 */
(function(){
'use strict';
const BUCKET='molms-documents';
const $id=id=>document.getElementById(id);
const getSb=()=>typeof sb!=='undefined'?sb:(window.supabaseClient||null);

function canDeleteDocument(doc){
  if(!doc||typeof authUser==='undefined'||!authUser)return false;
  const mine=doc.created_by===authUser.id||doc.uploaded_by===authUser.id;
  const elevated=typeof isAdmin==='function'&&isAdmin();
  return mine||elevated;
}

function enhanceDeleteButtons(){
  const list=$id('docList');
  if(!list||typeof docs==='undefined'||typeof DocumentsService==='undefined')return;
  let visible=docs.filter(d=>DocumentsService.canView(d));
  try{if(typeof filter==='function')visible=filter(visible,['title','document_type','document_no','description','matter_type','file_url']);}catch(_e){}
  const items=Array.from(list.querySelectorAll('.item'));
  items.forEach((item,i)=>{
    const d=visible[i];
    if(!d||!canDeleteDocument(d))return;
    const actions=item.querySelector('.member-actions');
    if(!actions)return;
    const already=Array.from(actions.querySelectorAll('button')).some(b=>(b.getAttribute('onclick')||'').includes('deleteDoc('));
    if(already)return;
    const btn=document.createElement('button');
    btn.className='btn red small';
    btn.type='button';
    btn.dataset.docDeleteV1=d.id;
    btn.textContent='Delete';
    btn.addEventListener('click',()=>window.deleteDoc(d.id));
    actions.appendChild(btn);
  });
}

function install(){
  if(typeof window.renderDocs!=='function'||typeof DocumentsService==='undefined')return false;
  if(window.deleteDoc&&window.deleteDoc.__molmsDeleteV1)return true;
  const baseRender=window.renderDocs;
  window.renderDocs=function(){
    const out=baseRender.apply(this,arguments);
    queueMicrotask(enhanceDeleteButtons);
    return out;
  };

  window.deleteDoc=async function(id){
    const d=(typeof docs!=='undefined'&&Array.isArray(docs))?docs.find(x=>x.id===id):null;
    if(!d)return typeof notice==='function'&&notice('Document not found.','err');
    if(!canDeleteDocument(d))return typeof notice==='function'&&notice('You can only delete documents you uploaded. Partners/Admins may delete any document.','err');
    const label=d.title||d.original_file_name||d.file_name||'this document';
    if(!confirm('Delete “'+label+'”? This removes it from the Document Register.'))return;
    const c=getSb();
    if(!c)return typeof notice==='function'&&notice('Delete failed: database connection is unavailable.','err');
    try{
      const r=await c.from('documents').update({deleted_at:new Date().toISOString()}).eq('id',id).is('deleted_at',null);
      if(r.error)throw r.error;
      if(d.storage_path){
        const sr=await c.storage.from(BUCKET).remove([d.storage_path]);
        if(sr.error)console.warn('[MOLMS] document record deleted but stored file cleanup failed:',sr.error.message);
      }
      if(typeof docEditId!=='undefined'&&docEditId===id){
        docEditId=null;
        if(typeof window.resetDocForm==='function')window.resetDocForm();
      }
      if(typeof loadDocs==='function')await loadDocs();
      if(typeof window.renderDocs==='function')window.renderDocs();
      if(typeof notice==='function')notice('Document deleted.');
    }catch(e){
      if(typeof notice==='function')notice('Delete failed: '+(e&&e.message?e.message:'Unknown error'),'err');
    }
  };
  window.deleteDoc.__molmsDeleteV1=true;
  enhanceDeleteButtons();
  return true;
}

let tries=0;
const timer=setInterval(()=>{if(install()||++tries>40)clearInterval(timer)},250);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>install(),{once:true});else install();
})();
