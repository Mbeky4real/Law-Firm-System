(function(){
  'use strict';
  if (window.__MOLMS_AUTH_IDENTITY_GUARD_V1__) return;
  window.__MOLMS_AUTH_IDENTITY_GUARD_V1__ = true;

  let authoritativePosition = '';
  let authoritativeRole = '';
  let identityError = '';
  let loginInProgress = false;
  let identitySyncInProgress = false;
  let authSubscription = null;

  const roleMap = {
    partner: 'partner',
    admin: 'partner',
    office_admin: 'office_admin',
    hr_officer: 'hr_officer',
    office_manager: 'office_manager'
  };

  function setIdentityError(message) {
    identityError = message || 'Your account permissions could not be verified.';
    window.__MOLMS_AUTH_IDENTITY_ERROR__ = identityError;
    window.setTimeout(function(){
      const node = document.getElementById('loginMsg');
      if (node) node.innerHTML = '<div class="notice err">' +
        (typeof esc === 'function' ? esc(identityError) : identityError) +
        ' Please contact an administrator. No access has been granted.</div>';
    }, 0);
  }

  function clearIdentityState() {
    try {
      if (typeof sessionRevalidateInterval !== 'undefined' && sessionRevalidateInterval !== null) {
        clearInterval(sessionRevalidateInterval);
        sessionRevalidateInterval = null;
      }
    } catch (_) {}
    try {
      ['unsubscribeFromReports','unsubscribeDocuments','unsubscribeCases',
       'unsubscribeNonLitigations','unsubscribeOfficeEvents'].forEach(function(name){
        if (typeof window[name] === 'function') {
          try { window[name](); } catch (_) {}
        }
      });
    } catch (_) {}
    try {
      if (typeof chatChannel !== 'undefined' && chatChannel) {
        chatChannel.unsubscribe();
        chatChannel = null;
      }
    } catch (_) {}
    try {
      if (typeof resetCoreDataState === 'function') resetCoreDataState();
    } catch (_) {}
    try {
      authUser = null;
      authRole = null;
      authFullName = null;
      currentMemberId = null;
      roomId = null;
    } catch (_) {}
    authoritativePosition = '';
    authoritativeRole = '';
    const selector = document.getElementById('currentUser');
    if (selector) selector.style.display = 'none';
    if (typeof showLogin === 'function') showLogin();
  }

  async function strictLoadAuthRole() {
    if (typeof sb === 'undefined' || !sb || typeof authUser === 'undefined' || !authUser) {
      authRole = null;
      authFullName = null;
      authoritativePosition = '';
      authoritativeRole = '';
      return false;
    }

    const userAtStart = authUser.id;
    const result = await sb.from('roles')
      .select('user_id,full_name,email,role,position,active')
      .eq('user_id', userAtStart)
      .maybeSingle();

    // Do not fall back to a locally selected member, local profile, or the
    // legacy members table. The roles row is the authoritative access record.
    if (result.error || !result.data || result.data.user_id !== userAtStart) {
      authRole = 'deactivated';
      authFullName = null;
      authoritativePosition = '';
      authoritativeRole = '';
      setIdentityError(result.error
        ? 'We could not verify your MOLMS access record (' + result.error.message + ').'
        : 'No MOLMS access record is linked to this signed-in account.');
      return false;
    }

    const row = result.data;
    if (row.active === false) {
      authRole = 'deactivated';
      authFullName = row.full_name || row.email || authUser.email;
      authoritativePosition = row.position || '';
      authoritativeRole = String(row.role || '').toLowerCase().trim();
      setIdentityError('This MOLMS account is inactive.');
      return false;
    }

    const rawRole = String(row.role || '').toLowerCase().trim();
    authRole = roleMap[rawRole] || 'staff';
    authoritativeRole = rawRole;
    authFullName = row.full_name || row.email || authUser.email;
    authoritativePosition = row.position || (
      authRole === 'partner' ? 'Partner / Admin' :
      authRole === 'office_admin' ? 'Office Admin (HR + Office Manager)' :
      authRole === 'hr_officer' ? 'HR Officer' :
      authRole === 'office_manager' ? 'Office Manager' : 'Staff'
    );
    identityError = '';
    window.__MOLMS_AUTH_IDENTITY_ERROR__ = '';
    try {
      if (typeof currentMemberId !== 'undefined') currentMemberId = authUser.id;
    } catch (_) {}
    return true;
  }

  const originalMe = window.me;
  window.me = function(){
    if (typeof authUser !== 'undefined' && authUser) {
      return {
        id: authUser.id,
        name: authFullName || authUser.email || 'User',
        role: authRole === 'partner' ? 'partner' : 'ordinary',
        position: authoritativePosition || 'Staff'
      };
    }
    return typeof originalMe === 'function'
      ? originalMe.apply(this, arguments)
      : {name:'User',role:'ordinary',position:'Staff'};
  };

  window.renderTopbarProfile = function(){
    const signedIn = typeof authUser !== 'undefined' && !!authUser;
    const name = signedIn ? (authFullName || authUser.email || 'User') :
      (typeof originalMe === 'function' ? (originalMe().name || 'User') : 'User');
    const position = signedIn ? (authoritativePosition || 'Staff') :
      (typeof originalMe === 'function' ? (originalMe().position || 'Staff') : 'Staff');
    const avatar = document.getElementById('topbarAvatar');
    if (avatar) {
      const palette = ['#2563EB','#16A34A','#7C3AED','#0891B2','#DC2626','#D97706','#BE185D','#059669'];
      const index = name.split('').reduce((sum,ch)=>sum+ch.charCodeAt(0),0) % palette.length;
      const parts = name.trim().split(/\s+/);
      const initials = ((parts[0] || 'U')[0] + (parts.length > 1 ? parts[parts.length-1][0] : '')).toUpperCase();
      avatar.style.background = palette[index];
      avatar.textContent = initials;
    }
    const nameNode = document.getElementById('topbarName');
    const roleNode = document.getElementById('topbarRole');
    if (nameNode) nameNode.textContent = name;
    if (roleNode) roleNode.textContent = position;
    const memberButton = document.getElementById('dropMembersBtn');
    if (memberButton) memberButton.style.display =
      signedIn && (authRole === 'partner' || authRole === 'admin') ? 'flex' : 'none';
    const selector = document.getElementById('currentUser');
    if (selector) {
      selector.style.display = signedIn ? 'none' : '';
      if (signedIn) selector.value = authUser.id;
    }
  };

  const originalPopulate = window.populateAllSelects;
  if (typeof originalPopulate === 'function') {
    window.populateAllSelects = function(){
      const result = originalPopulate.apply(this, arguments);
      const selector = document.getElementById('currentUser');
      if (selector && typeof authUser !== 'undefined' && authUser) {
        selector.value = authUser.id;
        selector.style.display = 'none';
      }
      if (typeof window.renderTopbarProfile === 'function') window.renderTopbarProfile();
      return result;
    };
  }

  window.switchUser = function(){
    if (typeof authUser !== 'undefined' && authUser) {
      currentMemberId = authUser.id;
      const selector = document.getElementById('currentUser');
      if (selector) { selector.value = authUser.id; selector.style.display = 'none'; }
      if (typeof window.renderTopbarProfile === 'function') window.renderTopbarProfile();
      if (typeof notice === 'function') notice('Your signed-in identity is controlled by your MOLMS login. Sign out to use another account.','note');
      return;
    }
    if (typeof currentUser !== 'undefined' && currentUser) currentMemberId = currentUser.value;
  };

  window.loadAuthRole = strictLoadAuthRole;

  const originalLoadLocal = window.loadLocal;
  if (typeof originalLoadLocal === 'function') {
    window.loadLocal = function(){
      const result = originalLoadLocal.apply(this, arguments);
      if (typeof authUser !== 'undefined' && authUser) currentMemberId = authUser.id;
      return result;
    };
  }

  const originalLoadMembers = window.loadMembers;
  if (typeof originalLoadMembers === 'function') {
    window.loadMembers = async function(){
      const result = await originalLoadMembers.apply(this, arguments);
      if (typeof authUser !== 'undefined' && authUser) currentMemberId = authUser.id;
      if (typeof window.renderTopbarProfile === 'function') window.renderTopbarProfile();
      return result;
    };
  }

  const originalLogin = window.login;
  if (typeof originalLogin === 'function') {
    window.login = async function(){
      loginInProgress = true;
      try { return await originalLogin.apply(this, arguments); }
      finally { loginInProgress = false; }
    };
  }

  async function syncChangedSession(session) {
    if (identitySyncInProgress || loginInProgress || !session || !session.user) return;
    const incomingId = session.user.id;
    const currentId = typeof authUser !== 'undefined' && authUser ? authUser.id : null;

    if (incomingId === currentId) {
      authUser = session.user;
      const valid = await strictLoadAuthRole();
      if (!valid) {
        if (typeof sb !== 'undefined' && sb) await sb.auth.signOut();
        clearIdentityState();
        return;
      }
      if (typeof window.renderTopbarProfile === 'function') window.renderTopbarProfile();
      return;
    }

    identitySyncInProgress = true;
    try {
      clearIdentityState();
      authUser = session.user;
      const valid = await strictLoadAuthRole();
      if (!valid) {
        if (typeof sb !== 'undefined' && sb) await sb.auth.signOut();
        clearIdentityState();
        return;
      }
      if (typeof showApp === 'function') showApp();
      if (typeof startSidebarClock === 'function') startSidebarClock();
      if (typeof startSessionRevalidation === 'function') startSessionRevalidation();
      if (typeof seedMembers === 'function') seedMembers();
      if (typeof loadLocal === 'function') loadLocal();
      if (typeof loadMembers === 'function') await loadMembers();
      if (typeof reload === 'function') await reload();
      if (typeof populateAllSelects === 'function') populateAllSelects();
      ['subscribeToReports','subscribeDocuments','subscribeCases',
       'subscribeNonLitigations','subscribeOfficeEvents'].forEach(function(name){
        if (typeof window[name] === 'function') window[name]();
      });
      if (typeof go === 'function') go('dashboard');
      if (typeof window.renderTopbarProfile === 'function') window.renderTopbarProfile();
    } catch (error) {
      console.error('[MOLMS identity guard] Session transition failed:', error);
      setIdentityError('The account changed, but MOLMS could not reload its authorised data.');
      clearIdentityState();
    } finally {
      identitySyncInProgress = false;
    }
  }

  function attachAuthListener() {
    if (typeof sb === 'undefined' || !sb || !sb.auth || authSubscription) return;
    const registration = sb.auth.onAuthStateChange(function(event, session){
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        window.setTimeout(clearIdentityState, 0);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        // Let the existing login/init promise finish first. This avoids
        // racing a second reload against the normal sign-in sequence.
        window.setTimeout(function(){ syncChangedSession(session); }, 0);
      }
    });
    authSubscription = registration && registration.data && registration.data.subscription
      ? registration.data.subscription : true;
  }

  async function install() {
    attachAuthListener();
    if (typeof sb !== 'undefined' && sb && typeof authUser !== 'undefined' && authUser) {
      const valid = await strictLoadAuthRole();
      if (!valid) {
        if (sb.auth) await sb.auth.signOut();
        clearIdentityState();
        return;
      }
      if (typeof window.renderTopbarProfile === 'function') window.renderTopbarProfile();
      const selector = document.getElementById('currentUser');
      if (selector) { selector.value = authUser.id; selector.style.display = 'none'; }
    }
  }

  install().catch(function(error){
    console.error('[MOLMS identity guard] Installation failed:', error);
    setIdentityError('MOLMS could not verify your account identity.');
  });
})();
