/* MOLMS-DOCUMENT-MODULE-CLEANUP-V1 */
(function(){
'use strict';
function boot(){
  if(typeof DocumentsService==='undefined'||typeof DocumentsRepository==='undefined')return;
  // Normalize legacy access semantics that are no longer used by the live module.
  const originalCanDelete=DocumentsService.canDelete;
  DocumentsService.canDelete=function(doc){
    if(!authUser)return false;
    return (doc&&(doc.uploaded_by===authUser.id||doc.created_by===authUser.id))||(typeof isAdmin==='function'&&isAdmin());
  };
  // Remove obsolete acknowledgement controls tied to the retired "confidential" level.
  if(typeof window.partnerAcknowledgeDoc==='function'){
    window.partnerAcknowledgeDoc=function(){return notice('Partner acknowledgement is no longer tied to document access levels.','err')};
  }
  // Clean legacy option labels if the base renderer appears before the upload runtime patches it.
  const sel=document.getElementById('docConfidentiality');
  if(sel){
    [...sel.options].forEach(o=>{if(o.value==='public'||o.value==='confidential')o.remove()});
  }
  // Avoid exposing stale local/offline document mutations in authenticated production mode.
  if(authUser&&typeof saveLocal==='function'){
    try{localStorage.removeItem('MOLMS_V12_DOCS')}catch(e){}
  }
  void originalCanDelete;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();