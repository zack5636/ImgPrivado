const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function isSupportedImageType(file) {
  if (supportedTypes.has(file.type)) {
    return true;
  }

  return /\.(jpe?g|png|webp)$/i.test(file.name);
}

export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`No se pudo abrir "${file.name}". Parece una imagen corrupta o no válida.`));
    };

    image.src = url;
  });
}

export async function getImageDimensions(file) {
  const image = await loadImage(file);
  return {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height
  };
}

export async function loadImageToCanvas(file) {
  const image = await loadImage(file);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('El navegador no pudo crear el contexto Canvas.');
  }

  context.drawImage(image, 0, 0, width, height);
  return { canvas, width, height };
}

export function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('No se pudo generar la imagen comprimida. Prueba de nuevo.'));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

export function outputFormat(file, format) {
  if (format === 'jpeg') {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }

  if (format === 'png') {
    return { mimeType: 'image/png', extension: 'png' };
  }

  if (format === 'webp') {
    return { mimeType: 'image/webp', extension: 'webp' };
  }

  if (file.type === 'image/png') {
    return { mimeType: 'image/png', extension: 'png' };
  }

  if (file.type === 'image/webp') {
    return { mimeType: 'image/webp', extension: 'webp' };
  }

  return { mimeType: 'image/jpeg', extension: 'jpg' };
}

export async function compressImage(file, { quality = 80, format = 'jpeg', maxWidth = null }) {
  const image = await loadImage(file);
  let width = image.naturalWidth || image.width;
  let height = image.naturalHeight || image.height;

  if (maxWidth && width > maxWidth) {
    height = Math.round((maxWidth / width) * height);
    width = maxWidth;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('El navegador no pudo crear el contexto Canvas.');
  }

  if (format === 'jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
  }

  context.drawImage(image, 0, 0, width, height);

  const { mimeType, extension } = outputFormat(file, format);
  const blob = await canvasToBlob(canvas, mimeType, quality / 100);

  return {
    blob,
    width,
    height,
    mimeType,
    extension
  };
}

export async function convertImage(file, { quality = 90, format = 'webp' }) {
  const image = await loadImage(file);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('El navegador no pudo crear el contexto Canvas.');
  }

  if (format === 'jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
  }

  context.drawImage(image, 0, 0, width, height);
  const { mimeType, extension } = outputFormat(file, format);
  const blob = await canvasToBlob(canvas, mimeType, quality / 100);
  return { blob, width, height, mimeType, extension };
}

export async function resizeImage(file, { width, height, keepRatio = true, quality = 90, format = 'original' }) {
  const image = await loadImage(file);
  const originalWidth = image.naturalWidth || image.width;
  const originalHeight = image.naturalHeight || image.height;
  let targetWidth = Number.parseInt(width, 10) || originalWidth;
  let targetHeight = Number.parseInt(height, 10) || originalHeight;

  if (keepRatio) {
    const ratio = originalHeight / originalWidth;
    targetHeight = Math.max(1, Math.round(targetWidth * ratio));
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, targetWidth);
  canvas.height = Math.max(1, targetHeight);
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('El navegador no pudo crear el contexto Canvas.');
  }

  const resolved = outputFormat(file, format);
  if (resolved.mimeType === 'image/jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await canvasToBlob(canvas, resolved.mimeType, quality / 100);
  return { blob, width: canvas.width, height: canvas.height, ...resolved };
}

export async function cropImage(file, { crop, quality = 90, format = 'original' }) {
  const image = await loadImage(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const safeCrop = {
    x: Math.max(0, Math.min(sourceWidth - 1, Math.round(crop.x))),
    y: Math.max(0, Math.min(sourceHeight - 1, Math.round(crop.y))),
    width: Math.max(1, Math.min(sourceWidth, Math.round(crop.width))),
    height: Math.max(1, Math.min(sourceHeight, Math.round(crop.height)))
  };

  if (safeCrop.x + safeCrop.width > sourceWidth) {
    safeCrop.width = sourceWidth - safeCrop.x;
  }

  if (safeCrop.y + safeCrop.height > sourceHeight) {
    safeCrop.height = sourceHeight - safeCrop.y;
  }

  const canvas = document.createElement('canvas');
  canvas.width = safeCrop.width;
  canvas.height = safeCrop.height;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('El navegador no pudo crear el contexto Canvas.');
  }

  const resolved = outputFormat(file, format);
  if (resolved.mimeType === 'image/jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  context.drawImage(
    image,
    safeCrop.x,
    safeCrop.y,
    safeCrop.width,
    safeCrop.height,
    0,
    0,
    safeCrop.width,
    safeCrop.height
  );
  const blob = await canvasToBlob(canvas, resolved.mimeType, quality / 100);
  return { blob, width: canvas.width, height: canvas.height, ...resolved };
}

export async function rotateImage(file, { degrees = 90, quality = 90, format = 'original' }) {
  const image = await loadImage(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const normalizedDegrees = ((Number.parseInt(degrees, 10) % 360) + 360) % 360;
  const swapsDimensions = normalizedDegrees === 90 || normalizedDegrees === 270;
  const canvas = document.createElement('canvas');
  canvas.width = swapsDimensions ? sourceHeight : sourceWidth;
  canvas.height = swapsDimensions ? sourceWidth : sourceHeight;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('El navegador no pudo crear el contexto Canvas.');
  }

  const resolved = outputFormat(file, format);
  if (resolved.mimeType === 'image/jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((normalizedDegrees * Math.PI) / 180);
  context.drawImage(image, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);

  const blob = await canvasToBlob(canvas, resolved.mimeType, quality / 100);
  return { blob, width: canvas.width, height: canvas.height, ...resolved };
}

export async function stripMetadata(file, { quality = 92, format = 'original' } = {}) {
  return convertImage(file, { quality, format });
}

function readAscii(view, offset, length) {
  let value = '';
  for (let index = 0; index < length; index += 1) {
    const code = view.getUint8(offset + index);
    if (code === 0) {
      break;
    }
    value += String.fromCharCode(code);
  }
  return value.trim();
}

function readExifValue(view, tiffStart, entryOffset, littleEndian) {
  const tag = view.getUint16(entryOffset, littleEndian);
  const type = view.getUint16(entryOffset + 2, littleEndian);
  const count = view.getUint32(entryOffset + 4, littleEndian);
  const valueOffset = entryOffset + 8;
  const typeSize = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8 }[type] || 1;
  const totalSize = typeSize * count;
  const dataOffset = totalSize <= 4 ? valueOffset : tiffStart + view.getUint32(valueOffset, littleEndian);

  if (type === 2) {
    return { tag, value: readAscii(view, dataOffset, count) };
  }

  if (type === 3) {
    return { tag, value: view.getUint16(dataOffset, littleEndian) };
  }

  if (type === 4) {
    return { tag, value: view.getUint32(dataOffset, littleEndian) };
  }

  return { tag, value: null };
}

function parseIfd(view, tiffStart, ifdOffset, littleEndian) {
  const entries = {};
  const count = view.getUint16(tiffStart + ifdOffset, littleEndian);

  for (let index = 0; index < count; index += 1) {
    const entryOffset = tiffStart + ifdOffset + 2 + index * 12;
    const { tag, value } = readExifValue(view, tiffStart, entryOffset, littleEndian);
    entries[tag] = value;
  }

  return entries;
}

export async function readImageMetadata(file) {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);

  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) {
    return {
      hasExif: false,
      summary: 'No se detectaron metadatos EXIF en esta imagen.',
      fields: []
    };
  }

  let offset = 2;
  while (offset + 4 < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) {
      break;
    }

    const marker = view.getUint8(offset + 1);
    const length = view.getUint16(offset + 2);

    if (marker === 0xe1 && readAscii(view, offset + 4, 6) === 'Exif') {
      const tiffStart = offset + 10;
      const byteOrder = readAscii(view, tiffStart, 2);
      const littleEndian = byteOrder === 'II';

      if (!littleEndian && byteOrder !== 'MM') {
        break;
      }

      const firstIfdOffset = view.getUint32(tiffStart + 4, littleEndian);
      const entries = parseIfd(view, tiffStart, firstIfdOffset, littleEndian);
      const labels = {
        0x010f: 'Cámara',
        0x0110: 'Modelo',
        0x0112: 'Orientación',
        0x0132: 'Fecha'
      };
      const fields = Object.entries(labels)
        .filter(([tag]) => entries[Number(tag)])
        .map(([tag, label]) => ({ label, value: String(entries[Number(tag)]) }));

      return {
        hasExif: true,
        summary: fields.length
          ? `EXIF detectado: ${fields.map((field) => `${field.label}: ${field.value}`).join(' · ')}`
          : 'EXIF detectado. Se limpiará al descargar la nueva imagen.',
        fields
      };
    }

    offset += 2 + length;
  }

  return {
    hasExif: false,
    summary: 'No se detectaron metadatos EXIF en esta imagen.',
    fields: []
  };
}
