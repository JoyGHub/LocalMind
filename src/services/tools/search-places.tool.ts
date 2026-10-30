import { ollamaService } from '../ollama.service';
import { readMapToolStream } from '../../utils/utility';
import { ToolDefinition, ToolExecutionContext } from './tool.interface';

const requestMapTool = async (
  endpoint: string,
  args: Record<string, unknown>,
  context?: ToolExecutionContext,
): Promise<unknown> => {
  const response = await fetch(`${ollamaService.proxyUrl}/tools/${endpoint}`, {
    method: 'POST',
    signal: context?.signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  return readMapToolStream(response, context?.messageId);
};

export const searchNearbyPlacesTool: ToolDefinition = {
  name: 'search_nearby_places',
  description: 'Find nearby places within a radius, return structured results, and display them on an interactive map. For "near me", use the user\'s current coordinates.',
  parameters: {
    type: 'object',
    properties: {
      latitude: { type: 'number', description: 'Latitude of the search center.' },
      longitude: { type: 'number', description: 'Longitude of the search center.' },
      category: {
        type: 'string',
        description: 'Place category to search for.',
        enum: ['cafe', 'restaurant', 'supermarket', 'market', 'park', 'pharmacy', 'bakery', 'bar', 'fuel', 'hotel', 'library', 'toilets'],
      },
      radius: { type: 'integer', description: 'Search radius in meters (1-50000); defaults to 20000 (20 km).' },
      limit: { type: 'integer', description: 'Maximum places per page (1-50); defaults to 10.' },
      offset: { type: 'integer', description: 'Zero-based result offset (0-500); defaults to 0.' },
      sort_by: {
        type: 'string',
        description: 'Result order; defaults to distance.',
        enum: ['distance', 'relevance', 'rating'],
      },
      include_details: { type: 'boolean', description: 'Include available OSM tags and extended attributes.' },
    },
    required: ['latitude', 'longitude', 'category'],
  },
  execute: async (args, context) => requestMapTool('search_nearby_places', args, context),
};

export const searchPlaceByQueryTool: ToolDefinition = {
  name: 'search_place_by_query',
  description: 'Find places matching a name or address, return structured results, and show them on a map. When coordinates are supplied, only return results within the radius of those coordinates (defaults to 20 km). For "near me", use the user\'s current coordinates; for a named location, use that location\'s coordinates instead.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Place name, address, or point of interest (1-200 characters).' },
      latitude: { type: 'number', description: 'Optional latitude of the search center (current location or the explicitly requested location).' },
      longitude: { type: 'number', description: 'Optional longitude of the search center (current location or the explicitly requested location).' },
      radius: { type: 'integer', description: 'Maximum distance from the supplied coordinates in meters (1-50000); defaults to 20000 (20 km).' },
      limit: { type: 'integer', description: 'Maximum places per page (1-50); defaults to 5.' },
      offset: { type: 'integer', description: 'Zero-based result offset (0-500); defaults to 0.' },
      sort_by: {
        type: 'string',
        description: 'Result order; defaults to distance when coordinates are provided, otherwise relevance.',
        enum: ['distance', 'relevance', 'rating'],
      },
      include_details: { type: 'boolean', description: 'Include extended attributes available from the source.' },
    },
    required: ['query'],
  },
  execute: async (args, context) => requestMapTool('search_place_by_query', args, context),
};
