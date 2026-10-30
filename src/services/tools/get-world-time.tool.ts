import { ToolDefinition } from './tool.interface';

const fetchWorldTime = async (timezone: string) => {
  const url = `https://timeapi.io/api/Time/current/zone?timeZone=${encodeURIComponent(timezone)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Timezone not found');
  }

  return await response.json();
};

export const getWorldTimeTool: ToolDefinition = {
  name: 'get_world_time',
  description: 'Get the exact current local time, date, and timezone configuration details for a specific timezone region.',
  parameters: {
    type: 'object',
    properties: {
      timezone: {
        type: 'string',
        description: 'The Area/Location identifier formatted string (e.g., "Europe/Bucharest", "America/New_York", "Asia/Tokyo").',
      },
    },
    required: ['timezone'],
  },
  execute: async (args: { timezone: string }) => {
    try {
      const data = await fetchWorldTime(args.timezone);

      return {
        timezone: data.timeZone,
        datetime: data.dateTime,
        day_of_week: data.dayOfWeek,
        date: data.date,
        time: data.time,
        is_dst: data.dstActive,
      };
    } catch (error) {
      return {
        error: `Could not fetch time for "${args.timezone}". Ensure the parameter matches an official IANA Time Zone database name.`,
      };
    }
  },
};
