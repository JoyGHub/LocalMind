import { ToolDefinition } from './tool.interface';
import { imageGenService } from '../image-gen.service';
import { settingsState } from '../settings.service';

interface GenerateImageArgs {
  prompt: string;
  negative_prompt?: string;
  aspect_ratio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
}

export const generateImageTool: ToolDefinition = {
  name: 'generate_image',
  description:
    'Generate an image locally from a detailed text description using stable-diffusion.cpp. Use this whenever the user asks to draw, generate, create, or illustrate an image, picture, logo, artwork, or visual.',
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'Detailed visual prompt describing subject, style, lighting, composition, and colors.',
      },
      negative_prompt: {
        type: 'string',
        description: 'Things to exclude from the image.',
      },
      aspect_ratio: {
        type: 'string',
        enum: ['1:1', '16:9', '9:16', '4:3', '3:4'],
        description: 'Desired aspect ratio.',
      },
    },
    required: ['prompt'],
  },
  execute: async (args: GenerateImageArgs, context) => {
    try {
      const dimensions: Record<string, { width: number; height: number }> = {
        '1:1': { width: 1024, height: 1024 },
        '16:9': { width: 1024, height: 576 },
        '9:16': { width: 576, height: 1024 },
        '4:3': { width: 896, height: 672 },
        '3:4': { width: 672, height: 896 },
      };
      const size = args.aspect_ratio ? dimensions[args.aspect_ratio] : undefined;
      const result = await imageGenService.generateImage({
        prompt: args.prompt,
        negative_prompt: args.negative_prompt,
        model_id: settingsState.defaultImageModel || undefined,
        ...(size ? size : {}),
        ollama_model: context?.ollamaModelName,
      });

      return {
        status: 'success',
        message: `Image generated successfully using ${result.modelName} (${result.width}x${result.height}). The image is already displayed in the chat UI — briefly describe what you created without outputting markdown image links.`,
        attachment: {
          type: 'generated-image',
          url: result.imageUrl,
          name: result.fileName,
          prompt: result.prompt,
          modelName: result.modelName,
          width: result.width,
          height: result.height,
          seed: result.seed,
        },
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error?.message || 'Image generation failed.',
      };
    }
  },
};
