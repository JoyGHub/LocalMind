import { convertBlobUrlToBase64 } from '../utils/utils';

export class LlmAttachmentService {
  async processGeneratedAttachment(attachment: any): Promise<any> {
    if (!attachment) return null;

    let processedAttachment = { ...attachment };

    // Convert volatile blob URLs to permanent Base64 strings
    if (processedAttachment.url?.startsWith('blob:')) {
      processedAttachment.url = await convertBlobUrlToBase64(processedAttachment.url);
    }

    // Future expansion: handle CSVs, images, data mapping, etc.
    // if (processedAttachment.type === 'csv') { ... }

    return processedAttachment;
  }
}

export const llmAttachmentService = new LlmAttachmentService();
