export interface PreparedImageUpload {
  mainFile: File;
  thumbnailFile: File;
  width: number;
  height: number;
  thumbnailWidth: number;
  thumbnailHeight: number;
}

const mainMaxBytes = 300 * 1024;
const thumbnailMaxBytes = 50 * 1024;

export async function prepareImageUpload(file: File): Promise<PreparedImageUpload> {
  const bitmap = await createImageBitmap(file);

  try {
    const main = await renderCompressed(bitmap, {
      filename: withSuffix(file.name, 'web'),
      maxBytes: mainMaxBytes,
      maxDimension: 1800
    });
    const thumbnail = await renderCompressed(bitmap, {
      filename: withSuffix(file.name, 'thumb'),
      maxBytes: thumbnailMaxBytes,
      maxDimension: 520
    });

    return {
      mainFile: main.file,
      thumbnailFile: thumbnail.file,
      width: main.width,
      height: main.height,
      thumbnailWidth: thumbnail.width,
      thumbnailHeight: thumbnail.height
    };
  } finally {
    bitmap.close();
  }
}

async function renderCompressed(
  bitmap: ImageBitmap,
  options: { filename: string; maxBytes: number; maxDimension: number }
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
  if (lastBlob.size > options.maxBytes) {
    throw new Error(`No se pudo reducir la imagen por debajo de ${Math.round(options.maxBytes / 1024)} KB.`);
  }

  return {
    file: new File([lastBlob], options.filename, { type: 'image/webp' }),
    width: lastSize.width,
    height: lastSize.height
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
