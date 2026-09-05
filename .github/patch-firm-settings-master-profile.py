from pathlib import Path

# Guarded master firm-profile integration patch.
p=Path('index.html')
s=p.read_text(encoding='utf-8')

old="""// Firm constants
const INV_FIRM = {
  name:    'M&O LAW OFFICE',
  tin:     '156-608-947',
  address: 'Mwanga Tower, 4th Floor – Left Wing',
  street:  'New Bagamoyo Road, Along Makumbusho Area',
  city:    'Dar es Salaam, Tanzania',
  tel:     ['+255 22 292 3816','+255 714 202 646','+255 758 666 024'],
  email:   'info@molaw.co.tz',
  website: 'www.molaw.co.tz',
};
"""
new="""// ── MASTER FIRM PROFILE ─────────────────────────────────────────────────────
// Firm Settings is the single source of truth for official firm identity used
// by generated/printable MOLMS outputs. Regulatory identifiers that do not yet
// have a Settings field (TIN) remain controlled defaults until deliberately
// exposed as editable configuration.
const FIRM_PROFILE_DEFAULTS={
  firmName:'M&O Law Office',
  firmTagline:'',
  firmAddress:'Mwanga Tower, 4th Floor – Left Wing, New Bagamoyo Road, Dar es Salaam, Tanzania',
  firmTel:'+255 22 292 3816',
  firmEmail:'info@molaw.co.tz',
  firmWebsite:'www.molaw.co.tz',
  firmLogo:'',
  tin:'156-608-947',
};
let _firmProfileServerLoaded=false;
function firmProfileGet(){
  const local=readObj(LS.firmSettings)||{};
  return {...FIRM_PROFILE_DEFAULTS,...local,tin:FIRM_PROFILE_DEFAULTS.tin};
}
async function firmProfileEnsureLoaded(force=false){
  if(_firmProfileServerLoaded&&!force) return firmProfileGet();
  if(!sb) return firmProfileGet();
  try{
    const {data,error}=await sb.from('system_settings').select('value').eq('key','firm_settings').maybeSingle();
    if(error) throw error;
    let remote=data?.value||{};
    if(typeof remote==='string'){
      try{remote=JSON.parse(remote||'{}')}catch(e){remote={}}
    }
    if(remote&&typeof remote==='object'){
      const merged={...readObj(LS.firmSettings),...remote};
      writeObj(LS.firmSettings,merged);
    }
    _firmProfileServerLoaded=true;
  }catch(e){
    console.warn('[firm-profile] server load failed; using local/default profile',e?.message||e);
  }
  return firmProfileGet();
}
function firmProfileLogoUrl(firm=firmProfileGet()){
  const u=String(firm.firmLogo||'').trim();
  if(!u) return '';
  if(/^data:image\//i.test(u)||/^blob:/i.test(u)||/\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(u)) return u;
  return '';
}
function firmProfilePhones(firm=firmProfileGet()){
  const raw=String(firm.firmTel||'').trim();
  if(!raw) return [];
  return raw.split(/\s*(?:,|;|\||\/)\s*/).map(x=>x.trim()).filter(Boolean);
}
"""
if old not in s: raise SystemExit('INV_FIRM anchor not found')
s=s.replace(old,new,1)

old="""async function invRender(){
  if(!invCanAccess()){ return; }
  if(!sb) return;
"""
new="""async function invRender(){
  if(!invCanAccess()){ return; }
  if(!sb) return;
  await firmProfileEnsureLoaded();
"""
if old not in s: raise SystemExit('invRender anchor not found')
s=s.replace(old,new,1)

old="""function invRenderPreview(){
  const el=$('invPreviewPane'); if(!el) return;
  const cur=val('invCurrency')||'TZS';
"""
new="""function invRenderPreview(){
  const el=$('invPreviewPane'); if(!el) return;
  const firm=firmProfileGet();
  const firmLogo=firmProfileLogoUrl(firm);
  const firmPhones=firmProfilePhones(firm);
  const cur=val('invCurrency')||'TZS';
"""
if old not in s: raise SystemExit('invRenderPreview anchor not found')
s=s.replace(old,new,1)

old="""    <div style=\"text-align:center;border-bottom:3px solid #8b3a0f;padding-bottom:12px;margin-bottom:12px\">
      <div style=\"font-size:28px;font-weight:900;color:#1a1a2e;letter-spacing:-1px;line-height:1\">M&O</div>
      <div style=\"font-size:11px;font-weight:700;letter-spacing:3px;color:#1a1a2e\">LAW OFFICE</div>
      <div style=\"height:1px;background:#8b3a0f;margin:8px 0\"></div>
    </div>
"""
new="""    <div style=\"text-align:center;border-bottom:3px solid #8b3a0f;padding-bottom:12px;margin-bottom:12px\">
      ${firmLogo?`<img src=\"${esc(firmLogo)}\" alt=\"${esc(firm.firmName||'Firm logo')}\" style=\"max-width:150px;max-height:64px;object-fit:contain;margin-bottom:5px\">`:`<div style=\"font-size:22px;font-weight:900;color:#1a1a2e;letter-spacing:-.5px;line-height:1.1\">${esc(String(firm.firmName||'M&O Law Office').toUpperCase())}</div>`}
      ${firm.firmTagline?`<div style=\"font-size:9px;letter-spacing:1px;color:#555;margin-top:5px\">${esc(firm.firmTagline)}</div>`:''}
      <div style=\"height:1px;background:#8b3a0f;margin:8px 0\"></div>
    </div>
"""
if old not in s: raise SystemExit('invoice header anchor not found')
s=s.replace(old,new,1)

repls={
"<div>TIN ${INV_FIRM.tin}</div>":"<div>TIN ${esc(firm.tin)}</div>",
"<div style=\"font-weight:700\">${INV_FIRM.name}</div>":"<div style=\"font-weight:700\">${esc(firm.firmName||'M&O Law Office')}</div>",
"<div>${INV_FIRM.address}</div>\n          <div>${INV_FIRM.street}</div>\n          <div>${INV_FIRM.city}</div>":"<div>${esc(firm.firmAddress||'—')}</div>",
"${INV_FIRM.tel.map(t=>`<div>${t}</div>`).join('')}":"${(firmPhones.length?firmPhones:['—']).map(t=>`<div>${esc(t)}</div>`).join('')}",
"<div>${INV_FIRM.email}</div>":"<div>${esc(firm.firmEmail||'—')}</div>",
"<div>${INV_FIRM.website}</div>":"<div>${esc(firm.firmWebsite||'—')}</div>",
}
for a,b in repls.items():
  if a not in s: raise SystemExit('invoice firm field anchor missing: '+a[:40])
  s=s.replace(a,b,1)

old="""function exPrintReport(){
  if(!_exBudgetDoc) return;
  const d=_exBudgetDoc;
"""
new="""async function exPrintReport(){
  if(!_exBudgetDoc) return;
  await firmProfileEnsureLoaded();
  const firm=firmProfileGet();
  const d=_exBudgetDoc;
"""
if old not in s: raise SystemExit('exPrintReport anchor not found')
s=s.replace(old,new,1)

old='<div class="firm">M&O LAW OFFICE — EXPENSE REGISTER REPORT</div>'
new='<div class="firm">${esc(String(firm.firmName||\'M&O Law Office\').toUpperCase())} — EXPENSE REGISTER REPORT</div>'
if old not in s: raise SystemExit('expense firm heading anchor not found')
s=s.replace(old,new,1)

old="""      Prepared by ${authFullName||'—'} | Printed: ${new Date().toLocaleString()} | M&O Law Office Management System
"""
new="""      Prepared by ${authFullName||'—'} | Printed: ${new Date().toLocaleString()} | ${esc(firm.firmName||'M&O Law Office')} Management System<br>
      ${esc(firm.firmAddress||'')} ${firm.firmTel?' | '+esc(firm.firmTel):''} ${firm.firmEmail?' | '+esc(firm.firmEmail):''} ${firm.firmWebsite?' | '+esc(firm.firmWebsite):''}
"""
if old not in s: raise SystemExit('expense footer anchor not found')
s=s.replace(old,new,1)

old="""function loadFirmFields(){
  const fs=readObj(LS.firmSettings);
"""
new="""async function loadFirmFields(){
  await firmProfileEnsureLoaded(true);
  const fs=firmProfileGet();
"""
if old not in s: raise SystemExit('loadFirmFields anchor not found')
s=s.replace(old,new,1)

old='<div><label>Firm Logo URL (https://...)</label><input id="sFirmLogo" placeholder="https://..."></div>'
new='<div><label>Firm Logo (direct image URL)</label><input id="sFirmLogo" placeholder="https://.../logo.png"><div style="font-size:10px;color:var(--muted);margin-top:4px">Use a direct PNG, JPG, WEBP, GIF or SVG image URL. Ordinary website addresses are not treated as logos.</div></div>'
if old not in s: raise SystemExit('logo field anchor not found')
s=s.replace(old,new,1)

old='<h3>Firm Settings</h3>'
if old in s:
  s=s.replace(old,'<h3>Firm Settings</h3><p style="margin:0 0 14px;font-size:11px;color:var(--muted)">Official firm identity used by MOLMS-generated invoices and formal printable outputs.</p>',1)

assert 'const INV_FIRM' not in s
assert 'firmProfileEnsureLoaded' in s
assert 'firmProfileGet()' in s
assert 'INV_FIRM.' not in s
assert 'async function exPrintReport()' in s
assert 'await firmProfileEnsureLoaded();' in s

p.write_text(s,encoding='utf-8')
print('firm profile patch applied')
