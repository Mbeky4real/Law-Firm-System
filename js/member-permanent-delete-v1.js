/* MOLMS permanent deletion controls — Admin only */
(function () {
  'use strict';
  let installed = false;
  let busy = false;

  function client() {
    return window.supabaseClient || window.sb || window.supabase || null;
  }
  async function currentAdmin() {
    const s = client();
    if (!s || !s.auth) return false;
    const { data: { user } } = await s.auth.getUser();
    if (!user) return false;
    const { data } = await s.from('roles').select('role,active').eq('user_id', user.id).maybeSingle();
    return !!data && data.active === true && data.role === 'admin';
  }
  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function addButton(container, type, id, label) {
    if (!container || container.querySelector('[data-molms-permanent-delete="'+type+'"]')) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.molmsPermanentDelete = type;
    b.dataset.targetId = id;
    b.textContent = label;
    b.style.cssText = 'margin-left:8px;padding:5px 9px;border:1px solid #b42318;border-radius:6px;background:#fff;color:#b42318;font-size:12px;font-weight:600;cursor:pointer;';
    container.appendChild(b);
  }
  function rowsForText(text) {
    const nodes = [...document.querySelectorAll('tr, li, .item, .card, .member-card, .employee-card, [role="listitem"]')];
    return nodes.filter(n => (n.textContent || '').includes(text));
  }
  async function decorateMembers() {
    const s = client();
    if (!s || !(await currentAdmin())) return;
    const { data, error } = await s.from('roles').select('user_id,full_name,email,active').eq('active', false);
    if (error || !data) return;
    data.forEach(m => {
      const target = m.email || m.full_name;
      if (!target) return;
      rowsForText(target).forEach(row => {
        if ((row.textContent || '').includes('Inactive') || (row.textContent || '').includes('Deactivated')) {
          addButton(row, 'member', m.user_id, 'Permanently Delete');
        }
      });
    });
  }
  async function decorateEmployees() {
    const s = client();
    if (!s || !(await currentAdmin())) return;
    const { data, error } = await s.from('hr_employees').select('id,full_name,status,deleted_at').neq('status','active');
    if (error || !data) return;
    data.filter(e => e.deleted_at || String(e.status || '').toLowerCase() !== 'active').forEach(e => {
      if (!e.full_name) return;
      rowsForText(e.full_name).forEach(row => addButton(row, 'employee', e.id, 'Permanently Delete'));
    });
  }
  async function handle(e) {
    const b = e.target.closest('[data-molms-permanent-delete]');
    if (!b || busy) return;
    const type = b.dataset.molmsPermanentDelete;
    const id = b.dataset.targetId;
    const noun = type === 'member' ? 'member' : 'employee';
    const warning = type === 'member'
      ? 'This will permanently remove the inactive MOLMS member, role record, member record and authentication account. Historical application records will not be deleted. Continue?'
      : 'This will permanently delete the inactive HR employee record. Payroll/leave-linked employees are protected and cannot be deleted. Continue?';
    if (!confirm(warning)) return;
    busy = true; b.disabled = true; b.textContent = 'Deleting…';
    try {
      const s = client();
      const fn = type === 'member' ? 'admin_delete_inactive_member' : 'admin_delete_inactive_employee';
      const { error } = await s.rpc(fn, type === 'member' ? { p_user_id: id } : { p_employee_id: id });
      if (error) throw error;
      alert(noun.charAt(0).toUpperCase()+noun.slice(1)+' permanently deleted.');
      location.reload();
    } catch (err) {
      console.error(err);
      alert(err?.message || 'Permanent deletion failed.');
      busy = false; b.disabled = false; b.textContent = 'Permanently Delete';
    }
  }
  function install() {
    if (installed) return;
    installed = true;
    document.addEventListener('click', handle);
    const observer = new MutationObserver(() => {
      clearTimeout(install._t);
      install._t = setTimeout(() => { decorateMembers(); decorateEmployees(); }, 250);
    });
    observer.observe(document.body, {childList:true,subtree:true});
    setTimeout(() => { decorateMembers(); decorateEmployees(); }, 800);
  }
  install();
})();
