const THEME_STORAGE_KEY = 'imgprivado-theme';

const themeColorByMode = {
  light: '#00bcd4',
  dark: '#ff7a1a'
};

export function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getPreferredTheme() {
  const stored = getStoredTheme();
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme) {
  const mode = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute('content', themeColorByMode[mode]);
  }
}

export function persistTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Theme persistence is a convenience, never a blocker.
  }
}

export function initThemeToggle(root = document) {
  applyTheme(getPreferredTheme());

  const mounts = root.querySelectorAll('[data-theme-toggle]');
  mounts.forEach((mount) => {
    const button = document.createElement('button');
    button.className = 'theme-toggle';
    button.type = 'button';

    const render = () => {
      const isDark = document.documentElement.dataset.theme === 'dark';
      button.setAttribute('aria-label', isDark ? 'Activar modo claro' : 'Activar modo oscuro');
      button.innerHTML = `<span aria-hidden="true">${isDark ? '☀' : '☾'}</span>`;
    };

    button.addEventListener('click', () => {
      const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      persistTheme(nextTheme);
      render();
    });

    mount.replaceChildren(button);
    render();
  });
}
