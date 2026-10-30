import { afterEach, describe, expect, it } from '@jest/globals';
import { getCountryInfoTool } from './get-country-info.tool';

describe('get_country_info', () => {
  const originalFetch = globalThis.fetch;

  const jsonResponse = (body: unknown, ok = true) => ({ ok, json: async () => body } as Response);

  const setFetchResponses = (...responses: Response[]) => {
    globalThis.fetch = async () => {
      const response = responses.shift();
      if (!response) {
        throw new Error('No mocked response available');
      }
      return response;
    };
  };

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns country names and full capitals for Romania and Japan', async () => {
    const responses = [
      {
        name: { common: 'Romania', official: 'Romania' },
        capital: ['Bucharest'],
        population: 19286123,
        currencies: { RON: { name: 'Romanian leu', symbol: 'lei' } },
      },
      {
        value: [{
          name: 'Japan',
          capital: 'Tokyo',
          population: 125836021,
          currencies: [{ name: 'Japanese yen', symbol: '¥' }],
        }],
      },
    ];
    setFetchResponses(jsonResponse(responses[0]), jsonResponse(responses[1]));

    const romania = await getCountryInfoTool.execute({ country_name: 'Romania' });
    const japan = await getCountryInfoTool.execute({ country_name: 'Japan' });

    expect(romania.common_name).toBe('Romania');
    expect(romania.official_name).toBe('Romania');
    expect(romania.capital).toBe('Bucharest');
    expect(japan.common_name).toBe('Japan');
    expect(japan.official_name).toBe('Japan');
    expect(japan.capital).toBe('Tokyo');
    expect(japan.currencies).toContain('Japanese yen [¥]');
  });

  it('selects the United States result rather than a similarly named territory', async () => {
    setFetchResponses(jsonResponse({
        value: [
          { name: 'United States Minor Outlying Islands', population: 300 },
          { name: 'United States of America', capital: 'Washington, D.C.', population: 329484123 },
        ],
      }));

    const result = await getCountryInfoTool.execute({ country_name: 'United States' });

    expect(result.common_name).toBe('United States of America');
    expect(result.official_name).toBe('United States');
    expect(result.capital).toBe('Washington, D.C.');
    expect(Number(result.population.replaceAll(',', ''))).toBeGreaterThan(300000000);
  });

  it('keeps the existing error message for unknown countries', async () => {
    setFetchResponses(jsonResponse({}, false));

    const result = await getCountryInfoTool.execute({ country_name: 'NotARealCountry' });

    expect(result.error).toBe('Failed to compile reference metrics for "NotARealCountry".');
  });
});
