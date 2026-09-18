/* MOLMS-CALENDAR-HOLIDAYS-V2 */
(function(){'use strict';
let holidays=[],showTZ=true,showIntl=true;
function recurringEvents(year){
  const out=[
    {holiday_date:year+'-08-01',name:'Happy M&O Law Day',scope:'molaw',kind:'firm'},
    {holiday_date:year+'-09-26',name:'Mwombeki’s Birthday',scope:'molaw',kind:'personal'},
    {holiday_date:year+'-10-26',name:'Fatma’s Birthday',scope:'molaw',kind:'personal'}
  ];
  const nthSunday=(month,n)=>{const d=new Date(year,month-1,1),shift=(7-d.getDay())%7;return new Date(year,month-1,1+shift+(n-1)*7)};
  const mothers=nthSunday(5,2),fathers=nthSunday(6,3);
  const fmt=d=>year+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  out.push({holiday_date:fmt(mothers),name:'Mother’s Day',scope:'family',kind:'observance'});
  out.push({holiday_date:fmt(fathers),name:'Father’s Day',scope:'family',kind:'observance'});
  return out;
}
const sbc=()=>typeof sb!=='undefined'?sb:(window.supabaseClient||null);
const pad=n=>String(n).padStart(2,'0');

async function load(){
  const c=sbc();
  if(!c){decorate();return}
  try{
    const {data,error}=await c.from('calendar_holidays')
      .select('holiday_date,name,scope,is_tentative')
      .eq('is_active',true);
    if(error) throw error;
    holidays=(data||[]).map(h=>({...h,holiday_date:String(h.holiday_date).slice(0,10)}));
    const year=new Date().getFullYear();
    holidays=holidays.concat(recurringEvents(year));
  }catch(e){
    console.error('Calendar holiday load failed:',e);
  }
  decorate();
}

function currentCalendarMonth(){
  try{
    if(typeof calDate!=='undefined' && calDate instanceof Date && !Number.isNaN(calDate.getTime())){
      return {year:calDate.getFullYear(),month:calDate.getMonth()+1};
    }
  }catch(e){}
  const title=document.getElementById('calTitle')?.textContent||'';
  const m=title.match(/([A-Za-zÀ-ÿ]+)\s+(20\d{2})/);
  if(m){
    const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
    const idx=months.indexOf(m[1].toLowerCase());
    if(idx>=0)return {year:Number(m[2]),month:idx+1};
  }
  return null;
}

function ymdForCell(cell){
  const num=Number.parseInt((cell.querySelector('.calNum')?.textContent||'').trim(),10);
  if(!Number.isInteger(num)||num<1||num>31)return null;
  const cm=currentCalendarMonth();
  if(!cm)return null;
  return cm.year+'-'+pad(cm.month)+'-'+pad(num);
}

function controls(){
  const p=document.getElementById('page-diary');
  if(!p||document.getElementById('holidayFiltersV2'))return;
  const cal=p.querySelector('.calendar');
  if(!cal)return;
  const d=document.createElement('div');
  d.id='holidayFiltersV2';
  d.style.cssText='display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin:0 0 10px;font-size:11px;color:#65738a';
  d.innerHTML='<b style="color:#0f2440">Calendar:</b><label style="margin:0;display:flex;gap:5px;align-items:center"><input id="hfTZ" type="checkbox" checked style="width:auto"> Tanzania Holidays</label><label style="margin:0;display:flex;gap:5px;align-items:center"><input id="hfIntl" type="checkbox" checked style="width:auto"> International Observances</label>';
  cal.parentNode.insertBefore(d,cal);
  const tz=d.querySelector('#hfTZ'),intl=d.querySelector('#hfIntl');
  if(tz)tz.onchange=e=>{showTZ=e.target.checked;decorate()};
  if(intl)intl.onchange=e=>{showIntl=e.target.checked;decorate()};
}

function selectedEventsForDate(date){
  return holidays.filter(h=>h.holiday_date===date&&(
    h.scope==='tanzania'&&showTZ || h.scope==='international'&&showIntl ||
    h.scope==='molaw' || h.scope==='family'
  ));
}
function ensureDayPanel(){
  const p=document.getElementById('page-diary'); if(!p)return null;
  let panel=document.getElementById('calendarSelectedDayV1');
  if(panel)return panel;
  const cal=p.querySelector('.calendar'); if(!cal)return null;
  panel=document.createElement('div'); panel.id='calendarSelectedDayV1';
  panel.style.cssText='margin-top:12px;border:1px solid #ded6cb;border-radius:10px;background:#fff;padding:12px 14px;color:#24344d';
  cal.parentNode.insertBefore(panel,cal.nextSibling); return panel;
}
function showSelectedDay(date){
  const panel=ensureDayPanel(); if(!panel)return;
  const events=selectedEventsForDate(date);
  const dt=new Date(date+'T00:00:00');
  const label=dt.toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  if(!events.length){
    panel.innerHTML='<div style="font-size:12px;font-weight:800">'+label+'</div><div style="margin-top:5px;font-size:11px;color:#65738a">No holiday or special event on this date.</div>';
    return;
  }
  panel.innerHTML='<div style="font-size:12px;font-weight:800">'+label+'</div><div style="margin-top:7px;display:flex;flex-direction:column;gap:5px">'+events.map(h=>{
    const icon=h.scope==='tanzania'?'🇹🇿':h.scope==='international'?'🌐':h.scope==='molaw'?'⚖️':'❤️';
    const type=h.scope==='tanzania'?'Tanzania Public Holiday':h.scope==='international'?'International Observance':h.scope==='molaw'?'M&O Law Office':'Family Observance';
    return '<div style="display:flex;align-items:center;gap:7px;font-size:11px"><span>'+icon+'</span><b>'+escText(h.name)+'</b><span style="color:#7a8699">— '+type+(h.is_tentative?' (tentative)':'')+'</span></div>';
  }).join('')+'</div>';
}
function escText(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function bindDayClicks(){
  const p=document.getElementById('page-diary'); if(!p)return;
  p.querySelectorAll('.calDay').forEach(cell=>{
    if(cell.__holidayClickV1)return;
    cell.__holidayClickV1=true;
    cell.style.cursor='pointer';
    cell.addEventListener('click',function(){
      const date=ymdForCell(cell);
      if(date)showSelectedDay(date);
    });
  });
}
function decorate(){
  controls();
  const p=document.getElementById('page-diary');
  if(!p)return;
  p.querySelectorAll('.molmsHoliday').forEach(x=>x.remove());
  p.querySelectorAll('.calDay').forEach(cell=>{
    const date=ymdForCell(cell);
    if(!date)return;
    selectedEventsForDate(date).forEach(h=>{
      const e=document.createElement('div');
      e.className='calEvent molmsHoliday';
      e.title=h.name+(h.is_tentative?' (tentative)':'');
      e.style.cssText=h.scope==='tanzania'
        ?'background:#fff3d8;color:#775000;border-left:3px solid #c9973a'
        :'background:#f0f2f5;color:#596579;border-left:3px solid #98a2b3';
      e.textContent=(h.scope==='tanzania'?'🇹🇿 ':'🌐 ')+h.name+(h.is_tentative?' *':'');
      cell.appendChild(e);
    });
  });
  bindDayClicks();
}

function patch(){
  if(typeof renderCalendar!=='function'||renderCalendar.__holidayV2)return;
  const base=renderCalendar;
  renderCalendar=function(){
    const r=base.apply(this,arguments);
    requestAnimationFrame(()=>{controls();decorate();bindDayClicks()});
    return r;
  };
  renderCalendar.__holidayV2=true;
}

function boot(){
  patch();
  load();
  let n=0,t=setInterval(()=>{
    patch();
    controls();
    decorate();
    if(++n>40)clearInterval(t);
  },300);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();