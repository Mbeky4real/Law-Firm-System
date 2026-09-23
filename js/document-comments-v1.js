/* MOLMS-DOCUMENT-COMMENTS-V1 */
(function(){
'use strict';

const $id=id=>document.getElementById(id);
const getSb=()=>typeof sb!=='undefined'?sb:(window.supabaseClient||null);
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatDate=v=>{
  try{return new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}
  catch(e){return v||''}
};

const styles=`
.doc-comments-v1{margin-top:10px;border-top:1px solid var(--border,#e6e1d8);padding-top:8px}
.doc-comments-toggle-v1{background:transparent;border:0;padding:4px 0;color:var(--muted,#777);font-size:12px;cursor:pointer}
.doc-comments-toggle-v1:hover{text-decoration:underline}
.doc-comments-panel-v1{margin-top:8px;background:var(--surface,#fff);border:1px solid var(--border,#e6e1d8);border-radius:8px;padding:9px}
.doc-comments-list-v1{display:flex;flex-direction:column;gap:8px;max-height:260px;overflow:auto}
.doc-comment-v1{padding:7px 9px;border-radius:7px;background:var(--bg,#f7f5f1)}
.doc-comment-meta-v1{font-size:11px;color:var(--muted,#777);margin-bottom:3px}
.doc-comment-body-v1{font-size:13px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere}
.doc-comment-form-v1{display:flex;gap:7px;margin-top:9px;align-items:flex-end}
.doc-comment-input-v1{flex:1;min-height:54px;resize:vertical;padding:8px;border:1px solid var(--border,#d9d3c8);border-radius:7px;font:inherit;font-size:13px;box-sizing:border-box}
.doc-comment-submit-v1{white-space:nowrap}
.doc-comments-empty-v1{font-size:12px;color:var(--muted,#777);padding:4px 0}
.doc-comments-error-v1{font-size:12px;color:var(--red,#b42318);padding:4px 0}
`;

let styleInstalled=false;
function installStyles(){
  if(styleInstalled)return;
  const s=document.createElement('style');
  s.id='molmsDocumentCommentsV1Styles';
  s.textContent=styles;
  document.head.appendChild(s);
  styleInstalled=true;
}

function currentUser(){
  if(typeof authUser!=='undefined'&&authUser)return authUser;
  return null;
}

function visibleDocuments(){
  if(typeof docs==='undefined'||!Array.isArray(docs))return[];
  const canView=typeof DocumentsService!=='undefined'&&typeof DocumentsService.canView==='function'
    ? DocumentsService.canView
    : (typeof window.molmsDocumentCanView==='function'?window.molmsDocumentCanView:null);
  return docs.filter(d=>{
    if(d.deleted_at)return false;
    return canView?canView(d):true;
  });
}

async function fetchComments(documentId){
  const c=getSb();
  if(!c)throw Error('Database connection is unavailable.');
  const r=await c.from('document_comments')
    .select('id,document_id,author_id,body,created_at,updated_at')
    .eq('document_id',documentId)
    .is('deleted_at',null)
    .order('created_at',{ascending:true});
  if(r.error)throw r.error;
  const rows=r.data||[];
  const ids=[...new Set(rows.map(x=>x.author_id).filter(Boolean))];
  let names={};
  if(ids.length){
    const rr=await c.from('roles').select('user_id,full_name').in('user_id',ids).eq('active',true);
    if(!rr.error)(rr.data||[]).forEach(x=>{names[x.user_id]=x.full_name});
  }
  return rows.map(x=>({...x,author_name:names[x.author_id]||'M&O Member'}));
}

function panelMarkup(documentId){
  return '<div class="doc-comments-panel-v1" data-doc-id="'+escapeHtml(documentId)+'" hidden>'
    +'<div class="doc-comments-list-v1"><div class="doc-comments-empty-v1">Loading comments…</div></div>'
    +'<form class="doc-comment-form-v1">'
    +'<textarea class="doc-comment-input-v1" maxlength="4000" placeholder="Write a comment on this document…" aria-label="Document comment"></textarea>'
    +'<button type="submit" class="btn small doc-comment-submit-v1">Comment</button>'
    +'</form>'
    +'</div>';
}

async function openComments(panel,button){
  const id=panel.getAttribute('data-doc-id');
  panel.hidden=false;
  button.setAttribute('aria-expanded','true');
  button.textContent='Comments';
  const list=panel.querySelector('.doc-comments-list-v1');
  if(panel.dataset.loaded==='true')return;
  list.innerHTML='<div class="doc-comments-empty-v1">Loading comments…</div>';
  try{
    const rows=await fetchComments(id);
    panel.dataset.loaded='true';
    panel.dataset.count=String(rows.length);
    button.textContent='Comments'+(rows.length?' ('+rows.length+')':'');
    list.innerHTML=rows.length
      ? rows.map(x=>'<div class="doc-comment-v1"><div class="doc-comment-meta-v1"><strong>'+escapeHtml(x.author_name)+'</strong> · '+escapeHtml(formatDate(x.created_at))+'</div><div class="doc-comment-body-v1">'+escapeHtml(x.body)+'</div></div>').join('')
      : '<div class="doc-comments-empty-v1">No comments yet.</div>';
  }catch(e){
    list.innerHTML='<div class="doc-comments-error-v1">Unable to load comments: '+escapeHtml(e.message)+'</div>';
  }
}

async function submitComment(form){
  const panel=form.closest('.doc-comments-panel-v1');
  const input=form.querySelector('.doc-comment-input-v1');
  const button=form.querySelector('.doc-comment-submit-v1');
  const id=panel&&panel.getAttribute('data-doc-id');
  const user=currentUser();
  const body=(input&&input.value||'').trim();
  if(!id||!user)return notice('You must be logged in to comment.','err');
  if(!body)return notice('Write a comment first.','err');
  const c=getSb();
  if(!c)return notice('Database connection is unavailable.','err');
  button.disabled=true;
  try{
    const r=await c.from('document_comments').insert({
      document_id:id,
      author_id:user.id,
      body
    });
    if(r.error)throw r.error;
    input.value='';
    panel.dataset.loaded='';
    await openComments(panel,panel.parentElement.querySelector('.doc-comments-toggle-v1'));
    notice('Comment added.');
  }catch(e){
    notice('Comment failed: '+e.message,'err');
  }finally{
    button.disabled=false;
  }
}

function decorate(){
  const list=$id('docList');
  if(!list)return;
  const visible=visibleDocuments();
  const items=Array.from(list.querySelectorAll('.item'));
  items.forEach((item,index)=>{
    const d=visible[index];
    if(!d||!d.id)return;
    if(item.querySelector('.doc-comments-v1'))return;
    const box=document.createElement('div');
    box.className='doc-comments-v1';
    box.setAttribute('data-document-id',d.id);
    box.innerHTML='<button type="button" class="doc-comments-toggle-v1" aria-expanded="false">Comments</button>'+panelMarkup(d.id);
    item.appendChild(box);
  });
}

function installEvents(){
  document.addEventListener('click',async e=>{
    const button=e.target.closest&&e.target.closest('.doc-comments-toggle-v1');
    if(!button)return;
    const panel=button.parentElement&&button.parentElement.querySelector('.doc-comments-panel-v1');
    if(!panel)return;
    if(panel.hidden)await openComments(panel,button);
    else{panel.hidden=true;button.setAttribute('aria-expanded','false');button.textContent='Comments'+(panel.dataset.count&&Number(panel.dataset.count)?' ('+panel.dataset.count+')':'')}
  });
  document.addEventListener('submit',e=>{
    const form=e.target.closest&&e.target.closest('.doc-comment-form-v1');
    if(!form)return;
    e.preventDefault();
    submitComment(form);
  });
}

function boot(){
  installStyles();
  installEvents();
  decorate();
  let queued=false;
  const run=()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;decorate()});
  };
  const list=$id('docList');
  if(list)new MutationObserver(run).observe(list,{childList:true,subtree:true});
  const body=document.body;
  if(body)new MutationObserver(run).observe(body,{childList:true,subtree:true});
  setInterval(decorate,1500);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
