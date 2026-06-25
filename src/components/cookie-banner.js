const CONSENT_STORAGE_KEY = 'imgprivado-cookie-consent';
const GA_MEASUREMENT_ID = '';
const ADSENSE_CLIENT_ID = '';

const defaultConsent = {
  necessary: true,
  analytics: false,
  ads: false
};

function getStoredConsent() {
  try {
    const rawConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
    return rawConsent ? JSON.parse(rawConsent) : null;
  } catch {
    return null;
  }
}

function storeConsent(consent) {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // Consent still applies in memory if storage is unavailable.
  }
}

function consentModePayload(consent) {
  return {
    analytics_storage: consent.analytics ? 'granted' : 'denied',
    ad_storage: consent.ads ? 'granted' : 'denied',
    ad_user_data: consent.ads ? 'granted' : 'denied',
    ad_personalization: consent.ads ? 'granted' : 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted'
  };
}

function ensureGtag() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };
}

function applyConsent(consent, mode = 'update') {
  ensureGtag();
  window.gtag('consent', mode, consentModePayload(consent));

  if (consent.analytics && GA_MEASUREMENT_ID && !document.querySelector('[data-ga-script]')) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.dataset.gaScript = 'true';
    document.head.append(script);
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID);
  }

  if (consent.ads && ADSENSE_CLIENT_ID && !document.querySelector('[data-adsense-script]')) {
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
    script.dataset.adsenseScript = 'true';
    document.head.append(script);
  }
}

function createModal({ onSave, onClose }) {
  const modal = document.createElement('div');
  modal.className = 'cookie-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'cookie-modal-title');
  modal.innerHTML = `
    <div class="cookie-modal__panel">
      <button class="icon-button cookie-modal__close" type="button" aria-label="Cerrar">×</button>
      <h2 id="cookie-modal-title">Preferencias de cookies</h2>
      <p>Las cookies necesarias mantienen la web funcionando. Las demás son opcionales.</p>
      <label class="consent-row consent-row--locked">
        <input type="checkbox" checked disabled />
        <span>
          <strong>Necesarias</strong>
          <small>Siempre activas</small>
        </span>
      </label>
      <label class="consent-row">
        <input id="consent-analytics" type="checkbox" />
        <span>
          <strong>Analítica</strong>
          <small>Medición agregada para mejorar la web</small>
        </span>
      </label>
      <label class="consent-row">
        <input id="consent-ads" type="checkbox" />
        <span>
          <strong>Publicidad</strong>
          <small>Anuncios y medición publicitaria de Google</small>
        </span>
      </label>
      <div class="cookie-modal__actions">
        <button class="button button--secondary" data-action="save" type="button">Guardar</button>
        <button class="button button--primary" data-action="accept-all" type="button">Aceptar todas</button>
      </div>
    </div>
  `;

  const close = () => {
    modal.remove();
    onClose?.();
  };

  modal.querySelector('.cookie-modal__close').addEventListener('click', close);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      close();
    }
  });

  modal.querySelector('[data-action="save"]').addEventListener('click', () => {
    onSave({
      necessary: true,
      analytics: modal.querySelector('#consent-analytics').checked,
      ads: modal.querySelector('#consent-ads').checked
    });
    close();
  });

  modal.querySelector('[data-action="accept-all"]').addEventListener('click', () => {
    onSave({ necessary: true, analytics: true, ads: true });
    close();
  });

  return modal;
}

export function initCookieBanner() {
  ensureGtag();
  window.gtag('consent', 'default', consentModePayload(defaultConsent));

  const storedConsent = getStoredConsent();
  if (storedConsent) {
    applyConsent({ ...defaultConsent, ...storedConsent }, 'update');
    return;
  }

  const banner = document.createElement('section');
  banner.className = 'cookie-banner';
  banner.setAttribute('aria-label', 'Consentimiento de cookies');
  banner.innerHTML = `
    <div>
      <strong>Cookies en imgprivado</strong>
      <p>Usamos cookies necesarias y, si aceptas, medición y anuncios. Tus imágenes nunca se suben.</p>
    </div>
    <div class="cookie-banner__actions">
      <button class="button button--secondary" data-action="necessary" type="button">Solo necesarias</button>
      <button class="button button--secondary" data-action="customize" type="button">Personalizar</button>
      <button class="button button--primary" data-action="accept-all" type="button">Aceptar todas</button>
    </div>
  `;

  const save = (consent) => {
    const finalConsent = { ...defaultConsent, ...consent };
    storeConsent(finalConsent);
    applyConsent(finalConsent, 'update');
    banner.remove();
  };

  banner.querySelector('[data-action="necessary"]').addEventListener('click', () => {
    save(defaultConsent);
  });

  banner.querySelector('[data-action="accept-all"]').addEventListener('click', () => {
    save({ necessary: true, analytics: true, ads: true });
  });

  banner.querySelector('[data-action="customize"]').addEventListener('click', () => {
    const modal = createModal({
      onSave: save,
      onClose: () => banner.querySelector('[data-action="customize"]')?.focus()
    });
    document.body.append(modal);
    modal.querySelector('#consent-analytics').focus();
  });

  document.body.append(banner);
}
