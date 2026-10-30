import { ToolDefinition } from './tool.interface';

const countryCodes = new Set(
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' '),
);

const countryAliases: Record<string, string> = {
  UK: 'GB',
  'U.K.': 'GB',
  USA: 'US',
  'U.S.': 'US',
  'U.S.A.': 'US',
  UAE: 'AE',
};

const titleCase = (value: string): string =>
  value.toLocaleLowerCase('en').replace(/(^|[\s'-])([a-z])/g, (_, separator: string, letter: string) =>
    `${separator}${letter.toLocaleUpperCase('en')}`,
  );

const normalizeLocation = (location: string) => {
  const parts = location.split(',').map(part => part
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\s+/g, ' '));
  const [rawCity = '', ...rawQualifierParts] = parts;
  const city = titleCase(rawCity);
  const rawQualifier = rawQualifierParts.join(',').trim();
  const qualifier = rawQualifier ? titleCase(rawQualifier) : '';
  const normalizedQualifier = qualifier.toLocaleLowerCase('en');
  const uppercaseQualifier = qualifier.toLocaleUpperCase('en');
  const qualifierCode = countryAliases[uppercaseQualifier]
    || (qualifier.length === 2 && countryCodes.has(uppercaseQualifier) ? uppercaseQualifier : undefined)
    || (normalizedQualifier === 'turkey' || normalizedQualifier === 'türkiye' ? 'TR' : undefined);

  const normalizedNameQualifier = normalizedQualifier === 'netherlands'
      ? 'The Netherlands'
      : normalizedQualifier === 'czech republic'
        ? 'Czechia'
        : qualifier;

  return {
    city,
    qualifier: qualifierCode ? undefined : normalizedNameQualifier,
    qualifierCode,
  };
};

const getWeatherCondition = (code: number): string => {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy / Overcast';
  if (code <= 48) return 'Fog';
  if (code <= 55) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Rain showers';
  if (code <= 86) return 'Snow showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Unknown';
};

export const getWeatherTool: ToolDefinition = {
  name: 'get_weather',
  description: 'Get the current weather for a specific location.',
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'The city and state/country, e.g., Bucharest, Romania',
      },
    },
    required: ['location'],
  },
  execute: async (args: { location: string }) => {
    try {
      const { city, qualifier, qualifierCode } = normalizeLocation(args.location);
      const fetchCoordinates = async (searchName: string, countryCode?: string) => {
        const params = new URLSearchParams({
          name: searchName,
          count: '1',
          language: 'en',
          format: 'json',
        });
        if (countryCode) params.set('countryCode', countryCode);
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`;
        const res = await fetch(geoUrl);
        if (!res.ok) {
          throw new Error(`Geocoding request failed with status ${res.status}`);
        }
        return await res.json() as { results?: Array<Record<string, unknown>> };
      };

      let geoData: { results?: Array<Record<string, unknown>> } | undefined;
      let lastGeocodingError: unknown;

      try {
        geoData = await fetchCoordinates(city);
      } catch (error) {
        lastGeocodingError = error;
      }

      let selectedLocation = geoData?.results?.[0];
      if (qualifier || qualifierCode) {
        const qualifiedName = qualifier ? `${city}, ${qualifier}` : city;
        try {
          const qualifiedData = await fetchCoordinates(qualifiedName, qualifierCode);
          selectedLocation = qualifiedData.results?.[0] || selectedLocation;
        } catch (error) {
          lastGeocodingError = error;
        }
      }

      if (!selectedLocation) {
        try {
          geoData = await fetchCoordinates(city);
          selectedLocation = geoData.results?.[0];
        } catch (error) {
          lastGeocodingError = error;
        }
      }

      if (!selectedLocation) {
        if (lastGeocodingError) {
          console.error('Weather geocoding failed:', lastGeocodingError);
        }
        return { error: `Could not find coordinates for ${args.location}.` };
      }

      const { latitude, longitude, name, country } = selectedLocation;

      // Add timezone=auto to automatically resolve to local time
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`;
      const weatherRes = await fetch(weatherUrl);
      const weatherData = await weatherRes.json();

      const current = weatherData.current;

      return {
        location: `${name}, ${country}`,
        original_request: args.location,
        coordinates: {
          latitude: latitude,
          longitude: longitude,
        },
        elevation: `${weatherData.elevation}m`,
        timezone: weatherData.timezone + ' ' + weatherData.timezone_abbreviation,
        local_time: current.time,
        temperature: `${current.temperature_2m}°C`,
        condition: getWeatherCondition(current.weather_code),
        humidity: `${current.relative_humidity_2m}%`,
      };
    } catch (error) {
      return { error: `Failed to fetch weather data for ${args.location}` };
    }
  },
};
