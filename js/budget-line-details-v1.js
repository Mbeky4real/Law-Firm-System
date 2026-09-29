/* MOLMS Budget Line Details V2
 * Reviewers can inspect the actual items behind each budget line
 * before approving, rejecting, returning or holding it.
 *
 * This version does not depend on the budget renderer being exposed on window.
 * It observes the rendered budget table and resolves the selected budget/line
 * directly from the existing Supabase client when a reviewer opens a line.
 */
(function(){
  'use strict';

  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = v => Number(v||0).toLocaleString('en-US');
  const getSb = () => typeof sb !== 'undefined' ? sb : (window.supabaseClient || null);

  function ensureStyles(){
    if(document.getElementById('molmsBudgetLineDetailsStyles')) return;
    const s=document.createElement('style');
    s.id='molmsBudgetLineDetailsStyles';
    s.textContent=`
      .bd-item-link{border:0;background:transparent;padding:0;margin:0;cursor:pointer;color:var(--navy,#0f2440);font-weight:800;text-decoration:underline;text-decoration-color:var(--gold,#c9973a);text-underline-offset:2px;font:inherit;text-align:left}
      .bd-item-link:hover{color:var(--blue,#1a3a5c)}
      .bd-item-view{display:inline-flex;align-items:center;gap:5px;border:1px solid #d8e1eb;background:#f3f7fb;color:#1a3a5c;border-radius:999px;padding:4px 8px;font-size:10px;font-weight:800;cursor:pointer;white-space:nowrap}
      .bd-item-view:hover{background:#e6f0fa;border-color:#b9c9da}
      .bd-item-view.is-loading{opacity:.65;pointer-events:none}
      .bd-items-modal{position:fixed;inset:0;background:rgba(15,36,64,.42);display:flex;align-items:center;justify-content:center;padding:20px;z-index:10050}
      .bd-items-dialog{width:min(820px,96vw);max-height:min(82vh,760px);overflow:auto;background:#fff;border:1px solid var(--border,#ded6cb);border-radius:16px;box-shadow:0 18px 60px rgba(15,36,64,.25)}
      .bd-items-head{position:sticky;top:0;background:#fff;border-bottom:1px solid var(--border,#ded6cb);padding:16px 18px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;z-index:1}
      .bd-items-title{font-size:15px;font-weight:900;color:var(--navy,#0f2440)}
      .bd-items-sub{font-size:11px;color:var(--muted,#65738a);margin-top:3px}
      .bd-items-close{border:1px solid var(--border,#ded6cb);background:#fff;color:var(--navy,#0f2440);width:32px;height:32px;border-radius:9px;cursor:pointer;font-size:18px;line-height:1}
      .bd-items-body{padding:14px 18px 18px}
      .bd-items-table{width:100%;border-collapse:collapse;font-size:12px}
      .bd-items-table th{padding:8px;border-bottom:2px solid var(--border,#ded6cb);text-align:left;color:var(--muted,#65738a);font-size:10px;letter-spacing:.04em;text-transform:uppercase}
      .bd-items-table td{padding:10px 8px;border-bottom:1px solid #eee8df;vertical-align:top;color:var(--navy,#0f2440)}
      .bd-items-table td.num{text-align:right;white-space:nowrap}
      .bd-items-total{display:flex;justify-content:flex-end;gap:8px;padding-top:12px;font-weight:900;color:var(--navy,#0f2440)}
      .bd-items-note{font-size:11px;color:var(--muted,#65738a);margin-top:3px}
      .bd-items-error{padding:14px;border-radius:10px;background:#fde8e8;color:#9b1c1f;font-size:12px}
      .bd-items-loading{padding:22px;text-align:center;color:var(--muted,#65738a);font-size:12px}
      @media(max-width:650px){
        .bd-items-modal{padding:8px}.bd-items-dialog{width:100%;max-height:90vh;border-radius:13px}
        .bd-items-body{padding:10px;overflow-x:auto}.bd-items-table{min-width:650px}
      }
    `;
    document.head.appendChild(s);
  }

  function closeModal(){ document.getElementById('molmsBudgetItemsModal')?.remove(); }

  function findBudgetRef(){
    const root=document.getElementById('page-budget')||document.body;
    const text=root.innerText||'';
    const refs=[...text.matchAll(/MOL\/BUD\/\d+\/\d{2}\/\d{2}\/\d{2}\/[A-Z]{2}/g)].map(m=>m[0]);
    return refs[0]||null;
  }

  function rowCategory(row){
    const cells=row.querySelectorAll('td');
    if(cells.length>=3) return (cells[2].innerText||cells[2].textContent||'').replace(/\s+/g,' ').trim();
    return '';
  }

  function rowIndexForCategory(row){
    const tbody=document.getElementById('bdLinesBody');
    if(!tbody) return 0;
    const cat=rowCategory(row);
    return [...tbody.querySelectorAll('tr')]
      .filter(r=>!r.querySelector('td[colspan]'))
      .slice(0,[...tbody.querySelectorAll('tr')].indexOf(row)+1)
      .filter(r=>rowCategory(r)===cat).length-1;
  }

  function normalizeText(v){
    return String(v||'').replace(/\\s+/g,' ').trim().toLowerCase();
  }

  function visibleBudgetRows(){
    const tbody=document.getElementById('bdLinesBody');
    if(!tbody) return [];
    return [...tbody.querySelectorAll('tr')].filter(r=>{
      if(r.querySelector('td[colspan]')) return false;
      const cells=r.querySelectorAll('td');
      return cells.length>=4;
    });
  }

  function rowPosition(row){
    const rows=visibleBudgetRows();
    return rows.indexOf(row);
  }

  async function resolveLine(row){
    const client=getSb();
    if(!client) throw new Error('Budget data service is not available.');

    const ref=findBudgetRef();
    if(!ref) throw new Error('The selected budget reference could not be identified.');

    const {data:doc,error:docError}=await client
      .from('budget_documents')
      .select('id,reference_number,title,budget_month,status')
      .eq('reference_number',ref)
      .maybeSingle();
    if(docError) throw docError;
    if(!doc) throw new Error('The selected budget could not be loaded.');

    const {data:lines,error:lineError}=await client
      .from('budget_lines')
      .select('id,category,reason,description,notes,requested_amount,status,created_at')
      .eq('budget_document_id',doc.id)
      .order('created_at',{ascending:true});
    if(lineError) throw lineError;

    const allLines=lines||[];
    if(!allLines.length) throw new Error('No budget lines were found for this budget.');

    /*
     * The budget table is rendered in the same logical line order as the
     * budget_lines collection. Use the visible row position first. This is
     * important because the UI displays both category and purpose, and the
     * text in a cell may therefore contain the category more than once.
     */
    const pos=rowPosition(row);
    let line=(pos>=0 && pos<allLines.length) ? allLines[pos] : null;

    /*
     * Safe fallback for filtered/reordered rows: match the visible text
     * against category/reason/description instead of requiring exact text.
     */
    if(!line){
      const cells=row.querySelectorAll('td');
      const visible=normalizeText(cells[2]?.innerText||'');
      line=allLines.find(x=>{
        const candidates=[x.category,x.reason,x.description]
          .map(normalizeText).filter(Boolean);
        return candidates.some(v=>v===visible || visible.includes(v) || v.includes(visible));
      })||null;
    }

    if(!line) throw new Error('The budget line could not be matched to this row.');

    const {data:items,error:itemError}=await client
      .from('budget_line_items')
      .select('id,item_name,quantity,unit,unit_price,item_total,notes,estimated_supplier,display_order,created_at')
      .eq('budget_line_id',line.id)
      .order('display_order',{ascending:true})
      .order('created_at',{ascending:true});
    if(itemError) throw itemError;

    return {doc,line,items:items||[]};
  }

  function renderModal(title,sub,content){
    closeModal();
    const modal=document.createElement('div');
    modal.id='molmsBudgetItemsModal';
    modal.className='bd-items-modal';
    modal.innerHTML=`
      <div class="bd-items-dialog" role="dialog" aria-modal="true" aria-label="Budget line items">
        <div class="bd-items-head">
          <div><div class="bd-items-title">${esc(title)}</div><div class="bd-items-sub">${esc(sub)}</div></div>
          <button class="bd-items-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="bd-items-body">${content}</div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.bd-items-close').onclick=closeModal;
    modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
    const escClose=e=>{if(e.key==='Escape'){closeModal();document.removeEventListener('keydown',escClose);}};
    document.addEventListener('keydown',escClose);
    return modal;
  }

  async function showItems(row,button){
    if(button) button.classList.add('is-loading');
    renderModal('Budget line items','Loading the individual items…','<div class="bd-items-loading">Loading item details…</div>');
    try{
      const {doc,line,items}=await resolveLine(row);
      const count=items.length;
      const content=items.length ? `
        <table class="bd-items-table">
          <thead><tr><th>#</th><th>Item / Description</th><th>Quantity</th><th>Unit</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead>
          <tbody>
            ${items.map((it,i)=>{
              const qty=Number(it.quantity)||0, price=Number(it.unit_price)||0;
              const total=it.item_total!=null?Number(it.item_total):qty*price;
              return '<tr><td>'+(i+1)+'</td><td><b>'+esc(it.item_name||'—')+'</b>'+
                (it.notes?'<div class="bd-items-note">'+esc(it.notes)+'</div>':'')+
                (it.estimated_supplier?'<div class="bd-items-note">Supplier: '+esc(it.estimated_supplier)+'</div>':'')+
                '</td><td>'+qty.toLocaleString()+'</td><td>'+esc(it.unit||'—')+
                '</td><td class="num">TZS '+money(price)+'</td><td class="num"><b>TZS '+money(total)+'</b></td></tr>';
            }).join('')}
          </tbody>
        </table>
        <div class="bd-items-total"><span>Line Total:</span><span>TZS ${money(line.requested_amount)}</span></div>
      ` : '<div class="bd-items-loading">No item-level details have been recorded for this budget line.</div>';
      const modal=document.getElementById('molmsBudgetItemsModal');
      if(modal){
        modal.querySelector('.bd-items-title').textContent=line.category||line.reason||'Budget Line';
        modal.querySelector('.bd-items-sub').textContent=`${count} ${count===1?'item':'items'} · TZS ${money(line.requested_amount)} · ${doc.reference_number}`;
        modal.querySelector('.bd-items-body').innerHTML=content;
      }
    }catch(err){
      console.error('[MOLMS budget line details]',err);
      const modal=document.getElementById('molmsBudgetItemsModal');
      if(modal){
        modal.querySelector('.bd-items-title').textContent='Budget line details';
        modal.querySelector('.bd-items-sub').textContent='Could not load the line items';
        modal.querySelector('.bd-items-body').innerHTML='<div class="bd-items-error">'+esc(err?.message||'Unable to load budget line items.')+'</div>';
      }
    }finally{
      if(button) button.classList.remove('is-loading');
    }
  }

  function decorate(){
    const tbody=document.getElementById('bdLinesBody');
    if(!tbody) return;

    const rows=[...tbody.querySelectorAll('tr')].filter(r=>!r.querySelector('td[colspan]'));
    rows.forEach(row=>{
      const cells=row.querySelectorAll('td');
      if(cells.length<4) return;

      const categoryCell=cells[2];
      const countCell=cells[3];
      if(!categoryCell||!countCell) return;

      if(!categoryCell.querySelector('.bd-item-link')){
        const label=(categoryCell.innerText||categoryCell.textContent||'Budget line').replace(/\s+/g,' ').trim();
        categoryCell.innerHTML='<button type="button" class="bd-item-link" title="View budget line items">'+esc(label)+'</button>';
      }

      if(!countCell.querySelector('.bd-item-view')){
        const raw=(countCell.innerText||countCell.textContent||'').trim();
        const n=(raw.match(/\d+/)||['0'])[0];
        countCell.innerHTML='<button type="button" class="bd-item-view" title="View the individual items">'+esc(n)+' '+(n==='1'?'item':'items')+' ▸</button>';
      }

      row.querySelectorAll('.bd-item-link,.bd-item-view').forEach(btn=>{
        if(btn.dataset.bdBound==='1') return;
        btn.dataset.bdBound='1';
        btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();showItems(row,btn);});
      });
    });
  }

  function install(){
    ensureStyles();
    decorate();

    if(window.__molmsBudgetLineDetailsV2Installed) return;
    window.__molmsBudgetLineDetailsV2Installed=true;

    const observer=new MutationObserver(()=>decorate());
    const tbody=document.getElementById('bdLinesBody');
    if(tbody) observer.observe(tbody,{childList:true,subtree:true});
    else{
      const bodyObserver=new MutationObserver(()=>{
        const target=document.getElementById('bdLinesBody');
        if(target){
          bodyObserver.disconnect();
          observer.observe(target,{childList:true,subtree:true});
          decorate();
        }
      });
      bodyObserver.observe(document.body,{childList:true,subtree:true});
    }

    [250,750,1500,3000].forEach(ms=>setTimeout(decorate,ms));
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install);
  else install();
})();
