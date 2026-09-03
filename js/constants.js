// Centralized app constants/configuration

window.LS = window.LS || {
  cases: 'molms_cases_v8',
  nonlits: 'molms_nonlits_v8',
  diary: 'molms_diary_v8',
  docs: 'molms_docs_v8',
  msgs: 'molms_msgs_v8',
  members: 'molms_members_v8',
  reports: 'molms_reports_v8',
  current: 'molms_current_member_v8',
  viewed: 'molms_viewed_badges_v8'
};

// Production bootstrap for the canonical MOLMS domain.
// The Supabase anon key is intentionally browser-safe; authorization remains
// enforced by Supabase Auth + RLS. Never place a service_role key here.
(function bootstrapProductionSupabase(){
  if (window.location.hostname !== 'admin.molaw.co.tz') return;

  const PROD_URL = 'https://myjkthjgnmzabmuwprqp.supabase.co';
  const PROD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15amt0aGpnbm16YWJtdXdwcnFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNjYwNTgsImV4cCI6MjA5MjY0MjA1OH0.eJO2oylABe71_g5FCBDGx7mnWWu5dgHr1Utr3dPOcGI';

  if (!localStorage.getItem('MOLMS_V12_SUPABASE_URL')) {
    localStorage.setItem('MOLMS_V12_SUPABASE_URL', PROD_URL);
  }
  if (!localStorage.getItem('MOLMS_V12_SUPABASE_KEY')) {
    localStorage.setItem('MOLMS_V12_SUPABASE_KEY', PROD_ANON_KEY);
  }

  // Production must never fall back to browser-local mode.
  localStorage.removeItem('MOLMS_V12_LOCAL_ONLY');
})();
