/* MOLMS Budget Line Details V1
 * Lets reviewers inspect the actual units/items behind each budget category
 * before approving, rejecting, returning or holding a line.
 */
(function(){
  'use strict';

  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = v => Number(v||0).toLocaleString();

  function ensureStyles(){
    if(document.getElementById('molmsBudgetLineDetailsStyles')) return;
    const s=document.createElement('style');
    s.id='molmsBudgetLineDetailsStyles';
    s.textContent=`
      .bd-item-link{border:0;background:transparent;padding:0;margin:0;cursor:pointer;color:#1a3a5c;font-weight:800;text-decoration:underline;text-decoration-color:#c9973a;text-underline-offset:2px;font:inherit}
      .bd-item-link:hover{color:#0f2440}
      .bd-item-view{display:inline-flex;align-items:center;gap:5px;margin-top:3px;border:0;background:#f3f7fb;color:#1a3a5c;border-radius:999px;padding:3px 7px;font-size:10px;font-weight:800;cursor:pointer}
      .bd-item-view:hover{background:#e6f0fa}
      .bd-items-modal{position:fixed;inset:0;background:rgba(15,36,64,.42);display:flex;align-items:center;justify-content:center;padding:20px;z-index:10050}
      .bd-items-dialog{width:min(760px,96vw);max-height:min(78vh,720px);overflow:auto;background:#fff;border:1px solid var(--border);border-radius:16px;box-shadow:0 18px 60px rgba(15,36,64,.25)}
      .bd-items-head{position:sticky;top:0;background:#fff;border-bottom:1px solid var(--border);padding:16px 18px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;z-index:1}
      .bd-items-title{font-size:15px;font-weight:900;color:var(--navy)}
      .bd-items-sub{font-size:11px;color:var(--muted);margin-top:3px}
      .bd-items-close{border:1px solid var(--border);background:#fff;color:var(--navy);width:32px;height:32px;border-radius:9px;cursor:pointer;font-size:18px;line-height:1}
      .bd-items-body{padding:14px 18px 18px}
      .bd-items-table{width:100%;border-collapse:collapse;font-size:12px}
      .bd-items-table th{padding:8px;border-bottom:2px solid var(--border);text-align:left;color:var(--muted);font-size:10px;letter-spacing:.04em;text-transform:uppercase}
      .bd-items-table td{padding:10px 8px;border-bottom:1px solid #eee8df;vertical-align:top;color:var(--navy)}
      .bd-items-table td.num{text-align:right;white-space:nowrap}
      .bd-items-total{display:flex;justify-content:flex-end;gap:8px;padding-top:12px;font-weight:900;color:var(--navy)}
      .bd-items-note{font-size:11px;color:var(--muted);margin-top:3px}
      @media(max-width:650px){
        .bd-items-modal{padding:8px}.bd-items-dialog{width:100%;max-height:90vh;border-radius:13px}
        .bd-items-body{padding:10px}.bd-items-table{min-width:620px}.bd-items-body{overflow-x:auto}
      }
    `;
    document.head.appendChild(s);
  }

  function closeModal(){
    document.getElementById('molmsBudgetItemsModal')?.remove();
  }

  function showItems(lineId){
    const lines=Array.isArray(window._bdLines)?window._bdLines:[];
    const line=lines.find(x=>String(x.id)===String(lineId));
    if(!line) return;
    const items=(window._bdItems&&Array.isArray(window._bdItems[lineId]))?window._bdItems[lineId]:[];
    const modal=document.createElement('div');
    modal.id='molmsBudgetItemsModal';
    modal.className='bd-items-modal';
    modal.innerHTML=`
      <div class="bd-items-dialog" role="dialog" aria-modal="true" aria-label="Budget line items">
        <div class="bd-items-head">
          <div>
            <div class="bd-items-title">${esc(line.category||line.reason||'Budget Line')}</div>
            <div class="bd-items-sub">${items.length} ${items.length===1?'item':'items'} · TZS ${money(line.requested_amount)}</div>
            ${line.notes?'<div class="bd-items-note">'+esc(line.notes)+'</div>':''}
          </div>
          <button class="bd-items-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="bd-items-body">
          ${items.length ? `
            <table class="bd-items-table">
              <thead><tr><th>#</th><th>Item / Description</th><th>Quantity</th><th>Unit</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead>
              <tbody>
                ${items.map((it,i)=>{
                  const qty=Number(it.quantity)||0, price=Number(it.unit_price)||0;
                  return '<tr><td>'+(i+1)+'</td><td><b>'+esc(it.item_name||'—')+'</b>'+(it.notes?'<div class="bd-items-note">'+esc(it.notes)+'</div>':'')+'</td><td>'+qty.toLocaleString()+'</td><td>'+esc(it.unit||'—')+'</td><td class="num">TZS '+money(price)+'</td><td class="num"><b>TZS '+money(qty*price)+'</b></td></tr>';
                }).join('')}
              </tbody>
            </table>
            <div class="bd-items-total"><span>Line Total:</span><span>TZS ${money(line.requested_amount)}</span></div>
          ` : '<div style="padding:18px;text-align:center;color:var(--muted);font-size:12px">No item-level details are available for this budget line.</div>'}
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.bd-items-close').onclick=closeModal;
    modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
    document.addEventListener('keydown',function escClose(e){if(e.key==='Escape'){closeModal();document.removeEventListener('keydown',escClose);}});
  }

  window.bdViewLineItems=showItems;

  function decorate(){
    const tbody=document.getElementById('bdLinesBody');
    const lines=Array.isArray(window._bdLines)?window._bdLines:[];
    if(!tbody||!lines.length) return;
    const rows=[...tbody.querySelectorAll('tr')].filter(r=>!r.querySelector('td[colspan]'));
    rows.forEach((row,idx)=>{
      const line=lines[idx]; if(!line) return;
      const items=(window._bdItems&&Array.isArray(window._bdItems[line.id]))?window._bdItems[line.id]:[];
      const cells=row.querySelectorAll('td');
      if(cells.length<8) return;

      // Make category/purpose itself clickable.
      const category=cells[2]?.querySelector('div');
      if(category && !category.querySelector('.bd-item-link')){
        const label=category.textContent||'Budget line';
        category.innerHTML='<button type="button" class="bd-item-link" onclick="bdViewLineItems(\\''+esc(line.id)+'\\')">'+esc(label)+'</button>';
      }

      // Replace the raw item count with a clear review affordance.
      const count=cells[3];
      if(count && !count.querySelector('.bd-item-view')){
        count.innerHTML='<button type="button" class="bd-item-view" onclick="bdViewLineItems(\\''+esc(line.id)+'\\')" title="View the individual items in this category">'+items.length+' '+(items.length===1?'item':'items')+' ▸</button>';
      }
    });
  }

  function install(){
    ensureStyles();
    if(typeof window.bdRenderLines!=='function'){
      setTimeout(install,250);
      return;
    }
    if(window.__molmsBudgetLineDetailsInstalled) return;
    window.__molmsBudgetLineDetailsInstalled=true;
    const original=window.bdRenderLines;
    window.bdRenderLines=function(){
      const result=original.apply(this,arguments);
      setTimeout(decorate,0);
      return result;
    };
    decorate();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install);
  else install();
})();
