from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(errors='surrogateescape')
MARK='MOLMS-SETTINGS-PROTECTION-CENTER-V1'
if MARK in s:
    print('already applied')
    raise SystemExit(0)

# Rename settings tab.
s=s.replace("<button class=\"stab\" onclick=\"settingsTab('data')\" id=\"stData\" style=\"display:none\">Data Management</button>",
            "<button class=\"stab\" onclick=\"settingsTab('data')\" id=\"stData\" style=\"display:none\">Backup &amp; Recovery</button>")

# Find and replace the complete spane-data DIV using balanced DIV tags.
needle='<div class="stab-pane" id="spane-data">'
start=s.find(needle)
assert start>=0, 'spane-data not found'
pat=re.compile(r'<div\b[^>]*>|</div>',re.I)
depth=0; end=None
for m in pat.finditer(s,start):
    tag=m.group(0).lower()
    if tag.startswith('<div'): depth+=1
    else:
        depth-=1
        if depth==0:
            end=m.end(); break
assert end, 'could not balance spane-data'

new_pane=r'''<div class="stab-pane" id="spane-data">
            <!-- MOLMS-SETTINGS-PROTECTION-CENTER-V1 -->
            <div class="settings-section-label">System Protection</div>
            <p class="muted small" style="margin-bottom:12px">A simple recovery centre for protecting M&amp;O operational records. Backup copies are restricted to Partners/Admins.</p>

            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px" id="settingsProtectionCards">
              <div style="border:1px solid var(--border);border-radius:12px;padding:12px;background:#fff">
                <div style="font-size:10px;font-weight:800;letter-spacing:.4px;color:var(--muted)">BACKUP STATUS</div>
                <div id="settingsBackupStatus" style="font-size:16px;font-weight:900;color:var(--navy);margin-top:5px">Checking…</div>
                <div id="settingsBackupLast" class="muted small" style="margin-top:3px">Last successful backup: —</div>
              </div>
              <div style="border:1px solid var(--border);border-radius:12px;padding:12px;background:#fff">
                <div style="font-size:10px;font-weight:800;letter-spacing:.4px;color:var(--muted)">DATABASE</div>
                <div style="font-size:16px;font-weight:900;color:var(--green);margin-top:5px">Connected</div>
                <div class="muted small" style="margin-top:3px">Operational data is stored in Supabase.</div>
              </div>
              <div style="border:1px solid var(--border);border-radius:12px;padding:12px;background:#fff">
                <div style="font-size:10px;font-weight:800;letter-spacing:.4px;color:var(--muted)">EXTERNAL COPY</div>
                <div style="font-size:16px;font-weight:900;color:var(--amber);margin-top:5px">Manual Download</div>
                <div class="muted small" style="margin-top:3px">Keep downloaded backups outside MOLMS.</div>
              </div>
            </div>

            <div class="settings-section-label">Backup &amp; Recovery</div>
            <div style="border:1px solid var(--border);border-radius:12px;padding:14px;background:#fff;margin-bottom:14px">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap">
                <div style="flex:1;min-width:240px">
                  <div style="font-weight:900;color:var(--navy);margin-bottom:4px">Full System Backup</div>
                  <div class="muted small">Creates a private logical snapshot of all MOLMS database tables plus account metadata, then provides a copy you can keep outside the system.</div>
                </div>
                <button id="settingsBackupNowBtn" class="btn gold" onclick="settingsCreateBackup()">Back Up Now</button>
              </div>
              <div id="settingsBackupMsg" style="margin-top:10px"></div>
              <div class="notice note" style="margin:10px 0 0;font-size:12px">Backup files contain confidential law-firm information. Store downloaded copies securely. Supabase platform-managed backups, if enabled on the project plan, remain separate from this MOLMS backup.</div>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;margin:18px 0 8px">
              <div class="settings-section-label" style="margin:0">Backup History</div>
              <button class="btn out small" onclick="settingsLoadBackups()">Refresh</button>
            </div>
            <div id="settingsBackupHistory" style="border:1px solid var(--border);border-radius:12px;background:#fff;overflow:hidden;margin-bottom:18px">
              <div class="muted small" style="padding:14px">Loading backup history…</div>
            </div>

            <div class="settings-section-label">Recovery</div>
            <div style="border:1px solid var(--border);border-radius:12px;padding:14px;background:#fff;margin-bottom:18px">
              <div style="font-weight:900;color:var(--navy);margin-bottom:4px">Controlled Restore Only</div>
              <div class="muted small">MOLMS deliberately has no one-click reset or full-data wipe. If recovery is required, download the required backup and restore it through a controlled administrator procedure after integrity checks.</div>
            </div>

            <div class="settings-section-label">Data Export</div>
            <p class="muted small">For reporting or offline reference only. Data exports are not system backups.</p>
            <div style="display:grid;grid-template-columns:minmax(220px,1fr) auto;gap:10px;align-items:center;max-width:720px">
              <select id="settingsExportDataset">
                <option value="members">Members</option>
                <option value="reports">Daily Reports</option>
                <option value="cases">Cause List</option>
                <option value="nonlits">Non-Litigations</option>
                <option value="officeEvents">Diary</option>
                <option value="docs">Documents Register</option>
              </select>
              <button class="btn out" onclick="settingsExportSelected()">Export CSV</button>
            </div>
            <div id="dataMgmtMsg" style="margin-top:10px"></div>
          </div>'''
s=s[:start]+new_pane+s[end:]

# Load backup history automatically when the Backup & Recovery tab opens.
old_tab="""function settingsTab(tab){
  document.querySelectorAll('.stab').forEach(b=>b.classList.toggle('active',b.textContent.trim().toLowerCase().replace(/ /g,'-')===tab||b.getAttribute('onclick')===`settingsTab('${tab}')`));
  document.querySelectorAll('.stab-pane').forEach(p=>p.classList.remove('open'));
  const pane=$('spane-'+tab);
  if(pane) pane.classList.add('open');
}"""
new_tab="""function settingsTab(tab){
  document.querySelectorAll('.stab').forEach(b=>b.classList.toggle('active',b.textContent.trim().toLowerCase().replace(/ /g,'-')===tab||b.getAttribute('onclick')===`settingsTab('${tab}')`));
  document.querySelectorAll('.stab-pane').forEach(p=>p.classList.remove('open'));
  const pane=$('spane-'+tab);
  if(pane) pane.classList.add('open');
  if(tab==='data' && typeof settingsLoadBackups==='function') settingsLoadBackups();
}"""
assert old_tab in s, 'settingsTab canonical block not found'
s=s.replace(old_tab,new_tab,1)

# Add canonical backup UI functions immediately before existing CSV export engine.
insert_marker='// ── EXPORT CSV ───────────────────────────────────────────────────────────────'
pos=s.find(insert_marker)
assert pos>=0, 'export marker missing'
backup_js=r'''
// ── SETTINGS: SYSTEM PROTECTION & BACKUP ─────────────────────────────────────
function settingsFmtBytes(n){
  n=Number(n)||0;
  if(n<1024)return n+' B';
  if(n<1024*1024)return (n/1024).toFixed(1)+' KB';
  return (n/(1024*1024)).toFixed(1)+' MB';
}
function settingsFmtBackupDate(x){
  if(!x)return '—';
  try{return new Date(x).toLocaleString('en-GB',{timeZone:'Africa/Dar_es_Salaam',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch(e){return x;}
}
function settingsExportSelected(){
  const el=$('settingsExportDataset');
  if(el) exportCSV(el.value);
}
async function settingsLoadBackups(){
  if(!isAdmin())return;
  const h=$('settingsBackupHistory'),st=$('settingsBackupStatus'),last=$('settingsBackupLast');
  if(h)h.innerHTML='<div class="muted small" style="padding:14px">Loading backup history…</div>';
  if(!sb){if(st)st.textContent='Unavailable';return;}
  try{
    const {data,error}=await sb.functions.invoke('system-backup',{body:{action:'history'}});
    if(error)throw error;
    if(data?.error)throw new Error(data.error);
    const rows=data?.backups||[];
    const ok=rows.find(r=>r.status==='completed');
    if(st){st.textContent=ok?'Protected':'No backup yet';st.style.color=ok?'var(--green)':'var(--amber)';}
    if(last)last.textContent='Last successful backup: '+(ok?settingsFmtBackupDate(ok.completed_at||ok.created_at):'—');
    if(!h)return;
    if(!rows.length){h.innerHTML='<div class="muted small" style="padding:14px">No MOLMS backups have been created yet.</div>';return;}
    h.innerHTML=`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="background:#f8f6f2;border-bottom:1px solid var(--border)"><th style="text-align:left;padding:9px">Date</th><th style="text-align:left;padding:9px">Type</th><th style="text-align:left;padding:9px">Coverage</th><th style="text-align:left;padding:9px">Status</th><th style="text-align:right;padding:9px">Size</th><th style="padding:9px"></th></tr></thead>
      <tbody>${rows.map(r=>`<tr style="border-bottom:1px solid #eee8df"><td style="padding:9px">${esc(settingsFmtBackupDate(r.completed_at||r.created_at))}</td><td style="padding:9px">${esc(r.backup_type||'manual')}</td><td style="padding:9px">${r.table_count||0} tables · ${Number(r.record_count||0).toLocaleString()} records</td><td style="padding:9px;font-weight:800;color:${r.status==='completed'?'var(--green)':r.status==='failed'?'var(--red)':'var(--amber)'}">${esc(r.status)}</td><td style="padding:9px;text-align:right">${settingsFmtBytes(r.byte_size)}</td><td style="padding:9px;text-align:right">${r.status==='completed'&&r.storage_path?`<button class="btn out small" onclick="settingsDownloadBackup('${String(r.storage_path).replace(/'/g,"\\'")}')">Download</button>`:''}</td></tr>`).join('')}</tbody></table></div>`;
  }catch(e){
    if(st){st.textContent='Check required';st.style.color='var(--red)';}
    if(h)h.innerHTML='<div class="notice err" style="margin:10px">Could not load backup history: '+esc(e.message||String(e))+'</div>';
  }
}
async function settingsDownloadBackup(path){
  if(!sb||!path)return;
  try{
    const {data,error}=await sb.functions.invoke('system-backup',{body:{action:'download',path}});
    if(error)throw error;if(data?.error)throw new Error(data.error);
    const a=document.createElement('a');a.href=data.download_url;a.download='';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
  }catch(e){notice('Could not download backup: '+(e.message||String(e)),'err');}
}
async function settingsCreateBackup(){
  if(!isAdmin()){notice('Only Partners/Admins can create a system backup.','err');return;}
  if(!sb){notice('Supabase connection required.','err');return;}
  const btn=$('settingsBackupNowBtn'),msg=$('settingsBackupMsg');
  if(btn){btn.disabled=true;btn.textContent='Creating backup…';}
  if(msg)msg.innerHTML='<div class="notice note">Creating a protected snapshot. Keep this page open until it completes.</div>';
  try{
    const {data,error}=await sb.functions.invoke('system-backup',{body:{action:'create'}});
    if(error)throw error;if(data?.error)throw new Error(data.error);
    if(msg)msg.innerHTML='<div class="notice ok">Backup completed successfully · '+Number(data.record_count||0).toLocaleString()+' records · '+settingsFmtBytes(data.byte_size)+'. A secure download is starting.</div>';
    await settingsLoadBackups();
    if(data.download_url){const a=document.createElement('a');a.href=data.download_url;a.download='';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();}
  }catch(e){
    if(msg)msg.innerHTML='<div class="notice err">Backup failed: '+esc(e.message||String(e))+'</div>';
  }finally{
    if(btn){btn.disabled=false;btn.textContent='Back Up Now';}
  }
}

'''
s=s[:pos]+backup_js+s[pos:]

# Remove legacy browser-side destructive reset functions. Their UI is already gone.
def remove_js_function(src,name):
    marker=f'async function {name}(){{'
    a=src.find(marker)
    if a<0:return src
    brace=src.find('{',a)
    i=brace; depth=0; quote=None; escp=False; line=False; block=False
    while i<len(src):
        c=src[i]; n=src[i+1] if i+1<len(src) else ''
        if line:
            if c=='\n': line=False
        elif block:
            if c=='*' and n=='/': block=False; i+=1
        elif quote:
            if escp: escp=False
            elif c=='\\': escp=True
            elif c==quote: quote=None
        else:
            if c=='/' and n=='/': line=True; i+=1
            elif c=='/' and n=='*': block=True; i+=1
            elif c in ('\"',"'",'`'): quote=c
            elif c=='{': depth+=1
            elif c=='}':
                depth-=1
                if depth==0:
                    return src[:a]+src[i+1:]
        i+=1
    raise AssertionError('unbalanced function '+name)

s=remove_js_function(s,'systemReset')
s=remove_js_function(s,'fullDataWipe')

# Responsive protection cards.
css='''\n<style>/* MOLMS Settings Protection Center V1 */\n@media(max-width:900px){#settingsProtectionCards{grid-template-columns:1fr!important}}\n</style>\n'''
close=s.lower().rfind('</body>')
assert close>=0
s=s[:close]+css+s[close:]

# Verification: destructive UI/functions gone; canonical backup centre present once.
for forbidden in ['onclick="systemReset()"','onclick="fullDataWipe()"','async function systemReset(){','async function fullDataWipe(){','<h3>⚠ Danger Zone</h3>']:
    assert forbidden not in s, forbidden
for required in [MARK,'Back Up Now','Backup History','Controlled Restore Only','system-backup','settingsCreateBackup','Backup &amp; Recovery']:
    assert required in s, required
assert s.count(MARK)==1
p.write_text(s,errors='surrogateescape')
print('settings protection center applied')
