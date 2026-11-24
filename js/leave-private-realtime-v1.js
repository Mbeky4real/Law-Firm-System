/* MOLMS Leave Request Private Realtime V1
 * Private Broadcast only. Payloads contain event name and request_id only.
 * Database RLS on realtime.messages is the authorization boundary.
 */
(function () {
  'use strict';
  if (window.__molmsLeavePrivateRealtimeV1) return;
  window.__molmsLeavePrivateRealtimeV1 = true;

  let client = null;
  let employeeChannel = null;
  let reviewerChannel = null;
  let currentUserId = null;
  let authSubscription = null;
  const seen = new Set();

  function getClient() {
    try { if (typeof sb !== 'undefined' && sb) return sb; } catch (_) {}
    return window.supabaseClient || window.sb || null;
  }

  function notify(eventName, requestId) {
    const submitted = eventName === 'leave_request_submitted';
    const detail = {
      type: 'leave_request',
      event: eventName,
      request_id: requestId || null
    };
    window.dispatchEvent(new CustomEvent('molms:leave-request-event', { detail }));
    const host = document.getElementById('molmsRealtimeNotificationHost') || (function () {
      const el = document.createElement('div');
      el.id = 'molmsRealtimeNotificationHost';
      el.setAttribute('aria-live', 'polite');
      el.style.cssText = 'position:fixed;z-index:2147483000;right:18px;top:18px;width:min(360px,calc(100vw - 36px));display:flex;flex-direction:column;gap:8px;pointer-events:none';
      document.body.appendChild(el);
      return el;
    })();
    const card = document.createElement('div');
    card.style.cssText = 'pointer-events:auto;background:#fff;border:1px solid #e5dfd5;border-left:4px solid #8b6b3f;border-radius:10px;padding:12px 14px;box-shadow:0 8px 28px rgba(0,0,0,.14);color:#28231e;font:13px/1.45 Arial,sans-serif';
    const title = document.createElement('div');
    title.style.cssText = 'font-weight:700';
    title.textContent = submitted ? 'Leave request submitted' : 'Leave request status updated';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Dismiss';
    close.style.cssText = 'margin-top:8px;border:0;background:transparent;color:#765b38;padding:2px 0;cursor:pointer;font:inherit';
    close.addEventListener('click', () => card.remove());
    card.append(title, close);
    host.appendChild(card);
    while (host.children.length > 4) host.firstElementChild.remove();
    window.setTimeout(() => { if (card.isConnected) card.remove(); }, 7000);
  }

  function handle(payload) {
    const data = payload && (payload.payload || payload);
    if (!data || !data.event || !data.request_id) return;
    const key = data.event + ':' + data.request_id;
    if (seen.has(key)) return;
    seen.add(key);
    if (seen.size > 300) seen.clear();
    notify(data.event, data.request_id);
  }

  async function remove(channel) {
    if (!channel || !client) return;
    try { await client.removeChannel(channel); } catch (e) {
      console.warn('[MOLMS leave realtime] channel cleanup failed', e);
    }
  }

  async function stop() {
    const oldEmployee = employeeChannel;
    const oldReviewer = reviewerChannel;
    employeeChannel = null;
    reviewerChannel = null;
    currentUserId = null;
    await Promise.all([remove(oldEmployee), remove(oldReviewer)]);
  }

  async function subscribeTopic(topic) {
    const channel = client.channel(topic, { config: { private: true } });
    channel
      .on('broadcast', { event: 'leave_request_submitted' }, handle)
      .on('broadcast', { event: 'leave_request_status_changed' }, handle)
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[MOLMS leave realtime] subscription status:', status, error || '');
        }
      });
    return channel;
  }

  async function syncSession() {
    client = getClient();
    if (!client || !client.auth) return;
    const result = await client.auth.getUser();
    const user = result && result.data && result.data.user;
    if (!user || !user.id) {
      await stop();
      return;
    }
    if (currentUserId === user.id && (employeeChannel || reviewerChannel)) return;
    await stop();
    currentUserId = user.id;

    try { await client.realtime.setAuth(); } catch (e) {
      console.warn('[MOLMS leave realtime] realtime auth refresh failed', e);
    }

    const roleResult = await client.from('roles')
      .select('role,active')
      .eq('user_id', user.id)
      .eq('active', true);
    const roles = roleResult && roleResult.data || [];
    const activeRoles = roles.map(row => row.role);
    const isReviewer = activeRoles.some(role =>
      ['partner', 'admin', 'hr_officer', 'office_admin'].includes(role)
    );

    const employeeResult = await client.from('hr_employees')
      .select('molms_user_id')
      .eq('molms_user_id', user.id)
      .is('deleted_at', null)
      .is('archived_at', null)
      .limit(1);
    const isEmployee = !!(employeeResult && employeeResult.data && employeeResult.data.length);

    if (isEmployee) {
      employeeChannel = await subscribeTopic('molms:leave:employee:' + user.id);
    }
    if (isReviewer) {
      reviewerChannel = await subscribeTopic('molms:leave:reviewers');
    }
  }

  function boot() {
    client = getClient();
    if (!client || !client.auth) return false;
    syncSession().catch(e => console.warn('[MOLMS leave realtime] session sync failed', e));
    if (!authSubscription) {
      const result = client.auth.onAuthStateChange((event, session) => {
        const id = session && session.user && session.user.id;
        window.setTimeout(() => {
          if (id) syncSession().catch(e => console.warn('[MOLMS leave realtime] resubscribe failed', e));
          else stop();
        }, 0);
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

  window.MOLMSLeavePrivateRealtimeV1 = {
    refresh: syncSession,
    stop,
    getStatus: () => ({
      userId: currentUserId,
      employeeConnected: !!employeeChannel,
      reviewerConnected: !!reviewerChannel
    })
  };
})();