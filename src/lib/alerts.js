export function clearAlerts(region) {
  region?.replaceChildren();
}

export function showAlert(region, message, type = 'info') {
  if (!region) {
    return;
  }

  const alert = document.createElement('div');
  alert.className = `alert alert--${type}`;
  alert.setAttribute('role', type === 'error' ? 'alert' : 'status');
  alert.textContent = message;
  region.append(alert);

  if (type !== 'error') {
    window.setTimeout(() => {
      alert.remove();
    }, 5200);
  }
}
