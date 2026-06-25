export function initAdSlots(root = document) {
  root.querySelectorAll('.ad-slot').forEach((slot) => {
    const format = slot.dataset.format || 'responsive';
    slot.dataset.state = 'placeholder';
    slot.setAttribute('role', 'complementary');
    slot.setAttribute('aria-label', `Espacio publicitario ${format}`);
    slot.innerHTML = `
      <span class="ad-slot__label">Espacio publicitario</span>
      <span class="ad-slot__format">${format}</span>
    `;
  });
}
