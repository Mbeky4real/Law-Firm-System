from pathlib import Path
p=Path('index.html');s=p.read_text();orig=s
old="function moduleUnreadCount(p){if(p==='chat')return Math.max(0,getUnreadCount());if(!NOTIFICATION_MODULES.includes(p))return 0;if(ensureNotificationBaseline(p))return 0;const seen=Date.parse(viewed[notificationSeenKey(p)]||'');if(!Number.isFinite(seen))return 0;return notificationItems(p).reduce((n,item)=>{const t=Date.parse(notificationCreatedAt(item)||'');return n+(Number.isFinite(t)&&t>seen?1:0)},0)}"
new="function moduleUnreadCount(p){if(p==='chat')return Math.max(0,getUnreadCount());if(!NOTIFICATION_MODULES.includes(p))return 0;if(ensureNotificationBaseline(p))return 0;if(page===p){viewed[notificationSeenKey(p)]=latestNotificationTime(p)||viewed[notificationSeenKey(p)]||new Date().toISOString();saveViewedState();return 0}const seen=Date.parse(viewed[notificationSeenKey(p)]||'');if(!Number.isFinite(seen))return 0;return notificationItems(p).reduce((n,item)=>{const t=Date.parse(notificationCreatedAt(item)||'');return n+(Number.isFinite(t)&&t>seen?1:0)},0)}"
assert old in s,'moduleUnreadCount anchor missing';s=s.replace(old,new,1)
old="""function getUnreadCount(){
  const lastSeen=viewed['chat_last_seen']||null;
  if(!lastSeen) return msgs.filter(m=>!m.deleted_at).length;
  return msgs.filter(m=>!m.deleted_at && m.created_at > lastSeen).length;
}"""
new="""function getUnreadCount(){
  let lastSeen=viewed['chat_last_seen']||null;
  const live=msgs.filter(m=>!m.deleted_at);
  if(!lastSeen){
    const latest=live.reduce((v,m)=>(!v||String(m.created_at||'')>String(v)?m.created_at:v),'');
    viewed['chat_last_seen']=latest||new Date().toISOString();
    saveViewedState();
    return 0;
  }
  if(page==='chat'){
    const latest=live.reduce((v,m)=>(!v||String(m.created_at||'')>String(v)?m.created_at:v),lastSeen);
    viewed['chat_last_seen']=latest||lastSeen;saveViewedState();return 0;
  }
  return live.filter(m=>m.created_at > lastSeen).length;
}"""
assert old in s,'getUnreadCount anchor missing';s=s.replace(old,new,1)
assert s!=orig
p.write_text(s)
print('notification V1b hardening applied')
