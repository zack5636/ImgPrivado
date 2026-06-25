import { initAdSlots } from './components/ad-slot.js';
import { initCookieBanner } from './components/cookie-banner.js';
import { initFooter } from './components/footer.js';
import { initHeader } from './components/header.js';
import { applyTheme, getPreferredTheme } from './components/theme-toggle.js';

applyTheme(getPreferredTheme());
initHeader();
initFooter();
initAdSlots();
initCookieBanner();
