import { settingsState } from '../settings.service';
import { dbService } from '../database.service';
import { ToolDefinition } from './tool.interface';

export const getAllMemoriesTool: ToolDefinition = {
  name: 'get_all_memories',
  description:
    "Return every saved memory. Use this once when the user asks what you remember about them or requests a complete overview. Do not repeatedly search to check for additional memories. Each memory's createdAt is a Unix timestamp in milliseconds for when it was saved, not the date of an event described in its content; use convert_timestamp_to_date to interpret it when needed. Only available when memory reading is enabled.",
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  async execute() {
    if (!settingsState.readMemories) {
      throw new Error('Reading memories is disabled in settings.');
    }

    const memories = await dbService.getMemories();
    return { count: memories.length, memories };
  },
};
