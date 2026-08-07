export interface PreparedImageUpload {
  mainFile: File;
  thumbnailFile: File;
  warnings: string[];
  width: number;
  height: number;
  thumbnailWidth: number;
  thumbnailHeight: number;
}

const mainMaxBytes = 300 * 1024;
const thumbnailMaxBytes = 50 * 1024;
type CompressionResult = { file: File; width: number; height: number; warning?: string };

export async function prepareImageUpload(file: File): Promise<PreparedImageUpload> {
  const bitmap = await createImageBitmap(file);

  try {
    const warnings: string[] = [];
    const main: CompressionResult = file.size <= mainMaxBytes
      ? { file, width: bitmap.width, height: bitmap.height }
      : await renderCompressed(bitmap, {
        filename: withSuffix(file.name, 'web'),
        maxBytes: mainMaxBytes,
        maxDimension: 1800,
        label: 'imagen principal'
      });
    const selectedMain: CompressionResult = main.file.size > file.size
      ? { file, width: bitmap.width, height: bitmap.height, warning: 'La imagen optimizada pesaba mas que la original; se ha usado el archivo original.' }
      : main;
    const thumbnail = await renderCompressed(bitmap, {
      filename: withSuffix(file.name, 'thumb'),
      maxBytes: thumbnailMaxBytes,
      maxDimension: 520,
      label: 'miniatura'
    });
    if (selectedMain.warning) warnings.push(selectedMain.warning);
    if (thumbnail.warning) warnings.push(thumbnail.warning);

    return {
      mainFile: selectedMain.file,
      thumbnailFile: thumbnail.file,
      warnings,
      width: selectedMain.width,
      height: selectedMain.height,
      thumbnailWidth: thumbnail.width,
      thumbnailHeight: thumbnail.height
    };
  } finally {
    bitmap.close();
  }
}

async function renderCompressed(
  bitmap: ImageBitmap,
  options: { filename: string; maxBytes: number; maxDimension: number; label: string }
) {
  let maxDimension = options.maxDimension;
  let lastBlob: Blob | undefined;
  let lastSize = dimensionsFor(bitmap.width, bitmap.height, maxDimension);

  for (let resizeAttempt = 0; resizeAttempt < 6; resizeAttempt += 1) {
    const size = dimensionsFor(bitmap.width, bitmap.height, maxDimension);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la imagen.');
    context.drawImage(bitmap, 0, 0, size.width, size.height);

    let low = 0.42;
    let high = 0.92;
    let bestBlob: Blob | undefined;

    for (let qualityAttempt = 0; qualityAttempt < 8; qualityAttempt += 1) {
      const quality = (low + high) / 2;
      const blob = await canvasToBlob(canvas, quality);
      lastBlob = blob;
      lastSize = size;

      if (blob.size <= options.maxBytes) {
        bestBlob = blob;
        low = quality;
      } else {
        high = quality;
      }
    }

    if (bestBlob) {
      return {
        file: new File([bestBlob], options.filename, { type: 'image/webp' }),
        width: size.width,
        height: size.height
      };
    }

    maxDimension = Math.max(320, Math.round(maxDimension * 0.78));
  }

  if (!lastBlob) throw new Error('No se pudo comprimir la imagen.');
  return {
    file: new File([lastBlob], options.filename, { type: 'image/webp' }),
    width: lastSize.width,
    height: lastSize.height,
    warning: lastBlob.size > options.maxBytes
      ? `La ${options.label} queda en ${Math.round(lastBlob.size / 1024)} KB; no se pudo bajar mas sin degradar demasiado.`
      : undefined
  };
}

function dimensionsFor(width: number, height: number, maxDimension: number) {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

async function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
  if (!blob) throw new Error('El navegador no pudo exportar la imagen optimizada.');
  return blob;
}

function withSuffix(filename: string, suffix: string) {
  const clean = filename.replace(/\.[^.]+$/, '');
  return `${clean}-${suffix}.webp`;
}
