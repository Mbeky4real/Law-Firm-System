/* MOLMS MANUAL RECEIVABLE FOLLOW-UP V2 — revenue only, lexical data access */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const allManual=()=>{try{return typeof _fdAllManual!=='undefined'&&Array.isArray(_fdAllManual)?_fdAllManual:[]}catch(e){return []}};
 function install(){
  const amount=$('fdManualAmount'),modal=$('fdManualModal');if(!amount||!modal||$('fdFollowUpWrapV1'))return;
  const wrap=document.createElement('div');wrap.id='fdFollowUpWrapV1';wrap.style='display:none;margin-top:10px;padding:10px;border:1px solid var(--border);border-radius:9px;background:#f8fafc';
  wrap.innerHTML='<label style="display:flex;gap:8px;align-items:center;font-size:12px;font-weight:700"><input type="checkbox" id="fdFollowUpModeV1"> This payment is against an existing client receivable</label><div id="fdFollowUpFieldsV1" style="display:none;margin-top:9px"><label style="font-size:11px;font-weight:700">Select existing receivable</label><select id="fdFollowUpParentV1" class="search" style="width:100%;margin-top:4px"></select><div id="fdFollowUpInfoV1" style="font-size:11px;margin-top:6px;color:var(--muted)"></div></div>';
  const amountGrid=amount.closest('div[style*="grid-template-columns"]');if(amountGrid)amountGrid.after(wrap);
  $('fdFollowUpModeV1').addEventListener('change',()=>{$('fdFollowUpFieldsV1').style.display=$('fdFollowUpModeV1').checked?'block':'none';populate();});
  $('fdFollowUpParentV1').addEventListener('change',preview);
  amount.addEventListener('input',preview);
  $('fdManualCurrency')?.addEventListener('change',populate);
 }
 function parents(){
  const cur=$('fdManualCurrency')?.value||'TZS';
  return allManual().filter(t=>t.tx_type==='revenue'&&t.client_receivable&&!t.receivable_parent_id&&Number(t.outstanding_amount||0)>0&&String(t.status||(t.is_approved?'approved':'pending')).toLowerCase()==='approved'&&(t.currency||'TZS')===cur);
 }
 function populate(){
  const sel=$('fdFollowUpParentV1');if(!sel)return;
  const list=parents();sel.innerHTML='<option value="">Choose client receivable…</option>'+list.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.receivable_client_name||t.counterparty||'Client')+' · '+esc(t.receivable_matter_ref||t.reference)+' · Outstanding '+esc(t.currency||'TZS')+' '+Number(t.outstanding_amount).toLocaleString()+'</option>').join('');
  preview();
 }
 function preview(){
  const t=parents().find(x=>x.id===$('fdFollowUpParentV1')?.value),n=Number($('fdManualAmount')?.value||0),info=$('fdFollowUpInfoV1');
  if(info)info.textContent=t?'Current outstanding: '+(t.currency||'TZS')+' '+Number(t.outstanding_amount).toLocaleString()+' · Balance after approval: '+(t.currency||'TZS')+' '+Math.max(0,Number(t.outstanding_amount)-n).toLocaleString()+(n>Number(t.outstanding_amount)?' · Payment exceeds outstanding balance':''):'Select an open receivable to see its balance.';
 }
 function reset(txType){
  const w=$('fdFollowUpWrapV1');if(!w)return;
  const show=txType==='revenue';w.style.display=show?'block':'none';
  $('fdFollowUpModeV1').checked=false;$('fdFollowUpFieldsV1').style.display='none';
  $('fdFollowUpParentV1').value='';populate();
 }
 const oldOpen=window.fdOpenManualModal;
 if(oldOpen)window.fdOpenManualModal=function(txType){const r=oldOpen.apply(this,arguments);setTimeout(()=>{install();reset(txType);},30);return r;};
 const oldSave=window.fdSaveManual;
 if(oldSave)window.fdSaveManual=async function(){
  if(!$('fdFollowUpModeV1')?.checked)return oldSave.apply(this,arguments);
  const parent=parents().find(x=>x.id===$('fdFollowUpParentV1')?.value),amount=Number($('fdManualAmount')?.value||0);
  if(!$('fdManualTxType')||$('fdManualTxType').value!=='revenue'){notice('Further payments can only be recorded under Other Revenue.','err');return;}
  if(!parent||amount<=0||amount>Number(parent.outstanding_amount)){notice('Choose an open receivable in the same currency and enter a payment not exceeding its outstanding balance.','err');return;}
  const before=new Set(allManual().map(t=>t.id));
  await oldSave.apply(this,arguments);
  const fresh=allManual().filter(t=>!before.has(t.id)&&Number(t.amount)===amount&&t.tx_type==='revenue').sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
  if(!fresh){notice('Payment was saved, but its receivable link could not be confirmed. Check the register before retrying.','err');return;}
  const {error}=await sb.from('fd_manual_transactions').update({client_receivable:false,agreed_amount:0,outstanding_amount:0,receivable_client_name:parent.receivable_client_name||parent.counterparty,receivable_matter_ref:parent.receivable_matter_ref,receivable_parent_id:parent.id}).eq('id',fresh.id);
  if(error){notice('Payment saved but linking failed: '+error.message,'err');return;}
  await fdRefresh();notice('Further payment linked. The balance will reduce after approval.','ok');
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
 setTimeout(install,500);setTimeout(install,1200);
})();