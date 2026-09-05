from pathlib import Path
p=Path('index.html')
s=p.read_text()
orig=s

old="function loadLocal(){cases=read(LS.cases);nonlits=read(LS.nonlits);diary=read(LS.diary);officeEvents=read(LS.officeEvents);docs=read(LS.docs);msgs=read(LS.msgs);members=read(LS.members);reports=read(LS.reports);viewed=readObj(LS.viewed);currentMemberId=localStorage.getItem(LS.current)||(members[0]&&members[0].id)}"
new="""function notificationStorageKey(){const uid=(authUser&&authUser.id)||currentMemberId||'local';return LS.viewed+':'+uid}
function saveViewedState(){try{localStorage.setItem(notificationStorageKey(),JSON.stringify(viewed||{}))}catch(e){console.warn('[notifications] save failed',e)}}
function loadLocal(){cases=read(LS.cases);nonlits=read(LS.nonlits);diary=read(LS.diary);officeEvents=read(LS.officeEvents);docs=read(LS.docs);msgs=read(LS.msgs);members=read(LS.members);reports=read(LS.reports);currentMemberId=localStorage.getItem(LS.current)||(members[0]&&members[0].id);viewed=readObj(notificationStorageKey())}"""
assert old in s,'loadLocal anchor missing'
s=s.replace(old,new,1)

old="if(p==='chat'&&msgs.length){ viewed['chat_last_seen']=msgs[msgs.length-1].created_at; writeObj(LS.viewed,viewed); } page=p;viewed[p]=countFor(p);writeObj(LS.viewed,viewed);"
new="page=p;if(p!=='dashboard')markModuleSeen(p);"
assert old in s,'go notification anchor missing'
s=s.replace(old,new,1)

old="""function countFor(p){let map={dashboard:cases.length+nonlits.length+reports.length+officeEvents.length+docs.length+msgs.length,cause:cases.length,nonlit:nonlits.length,reports:reports.length,diary:officeEvents.length,documents:docs.length,chat:msgs.length,members:members.length};return map[p]||0}
function badgeVal(p){if(p==='chat') return Math.max(0,getUnreadCount());return Math.max(0,countFor(p)-(viewed[p]||0))}
function setBadge(id,v){let e=$(id);if(e){e.textContent=v;e.style.display=v>0?'flex':'none'}}
function badges(){['dashboard','cause','nonlit','reports','diary','documents','chat','members'].forEach(p=>{let key={dashboard:'Dash',cause:'Cause',nonlit:'NonLit',reports:'Reports',diary:'Diary',documents:'Docs',chat:'Chat',members:'Members'}[p];let v=badgeVal(p);setBadge('bb'+key,v);setBadge('sb'+key,v)});$('sMembers')&&($('sMembers').textContent=members.length)}"""
new="""function countFor(p){let map={dashboard:cases.length+nonlits.length+reports.length+officeEvents.length+docs.length+msgs.length,cause:cases.length,nonlit:nonlits.length,reports:reports.length,diary:officeEvents.length,documents:docs.length,chat:msgs.length,members:members.length};return map[p]||0}
const NOTIFICATION_MODULES=['cause','nonlit','reports','diary','documents','members'];
function notificationItems(p){const map={cause:cases,nonlit:nonlits,reports:reports,diary:officeEvents,documents:docs,members:members};return Array.isArray(map[p])?map[p]:[]}
function notificationCreatedAt(item){return item&&(item.created_at||item.createdAt||item.inserted_at)||null}
function latestNotificationTime(p){let latest='';notificationItems(p).forEach(item=>{const t=notificationCreatedAt(item);if(t&&(!latest||new Date(t)>new Date(latest)))latest=t});return latest}
function notificationSeenKey(p){return p+'_last_seen_at'}
function ensureNotificationBaseline(p){const key=notificationSeenKey(p);if(viewed[key])return false;viewed[key]=latestNotificationTime(p)||new Date().toISOString();saveViewedState();return true}
function moduleUnreadCount(p){if(p==='chat')return Math.max(0,getUnreadCount());if(!NOTIFICATION_MODULES.includes(p))return 0;if(ensureNotificationBaseline(p))return 0;const seen=Date.parse(viewed[notificationSeenKey(p)]||'');if(!Number.isFinite(seen))return 0;return notificationItems(p).reduce((n,item)=>{const t=Date.parse(notificationCreatedAt(item)||'');return n+(Number.isFinite(t)&&t>seen?1:0)},0)}
function markModuleSeen(p){if(p==='chat'){if(msgs.length)viewed['chat_last_seen']=msgs[msgs.length-1].created_at||new Date().toISOString();else viewed['chat_last_seen']=new Date().toISOString();saveViewedState();return}if(!NOTIFICATION_MODULES.includes(p))return;viewed[notificationSeenKey(p)]=latestNotificationTime(p)||new Date().toISOString();saveViewedState()}
function badgeVal(p){if(p==='dashboard')return NOTIFICATION_MODULES.reduce((n,m)=>n+moduleUnreadCount(m),0)+moduleUnreadCount('chat');return moduleUnreadCount(p)}
function setBadge(id,v){let e=$(id);if(e){e.textContent=v;e.style.display=v>0?'flex':'none'}}
function badges(){['dashboard','cause','nonlit','reports','diary','documents','chat','members'].forEach(p=>{let key={dashboard:'Dash',cause:'Cause',nonlit:'NonLit',reports:'Reports',diary:'Diary',documents:'Docs',chat:'Chat',members:'Members'}[p];let v=badgeVal(p);setBadge('bb'+key,v);setBadge('sb'+key,v)});$('sMembers')&&($('sMembers').textContent=members.length)}"""
assert old in s,'badge engine anchor missing'
s=s.replace(old,new,1)

# All existing chat watermark writes must use the authenticated user's scoped state.
s=s.replace('writeObj(LS.viewed,viewed)','saveViewedState()')

assert 'countFor(p)-(viewed[p]||0)' not in s
assert "LS.viewed+':'+uid" in s
assert "NOTIFICATION_MODULES=['cause','nonlit','reports','diary','documents','members']" in s
assert "if(p==='dashboard')return NOTIFICATION_MODULES.reduce" in s
assert s!=orig
p.write_text(s)
print('notification watermark patch applied')
