/* MOLMS Receivables Card Recovery V1
 * Isolated receivables loader/renderer; does not replace other finance dashboard modules.
 */
(function(){
  'use strict';
  if(window.MOLMSReceivablesRecoveryV1) return;
  const api=window.MOLMSReceivablesRecoveryV1={version:1,loaded:false,error:null};
  const $=id=>document.getElementById(id);
  const n=v=>Number(v||0);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
  const money=(c,v)=>String(c||'TZS')+' '+n(v).toLocaleString(undefined,{maximumFractionDigits:2});
  function host(){return $('fdReceivablesCardV1')||$('fdReceivablesCardV2')}
  function installStyle(){
    if($('molmsReceivablesRecoveryStyle'))return;
    const s=document.createElement('style');s.id='molmsReceivablesRecoveryStyle';
    s.textContent=`
      #page-findash #fdReceivablesCardV1,#page-findash #fdReceivablesCardV2{min-width:0!important;max-width:100%;box-sizing:border-box;overflow-wrap:anywhere}
      #page-findash .rr-summary{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px}
      #page-findash .rr-total{font-size:clamp(17px,2.5vw,23px);font-weight:900;line-height:1.3;color:#a16207;overflow-wrap:anywhere}
      #page-findash .rr-list{display:grid;gap:0}
      #page-findash .rr-row{width:100%;min-width:0;display:grid;grid-template-columns:minmax(0,1fr) repeat(3,minmax(0,.72fr));gap:8px;align-items:start;border:0;border-top:1px solid var(--border);padding:10px 2px;background:transparent;text-align:left;cursor:pointer;color:var(--navy);white-space:normal;overflow-wrap:anywhere}
      #page-findash .rr-client{grid-column:1/-1;font-size:12px;font-weight:800;line-height:1.35;overflow-wrap:anywhere}
      #page-findash .rr-ref{display:block;color:var(--muted);font-size:10px;font-weight:400;margin-top:2px;overflow-wrap:anywhere}
      #page-findash .rr-metric{font-size:10px;line-height:1.35;overflow-wrap:anywhere}
      #page-findash .rr-metric b{display:block;font-size:11px;line-height:1.4;margin-top:2px;overflow-wrap:anywhere}
      @media(max-width:520px){#page-findash .rr-row{gap:5px;padding:9px 0}#page-findash .rr-metric{font-size:9px}#page-findash .rr-metric b{font-size:10px}}
    `;
    document.head.appendChild(s);
  }
  async function load(){
    const h=host(); if(!h||typeof sb==='undefined'||!sb)return;
    h.innerHTML='<div style="font-size:11px;color:var(--muted);padding:8px 0">Loading receivables…</div>';
    try{
      const end=today();
      const [invRes,payRes,manRes]=await Promise.all([
        sb.from('invoices').select('id,invoice_number,invoice_type,status,client_name,currency,invoice_date,total_due,amount_paid,withholding_tax_amount,matter_ref,matter_title').lte('invoice_date',end),
        sb.from('invoice_payments').select('invoice_id,payment_date,cash_amount,withholding_tax_amount'),
        sb.from('fd_manual_transactions').select('id,reference,tx_type,status,is_approved,approval_status,date,amount,currency,client_receivable,agreed_amount,outstanding_amount,receivable_client_name,counterparty,receivable_matter_ref,description').lte('date',end)
      ]);
      if(invRes.error)throw invRes.error;
      if(payRes.error)throw payRes.error;
      if(manRes.error)throw manRes.error;
      const paid={};
      (payRes.data||[]).forEach(p=>{paid[p.invoice_id]=(paid[p.invoice_id]||0)+n(p.cash_amount)+n(p.withholding_tax_amount)});
      const rows=[];
      (invRes.data||[]).forEach(i=>{
        const type=String(i.invoice_type||'tax').toLowerCase(),status=String(i.status||'').toLowerCase();
        const activeTax=type==='tax'&&!['draft','void','cancelled','superseded'].includes(status);
        const issuedProforma=type==='proforma'&&status==='issued';
        if(!activeTax&&!issuedProforma)return;
        const total=n(i.total_due),p=n(paid[i.id]),due=Math.max(0,total-p);
        if(due>.01)rows.push({kind:'invoice',id:i.id,client:i.client_name||'Unknown client',source:i.invoice_number||'—',currency:i.currency||'TZS',revenue:total,paid:p,outstanding:due,status:issuedProforma?'Proforma Outstanding':p>0?'Part Paid':'Unpaid'});
      });
      (manRes.data||[]).forEach(t=>{
        const status=String(t.status||t.approval_status||(t.is_approved?'approved':'pending')).toLowerCase();
        if(status!=='approved'||!t.client_receivable)return;
        const due=Math.max(0,n(t.outstanding_amount));if(due<=.01)return;
        rows.push({kind:'manual',id:t.id,client:t.receivable_client_name||t.counterparty||'Unknown client',source:t.reference||t.description||'Manual receivable',currency:t.currency||'TZS',revenue:n(t.agreed_amount||t.amount),paid:n(t.amount),outstanding:due,status:'Part Paid'});
      });
      rows.sort((a,b)=>b.outstanding-a.outstanding);
      const currencies=[...new Set(rows.map(r=>r.currency||'TZS'))];
      const totals=currencies.map(c=>({currency:c,value:rows.filter(r=>r.currency===c).reduce((s,r)=>s+r.outstanding,0)}));
      h.innerHTML='<div class="rr-summary"><div><div style="font-size:11px;font-weight:800;color:var(--navy)">TOTAL CLIENT RECEIVABLES</div>'+
        totals.map(t=>'<div class="rr-total">'+esc(money(t.currency,t.value))+'</div>').join('')+
        '<div style="font-size:10px;color:var(--muted);margin-top:3px">Open balances as at '+esc(end)+'</div></div>'+
        '<div style="font-size:10px;color:var(--muted);text-align:right">'+rows.length+' open item'+(rows.length===1?'':'s')+'</div></div>'+
        '<div class="rr-list">'+(rows.map(r=>'<button class="rr-row" data-rr-kind="'+esc(r.kind)+'" data-rr-id="'+esc(r.id)+'"><span class="rr-client">'+esc(r.client)+'<small class="rr-ref">'+esc(r.source)+' · '+esc(r.status)+'</small></span><span class="rr-metric">Agreed<b>'+esc(money(r.currency,r.revenue))+'</b></span><span class="rr-metric" style="color:#16803c">Paid<b>'+esc(money(r.currency,r.paid))+'</b></span><span class="rr-metric" style="color:#b42318">Outstanding<b>'+esc(money(r.currency,r.outstanding))+'</b></span></button>').join('')||'<div style="font-size:11px;color:var(--muted);padding:8px 0">No open receivables recorded.</div>')+'</div>';
      h.onclick=e=>{const b=e.target.closest('[data-rr-kind]');if(!b)return;if(typeof fdOpenReceivableSourceV2==='function')fdOpenReceivableSourceV2(b.dataset.rrKind,b.dataset.rrId)};
      api.loaded=true;api.error=null;api.rows=rows;
    }catch(e){
      api.error=String(e&&e.message||e);
      console.error('[MOLMS receivables recovery]',e);
      h.innerHTML='<div style="font-size:11px;color:#b42318;padding:8px 0">Receivables could not be loaded. Please refresh or contact the system administrator.</div>';
    }
  }
  function start(){
    installStyle();
    const p=$('page-findash');if(!p)return;
    if(host()&&!api.loaded)load();
    if(!api.observer){api.observer=new MutationObserver(()=>{installStyle();if(host()&&!api.loaded)load()});api.observer.observe(p,{childList:true,subtree:true})}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('load',start,{once:true});
  document.addEventListener('click',e=>{if(e.target.closest('[onclick*="fdRefresh"],[onclick*="fdRender"],[data-page="findash"]')){api.loaded=false;setTimeout(start,250)}},true);
})();