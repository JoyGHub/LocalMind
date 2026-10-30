import { ToolDefinition } from './tool.interface';

const fetchWikipediaData = async (topic: string) => {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Not found');
  }

  return await response.json();
};

export const getWikipediaSummaryTool: ToolDefinition = {
  name: 'get_wikipedia_summary',
  description: 'Get a summary of a Wikipedia article. Useful for factual information, history, and defining concepts.',
  parameters: {
    type: 'object',
    properties: {
      topic: {
        type: 'string',
        description: 'The exact topic or article title to search for on Wikipedia (e.g., "Quantum mechanics", "Roman Empire").',
      },
    },
    required: ['topic'],
  },
  execute: async (args: { topic: string }) => {
    try {
      const data = await fetchWikipediaData(args.topic);

      return {
        title: data.title,
        description: data.description || 'No description available',
        summary: data.extract,
        url: data.content_urls?.desktop?.page || '',
      };
    } catch (error) {
      return {
        error: `Could not find a Wikipedia article for "${args.topic}". Try a different or more specific search term.`,
      };
    }
  },
};
