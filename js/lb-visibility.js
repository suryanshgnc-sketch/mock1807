/* MDCCCVII — admin-controlled leaderboard visibility.
   Fail-open: if the setting cannot be read, the leaderboard stays visible. */
(() => {
  'use strict';
  const KEY = 'md_lb_visible';
  const root = document.documentElement;
  const apply = (visible) => {
    root.classList.toggle('lb-off', visible === false);
    try { localStorage.setItem(KEY, visible === false ? '0' : '1'); } catch (e) {}
    window.dispatchEvent(new CustomEvent('md:lb-visibility', { detail: { visible } }));
  };
  async function check() {
    const sb = window.mock1807Auth && window.mock1807Auth.client;
    if (!sb) return setTimeout(check, 400);
    try {
      const { data, error } = await sb.rpc('get_leaderboard_visibility');
      if (error) return;               // setting not installed yet -> keep current state
      apply(data !== false);
    } catch (e) {}
  }
  check();
  setInterval(() => { if (!document.hidden) check(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
})();
