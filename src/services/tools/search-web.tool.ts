import { ToolDefinition } from './tool.interface';
import { Env } from '@stencil/core';

const getApiKey = () => {
  return Env.TAVILY_API_KEY || '';
};

type SearchDepth = 'basic' | 'advanced';
type TimeRange = 'day' | 'week' | 'month' | 'year';

interface SearchOptions {
  max_results?: number;
  search_depth?: SearchDepth;
  time_range?: TimeRange;
  include_domains?: string[];
  exclude_domains?: string[];
}

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  error?: unknown;
}

const containsErrorObject = (value: unknown): boolean => {
  if (typeof value === 'string') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      return /["']?error["']?\s*:\s*\{/i.test(value);
    }
    if (parsed !== null && typeof parsed === 'object' && containsErrorObject(parsed)) {
      return true;
    }
    return /["']?error["']?\s*:\s*\{/i.test(value);
  }

  if (Array.isArray(value)) {
    return value.some(containsErrorObject);
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.entries(record).some(([key, nestedValue]) =>
      key.toLowerCase() === 'error' && nestedValue !== null && typeof nestedValue === 'object'
        ? true
        : containsErrorObject(nestedValue),
    );
  }

  return false;
};

const cleanSnippet = (snippet: string) => {
  const cleaned = snippet.replace(/\s+/g, ' ').trim();
  return cleaned.length > 400 ? `${cleaned.slice(0, 399).trimEnd()}…` : cleaned;
};

const fetchTavilySearch = async (query: string, options: SearchOptions = {}) => {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('Tavily API key is missing. Please add TAVILY_API_KEY to your .env file.');
  }

  const maxResults = Number.isInteger(options.max_results)
    ? Math.min(10, Math.max(1, options.max_results as number))
    : 5;
  const searchDepth = options.search_depth === 'advanced' ? 'advanced' : 'basic';

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      query: query,
      search_depth: searchDepth,
      include_images: false,
      include_answer: true,
      max_results: maxResults,
      ...(options.time_range ? { time_range: options.time_range } : {}),
      ...(options.include_domains ? { include_domains: options.include_domains } : {}),
      ...(options.exclude_domains ? { exclude_domains: options.exclude_domains } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    let detail: string;
    try {
      const data: unknown = JSON.parse(body);
      const error = data && typeof data === 'object' ? (data as Record<string, unknown>).error : null;
      const message =
        error && typeof error === 'object' ? (error as Record<string, unknown>).message : null;
      detail = typeof message === 'string' ? message : body;
    } catch {
      throw new Error(`Search API returned status: ${response.status}`);
    }
    throw new Error(`Search failed: ${detail} (HTTP ${response.status})`);
  }

  const data = await response.json();
  const upstreamResults: TavilyResult[] = Array.isArray(data.results) ? data.results : [];
  const errorResults = upstreamResults.filter(
    (result) => containsErrorObject(result.content) || containsErrorObject(result.error),
  );

  return {
    answer: typeof data.answer === 'string' ? data.answer : null,
    allResultsWereErrors: upstreamResults.length > 0 && errorResults.length === upstreamResults.length,
    results: upstreamResults
      .filter((result) => !containsErrorObject(result.content) && !containsErrorObject(result.error))
      .filter((result) => Number.isFinite(result.score) && result.score >= 0.5)
      .map((result) => ({
        title: result.title,
        url: result.url,
        snippet: cleanSnippet(typeof result.content === 'string' ? result.content : ''),
        score: Math.min(1, Math.max(0, result.score)),
      }))
      .sort((left, right) => right.score - left.score),
  };
};

export const searchWebTool: ToolDefinition = {
  name: 'search_web',
  description: 'Search the internet for up-to-date information, news, or general queries. Returns relevant results with titles, URLs, relevance scores, and text snippets.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to execute (e.g., "latest AI news 2026", "weather in tokyo").',
      },
      max_results: {
        type: 'integer',
        description: 'Maximum number of results to request (default 5, maximum 10).',
      },
      search_depth: {
        type: 'string',
        enum: ['basic', 'advanced'],
        description: 'Search depth (default "basic").',
      },
      time_range: {
        type: 'string',
        enum: ['day', 'week', 'month', 'year'],
        description: 'Optional time range for recent results.',
      },
      include_domains: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional domains to include in results.',
      },
      exclude_domains: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional domains to exclude from results.',
      },
    },
    required: ['query'],
  },
  execute: async (args: { query: string } & SearchOptions) => {
    if (args.query.length < 2) {
      return {
        error: 'Query too short (minimum 2 characters)',
        results: [],
      };
    }

    try {
      const search = await fetchTavilySearch(args.query, args);

      if (search.allResultsWereErrors) {
        return {
          query: args.query,
          source: 'Tavily Search API',
          error: 'Tavily returned only error payloads instead of search results.',
          results: [],
        };
      }

      if (search.results.length === 0) {
        return {
          query: args.query,
          source: 'Tavily Search API',
          results: [],
          aiAnswer: null,
          no_results: true,
        };
      }

      return {
        query: args.query,
        source: 'Tavily Search API',
        results: search.results,
        aiAnswer: search.answer,
      };
    } catch (error: unknown) {
      return {
        error:
          error instanceof Error && error.message.startsWith('Search failed: ')
            ? error.message
            : `Search failed. ${error instanceof Error ? error.message : String(error)}`,
        results: [],
      };
    }
  },
};
