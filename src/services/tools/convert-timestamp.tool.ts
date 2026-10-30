import { ToolDefinition } from './tool.interface';

export const convertTimestampTool: ToolDefinition = {
  name: 'convert_timestamp_to_date',
  description:
    'Convert a Unix timestamp in milliseconds into a calendar date and time. Use this when interpreting createdAt timestamps in saved memories; that timestamp is when the memory was saved, not the date of an event described in its content. The result includes UTC and, if provided, the requested IANA timezone.',
  parameters: {
    type: 'object',
    properties: {
      timestamp: {
        type: 'number',
        description: 'Unix timestamp in milliseconds (e.g., 1792587554477).',
      },
      timezone: {
        type: 'string',
        description: 'Optional IANA timezone for a localized date and time (e.g., "Europe/Bucharest"). Defaults to UTC.',
      },
    },
    required: ['timestamp'],
  },
  execute: async (args: { timestamp?: number; timezone?: string }) => {
    if (typeof args.timestamp !== 'number' || !Number.isFinite(args.timestamp)) {
      return { error: 'A finite Unix timestamp in milliseconds is required.' };
    }

    const date = new Date(args.timestamp);
    if (Number.isNaN(date.getTime())) {
      return { error: 'The timestamp is outside the supported date range.' };
    }

    const timezone = args.timezone?.trim() || 'UTC';
    try {
      const localizedDateTime = date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'long',
        timeZone: timezone,
      });
      return {
        timestamp: args.timestamp,
        iso_utc: date.toISOString(),
        utc_date: date.toISOString().slice(0, 10),
        timezone,
        localized_date_time: localizedDateTime,
      };
    } catch {
      return { error: `Invalid timezone "${timezone}". Use an IANA timezone such as "Europe/Bucharest".` };
    }
  },
};
