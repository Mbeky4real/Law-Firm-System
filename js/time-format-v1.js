/* MOLMS-TIME-FORMAT-V1 */
(function(){
'use strict';
const nativeLocaleString=Date.prototype.toLocaleString;
const nativeLocaleTimeString=Date.prototype.toLocaleTimeString;
function normalizeLocale(locale){return !locale||locale==='default'?'en-GB':locale;}
function with24(options){const o=options?{...options}:{};o.hour12=false;o.hourCycle='h23';return o;}
Date.prototype.toLocaleString=function(locale,options){return nativeLocaleString.call(this,normalizeLocale(locale),with24(options));};
Date.prototype.toLocaleTimeString=function(locale,options){return nativeLocaleTimeString.call(this,normalizeLocale(locale),with24(options));};
window.molmsFormatTime24=function(value){if(!value)return'';const d=value instanceof Date?value:new Date(value);if(Number.isNaN(d.getTime()))return String(value);return nativeLocaleTimeString.call(d,'en-GB',{hour:'2-digit',minute:'2-digit',hour12:false,hourCycle:'h23'});};
window.molmsFormatDateTime24=function(value){if(!value)return'';const d=value instanceof Date?value:new Date(value);if(Number.isNaN(d.getTime()))return String(value);return nativeLocaleString.call(d,'en-GB',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false,hourCycle:'h23'});};
function installSidebarClock(){
  try{
    if(typeof clockInterval!=='undefined'&&clockInterval!==null){clearInterval(clockInterval);clockInterval=null;}
    if(typeof updateSidebarClock==='function'){
      updateSidebarClock=function(){
        const now=new Date();
        try{
          if(typeof businessToday==='function'&&typeof _lastKnownBusinessDate!=='undefined'){
            const bd=businessToday();
            if(_lastKnownBusinessDate===null)_lastKnownBusinessDate=bd;
            else if(bd!==_lastKnownBusinessDate){_lastKnownBusinessDate=bd;if(typeof page!=='undefined'&&page==='dashboard'){if(typeof renderFirmSnapshotWidget==='function')renderFirmSnapshotWidget();if(typeof renderUpcomingWidget==='function')renderUpcomingWidget();}}
          }
        }catch(e){}
        const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
        const dateStr=days[now.getDay()]+', '+now.getDate()+' '+months[now.getMonth()]+' '+now.getFullYear();
        const h=String(now.getHours()).padStart(2,'0'),m=String(now.getMinutes()).padStart(2,'0');
        const de=document.getElementById('sidebarDate'),te=document.getElementById('sidebarTime');
        if(de)de.textContent=dateStr;if(te)te.textContent=h+':'+m;
      };
      updateSidebarClock();
      if(typeof clockInterval!=='undefined')clockInterval=setInterval(updateSidebarClock,1000);
    }
  }catch(e){console.warn('[MOLMS] 24-hour sidebar clock patch failed',e);}
}
function installEventTime(){
  try{if(typeof fmtEventTime12h==='function'){fmtEventTime12h=function(t){if(!t)return null;const p=String(t).split(':');return String(p[0]||'00').padStart(2,'0')+':'+String(p[1]||'00').padStart(2,'0');};}}catch(e){}
}
function refreshCurrentView(){
  try{if(typeof renderChat==='function'&&typeof page!=='undefined'&&page==='chat')renderChat();}catch(e){}
  try{if(typeof renderUpcomingWidget==='function'&&typeof page!=='undefined'&&page==='dashboard')renderUpcomingWidget();}catch(e){}
}
function boot(){installSidebarClock();installEventTime();refreshCurrentView();setTimeout(()=>{installSidebarClock();installEventTime();refreshCurrentView();},500);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();