/* MOLMS INVOICE WORKFLOW V3
 * Office Manager draft editing/submission; Partner review/return/issuance.
 * Workflow transitions are enforced by Supabase RPCs and database triggers.
 */
(function () {
  'use strict';
  if (window.__molmsInvoiceWorkflowV3) return;
  window.__molmsInvoiceWorkflowV3 = true;
  const $ = id => document.getElementById(id);
  const db = () => (typeof sb !== 'undefined' ? sb : (window.supabaseClient || window.sb || null));
  const page = () => { const p=$('page-invoice'); return p && p.style.display!=='none' && !p.hidden ? p : null; };
  let identity={id:null,role:'',name:''}, loading=false, currentDraft=null;
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=(v,c)=>(c||'TZS')+' '+Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const isManager=()=>['office_manager','office_admin'].includes(identity.role);
  const isPartner=()=>identity.role==='partner';
  function protectManagerIssueControls(){
    if(!isManager())return;
    const p=page();if(!p)return;
    [...p.querySelectorAll('button,input[type="button"],input[type="submit"],a')].forEach(el=>{
      const label=String(el.textContent||el.value||'').replace(/\s+/g,' ').trim().toLowerCase();
      if(/\b(issue|approve|authorize|authorise|finalize|finalise)\b/.test(label)&&!label.includes('send to partner')){
        el.disabled=true;el.setAttribute('aria-disabled','true');
        el.title='Only a Partner may issue an invoice. Use the Partner submission workflow.';
        el.style.pointerEvents='none';el.style.opacity='.45';
      }
    });
    const status=String(p.textContent||'').toLowerCase();
    if(status.includes('issued')&&!status.includes('draft'))return;
    const walker=document.createTreeWalker(p,NodeFilter.SHOW_TEXT),nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(n=>{
      const raw=n.nodeValue||'';
      if(/signatory/i.test(raw))n.nodeValue=raw.replace(/signatory/gi,'Prepared by');
      if(/\bpartner\b/i.test(n.nodeValue||'')&&/prepared by|signatory|issuer|issued by/i.test(n.parentElement?.parentElement?.textContent||'')){
        n.nodeValue=n.nodeValue.replace(/\bpartner\b/gi,'Office Manager');
      }
    });
  }

  async function loadIdentity(){
    const c=db(); if(!c?.auth?.getUser)return false;
    const {data:a,error:ae}=await c.auth.getUser(); if(ae||!a?.user)return false;
    const {data,error}=await c.from('roles').select('user_id,full_name,role,active').eq('user_id',a.user.id).eq('active',true).maybeSingle();
    if(error||!data)return false;
    identity={id:a.user.id,role:String(data.role||'').toLowerCase(),name:data.full_name||''}; return true;
  }
  function styles(){
    if($('molms-invoice-workflow-style-v3'))return;
    const s=document.createElement('style');s.id='molms-invoice-workflow-style-v3';
    s.textContent="#molms-invoice-workflow-v3{display:block;box-sizing:border-box;margin:12px 16px 18px;padding:16px;border:1px solid #dfd4c5;border-radius:14px;background:#fff;position:relative;z-index:2;color:#183247;font:inherit}#molms-invoice-workflow-v3 *{box-sizing:border-box}.molms-iwf-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}.molms-iwf-title{font-size:16px;font-weight:800;color:#183247}.molms-iwf-sub{font-size:12px;color:#667085;margin-top:4px;line-height:1.5}.molms-iwf-refresh,.molms-iwf-btn{border:1px solid #c9b89f;border-radius:8px;padding:8px 12px;background:#faf8f4;color:#183247;font-weight:700;cursor:pointer;font-size:12px}.molms-iwf-btn.primary{background:#183247;color:#fff;border-color:#183247}.molms-iwf-btn.issue{background:#166534;color:#fff;border-color:#166534}.molms-iwf-btn.return{background:#fff7ed;color:#9a3412;border-color:#fed7aa}.molms-iwf-btn:disabled{opacity:.5;cursor:not-allowed}.molms-iwf-section{border-top:1px solid #edf0f2;padding-top:13px;margin-top:13px}.molms-iwf-section h4{font-size:13px;margin:0 0 9px;color:#183247}.molms-iwf-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:10px}.molms-iwf-card{border:1px solid #e5e7eb;border-radius:10px;padding:12px;background:#fff;min-width:0}.molms-iwf-card strong{font-size:13px}.molms-iwf-meta{font-size:11px;color:#667085;line-height:1.6;margin:5px 0 9px;overflow-wrap:anywhere}.molms-iwf-actions{display:flex;gap:7px;flex-wrap:wrap}.molms-iwf-empty{font-size:12px;color:#667085;padding:12px;border-radius:8px;background:#f8fafc}.molms-iwf-editor{margin-top:12px;padding:14px;border:1px solid #c9b89f;border-radius:10px;background:#fcfbf9}.molms-iwf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:9px}.molms-iwf-field{display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:700;color:#475467}.molms-iwf-field input,.molms-iwf-field select,.molms-iwf-field textarea{width:100%;min-width:0;border:1px solid #d0d5dd;border-radius:7px;padding:8px;background:#fff;color:#183247;font:inherit;font-size:12px}.molms-iwf-field textarea{min-height:58px;resize:vertical}.molms-iwf-lines{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px}.molms-iwf-lines th,.molms-iwf-lines td{padding:6px;border-bottom:1px solid #e5e7eb;text-align:left}.molms-iwf-lines input{width:100%;min-width:60px;border:1px solid #d0d5dd;border-radius:6px;padding:7px;font:inherit}.molms-iwf-status{font-size:12px;margin:8px 0;color:#475467}@media(max-width:600px){#molms-invoice-workflow-v3{margin:8px;padding:11px}.molms-iwf-lines{min-width:620px}.molms-iwf-lines-wrap{overflow:auto}}";
    document.head.appendChild(s);
  }
  function ensurePanel(){
    const p=page();if(!p)return null;let panel=$('molms-invoice-workflow-v3');
    if(!panel){panel=document.createElement('section');panel.id='molms-invoice-workflow-v3';panel.innerHTML='<div class="molms-iwf-head"><div><div class="molms-iwf-title">Invoice Preparation & Issuance</div><div class="molms-iwf-sub">Office Manager prepares and corrects drafts. Only a Partner can authorise issuance.</div></div><button type="button" class="molms-iwf-refresh" data-iwf="refresh">Refresh</button></div><div id="molms-iwf-body"></div>';p.insertBefore(panel,p.firstChild);panel.addEventListener('click',onClick);}
    return panel;
  }
  async function getLines(id){const {data,error}=await db().from('invoice_lines').select('id,sn,particulars,qty,rate,amount').eq('invoice_id',id).order('sn');if(error)throw error;return data||[];}
  function card(r,mode){
    const status=r.issuance_state==='returned'?'<span style="color:#9a3412;font-weight:800">Returned for correction</span>':mode==='pending'?'<span style="color:#b45309;font-weight:800">Awaiting Partner review</span>':'<span style="color:#166534;font-weight:800">Draft</span>';
    const note=r.return_note?'<br><b>Partner comments:</b> '+esc(r.return_note):'';
    const action=mode==='pending'?'<button class="molms-iwf-btn" data-iwf="view" data-id="'+esc(r.id)+'">Review details</button>':'<button class="molms-iwf-btn primary" data-iwf="edit" data-id="'+esc(r.id)+'">Edit draft</button>';
    return '<article class="molms-iwf-card"><strong>'+esc(r.invoice_number||'Unnumbered draft')+' · '+esc(r.client_name||'Client not specified')+'</strong><div class="molms-iwf-meta">'+esc((r.invoice_type||'tax').toUpperCase())+' · '+esc(r.invoice_date||'No date')+' · '+money(r.total_due,r.currency)+'<br>'+status+note+'</div><div class="molms-iwf-actions">'+action+'</div></article>';
  }
  async function render(){
    const p=page(),panel=ensurePanel();if(!p||!panel||loading)return;loading=true;styles();
    const body=$('molms-iwf-body');body.innerHTML='<div class="molms-iwf-empty">Loading invoice workflow…</div>';
    try{
      if(!await loadIdentity())throw new Error('Your active MOLMS role could not be verified. Please sign in again.');
      protectManagerIssueControls();
      if(!isManager()&&!isPartner()){body.innerHTML='<div class="molms-iwf-empty">Invoice workflow access is restricted to the Office Manager and Partners.</div>';return;}
      if(isManager()){
        const {data,error}=await db().from('invoices').select('id,invoice_number,client_name,invoice_type,status,issuance_state,invoice_date,currency,total_due,return_note,created_at').eq('status','draft').in('issuance_state',['draft','returned']).order('created_at',{ascending:false});
        if(error)throw error;const rows=data||[];
        body.innerHTML='<div class="molms-iwf-section" style="border-top:0;padding-top:0;margin-top:0"><h4>Drafts ready for correction and submission ('+rows.length+')</h4>'+(rows.length?'<div class="molms-iwf-list">'+rows.map(r=>card(r,'draft')).join('')+'</div>':'<div class="molms-iwf-empty">No editable draft invoices. Create an invoice using the existing invoice form; saved drafts will appear here.</div>')+'</div><div id="molms-iwf-editor-host"></div><div id="molms-iwf-message" class="molms-iwf-status"></div>';
      }else{
        const {data,error}=await db().from('invoices').select('id,invoice_number,client_name,invoice_type,status,issuance_state,invoice_date,currency,total_due,submitted_for_issue_at,return_note,created_at').eq('status','draft').eq('issuance_state','pending').order('submitted_for_issue_at',{ascending:true});
        if(error)throw error;const rows=data||[];
        body.innerHTML='<div class="molms-iwf-section" style="border-top:0;padding-top:0;margin-top:0"><h4>Pending Partner review ('+rows.length+')</h4>'+(rows.length?'<div class="molms-iwf-list">'+rows.map(r=>card(r,'pending')).join('')+'</div>':'<div class="molms-iwf-empty">No invoices are waiting for Partner review.</div>')+'</div><div id="molms-iwf-review-host"></div><div id="molms-iwf-message" class="molms-iwf-status"></div>';
      }
    }catch(e){body.innerHTML='<div class="molms-iwf-empty" style="color:#b42318">Invoice workflow could not load: '+esc(e.message||e)+'</div>';}
    finally{loading=false;}
  }
  function field(label,name,value,type){
    const val=value==null?'':String(value);
    if(name==='currency')return '<label class="molms-iwf-field">'+label+'<select name="'+name+'"><option value="TZS"'+(val==='TZS'?' selected':'')+'>TZS</option><option value="USD"'+(val==='USD'?' selected':'')+'>USD</option></select></label>';
    if(name==='invoice_type')return '<label class="molms-iwf-field">'+label+'<select name="'+name+'"><option value="tax"'+(val==='tax'?' selected':'')+'>Tax Invoice</option><option value="proforma"'+(val==='proforma'?' selected':'')+'>Proforma Invoice</option></select></label>';
    return '<label class="molms-iwf-field">'+label+'<input name="'+name+'" type="'+(type||'text')+'" value="'+esc(val)+'"></label>';
  }
  function lineRow(l){
    return '<tr><td><input data-line="particulars" value="'+esc(l.particulars||'')+'" placeholder="Description of service"></td><td><input data-line="qty" type="number" min="0.01" step="0.01" value="'+esc(l.qty==null?1:l.qty)+'"></td><td><input data-line="rate" type="number" min="0" step="0.01" value="'+esc(l.rate==null?0:l.rate)+'"></td><td><button type="button" class="molms-iwf-btn return" data-iwf="remove-line">Remove</button></td></tr>';
  }
  async function openEditor(id){
    const {data,error}=await db().from('invoices').select('id,invoice_number,client_id,client_name,matter_ref,matter_title,currency,invoice_type,invoice_date,due_date,attention,notes,vat_rate,bank_account_id,service_type,retainer_period,practice_area,issuance_state,total_due').eq('id',id).maybeSingle();
    if(error)throw error;if(!data)throw new Error('Invoice draft was not found.');
    if(!['draft','returned'].includes(data.issuance_state))throw new Error('This invoice is not currently editable.');
    const lines=await getLines(id);currentDraft=data;const host=$('molms-iwf-editor-host');if(!host)throw new Error('The invoice editor could not be opened.');
    host.innerHTML='<div class="molms-iwf-editor" id="molms-iwf-editor"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><div><b>Correct invoice '+esc(data.invoice_number)+'</b><div class="molms-iwf-meta">Changes are saved to the draft. Once submitted, only a Partner can issue it or return it for correction.</div></div><button class="molms-iwf-btn" data-iwf="close-editor">Close</button></div><div class="molms-iwf-grid">'+field('Client name','client_name',data.client_name)+field('Matter reference','matter_ref',data.matter_ref)+field('Matter title','matter_title',data.matter_title)+field('Currency','currency',data.currency)+field('Document type','invoice_type',data.invoice_type)+field('Invoice date','invoice_date',data.invoice_date,'date')+field('Due date','due_date',data.due_date,'date')+field('VAT rate (%)','vat_rate',data.vat_rate,'number')+field('Service type','service_type',data.service_type)+field('Practice area','practice_area',data.practice_area)+field('Retainer period','retainer_period',data.retainer_period)+field('Attention','attention',data.attention)+'</div><label class="molms-iwf-field" style="margin-top:9px">Notes<textarea name="notes">'+esc(data.notes||'')+'</textarea></label><div class="molms-iwf-lines-wrap"><table class="molms-iwf-lines"><thead><tr><th>Particulars</th><th>Qty</th><th>Rate</th><th></th></tr></thead><tbody id="molms-iwf-lines-body">'+(lines.length?lines:[{particulars:'',qty:1,rate:0}]).map(lineRow).join('')+'</tbody></table></div><div class="molms-iwf-actions" style="margin-top:9px"><button class="molms-iwf-btn" data-iwf="add-line">Add line</button><button class="molms-iwf-btn primary" data-iwf="save">Save corrections</button><button class="molms-iwf-btn issue" data-iwf="submit">Save & send to Partners</button></div><div id="molms-iwf-editor-message" class="molms-iwf-status"></div></div>';
    host.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function readEditor(){
    const ed=$('molms-iwf-editor');if(!ed)throw new Error('Open a draft before saving.');
    const val=n=>{const el=ed.querySelector('[name="'+n+'"]');return el?el.value.trim():'';};
    const invoice={};['client_name','matter_ref','matter_title','currency','invoice_type','invoice_date','due_date','vat_rate','service_type','practice_area','retainer_period','attention','notes'].forEach(k=>invoice[k]=val(k));
    const lines=[...ed.querySelectorAll('#molms-iwf-lines-body tr')].map(tr=>({particulars:tr.querySelector('[data-line="particulars"]').value.trim(),qty:Number(tr.querySelector('[data-line="qty"]').value),rate:Number(tr.querySelector('[data-line="rate"]').value)}));
    return {invoice,lines};
  }
  async function saveDraft(submit){
    if(!currentDraft)throw new Error('No draft selected.');const {invoice,lines}=readEditor();const msg=$('molms-iwf-editor-message');if(msg)msg.textContent='Saving draft…';
    const saved=await db().rpc('save_invoice_draft',{p_invoice_id:currentDraft.id,p_invoice:invoice,p_lines:lines});if(saved.error)throw saved.error;
    const id=currentDraft.id;
    if(submit){const sent=await db().rpc('submit_invoice_for_issuance',{p_invoice_id:id});if(sent.error)throw sent.error;currentDraft=null;await render();const m=$('molms-iwf-message');if(m)m.textContent='Invoice saved and submitted to the Partners for review.';}
    else{if(msg)msg.textContent='Draft corrections saved successfully.';await render();await openEditor(id);}
  }
  async function openReview(id){
    const {data,error}=await db().from('invoices').select('id,invoice_number,client_name,matter_ref,matter_title,currency,invoice_type,invoice_date,due_date,attention,notes,subtotal,vat_rate,vat_amount,total_due').eq('id',id).maybeSingle();
    if(error)throw error;if(!data)throw new Error('Submitted invoice not found.');const lines=await getLines(id);const host=$('molms-iwf-review-host');if(!host)throw new Error('Review panel could not be opened.');
    host.innerHTML='<div class="molms-iwf-editor"><b>Partner review · '+esc(data.invoice_number)+'</b><div class="molms-iwf-meta">'+esc(data.client_name)+' · '+esc(data.matter_ref||'General matter')+' · '+esc(data.invoice_date)+'<br>Subtotal: '+money(data.subtotal,data.currency)+' · VAT ('+esc(data.vat_rate)+'%): '+money(data.vat_amount,data.currency)+' · <b>Total: '+money(data.total_due,data.currency)+'</b></div><div style="font-size:12px;margin:8px 0">'+lines.map((l,i)=>(i+1)+'. '+esc(l.particulars)+' — '+esc(l.qty)+' × '+money(l.rate,data.currency)+' = '+money(l.amount==null?Number(l.qty)*Number(l.rate):l.amount,data.currency)).join('<br>')+'</div><div class="molms-iwf-actions"><button class="molms-iwf-btn return" data-iwf="return" data-id="'+esc(id)+'">Return for correction</button><button class="molms-iwf-btn issue" data-iwf="issue" data-id="'+esc(id)+'">Issue invoice</button></div></div>';
    host.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  async function onClick(e){
    const b=e.target.closest('[data-iwf]');if(!b)return;const a=b.dataset.iwf;
    try{
      if(a==='refresh'){await render();return;}
      if(a==='edit'){await openEditor(b.dataset.id);return;}
      if(a==='view'){await openReview(b.dataset.id);return;}
      if(a==='close-editor'){currentDraft=null;const h=$('molms-iwf-editor-host');if(h)h.innerHTML='';return;}
      if(a==='add-line'){const body=$('molms-iwf-lines-body');if(body)body.insertAdjacentHTML('beforeend',lineRow({particulars:'',qty:1,rate:0}));return;}
      if(a==='remove-line'){const tr=b.closest('tr'),body=$('molms-iwf-lines-body');if(tr&&body&&body.children.length>1)tr.remove();return;}
      if(a==='save'||a==='submit'){b.disabled=true;await saveDraft(a==='submit');return;}
      if(a==='return'){const note=window.prompt('Explain what needs correction before this invoice can be issued:');if(note===null)return;b.disabled=true;const r=await db().rpc('return_invoice_for_correction',{p_invoice_id:b.dataset.id,p_note:note});if(r.error)throw r.error;await render();const m=$('molms-iwf-message');if(m)m.textContent='Invoice returned to the Office Manager with your comments.';return;}
      if(a==='issue'){if(!window.confirm('Issue this invoice now? The issuing Partner and issuance time will be recorded.'))return;b.disabled=true;const r=await db().rpc('issue_submitted_invoice',{p_invoice_id:b.dataset.id});if(r.error)throw r.error;await render();const m=$('molms-iwf-message');if(m)m.textContent='Invoice successfully issued. The database recorded the issuing Partner and issuance time.';}
    }catch(err){const target=$('molms-iwf-editor-message')||$('molms-iwf-message');if(target)target.textContent='Action failed: '+(err.message||err);else window.alert(err.message||err);b.disabled=false;}
  }
  let lastPage=false;
  async function boot(){const p=page();if(!p){lastPage=false;return;}if(!lastPage){lastPage=true;await render();}else if(!$('molms-invoice-workflow-v3'))await render();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  const observer=new MutationObserver(()=>{if(page()&&!$('molms-invoice-workflow-v3'))boot();});
  observer.observe(document.body,{childList:true,subtree:true});
  setInterval(()=>{if(page()&&!$('molms-invoice-workflow-v3'))boot();},1000);
  setInterval(()=>{if(page()&&$('molms-invoice-workflow-v3')&&!$('molms-iwf-editor')&&!document.querySelector('#molms-iwf-review-host .molms-iwf-editor')&&!loading)render();},10000);
  setInterval(()=>{if(page()&&isManager())protectManagerIssueControls();},1500);
})();