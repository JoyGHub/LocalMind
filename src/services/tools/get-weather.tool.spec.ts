import { afterEach, describe, expect, it } from '@jest/globals';
import { getWeatherTool } from './get-weather.tool';

describe('get_weather geocoding', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const cases = [
    { input: 'London, UK', city: 'London', countryCode: 'GB', country: 'United Kingdom' },
    { input: 'New York, USA', city: 'New York', countryCode: 'US', country: 'United States' },
    { input: 'Bucharest, RO', city: 'Bucharest', countryCode: 'RO', country: 'Romania' },
    { input: 'Amsterdam, NL', city: 'Amsterdam', countryCode: 'NL', country: 'The Netherlands' },
    { input: 'Prague, CZ', city: 'Prague', countryCode: 'CZ', country: 'Czechia' },
    { input: 'Istanbul, TR', city: 'Istanbul', countryCode: 'TR', country: 'Republic of Türkiye' },
    { input: 'Istanbul, Turkey', city: 'Istanbul', countryCode: 'TR', country: 'Republic of Türkiye' },
    { input: 'Amsterdam, Netherlands', city: 'Amsterdam', qualifierName: 'Amsterdam, The Netherlands', country: 'The Netherlands' },
    { input: 'Prague, Czech Republic', city: 'Prague', qualifierName: 'Prague, Czechia', country: 'Czechia' },
    { input: 'London', city: 'London', country: undefined, countryCode: undefined },
    { input: 'london, uk', city: 'London', countryCode: 'GB', country: 'United Kingdom' },
    { input: '"London, UK"', city: 'London', countryCode: 'GB', country: 'United Kingdom' },
  ];

  it.each(cases)('resolves "$input" with the intended geocoding query', async ({ input, city, countryCode, qualifierName, country }) => {
    const geocodingQueries: URL[] = [];
    globalThis.fetch = async (inputUrl: RequestInfo | URL) => {
      const url = new URL(String(inputUrl));
      if (url.hostname === 'geocoding-api.open-meteo.com') {
        geocodingQueries.push(url);
        const isQualifiedRequest = url.searchParams.has('countryCode')
          || url.searchParams.get('name')?.includes(',');
        const resultCountry = isQualifiedRequest || !country ? country || 'United Kingdom' : 'Initial city-only result';
        return {
          ok: true,
          json: async () => ({
            results: [{ latitude: 1, longitude: 2, name: city, country: resultCountry }],
          }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({
          elevation: 0,
          timezone: 'Europe/London',
          timezone_abbreviation: 'GMT',
          current: {
            time: '2026-01-01T12:00',
            temperature_2m: 10,
            weather_code: 0,
            relative_humidity_2m: 50,
          },
        }),
      } as Response;
    };

    const result = await getWeatherTool.execute({ location: input });

    expect(result.location).toBe(`${city}, ${country || 'United Kingdom'}`);
    expect(geocodingQueries[0].searchParams.get('name')).toBe(city);
    expect(geocodingQueries[0].searchParams.get('countryCode')).toBeNull();
    if (countryCode || qualifierName) {
      expect(geocodingQueries[1].searchParams.get('countryCode')).toBe(countryCode || null);
      expect(geocodingQueries[1].searchParams.get('name')).toBe(qualifierName || city);
    }
  });

  it('keeps a full country name in the name query', async () => {
    let qualifiedName: string | null = null;
    globalThis.fetch = async (inputUrl: RequestInfo | URL) => {
      const url = new URL(String(inputUrl));
      if (url.hostname === 'geocoding-api.open-meteo.com') {
        if (url.searchParams.get('name')?.includes(',')) {
          qualifiedName = url.searchParams.get('name');
        }
        return {
          ok: true,
          json: async () => ({
            results: [{ latitude: 1, longitude: 2, name: 'London', country: 'United Kingdom' }],
          }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({
          elevation: 0,
          timezone: 'Europe/London',
          timezone_abbreviation: 'GMT',
          current: { time: '2026-01-01T12:00', temperature_2m: 10, weather_code: 0, relative_humidity_2m: 50 },
        }),
      } as Response;
    };

    await getWeatherTool.execute({ location: 'London, United Kingdom' });

    expect(qualifiedName).toBe('London, United Kingdom');
  });
});
