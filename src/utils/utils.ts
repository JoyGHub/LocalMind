export async function convertBlobUrlToBase64(blobUrl: string): Promise<string> {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function bytesToGbMb(bytes: number): string {
  if (!bytes) {
    return '0 B';
  }

  const gb = bytes / (1024 * 1024 * 1024);
  const mb = bytes / (1024 * 1024);

  if (gb >= 1) {
    return `${gb.toFixed(2)} GB`;
  } else {
    return `${mb.toFixed(2)} MB`;
  }
}

export function formatTime(timestamp?: number) {
  if (!timestamp) return 'Earlier';

  const date = new Date(timestamp);
  const today = new Date();
  const diffMs = today.getTime() - date.getTime();

  // If it was edited less than or equal to 60,000 milliseconds (1 minute) ago
  if (diffMs <= 60000 && diffMs >= 0) {
    return 'Just now';
  }

  // If it was edited today (but more than a minute ago)
  if (date.toDateString() === today.toDateString()) {
    // Returns hour and minute (e.g., "14:30" or "2:30 PM" depending on locale)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Yesterday
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  // X days ago
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  // Fallback to standard date
  return date.toLocaleDateString();
}

export function formatAssistantTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const isToday = new Date().toDateString() === date.toDateString();
  const timeString = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return isToday
    ? `Today, ${timeString}`
    : `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeString}`;
}

export function getIconForFile(file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'pdf':
      return 'file-earmark-pdf';
    case 'txt':
      return 'file-earmark-text';
    case 'csv':
    case 'xlsx':
    case 'xls':
      return 'file-earmark-excel';
    case 'doc':
    case 'docx':
      return 'file-earmark-word';
    case 'js':
    case 'ts':
    case 'py':
    case 'html':
    case 'css':
    case 'json':
    case 'cpp':
    case 'cs':
    case 'xml':
    case 'yaml':
      return 'file-earmark-code';
    default:
      return 'file-earmark';
  }
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (!+bytes) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}