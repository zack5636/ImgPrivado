export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 KB';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  const digits = value >= 100 || index === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[index]}`;
}

export function debounce(callback, wait = 300) {
  let timeoutId;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => callback(...args), wait);
  };
}

export function sumBy(items, selector) {
  return items.reduce((total, item) => total + selector(item), 0);
}

export function percentSavings(originalBytes, compressedBytes) {
  if (!originalBytes || !compressedBytes) {
    return 0;
  }

  return Math.round(((originalBytes - compressedBytes) / originalBytes) * 100);
}

export function safeFileName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'imagen';
}

export function outputFileName(originalName, extension) {
  return buildOutputFileName(originalName, 'comprimida', extension);
}

export function buildOutputFileName(originalName, suffix, extension) {
  const cleanName = safeFileName(originalName);
  const baseName = cleanName.replace(/\.[^.]+$/, '');
  return `${baseName}-${suffix}.${extension}`;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function uid(prefix = 'item') {
  if (crypto?.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
