/* Theme switch: follows the system setting until the reader picks one, then remembers it. */
window.SiteTheme = (() => {
  const KEY = 'assassinlike.theme';
  const query = window.matchMedia?.('(prefers-color-scheme: light)');
  let choice = null;

  function stored() {
    try {
      const value = localStorage.getItem(KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch { return null; }
  }

  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#fbfaf7' : '#0d1020');
    const button = document.getElementById('theme-toggle');
    if (button) {
      // The label names the theme the click switches to, like the language toggle does.
      const target = theme === 'light' ? '深色' : '浅色';
      const english = target === '深色' ? 'Dark' : 'Light';
      button.setAttribute('data-language-label-zh', target);
      button.setAttribute('data-language-label-en', english);
      button.textContent = document.documentElement.lang === 'en' ? english : target;
      button.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    }
    document.dispatchEvent(new CustomEvent('site-theme-change', { detail: { theme } }));
  }

  function current() {
    return choice || (query?.matches ? 'light' : 'dark');
  }

  function toggle() {
    choice = current() === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(KEY, choice); } catch { /* The choice still applies to this page. */ }
    apply(choice);
  }

  function init() {
    choice = stored();
    const actions = document.querySelector('.topbar-actions');
    if (actions && !document.getElementById('theme-toggle')) {
      const button = document.createElement('button');
      button.id = 'theme-toggle';
      button.type = 'button';
      button.className = 'icon-link theme-toggle';
      button.addEventListener('click', toggle);
      actions.prepend(button);
    }
    apply(current());
    query?.addEventListener?.('change', () => { if (!choice) apply(current()); });
  }

  // Set the attribute before first paint so the page never flashes the wrong background.
  choice = stored();
  document.documentElement.dataset.theme = choice || (query?.matches ? 'light' : 'dark');

  return { init, toggle, current };
})();
