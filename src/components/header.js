import { initThemeToggle } from './theme-toggle.js';

function mascotMarkup() {
  return `
    <span class="brand-mascot" aria-hidden="true">
      <span class="brand-mascot__sun"></span>
      <span class="brand-mascot__mountain"></span>
      <span class="brand-mascot__eye brand-mascot__eye--left"></span>
      <span class="brand-mascot__eye brand-mascot__eye--right"></span>
      <span class="brand-mascot__smile"></span>
    </span>
  `;
}

export function initHeader() {
  const mount = document.querySelector('[data-component="header"]');
  if (!mount) {
    return;
  }

  mount.innerHTML = `
    <header class="site-header">
      <div class="container site-header__inner">
        <a class="brand" href="/" aria-label="imgprivado inicio">
          ${mascotMarkup()}
          <span>imgprivado</span>
        </a>
        <nav class="site-nav" aria-label="Principal">
          <a href="/comprimir-imagen/">Comprimir imagen</a>
          <a href="/redimensionar-imagen/">Redimensionar</a>
          <a href="/blog/">Blog</a>
        </nav>
        <div data-theme-toggle></div>
      </div>
    </header>
  `;

  initThemeToggle(mount);
}
