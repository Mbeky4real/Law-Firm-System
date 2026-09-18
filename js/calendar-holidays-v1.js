/* MOLMS-CALENDAR-HOLIDAYS-V2 */
(function(){'use strict';
let holidays=[],showTZ=true,showIntl=true;
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

function decorate(){
  controls();
  const p=document.getElementById('page-diary');
  if(!p)return;
  p.querySelectorAll('.molmsHoliday').forEach(x=>x.remove());
  p.querySelectorAll('.calDay').forEach(cell=>{
    const date=ymdForCell(cell);
    if(!date)return;
    holidays.filter(h=>h.holiday_date===date&&(
      (h.scope==='tanzania'&&showTZ)||
      (h.scope==='international'&&showIntl)
    )).forEach(h=>{
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
}

function patch(){
  if(typeof renderCalendar!=='function'||renderCalendar.__holidayV2)return;
  const base=renderCalendar;
  renderCalendar=function(){
    const r=base.apply(this,arguments);
    requestAnimationFrame(()=>{controls();decorate()});
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