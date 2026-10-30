import { ToolDefinition } from './tool.interface';

type CountryRecord = Record<string, unknown>;

const fetchCountryInfo = async (countryName: string) => {
  const url = `https://countries.dev/name/${encodeURIComponent(countryName)}?fields=name,currencies,capital,region,subregion,languages,borders,population`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Country not found');
  }

  return await response.json();
};

const asRecord = (value: unknown): CountryRecord | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as CountryRecord) : undefined;

const countryNameFields = (country: CountryRecord) => {
  const name = asRecord(country.name);
  return {
    common: typeof name?.common === 'string' ? name.common : typeof country.name === 'string' ? country.name : '',
    official: typeof name?.official === 'string' ? name.official : '',
  };
};

const getCountryMatchScore = (country: CountryRecord, requestedName: string) => {
  const query = requestedName.trim().toLocaleLowerCase();
  const { common, official } = countryNameFields(country);
  const candidates = [common, official].map(name => name.trim().toLocaleLowerCase()).filter(Boolean);
  if (candidates.includes(query)) return 0;
  if (candidates.some(name => name.startsWith(query))) return 1;
  if (candidates.some(name => name.includes(query))) return 2;
  return 3;
};

const getCurrencies = (currencies: unknown): string[] => {
  const entries: Array<[string, unknown]> = Array.isArray(currencies)
    ? currencies.map((currency, index) => [String(index), currency])
    : Object.entries(asRecord(currencies) || {});

  return entries.map(([, value]) => {
    const currency = asRecord(value);
    const name = typeof currency?.name === 'string' ? currency.name : '';
    const symbol = typeof currency?.symbol === 'string' ? currency.symbol : '';
    return symbol ? `${name} [${symbol}]` : name;
  }).filter(Boolean);
};

export const getCountryInfoTool: ToolDefinition = {
  name: 'get_country_info',
  description: 'Get detailed factual data about a country, including its official name, capital, population, languages, borders, and currency details.',
  parameters: {
    type: 'object',
    properties: {
      country_name: {
        type: 'string',
        description: 'The common name of the country (e.g., "Romania", "Japan", "France").',
      },
    },
    required: ['country_name'],
  },
  execute: async (args: { country_name: string }) => {
    try {
      const response = await fetchCountryInfo(args.country_name);
      const responseRecord = asRecord(response);
      const results = Array.isArray(response)
        ? response
        : Array.isArray(responseRecord?.value)
          ? responseRecord.value
          : responseRecord
            ? [responseRecord]
            : [];

      const countries = results.map(asRecord).filter((country): country is CountryRecord => Boolean(country));
      if (countries.length === 0) {
        throw new Error('Country not found');
      }

      const data = countries
        .map((country, index) => ({ country, index, score: getCountryMatchScore(country, args.country_name) }))
        .sort((left, right) => left.score - right.score
          || countryNameFields(left.country).common.length - countryNameFields(right.country).common.length
          || left.index - right.index)[0].country;

      const names = countryNameFields(data);
      const capitals = Array.isArray(data.capital)
        ? data.capital.filter((capital): capital is string => typeof capital === 'string' && Boolean(capital))
        : typeof data.capital === 'string' && data.capital
          ? [data.capital]
          : [];
      const languages = Array.isArray(data.languages)
        ? data.languages
        : Object.values(asRecord(data.languages) || {});
      const population = data.population;

      return {
        common_name: names.common || args.country_name,
        official_name: names.official || args.country_name,
        capital: capitals.length > 0 ? capitals.join(', ') : 'N/A',
        region: typeof data.region === 'string' ? data.region : '',
        subregion: typeof data.subregion === 'string' ? data.subregion : '',
        population: typeof population === 'number' ? population.toLocaleString() : typeof population === 'string' ? population : '0',
        languages: languages,
        currencies: getCurrencies(data.currencies),
        border_countries: Array.isArray(data.borders) ? data.borders : [],
      };
    } catch (error) {
      return { error: `Failed to compile reference metrics for "${args.country_name}".` };
    }
  },
};
