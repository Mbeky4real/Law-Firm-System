/* MOLMS-CALENDAR-PROFESSIONAL-V1 */
(function(){'use strict';
const CSS=`
/* Professional legal diary — unified 7-column month grid */
#page-diary{overflow-x:hidden!important}
#page-diary .calendar-card,#page-diary .cal-card{overflow:hidden!important;max-width:100%!important}
#page-diary .cal-grid{display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr))!important;gap:0!important;width:100%!important;min-width:0!important;border:1px solid #ddd5c9!important;border-radius:14px!important;overflow:hidden!important;background:#fff!important}
#page-diary .cal-dow{min-width:0!important;padding:10px 8px!important;background:#f7f4ef!important;border-right:1px solid #e7e0d6!important;border-bottom:1px solid #ddd5c9!important;text-align:left!important;font-size:11px!important;font-weight:800!important;color:#667085!important;text-transform:uppercase!important;letter-spacing:.04em!important}
#page-diary .cal-dow:nth-child(7){border-right:0!important}
#page-diary .cal-cell{box-sizing:border-box!important;min-width:0!important;width:auto!important;height:126px!important;min-height:126px!important;margin:0!important;border:0!important;border-right:1px solid #e7e0d6!important;border-bottom:1px solid #e7e0d6!important;border-radius:0!important;padding:8px!important;background:#fff!important;overflow:hidden!important;position:relative!important}
#page-diary .cal-cell:nth-child(7n){border-right:0!important}
#page-diary .cal-cell:hover{background:#fbfaf8!important}
#page-diary .cal-cell.today{background:#f5f8fc!important;box-shadow:inset 0 0 0 2px #17395f!important}
#page-diary .cal-cell.other-month{background:#faf9f7!important;color:#a8a29a!important}
#page-diary .cal-cell:nth-child(7n+1),#page-diary .cal-cell:nth-child(7n){background-color:#fcfbf9!important}
#page-diary .cal-day,#page-diary .cal-date,#page-diary .day-num{font-size:13px!important;font-weight:800!important;color:#102a4c!important;margin:0 0 6px!important;line-height:22px!important;width:24px!important;height:24px!important;text-align:center!important;border-radius:50%!important}
#page-diary .cal-cell.today .cal-day,#page-diary .cal-cell.today .cal-date,#page-diary .cal-cell.today .day-num{background:#102a4c!important;color:#fff!important}
#page-diary .cal-event{display:block!important;box-sizing:border-box!important;width:100%!important;max-width:100%!important;min-width:0!important;margin:3px 0!important;padding:4px 6px!important;border-radius:5px!important;font-size:10.5px!important;line-height:1.25!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;border-left:3px solid currentColor!important}
#page-diary .cal-more{display:block!important;margin-top:4px!important;padding:3px 6px!important;background:#f0ede7!important;border-radius:5px!important;font-size:10px!important;font-weight:700!important;color:#667085!important;cursor:pointer!important}
#page-diary .cal-legend{margin-top:12px!important;padding-top:10px!important;border-top:1px solid #e7e0d6!important;font-size:11px!important}
@media(max-width:1050px){#page-diary .cal-cell{height:112px!important;min-height:112px!important;padding:6px!important}#page-diary .cal-event{font-size:9.5px!important}}
`;
function installStyle(){if(document.getElementById('molmsCalendarProfessionalStyle'))return;const s=document.createElement('style');s.id='molmsCalendarProfessionalStyle';s.textContent=CSS;document.head.appendChild(s)}
function normalize(){const page=document.getElementById('page-diary');if(!page)return;const grids=[...page.querySelectorAll('.cal-grid')];grids.forEach(g=>{g.style.gridTemplateColumns='repeat(7,minmax(0,1fr))';g.style.width='100%';g.style.minWidth='0'});page.querySelectorAll('.cal-cell').forEach(c=>{c.style.minWidth='0';c.style.width='auto'});}
function patchRender(){if(typeof renderCalendar!=='function'||renderCalendar.__professionalV1)return;const base=renderCalendar;renderCalendar=function(){const r=base.apply(this,arguments);requestAnimationFrame(normalize);return r};renderCalendar.__professionalV1=true}
function boot(){installStyle();patchRender();normalize();let n=0,t=setInterval(()=>{installStyle();patchRender();normalize();if(++n>40)clearInterval(t)},250);window.addEventListener('resize',normalize)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();