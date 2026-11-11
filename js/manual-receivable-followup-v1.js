/* MOLMS MANUAL RECEIVABLE FOLLOW-UP V1 */
(function(){
 const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 function install(){
  const amount=$('fdManualAmount'),modal=$('fdManualModal'); if(!amount||!modal||$('fdFollowUpWrapV1'))return false;
  const wrap=document.createElement('div');wrap.id='fdFollowUpWrapV1';wrap.style='margin-top:10px;padding:10px;border:1px solid var(--border);border-radius:9px;background:#f8fafc';
  wrap.innerHTML='<label style="display:flex;gap:8px;align-items:center;font-size:12px;font-weight:700"><input type="checkbox" id="fdFollowUpModeV1"> This payment is against an existing client receivable</label><div id="fdFollowUpFieldsV1" style="display:none;margin-top:9px"><label style="font-size:11px;font-weight:700">Select existing receivable</label><select id="fdFollowUpParentV1" class="search" style="width:100%;margin-top:4px"></select><div id="fdFollowUpInfoV1" style="font-size:11px;margin-top:6px;color:var(--muted)"></div></div>';
  amount.closest('div[style*="grid-template-columns"]')?.after(wrap);
  $('fdFollowUpModeV1').addEventListener('change',()=>{$('fdFollowUpFieldsV1').style.display=$('fdFollowUpModeV1').checked?'block':'none';populate();});
  $('fdFollowUpParentV1').addEventListener('change',preview);
  amount.addEventListener('input',preview);
  return true;
 }
 function parents(){return (window._fdAllManual||[]).filter(t=>t.client_receivable&&!t.receivable_parent_id&&Number(t.outstanding_amount||0)>0);}
 function populate(){const sel=$('fdFollowUpParentV1');if(!sel)return;const list=parents();sel.innerHTML='<option value="">Choose client receivable…</option>'+list.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.receivable_client_name||t.counterparty||'Client')+' · '+esc(t.receivable_matter_ref||t.reference)+' · Outstanding '+esc(t.currency||'TZS')+' '+Number(t.outstanding_amount).toLocaleString()+'</option>').join('');preview();}
 function preview(){const t=parents().find(x=>x.id===$('fdFollowUpParentV1')?.value);const n=Number($('fdManualAmount')?.value||0);if($('fdFollowUpInfoV1'))$('fdFollowUpInfoV1').textContent=t?'Current outstanding: '+(t.currency||'TZS')+' '+Number(t.outstanding_amount).toLocaleString()+' · New balance after approval: '+(t.currency||'TZS')+' '+Math.max(0,Number(t.outstanding_amount)-n).toLocaleString()+(n>Number(t.outstanding_amount)?' · Amount exceeds outstanding balance':''):'Select a receivable to see its balance.';}
 const open=window.fdOpenManualModal;
 if(open)window.fdOpenManualModal=function(){const r=open.apply(this,arguments);setTimeout(()=>{install();$('fdFollowUpModeV1').checked=false;$('fdFollowUpFieldsV1').style.display='none';populate();},50);return r;};
 const save=window.fdSaveManual;
 if(save)window.fdSaveManual=async function(){
  if(!$('fdFollowUpModeV1')?.checked)return save.apply(this,arguments);
  const parent=parents().find(x=>x.id===$('fdFollowUpParentV1').value),amount=Number($('fdManualAmount').value||0);
  if(!parent||amount<=0||amount>Number(parent.outstanding_amount)){notice('Select an existing receivable and enter a payment not exceeding its outstanding balance.','err');return;}
  const originalCheck=$('fdClientReceivable');if(originalCheck)originalCheck.checked=false;
  const before=new Set((window._fdAllManual||[]).map(t=>t.id));
  await save.apply(this,arguments);
  const fresh=(window._fdAllManual||[]).filter(t=>!before.has(t.id)&&Number(t.amount)===amount).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
  if(!fresh){notice('Payment was saved, but its receivable link could not be confirmed. Contact an administrator before recording it again.','err');return;}
  const {error}=await sb.from('fd_manual_transactions').update({client_receivable:true,agreed_amount:Number(parent.agreed_amount),outstanding_amount:0,receivable_client_name:parent.receivable_client_name||parent.counterparty,receivable_matter_ref:parent.receivable_matter_ref,receivable_parent_id:parent.id}).eq('id',fresh.id);
  if(error){notice('Payment saved but linking failed: '+error.message,'err');return;}
  await fdRefresh();notice('Further payment linked to the existing receivable. The balance will reduce when the payment is approved.','ok');
 };
 document.addEventListener('DOMContentLoaded',install);setTimeout(install,400);setTimeout(install,1200);
})();