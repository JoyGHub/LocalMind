import { settingsState } from '../settings.service';
import { dbService } from '../database.service';
import { ToolDefinition } from './tool.interface';

export const searchMemoriesTool: ToolDefinition = {
  name: 'search_memories',
  description:
    "Search the user's saved memories for a specific fact relevant to the current request. Results match any query keyword, are ranked by keyword relevance (rarer terms carry more weight), and include all matches. Use a few meaningful keywords. Each memory's createdAt is a Unix timestamp in milliseconds for when it was saved, not the date of an event described in its content; use convert_timestamp_to_date to interpret it when needed. For a complete overview or a question about what you remember, use get_all_memories once instead of repeated broad searches. Only available when memory reading is enabled.",
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Keywords or a short phrase; a memory matches when it contains any query keyword.',
      },
    },
    required: ['query'],
  },
  async execute(args: { query?: string }) {
    if (!settingsState.readMemories) {
      throw new Error('Reading memories is disabled in settings.');
    }

    const query = typeof args.query === 'string' ? args.query.trim() : '';
    if (!query) {
      throw new Error('A non-empty memory search query is required.');
    }

    const memories = await dbService.searchMemories(query);
    return { count: memories.length, memories };
  },
};
