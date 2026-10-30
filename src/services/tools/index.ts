import { ToolDefinition } from './tool.interface';
import { getWeatherTool } from './get-weather.tool';
import { getWikipediaSummaryTool } from './get-wikipedia.tool';
import { getCountryInfoTool } from './get-country-info.tool';
import { getCryptoPriceTool } from './get-crypto-price.tool';
import { getWorldTimeTool } from './get-world-time.tool';
import { searchWebTool } from './search-web.tool';
import { getUserLatitudeAndLongitude } from './get-user-location.tool';
import { calculatorTool } from './calculator.tool';
import { convertUnitsTool } from './convert-units.tool';
import { generatePdfTool } from './generate-pdf.tool';
import { addMemoryTool } from './add-memory.tool';
import { searchMemoriesTool } from './search-memories.tool';
import { getAllMemoriesTool } from './get-all-memories.tool';
import { convertTimestampTool } from './convert-timestamp.tool';
import { searchNearbyPlacesTool, searchPlaceByQueryTool } from './search-places.tool';
import { settingsState } from '../settings.service';

export const AVAILABLE_TOOLS: ToolDefinition[] = [
  getUserLatitudeAndLongitude,
  getWorldTimeTool,
  searchWebTool,
  searchNearbyPlacesTool,
  searchPlaceByQueryTool,
  getWikipediaSummaryTool,
  getWeatherTool,
  getCountryInfoTool,
  getCryptoPriceTool,
  calculatorTool,
  convertUnitsTool,
  convertTimestampTool,
  generatePdfTool,
  addMemoryTool,
  searchMemoriesTool,
  getAllMemoriesTool,
];

export const toolRegistry = new Map<string, ToolDefinition>(AVAILABLE_TOOLS.map(tool => [tool.name, tool]));

const toOllamaToolSchema = (tool: ToolDefinition) => ({
  type: 'function',
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  },
});

export const getOllamaToolsSchema = () =>
  AVAILABLE_TOOLS.filter(tool => {
    if (tool.name === 'add_memory') return settingsState.saveMemories;
    if (tool.name === 'search_memories' || tool.name === 'get_all_memories') return settingsState.readMemories;
    return true;
  }).map(toOllamaToolSchema);
