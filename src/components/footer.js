export function initFooter() {
  const mount = document.querySelector('[data-component="footer"]');
  if (!mount) {
    return;
  }

  mount.innerHTML = `
    <footer class="site-footer">
      <div class="container site-footer__grid">
        <div class="site-footer__brand">
          <strong>imgprivado</strong>
          <p>Herramientas de imagen privadas, gratis y sin registro.</p>
        </div>
        <nav aria-label="Herramientas">
          <h2>Herramientas</h2>
          <a href="/comprimir-imagen/">Comprimir imagen</a>
          <a href="/redimensionar-imagen/">Redimensionar imagen</a>
          <a href="/recortar-imagen/">Recortar imagen</a>
          <a href="/convertir-imagen/">Convertir imagen</a>
          <a href="/quitar-metadatos/">Quitar metadatos</a>
          <a href="/rotar-imagen/">Rotar imagen</a>
        </nav>
        <nav aria-label="Legal">
          <h2>Legal</h2>
          <a href="/privacidad/">Privacidad</a>
          <a href="/cookies/">Cookies</a>
          <a href="/terminos/">Términos</a>
        </nav>
        <nav aria-label="Sobre nosotros">
          <h2>Sobre nosotros</h2>
          <a href="/sobre-nosotros/">Sobre imgprivado</a>
          <a href="/como-funciona/">Cómo funciona</a>
          <a href="/faq/">FAQ</a>
          <a href="/contacto/">Contacto</a>
        </nav>
      </div>
      <div class="container site-footer__bottom">
        <span>© ${new Date().getFullYear()} imgprivado</span>
        <span>Procesamiento 100% client-side</span>
      </div>
    </footer>
  `;
}
