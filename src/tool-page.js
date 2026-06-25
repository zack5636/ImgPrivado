import JSZip from 'jszip';
import './main.js';
import { clearAlerts, showAlert } from './lib/alerts.js';
import { createDropzone } from './lib/dropzone.js';
import { compressImage, getImageDimensions, isSupportedImageType } from './lib/image-processing.js';
import { createGenerationState } from './lib/tool-state.js';
import {
  debounce,
  downloadBlob,
  formatBytes,
  outputFileName,
  percentSavings,
  sumBy,
  uid
} from './lib/helpers.js';

const elements = {
  dropzone: document.querySelector('#image-dropzone'),
  input: document.querySelector('#image-input'),
  alertRegion: document.querySelector('#alert-region'),
  imageCounter: document.querySelector('#image-counter'),
  imageList: document.querySelector('#image-list'),
  clearAll: document.querySelector('#clear-all'),
  quality: document.querySelector('#quality-range'),
  qualityValue: document.querySelector('#quality-value'),
  formatWarning: document.querySelector('#format-warning'),
  resizeToggle: document.querySelector('#resize-toggle'),
  resizeControl: document.querySelector('#resize-control'),
  maxWidth: document.querySelector('#max-width'),
  estimateSummary: document.querySelector('#estimate-summary'),
  compressButton: document.querySelector('#compress-button'),
  readyStatus: document.querySelector('#ready-status')
};

let images = [];
let estimateRunId = 0;

const state = createGenerationState({
  button: elements.compressButton,
  labels: {
    idle: 'Comprimir imágenes',
    processing: 'Comprimiendo...',
    ready: 'Descargar resultado'
  },
  canGenerate: () => images.length > 0,
  onGenerate: compressAll,
  onDownload: (result) => {
    if (!result) {
      return;
    }

    downloadBlob(result.blob, result.filename);
    showAlert(
      elements.alertRegion,
      result.kind === 'zip'
        ? 'ZIP descargado con tus imágenes comprimidas.'
        : 'Imagen comprimida descargada.',
      'success'
    );
  },
  onReady: (result) => {
    elements.readyStatus.textContent = 'Listo';
    showAlert(
      elements.alertRegion,
      result.kind === 'zip'
        ? 'Compresión lista. Puedes descargar el ZIP.'
        : 'Compresión lista. Puedes descargar la imagen.',
      'success'
    );
  },
  onInvalidate: () => {
    elements.readyStatus.textContent = images.length ? 'Sin generar' : 'Sin imágenes';
  },
  onError: (error) => {
    showAlert(elements.alertRegion, error.message || 'No se pudo comprimir. Prueba de nuevo.', 'error');
  }
});

createDropzone({
  element: elements.dropzone,
  input: elements.input,
  onFiles: handleFiles,
  multiple: true
});

elements.clearAll.addEventListener('click', clearAllImages);
elements.quality.addEventListener('input', () => {
  elements.qualityValue.textContent = elements.quality.value;
  invalidateAndEstimate();
});

document.querySelectorAll('input[name="output-format"]').forEach((input) => {
  input.addEventListener('change', invalidateAndEstimate);
});

elements.resizeToggle.addEventListener('change', () => {
  elements.resizeControl.hidden = !elements.resizeToggle.checked;
  invalidateAndEstimate();
});

elements.maxWidth.addEventListener('input', invalidateAndEstimate);

render();

async function handleFiles(files) {
  clearAlerts(elements.alertRegion);
  let added = 0;

  for (const file of files) {
    if (!isSupportedImageType(file)) {
      showAlert(
        elements.alertRegion,
        `"${file.name}" no es JPG, PNG ni WebP. Se excluyó de la lista.`,
        'error'
      );
      continue;
    }

    try {
      const { width, height } = await getImageDimensions(file);
      images.push({
        id: uid('image'),
        file,
        name: file.name,
        size: file.size,
        width,
        height,
        previewUrl: URL.createObjectURL(file),
        estimateStatus: 'pending',
        estimate: null
      });
      added += 1;
    } catch (error) {
      showAlert(
        elements.alertRegion,
        error.message || `"${file.name}" no pudo cargarse como imagen real.`,
        'error'
      );
    }
  }

  if (added > 0) {
    showAlert(
      elements.alertRegion,
      added === 1 ? 'Imagen añadida.' : `${added} imágenes añadidas.`,
      'info'
    );
    invalidateAndEstimate();
  } else {
    render();
  }
}

function readOptions() {
  const format = document.querySelector('input[name="output-format"]:checked')?.value || 'jpeg';
  const resizeEnabled = elements.resizeToggle.checked;
  const maxWidth = resizeEnabled ? Number.parseInt(elements.maxWidth.value, 10) : null;

  return {
    quality: Number.parseInt(elements.quality.value, 10),
    format,
    maxWidth: Number.isFinite(maxWidth) && maxWidth > 0 ? maxWidth : null
  };
}

function invalidateAndEstimate() {
  state.invalidate();
  images = images.map((image) => ({
    ...image,
    estimateStatus: 'pending',
    estimate: null
  }));
  render();
  queueEstimates();
}

const queueEstimates = debounce(async () => {
  const runId = ++estimateRunId;
  const options = readOptions();

  if (images.length === 0) {
    render();
    return;
  }

  for (const image of images) {
    if (runId !== estimateRunId) {
      return;
    }

    image.estimateStatus = 'loading';
    render();

    try {
      const compressed = await compressImage(image.file, options);
      if (runId !== estimateRunId) {
        return;
      }

      image.estimateStatus = 'done';
      image.estimate = {
        bytes: compressed.blob.size,
        width: compressed.width,
        height: compressed.height,
        extension: compressed.extension
      };
    } catch (error) {
      image.estimateStatus = 'error';
      image.estimate = {
        error: error.message || 'No se pudo calcular la estimación.'
      };
    }

    render();
  }
}, 300);

async function compressAll() {
  clearAlerts(elements.alertRegion);
  if (images.length === 0) {
    throw new Error('Añade al menos una imagen para comprimir.');
  }

  const options = readOptions();
  const results = [];

  for (const [index, image] of images.entries()) {
    elements.readyStatus.textContent = `Comprimiendo ${index + 1}/${images.length}`;
    const compressed = await compressImage(image.file, options);
    results.push({
      filename: outputFileName(image.name, compressed.extension),
      blob: compressed.blob,
      width: compressed.width,
      height: compressed.height
    });
  }

  if (results.length === 1) {
    return {
      kind: 'file',
      filename: results[0].filename,
      blob: results[0].blob,
      files: results
    };
  }

  elements.readyStatus.textContent = 'Creando ZIP';
  const zip = new JSZip();
  results.forEach((result) => {
    zip.file(result.filename, result.blob);
  });

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6
      }
    },
    (metadata) => {
      elements.readyStatus.textContent = `ZIP ${Math.round(metadata.percent)}%`;
    }
  );

  return {
    kind: 'zip',
    filename: 'imagenes-comprimidas.zip',
    blob: zipBlob,
    files: results
  };
}

function clearAllImages() {
  images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
  images = [];
  estimateRunId += 1;
  clearAlerts(elements.alertRegion);
  state.invalidate();
  render();
}

function removeImage(id) {
  const image = images.find((item) => item.id === id);
  if (image) {
    URL.revokeObjectURL(image.previewUrl);
  }

  images = images.filter((item) => item.id !== id);
  invalidateAndEstimate();
}

function render() {
  renderCounter();
  renderWarnings();
  renderList();
  renderEstimateSummary();
  state.update();
}

function renderCounter() {
  const count = images.length;
  const label = count === 1 ? 'imagen' : 'imágenes';
  const totalBytes = sumBy(images, (image) => image.size);
  elements.imageCounter.textContent = `${count} ${label} · ${formatBytes(totalBytes)} en total`;
  elements.clearAll.disabled = count === 0;
}

function renderWarnings() {
  const options = readOptions();
  const hasPng = images.some((image) => image.file.type === 'image/png' || /\.png$/i.test(image.name));
  elements.formatWarning.hidden = !(options.format === 'jpeg' && hasPng);
}

function renderList() {
  elements.imageList.replaceChildren();

  if (images.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'image-card__details';
    empty.textContent = 'Todavía no has añadido imágenes.';
    elements.imageList.append(empty);
    return;
  }

  images.forEach((image) => {
    elements.imageList.append(createImageCard(image));
  });
}

function createImageCard(image) {
  const card = document.createElement('article');
  card.className = 'image-card';

  const thumb = document.createElement('img');
  thumb.className = 'image-card__thumb';
  thumb.src = image.previewUrl;
  thumb.alt = `Miniatura de ${image.name}`;

  const meta = document.createElement('div');
  meta.className = 'image-card__meta';

  const name = document.createElement('div');
  name.className = 'image-card__name';
  name.textContent = image.name;

  const details = document.createElement('div');
  details.className = 'image-card__details';
  details.textContent = `${image.width} x ${image.height} px · ${formatBytes(image.size)}`;

  const estimate = document.createElement('div');
  estimate.className = 'image-card__estimate';
  estimate.textContent = estimateText(image);

  meta.append(name, details, estimate);

  const savings = image.estimate?.bytes ? percentSavings(image.size, image.estimate.bytes) : 0;
  if (savings >= 5) {
    const badge = document.createElement('span');
    badge.className = 'saving-badge';
    badge.textContent = `${savings}% más ligero`;
    meta.append(badge);
  }

  const removeButton = document.createElement('button');
  removeButton.className = 'icon-button image-card__remove';
  removeButton.type = 'button';
  removeButton.setAttribute('aria-label', `Eliminar ${image.name}`);
  removeButton.textContent = '×';
  removeButton.addEventListener('click', () => removeImage(image.id));

  card.append(thumb, meta, removeButton);
  return card;
}

function estimateText(image) {
  if (image.estimateStatus === 'loading') {
    return 'Calculando estimación...';
  }

  if (image.estimateStatus === 'error') {
    return image.estimate?.error || 'No se pudo calcular la estimación.';
  }

  if (!image.estimate?.bytes) {
    return 'Estimación pendiente.';
  }

  const savings = percentSavings(image.size, image.estimate.bytes);
  const suffix =
    savings > 0 ? `${savings}% más ligero` : savings < 0 ? `${Math.abs(savings)}% más pesado` : 'peso similar';
  const dimensions =
    image.estimate.width !== image.width || image.estimate.height !== image.height
      ? ` · salida ${image.estimate.width} x ${image.estimate.height} px`
      : '';

  return `${formatBytes(image.size)} → ~${formatBytes(image.estimate.bytes)} (${suffix})${dimensions}`;
}

function renderEstimateSummary() {
  if (images.length === 0) {
    elements.estimateSummary.textContent = 'Añade imágenes para ver el ahorro estimado.';
    elements.readyStatus.textContent = 'Sin imágenes';
    return;
  }

  const loading = images.some((image) => image.estimateStatus === 'loading' || image.estimateStatus === 'pending');
  const completed = images.filter((image) => image.estimate?.bytes);

  if (loading || completed.length !== images.length) {
    elements.estimateSummary.textContent = 'Calculando tamaño estimado...';
    if (state.phase !== 'processing' && state.phase !== 'ready') {
      elements.readyStatus.textContent = 'Estimando';
    }
    return;
  }

  const original = sumBy(images, (image) => image.size);
  const estimated = sumBy(images, (image) => image.estimate.bytes);
  const savings = percentSavings(original, estimated);
  const savingsText =
    savings > 0 ? `${savings}% menos peso` : savings < 0 ? `${Math.abs(savings)}% más peso` : 'peso similar';

  elements.estimateSummary.textContent = `Total estimado: ${formatBytes(original)} → ~${formatBytes(
    estimated
  )} (${savingsText}).`;

  if (state.phase !== 'processing' && state.phase !== 'ready') {
    elements.readyStatus.textContent = 'Listo para comprimir';
  }
}
