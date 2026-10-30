import { settingsState } from '../settings.service';
import { dbService } from '../database.service';
import { ToolDefinition } from './tool.interface';

export const addMemoryTool: ToolDefinition = {
  name: 'add_memory',
  description:
    'Save a useful, stable fact or preference the user has shared so it can be recalled in future conversations. Only save when memory saving is enabled and the information is appropriate to remember.',
  parameters: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'A concise, self-contained fact or preference to remember.',
      },
    },
    required: ['content'],
  },
  async execute(args: { content?: string }) {
    if (!settingsState.saveMemories) {
      throw new Error('Saving memories is disabled in settings.');
    }

    const content = typeof args.content === 'string' ? args.content.trim() : '';
    if (!content) {
      throw new Error('Memory content cannot be empty.');
    }

    const memory = await dbService.addMemory(content);
    return { success: true, memory };
  },
};
