/* MOLMS permanent deletion controls — Admin only, v2 */
(function () {
  'use strict';

  let installed = false;
  let busy = false;
  let decorateTimer = null;

  function client() {
    return window.supabaseClient || window.sb || window.supabase || null;
  }

  async function currentAdmin() {
    const s = client();
    if (!s || !s.auth) return false;

    const { data: { user } } = await s.auth.getUser();
    if (!user) return false;

    const { data } = await s.from('roles')
      .select('role,active')
      .eq('user_id', user.id)
      .maybeSingle();

    return !!data && data.active === true && String(data.role || '').toLowerCase() === 'admin';
  }

  function addButton(container, type, id, name) {
    if (!container || !id) return;
    if (container.querySelector('[data-molms-permanent-delete="' + type + '"]')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.molmsPermanentDelete = type;
    button.dataset.targetId = id;
    button.dataset.targetName = name || '';
    button.textContent = 'Permanently Delete';
    button.setAttribute('aria-label', 'Permanently delete ' + (name || type));
    button.style.cssText =
      'margin-left:8px;padding:6px 10px;border:1px solid #b42318;border-radius:6px;' +
      'background:#fff;color:#b42318;font-size:12px;font-weight:600;cursor:pointer;';

    container.appendChild(button);
  }

  function bestRowForText(text) {
    const candidates = [...document.querySelectorAll(
      'tr, li, .item, .card, .member-card, .employee-card, [role="listitem"]'
    )]
      .filter(node => (node.textContent || '').includes(text))
      .filter(node => {
        const value = node.textContent || '';
        return value.length > text.length && value.length < 2500;
      })
      .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length);

    return candidates[0] || null;
  }

  async function decorateMembers() {
    const s = client();
    if (!s || !(await currentAdmin())) return;

    const { data, error } = await s.from('roles')
      .select('user_id,full_name,email,active')
      .eq('active', false);

    if (error || !data) return;

    data.forEach(member => {
      const target = member.email || member.full_name;
      if (!target) return;

      const row = bestRowForText(target);
      if (!row) return;

      const rowText = row.textContent || '';
      if (!/\binactive\b|\bdeactivated\b/i.test(rowText)) return;

      addButton(row, 'member', member.user_id, member.full_name || member.email);
    });
  }

  async function decorateEmployees() {
    const s = client();
    if (!s || !(await currentAdmin())) return;

    const { data, error } = await s.from('hr_employees')
      .select('id,full_name,status,deleted_at');

    if (error || !data) return;

    data
      .filter(employee =>
        employee.deleted_at ||
        String(employee.status || '').toLowerCase() !== 'active'
      )
      .forEach(employee => {
        if (!employee.full_name) return;

        const row = bestRowForText(employee.full_name);
        if (!row) return;

        addButton(row, 'employee', employee.id, employee.full_name);
      });
  }

  async function confirmPermanentDeletion(type, name) {
    const noun = type === 'member' ? 'member' : 'employee';
    const subject = name || ('this ' + noun);

    const first = window.confirm(
      'PERMANENT DELETION\\n\\n' +
      'You are about to permanently delete ' + subject + '.\\n\\n' +
      'This cannot be undone. Continue?'
    );
    if (!first) return false;

    const typed = window.prompt(
      'Final confirmation\\n\\n' +
      'Type DELETE to permanently remove ' + subject + '.'
    );

    return typed === 'DELETE';
  }

  async function handle(event) {
    const button = event.target.closest('[data-molms-permanent-delete]');
    if (!button || busy) return;

    const type = button.dataset.molmsPermanentDelete;
    const id = button.dataset.targetId;
    const name = button.dataset.targetName || 'this record';

    if (!(await confirmPermanentDeletion(type, name))) {
      return;
    }

    busy = true;
    button.disabled = true;
    button.textContent = 'Deleting…';

    try {
      const s = client();
      if (!s) throw new Error('Supabase connection is unavailable.');

      const functionName =
        type === 'member'
          ? 'admin_delete_inactive_member'
          : 'admin_delete_inactive_employee';

      const payload =
        type === 'member'
          ? { p_user_id: id }
          : { p_employee_id: id };

      const { error } = await s.rpc(functionName, payload);
      if (error) throw error;

      window.alert(
        (type === 'member' ? 'Member' : 'Employee') +
        ' permanently deleted.'
      );

      window.location.reload();
    } catch (error) {
      console.error('MOLMS permanent deletion failed:', error);
      window.alert(error?.message || 'Permanent deletion failed.');
      busy = false;
      button.disabled = false;
      button.textContent = 'Permanently Delete';
    }
  }

  function scheduleDecorate() {
    clearTimeout(decorateTimer);
    decorateTimer = setTimeout(() => {
      decorateMembers();
      decorateEmployees();
    }, 300);
  }

  function install() {
    if (installed) return;
    installed = true;

    document.addEventListener('click', handle);

    const observer = new MutationObserver(scheduleDecorate);
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(scheduleDecorate, 800);
  }

  install();
})();
