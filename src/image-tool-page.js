import './main.js';
import { clearAlerts, showAlert } from './lib/alerts.js';
import { createDropzone } from './lib/dropzone.js';
import {
  convertImage,
  cropImage,
  getImageDimensions,
  isSupportedImageType,
  readImageMetadata,
  resizeImage,
  rotateImage,
  stripMetadata
} from './lib/image-processing.js';
import { createGenerationState } from './lib/tool-state.js';
import { buildOutputFileName, downloadBlob, formatBytes } from './lib/helpers.js';

const tool = document.body.dataset.tool;
const elements = {
  dropzone: document.querySelector('#image-dropzone'),
  input: document.querySelector('#image-input'),
  alertRegion: document.querySelector('#alert-region'),
  filePanel: document.querySelector('#selected-file'),
  options: document.querySelector('#tool-options'),
  status: document.querySelector('#ready-status'),
  action: document.querySelector('#tool-action'),
  preview: document.querySelector('#tool-preview')
};

let current = null;
let cropState = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return entities[character];
  });
}

const configs = {
  resize: {
    idle: 'Redimensionar imagen',
    processing: 'Redimensionando...',
    ready: 'Descargar imagen',
    suffix: 'redimensionada',
    async generate(file) {
      const keepRatio = document.querySelector('#keep-ratio').checked;
      const width = Number.parseInt(document.querySelector('#resize-width').value, 10);
      const height = Number.parseInt(document.querySelector('#resize-height').value, 10);
      return resizeImage(file, { width, height, keepRatio, format: 'original', quality: 92 });
    }
  },
  crop: {
    idle: 'Recortar imagen',
    processing: 'Recortando...',
    ready: 'Descargar imagen',
    suffix: 'recortada',
    async generate(file) {
      if (!cropState) {
        throw new Error('Selecciona una imagen para recortar.');
      }

      return cropImage(file, { crop: getNaturalCrop(), format: 'original', quality: 92 });
    }
  },
  convert: {
    idle: 'Convertir imagen',
    processing: 'Convirtiendo...',
    ready: 'Descargar imagen',
    suffix: 'convertida',
    async generate(file) {
      const format = document.querySelector('input[name="output-format"]:checked')?.value || 'webp';
      const quality = Number.parseInt(document.querySelector('#quality-range')?.value || '90', 10);
      return convertImage(file, { format, quality });
    }
  },
  metadata: {
    idle: 'Quitar metadatos',
    processing: 'Limpiando...',
    ready: 'Descargar imagen limpia',
    suffix: 'sin-metadatos',
    async generate(file) {
      return stripMetadata(file, { format: 'original', quality: 92 });
    }
  },
  rotate: {
    idle: 'Rotar imagen',
    processing: 'Rotando...',
    ready: 'Descargar imagen',
    suffix: 'rotada',
    async generate(file) {
      const degrees = Number.parseInt(document.querySelector('input[name="rotation"]:checked')?.value || '90', 10);
      return rotateImage(file, { degrees, format: 'original', quality: 92 });
    }
  }
};

const config = configs[tool];

if (!config) {
  throw new Error(`Herramienta no configurada: ${tool}`);
}

const state = createGenerationState({
  button: elements.action,
  labels: {
    idle: config.idle,
    processing: config.processing,
    ready: config.ready
  },
  canGenerate: () => Boolean(current),
  onGenerate: async () => {
    clearAlerts(elements.alertRegion);
    elements.status.textContent = 'Procesando';
    const result = await config.generate(current.file);
    return {
      ...result,
      filename: buildOutputFileName(current.name, config.suffix, result.extension)
    };
  },
  onDownload: (result) => {
    downloadBlob(result.blob, result.filename);
    showAlert(elements.alertRegion, 'Descarga lista en tu navegador.', 'success');
  },
  onReady: (result) => {
    elements.status.textContent = 'Listo';
    showAlert(
      elements.alertRegion,
      `Resultado: ${result.width} x ${result.height} px · ${formatBytes(result.blob.size)}.`,
      'success'
    );
  },
  onInvalidate: () => {
    elements.status.textContent = current ? 'Sin generar' : 'Sin imagen';
  },
  onError: (error) => {
    showAlert(elements.alertRegion, error.message || 'No se pudo procesar la imagen.', 'error');
  }
});

createDropzone({
  element: elements.dropzone,
  input: elements.input,
  multiple: false,
  onFiles: async ([file]) => {
    await selectFile(file);
  }
});

document.querySelectorAll('[data-invalidates-tool]').forEach((control) => {
  control.addEventListener('input', () => {
    syncLinkedControls(control);
    invalidate();
  });
  control.addEventListener('change', () => {
    syncLinkedControls(control);
    invalidate();
  });
});

document.querySelectorAll('[data-rotation-preview]').forEach((control) => {
  control.addEventListener('change', () => {
    updateRotatePreview();
  });
});

document.querySelector('#clear-file')?.addEventListener('click', clearCurrentFile);

renderEmpty();

async function selectFile(file) {
  clearAlerts(elements.alertRegion);

  if (!file || !isSupportedImageType(file)) {
    showAlert(elements.alertRegion, 'Elige una imagen JPG, PNG o WebP real.', 'error');
    return;
  }

  try {
    const dimensions = await getImageDimensions(file);
    if (current?.previewUrl) {
      URL.revokeObjectURL(current.previewUrl);
    }
    current = {
      file,
      name: file.name,
      size: file.size,
      ...dimensions,
      previewUrl: URL.createObjectURL(file)
    };

    await renderSelected();
    invalidate();
  } catch (error) {
    showAlert(elements.alertRegion, error.message || 'No se pudo cargar esa imagen.', 'error');
  }
}

async function renderSelected() {
  elements.filePanel.hidden = false;
  elements.filePanel.innerHTML = `
    <img class="image-card__thumb" src="${current.previewUrl}" alt="Miniatura de ${escapeHtml(current.name)}" />
    <div class="image-card__meta">
      <div class="image-card__name">${escapeHtml(current.name)}</div>
      <div class="image-card__details">${current.width} x ${current.height} px · ${formatBytes(current.size)}</div>
    </div>
    <button class="icon-button image-card__remove" id="clear-file" type="button" aria-label="Eliminar imagen">×</button>
  `;
  document.querySelector('#clear-file').addEventListener('click', clearCurrentFile);

  if (tool === 'resize') {
    setupResizeDefaults();
  }

  if (tool === 'crop') {
    await setupCropper();
  }

  if (tool === 'convert') {
    elements.preview.innerHTML = `
      <img class="tool-preview__image" src="${current.previewUrl}" alt="Vista previa de ${escapeHtml(current.name)}" />
    `;
  }

  if (tool === 'metadata') {
    await renderMetadata();
  }

  if (tool === 'rotate') {
    updateRotatePreview();
  }
}

function renderEmpty() {
  elements.filePanel.hidden = true;
  elements.filePanel.replaceChildren();
  elements.status.textContent = 'Sin imagen';
  state.update();
}

function clearCurrentFile() {
  if (current?.previewUrl) {
    URL.revokeObjectURL(current.previewUrl);
  }
  current = null;
  cropState = null;
  elements.preview.replaceChildren();
  renderEmpty();
  invalidate();
}

function invalidate() {
  state.invalidate();
}

function syncLinkedControls(control) {
  if (control.id === 'quality-range') {
    const value = document.querySelector('#quality-value');
    if (value) {
      value.textContent = control.value;
    }
  }

  if (tool !== 'resize' || !current || control.id !== 'resize-width') {
    return;
  }

  const keepRatio = document.querySelector('#keep-ratio')?.checked;
  if (!keepRatio) {
    return;
  }

  const width = Number.parseInt(control.value, 10);
  if (Number.isFinite(width) && width > 0) {
    document.querySelector('#resize-height').value = Math.max(1, Math.round((width / current.width) * current.height));
  }
}

function setupResizeDefaults() {
  const widthInput = document.querySelector('#resize-width');
  const heightInput = document.querySelector('#resize-height');
  widthInput.value = Math.min(1200, current.width);
  heightInput.value = Math.max(1, Math.round((Number.parseInt(widthInput.value, 10) / current.width) * current.height));
  elements.preview.innerHTML = `
    <img class="tool-preview__image" src="${current.previewUrl}" alt="Vista previa de ${current.name}" />
  `;
}

function updateRotatePreview() {
  if (!current) {
    return;
  }

  const degrees = Number.parseInt(document.querySelector('input[name="rotation"]:checked')?.value || '90', 10);
  elements.preview.innerHTML = `
    <div class="rotate-preview">
      <img class="tool-preview__image" src="${current.previewUrl}" style="transform: rotate(${degrees}deg)" alt="Vista previa rotada" />
    </div>
  `;
}

async function renderMetadata() {
  const metadata = await readImageMetadata(current.file);
  const fields = metadata.fields
    .map((field) => `<li><strong>${field.label}</strong><span>${field.value}</span></li>`)
    .join('');

  elements.preview.innerHTML = `
    <div class="metadata-panel ${metadata.hasExif ? 'metadata-panel--found' : ''}">
      <h3>${metadata.hasExif ? 'EXIF detectado' : 'Sin EXIF detectado'}</h3>
      <p>${metadata.summary}</p>
      ${fields ? `<ul>${fields}</ul>` : ''}
      <p>La descarga se genera desde Canvas, por eso sale sin los metadatos del archivo original.</p>
    </div>
  `;
}

async function setupCropper() {
  const image = new Image();
  image.src = current.previewUrl;
  await image.decode();

  elements.preview.innerHTML = `
    <div class="crop-stage">
      <canvas id="crop-canvas" width="${current.width}" height="${current.height}"></canvas>
      <div class="crop-box" id="crop-box">
        <span class="crop-handle crop-handle--nw" data-handle="nw"></span>
        <span class="crop-handle crop-handle--ne" data-handle="ne"></span>
        <span class="crop-handle crop-handle--sw" data-handle="sw"></span>
        <span class="crop-handle crop-handle--se" data-handle="se"></span>
      </div>
    </div>
  `;

  const canvas = document.querySelector('#crop-canvas');
  const stage = document.querySelector('.crop-stage');
  const context = canvas.getContext('2d');
  const maxWidth = Math.min(720, stage.clientWidth || 720);
  const scale = maxWidth / current.width;
  const displayWidth = Math.round(current.width * scale);
  const displayHeight = Math.round(current.height * scale);

  canvas.width = displayWidth;
  canvas.height = displayHeight;
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
  stage.style.width = `${displayWidth}px`;
  stage.style.height = `${displayHeight}px`;
  context.drawImage(image, 0, 0, displayWidth, displayHeight);

  cropState = {
    scale,
    displayWidth,
    displayHeight,
    rect: {
      x: Math.round(displayWidth * 0.18),
      y: Math.round(displayHeight * 0.16),
      width: Math.round(displayWidth * 0.58),
      height: Math.round(displayHeight * 0.6)
    }
  };

  const box = document.querySelector('#crop-box');
  let drag = null;

  function placeBox() {
    box.style.left = `${cropState.rect.x}px`;
    box.style.top = `${cropState.rect.y}px`;
    box.style.width = `${cropState.rect.width}px`;
    box.style.height = `${cropState.rect.height}px`;
  }

  function updateRect(next) {
    const minSize = 40;
    const maxX = cropState.displayWidth;
    const maxY = cropState.displayHeight;
    next.width = Math.max(minSize, Math.min(next.width, maxX - next.x));
    next.height = Math.max(minSize, Math.min(next.height, maxY - next.y));
    next.x = Math.max(0, Math.min(next.x, maxX - next.width));
    next.y = Math.max(0, Math.min(next.y, maxY - next.height));
    cropState.rect = next;
    placeBox();
    invalidate();
  }

  box.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    box.setPointerCapture(event.pointerId);
    drag = {
      handle: event.target.dataset.handle || 'move',
      startX: event.clientX,
      startY: event.clientY,
      rect: { ...cropState.rect }
    };
  });

  box.addEventListener('pointermove', (event) => {
    if (!drag) {
      return;
    }

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const next = { ...drag.rect };

    if (drag.handle === 'move') {
      next.x += dx;
      next.y += dy;
    } else {
      if (drag.handle.includes('e')) {
        next.width += dx;
      }
      if (drag.handle.includes('s')) {
        next.height += dy;
      }
      if (drag.handle.includes('w')) {
        next.x += dx;
        next.width -= dx;
      }
      if (drag.handle.includes('n')) {
        next.y += dy;
        next.height -= dy;
      }
    }

    updateRect(next);
  });

  box.addEventListener('pointerup', () => {
    drag = null;
  });

  placeBox();
}

function getNaturalCrop() {
  const { rect, scale } = cropState;
  return {
    x: rect.x / scale,
    y: rect.y / scale,
    width: rect.width / scale,
    height: rect.height / scale
  };
}
