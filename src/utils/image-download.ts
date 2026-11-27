export type ImageDownloadFormat = 'png' | 'jpg' | 'webp' | 'bmp' | 'gif' | 'ico';

function getBaseFileName(name: string | undefined, fallback = 'generated-image'): string {
  if (!name) return fallback;
  const trimmed = name.trim();
  if (!trimmed) return fallback;
  const dotIndex = trimmed.lastIndexOf('.');
  return dotIndex > 0 ? trimmed.slice(0, dotIndex) : trimmed;
}

function getMimeType(format: ImageDownloadFormat): string {
  switch (format) {
    case 'jpg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'bmp':
      return 'image/bmp';
    case 'gif':
      return 'image/gif';
    case 'ico':
      return 'image/x-icon';
    case 'png':
    default:
      return 'image/png';
  }
}

export async function downloadImageAsFormat(url: string, format: ImageDownloadFormat, fileName?: string): Promise<void> {
  const response = await fetch(url);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image for conversion'));
      img.src = objectUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (format === 'jpg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0);

    const mimeType = getMimeType(format);
    const quality = format === 'png' ? undefined : 0.92;

    const convertedBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mimeType, quality));

    if (!convertedBlob) return;

    const downloadUrl = URL.createObjectURL(convertedBlob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${getBaseFileName(fileName)}.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
