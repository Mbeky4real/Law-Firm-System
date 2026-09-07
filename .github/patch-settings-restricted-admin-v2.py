from pathlib import Path
p=Path('index.html')
s=p.read_text(errors='surrogateescape')
MARK='MOLMS-SETTINGS-RESTRICTED-ADMIN-V2'
if MARK in s:
    print('already applied')
    raise SystemExit(0)
assert 'MOLMS-SETTINGS-PROTECTION-CENTER-V1' in s
old='''            <div id="dataMgmtMsg" style="margin-top:10px"></div>\n          </div>'''
assert old in s, 'settings data pane anchor missing'
ui=r'''            <div id="dataMgmtMsg" style="margin-top:10px"></div>

            <!-- MOLMS-SETTINGS-RESTRICTED-ADMIN-V2 -->
            <div class="settings-section-label" style="margin-top:26px">Restricted Administration</div>
            <p class="muted small">Partner/Admin only. Destructive actions require a successful backup from the last 24 hours, password re-authentication and exact typed confirmation.</p>
            <details id="settingsRestrictedAdmin" style="border:1px solid #efb4b4;border-radius:12px;background:#fffafa;padding:0;margin-top:10px">
              <summary style="cursor:pointer;padding:14px 16px;font-weight:900;color:var(--red);list-style:none">⚠ Advanced Reset &amp; Wipe Controls</summary>
              <div style="padding:0 16px 16px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div style="border:1px solid #f1cccc;border-radius:10px;padding:13px;background:#fff">
                  <div style="font-weight:900;color:var(--navy)">System Reset</div>
                  <p class="muted small" style="margin:5px 0 10px">Clears operational records while preserving users, access roles, HR employee master data, bank setup, statutory configuration and backup history.</p>
                  <button class="btn out small" style="border-color:#b91c1c;color:#991b1b" onclick="settingsOpenAdminAction('reset')">System Reset</button>
                </div>
                <div style="border:1px solid #e5a5a5;border-radius:10px;padding:13px;background:#fff">
                  <div style="font-weight:900;color:#991b1b">Full Operational Data Wipe</div>
                  <p class="muted small" style="margin:5px 0 10px">Removes all operational/business records and core HR/financial setup. User access, security roles and backup history are preserved so recovery remains possible.</p>
                  <button class="btn red small" onclick="settingsOpenAdminAction('wipe')">Full Data Wipe</button>
                </div>
              </div>
              <div style="padding:0 16px 16px;font-size:11px;color:#7f1d1d">Neither action deletes protected MOLMS backup files or your Partner/Admin access.</div>
            </details>

            <div id="settingsAdminModal" style="display:none;position:fixed;inset:0;background:rgba(15,36,64,.55);z-index:900;align-items:center;justify-content:center;padding:18px">
              <div style="width:520px;max-width:96vw;background:#fff;border-radius:14px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.25)">
                <div id="settingsAdminModalTitle" style="font-family:Georgia,serif;font-size:20px;font-weight:900;color:#991b1b;margin-bottom:5px"></div>
                <div id="settingsAdminModalExplain" class="muted small" style="line-height:1.5;margin-bottom:12px"></div>
                <div style="background:#fff6da;border:1px solid #ecd081;border-radius:10px;padding:10px 12px;font-size:12px;margin-bottom:12px">A successful MOLMS backup less than 24 hours old is mandatory. The action is recorded in the system administration audit log.</div>
                <label>Password</label>
                <input id="settingsAdminPassword" type="password" autocomplete="current-password" placeholder="Re-enter your MOLMS password">
                <label id="settingsAdminConfirmLabel" style="margin-top:12px"></label>
                <input id="settingsAdminConfirmation" autocomplete="off">
                <div id="settingsAdminActionMsg" style="margin-top:12px"></div>
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">
                  <button class="btn out" onclick="settingsCloseAdminAction()">Cancel</button>
                  <button id="settingsAdminExecuteBtn" class="btn red" onclick="settingsExecuteAdminAction()">Confirm Action</button>
                </div>
              </div>
            </div>
          </div>'''
s=s.replace(old,ui,1)
anchor="""function settingsExportSelected(){\n  const el=$('settingsExportDataset');\n  if(el) exportCSV(el.value);\n}\n"""
assert anchor in s, 'settings function anchor missing'
funcs=r'''function settingsExportSelected(){
  const el=$('settingsExportDataset');
  if(el) exportCSV(el.value);
}
let _settingsAdminAction=null;
function settingsOpenAdminAction(action){
  if(!isAdmin()){ notice('Only Partners/Admins can use restricted administration.','err'); return; }
  _settingsAdminAction=action;
  const wipe=action==='wipe';
  $('settingsAdminModalTitle').textContent=wipe?'Full Operational Data Wipe':'System Reset';
  $('settingsAdminModalExplain').textContent=wipe
    ?'This permanently clears operational/business records and core HR/financial setup from the live MOLMS database. Protected backups and your access account remain available.'
    :'This permanently clears operational records from the live MOLMS database while preserving user access and core setup.';
  const phrase=wipe?'DELETE ALL MOLMS OPERATIONAL DATA':'RESET MOLMS OPERATIONAL DATA';
  $('settingsAdminConfirmLabel').textContent='Type '+phrase+' exactly to confirm';
  $('settingsAdminConfirmation').value='';
  $('settingsAdminPassword').value='';
  $('settingsAdminConfirmation').placeholder=phrase;
  $('settingsAdminActionMsg').innerHTML='';
  $('settingsAdminModal').style.display='flex';
}
function settingsCloseAdminAction(){
  const m=$('settingsAdminModal');
  if(m)m.style.display='none';
  _settingsAdminAction=null;
}
async function settingsExecuteAdminAction(){
  if(!isAdmin()||!_settingsAdminAction)return;
  const action=_settingsAdminAction;
  const wipe=action==='wipe';
  const phrase=wipe?'DELETE ALL MOLMS OPERATIONAL DATA':'RESET MOLMS OPERATIONAL DATA';
  const pwd=($('settingsAdminPassword')?.value||'');
  const conf=($('settingsAdminConfirmation')?.value||'');
  const msg=$('settingsAdminActionMsg');
  const btn=$('settingsAdminExecuteBtn');
  if(!pwd){msg.innerHTML='<div class="notice err">Password is required.</div>';return;}
  if(conf!==phrase){msg.innerHTML='<div class="notice err">The confirmation phrase does not match.</div>';return;}
  if(!confirm((wipe?'FULL DATA WIPE':'SYSTEM RESET')+': This action permanently changes the live MOLMS database. Continue?'))return;
  btn.disabled=true;
  msg.innerHTML='<div class="notice note">Verifying password, backup and authority…</div>';
  try{
    const email=authUser?.email;
    if(!email)throw new Error('Current account email is unavailable.');
    const {data:reauth,error:reauthErr}=await sb.auth.signInWithPassword({email,password:pwd});
    if(reauthErr||!reauth?.session)throw new Error(reauthErr?.message||'Password verification failed.');
    const {data,error}=await sb.functions.invoke('restricted-system-admin',{body:{action,confirmation:conf}});
    if(error){
      let detail=error.message||'Administration request failed.';
      try{const x=await error.context?.json();if(x?.error)detail=x.error;}catch(_e){}
      throw new Error(detail);
    }
    if(data?.error)throw new Error(data.error);
    msg.innerHTML='<div class="notice ok">Action completed. MOLMS will reload.</div>';
    setTimeout(()=>location.reload(),1200);
  }catch(e){
    msg.innerHTML='<div class="notice err">'+esc(e.message||String(e))+'</div>';
    btn.disabled=false;
  }
}
'''
s=s.replace(anchor,funcs,1)
assert s.count(MARK)==1
assert "sb.functions.invoke('restricted-system-admin'" in s
assert 'DELETE ALL MOLMS OPERATIONAL DATA' in s
assert 'RESET MOLMS OPERATIONAL DATA' in s
assert 'function fullDataWipe(' not in s
assert 'async function systemReset(' not in s
p.write_text(s,errors='surrogateescape')
print('restricted administration UI built and verified')
