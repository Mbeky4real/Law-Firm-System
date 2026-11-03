/* MOLMS Invoice Identity V1 — display persisted preparer/issuer identity. */
(function(){
'use strict';
if(window.__molmsInvoiceIdentityV1)return;window.__molmsInvoiceIdentityV1=true;
const client=()=>typeof sb!=='undefined'?sb:(window.supabaseClient||window.sb||null);
const preview=()=>document.getElementById('invPreviewPane');
let token=0;const cache=new Map();
function nodes(){
 const root=preview();if(!root)return null;
 const label=[...root.querySelectorAll('div')].find(el=>el.children.length===0&&/^\((Partner|Office Manager|Administrator)\)$/i.test((el.textContent||'').trim()));
 return label?{label,name:label.previousElementSibling}:null;
}
function title(role){
 role=String(role||'').toLowerCase().replace(/[\s-]+/g,'_');
 if(['office_manager','office_admin'].includes(role))return 'Office Manager';
 if(role==='partner')return 'Partner';
 if(role==='admin')return 'Administrator';
 return role?role.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'Authorised Officer';
}
async function resolve(id){
 if(cache.has(id))return cache.get(id);
 const c=client();if(!c)return null;
 const {data:inv,error}=await c.from('invoices').select('status,created_by,issued_by').eq('id',id).maybeSingle();
 if(error||!inv)return null;
 const issued=['issued','paid','part_paid','overdue'].includes(String(inv.status));
 const actor=issued?(inv.issued_by||inv.created_by):(inv.created_by||inv.issued_by);
 if(!actor)return null;
 const {data:r,error:re}=await c.from('roles').select('full_name,role,position').eq('user_id',actor).maybeSingle();
 if(re||!r)return null;
 const out={name:r.full_name||'',role:r.role||r.position||''};cache.set(id,out);return out;
}
async function apply(){
 const mine=++token;
 const id=typeof _invActiveId!=='undefined'&&_invActiveId?String(_invActiveId):'';
 let p=id?await resolve(id):null;
 if(mine!==token)return;
 if(!p)p={name:typeof authFullName!=='undefined'?authFullName:'',role:typeof authRole!=='undefined'?authRole:''};
 const n=nodes();if(!n)return;
 if(p.name&&n.name)n.name.textContent=p.name;
 n.label.textContent='('+title(p.role)+')';
}
function install(){
 if(typeof window.invRenderPreview!=='function'||window.invRenderPreview.__identityV1)return false;
 const base=window.invRenderPreview;
 const wrap=function(){const r=base.apply(this,arguments);apply().catch(e=>console.warn('[MOLMS invoice identity]',e));return r;};
 wrap.__identityV1=true;window.invRenderPreview=wrap;return true;
}
let count=0;const timer=setInterval(()=>{if(install()||++count>80)clearInterval(timer)},250);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();