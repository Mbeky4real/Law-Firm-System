/* MOLMS Notifications Realtime V1
 * Subscribes only to INSERT events for the authenticated user's own notifications.
 * The notifications SELECT RLS policy remains the authorization boundary.
 */
(function () {
  'use strict';
  if (window.__molmsNotificationsRealtimeV1) return;
  window.__molmsNotificationsRealtimeV1 = true;

  let channel = null;
  let activeUserId = null;
  let client = null;
  let authSubscription = null;
  const seen = new Set();

  function getClient() {
    try { if (typeof sb !== 'undefined' && sb) return sb; } catch (_) {}
    return window.supabaseClient || window.sb || null;
  }

  function showToast(row) {
    const host = document.getElementById('molmsRealtimeNotificationHost') || (function () {
      const el = document.createElement('div');
      el.id = 'molmsRealtimeNotificationHost';
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('aria-atomic', 'false');
      el.style.cssText = 'position:fixed;z-index:2147483000;right:18px;top:18px;width:min(360px,calc(100vw - 36px));display:flex;flex-direction:column;gap:8px;pointer-events:none';
      document.body.appendChild(el);
      return el;
    })();

    const card = document.createElement('div');
    card.style.cssText = 'pointer-events:auto;background:#fff;border:1px solid #e5dfd5;border-left:4px solid #8b6b3f;border-radius:10px;padding:12px 14px;box-shadow:0 8px 28px rgba(0,0,0,.14);color:#28231e;font:13px/1.45 Arial,sans-serif';
    const title = document.createElement('div');
    title.style.cssText = 'font-weight:700;margin-bottom:4px';
    title.textContent = String(row.title || 'New notification');
    const message = document.createElement('div');
    message.style.cssText = 'color:#625b53;overflow-wrap:anywhere';
    message.textContent = String(row.message || '');
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Dismiss';
    close.style.cssText = 'margin-top:8px;border:0;background:transparent;color:#765b38;padding:2px 0;cursor:pointer;font:inherit';
    close.addEventListener('click', () => card.remove());
    card.append(title, message, close);
    host.appendChild(card);
    while (host.children.length > 4) host.firstElementChild.remove();
    window.setTimeout(() => { if (card.isConnected) card.remove(); }, 7000);
  }

  async function stop() {
    if (channel && client) {
      const old = channel;
      channel = null;
      try { await client.removeChannel(old); } catch (e) { console.warn('[MOLMS notifications] channel cleanup failed', e); }
    }
    activeUserId = null;
  }

  async function start(userId) {
    if (!userId || !client) return;
    if (activeUserId === userId && channel) return;
    await stop();
    activeUserId = userId;
    channel = client
      .channel('molms-notifications-' + userId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: 'recipient_user_id=eq.' + userId
      }, (payload) => {
        const row = payload && payload.new;
        if (!row || row.recipient_user_id !== activeUserId || seen.has(row.id)) return;
        seen.add(row.id);
        window.dispatchEvent(new CustomEvent('molms:notification', { detail: row }));
        showToast(row);
      })
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[MOLMS notifications] Realtime subscription status:', status, error || '');
        }
      });
  }

  async function syncSession() {
    client = getClient();
    if (!client || !client.auth) return;
    const result = await client.auth.getUser();
    const user = result && result.data && result.data.user;
    if (user && user.id) await start(user.id);
    else await stop();
  }

  function boot() {
    client = getClient();
    if (!client || !client.auth) return false;
    syncSession().catch(e => console.warn('[MOLMS notifications] session sync failed', e));
    if (!authSubscription) {
      const result = client.auth.onAuthStateChange((event, session) => {
        const id = session && session.user && session.user.id;
        if (id) start(id).catch(e => console.warn('[MOLMS notifications] subscribe failed', e));
        else stop();
      });
      authSubscription = result && result.data && result.data.subscription;
    }
    return true;
  }

  if (!boot()) {
    let attempts = 0;
    const retry = window.setInterval(() => {
      attempts += 1;
      if (boot() || attempts >= 30) window.clearInterval(retry);
    }, 500);
  }

  window.MOLMSNotificationsRealtimeV1 = {
    refresh: syncSession,
    stop,
    getStatus: () => ({ userId: activeUserId, connected: !!channel })
  };
})();