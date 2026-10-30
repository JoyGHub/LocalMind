export class AttachmentService {
  async processAttachments(files: File[]): Promise<{ images: string[]; textContext: string }> {
    const images: string[] = [];
    let textContext = '';

    for (const file of files) {
      try {
        if (file.type.startsWith('image/')) {
          const base64 = await this.fileToBase64(file);
          const base64Clean = base64.split(',')[1];
          if (!base64Clean) {
            throw new Error('The image could not be encoded.');
          }
          images.push(base64Clean);
        } else {
          const text = await this.extractTextFromFile(file);
          if (!text.trim()) {
            throw new Error('No readable text was found in the file.');
          }
          textContext += `\n--- START OF FILE: ${file.name} ---\n${text}\n--- END OF FILE: ${file.name} ---\n`;
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to process "${file.name}": ${reason}`);
      }
    }

    return { images, textContext };
  }

  async extractTextFromFile(file: File): Promise<string> {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const validTextExtensions = [
      'txt', 'md', 'mdx', 'csv', 'tsv', 'json', 'xml', 'yaml', 'yml', 'ini', 'log', 'env',
      'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'php', 'rb',
      'sh', 'bat', 'ps1', 'sql', 'swift', 'kt', 'html', 'htm', 'css', 'scss', 'less',
      'svg', 'vue', 'svelte',
    ];

    if (extension === 'pdf') {
      return this.extractPdfText(file);
    }
    if (!validTextExtensions.includes(extension)) {
      throw new Error('Unsupported file format for text extraction.');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('The file did not produce readable text.'));
        }
      };
      reader.onerror = () => reject(reader.error ?? new Error('The file could not be read.'));
      reader.readAsText(file);
    });
  }

  async extractPdfText(file: File): Promise<string> {
    const pdfjsLib = await import('pdfjs-dist');

    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('assets/pdf.worker.min.js', document.baseURI).toString();
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  }

  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}

export const attachmentService = new AttachmentService();