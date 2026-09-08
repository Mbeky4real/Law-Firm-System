/* MOLMS-CALENDAR-PROFESSIONAL-V2 */
(function(){'use strict';
const CSS=`
#page-diary{overflow-x:hidden!important}
#page-diary .card{max-width:100%!important;overflow:hidden!important}
#page-diary .calendar{display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr))!important;gap:0!important;width:100%!important;min-width:0!important;border:1px solid #ded6cb!important;border-radius:12px!important;overflow:hidden!important;background:#fff!important}
#page-diary .calHead{box-sizing:border-box!important;min-width:0!important;padding:10px 8px!important;background:#f7f4ef!important;border-right:1px solid #e8e1d8!important;border-bottom:1px solid #ded6cb!important;text-align:left!important;font-size:11px!important;color:#65738a!important;font-weight:800!important;text-transform:uppercase!important;letter-spacing:.04em!important}
#page-diary .calHead:nth-child(7){border-right:0!important}
#page-diary .calDay{box-sizing:border-box!important;min-width:0!important;width:auto!important;height:118px!important;min-height:118px!important;margin:0!important;padding:7px!important;border:0!important;border-right:1px solid #e8e1d8!important;border-bottom:1px solid #e8e1d8!important;border-radius:0!important;background:#fff!important;overflow:hidden!important;font-size:12px!important}
#page-diary .calDay:nth-child(7n){border-right:0!important}
#page-diary .calDay:hover{background:#fbfaf8!important}
#page-diary .calDaySelected{border:0!important;background:#f4f7fb!important;box-shadow:inset 0 0 0 2px #0f2440!important}
#page-diary .calNum{display:flex!important;align-items:center!important;justify-content:center!important;width:24px!important;height:24px!important;margin:0 0 4px!important;border-radius:50%!important;font-size:12px!important;font-weight:900!important;color:#0f2440!important}
#page-diary .calDaySelected .calNum{background:#0f2440!important;color:#fff!important}
#page-diary .calEvent{box-sizing:border-box!important;display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;margin:3px 0!important;padding:4px 5px!important;border-radius:4px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;font-size:10px!important;line-height:1.2!important}
#page-diary .calEvent.calMore{background:#eeeae3!important;color:#65738a!important;font-weight:700!important;font-style:normal!important}
@media(max-width:1300px){#page-diary .calDay{height:105px!important;min-height:105px!important;padding:5px!important}#page-diary .calEvent{font-size:9px!important;padding:3px 4px!important}}
`;
function install(){let s=document.getElementById('molmsCalendarProfessionalStyle');if(!s){s=document.createElement('style');s.id='molmsCalendarProfessionalStyle';document.head.appendChild(s)}s.textContent=CSS}
function normalize(){const p=document.getElementById('page-diary');if(!p)return;p.querySelectorAll('.calendar').forEach(g=>{g.style.setProperty('grid-template-columns','repeat(7,minmax(0,1fr))','important');g.style.setProperty('width','100%','important');g.style.setProperty('min-width','0','important')});p.querySelectorAll('.calDay').forEach(c=>{c.style.setProperty('min-width','0','important');c.style.setProperty('width','auto','important')})}
function patch(){if(typeof renderCalendar!=='function'||renderCalendar.__professionalV2)return;const base=renderCalendar;renderCalendar=function(){const r=base.apply(this,arguments);requestAnimationFrame(normalize);return r};renderCalendar.__professionalV2=true}
function boot(){install();patch();normalize();let n=0,t=setInterval(()=>{install();patch();normalize();if(++n>40)clearInterval(t)},250);window.addEventListener('resize',normalize)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();