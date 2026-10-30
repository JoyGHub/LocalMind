import { ToolDefinition } from './tool.interface';
import { unit } from 'mathjs';

export const convertUnitsTool: ToolDefinition = {
  name: 'convert_units',
  description:
    'Converts measurements from one unit system to another (e.g., Metric to Imperial, Celsius to Fahrenheit). Supported units include mass (kg, lb, oz), length (m, cm, in, ft, mi), volume (l, ml, gal, qt), and temperature (degC, degF, K).',
  parameters: {
    type: 'object',
    properties: {
      value: {
        type: 'number',
        description: 'The numeric value to convert (e.g., 100, 5.5).',
      },
      from_unit: {
        type: 'string',
        description: 'The source unit identifier (e.g., "kg", "m", "cm", "degC", "l", "gal").',
      },
      to_unit: {
        type: 'string',
        description: 'The target unit identifier to convert into (e.g., "lb", "in", "ft", "degF", "ml").',
      },
    },
    required: ['value', 'from_unit', 'to_unit'],
  },
  execute: async (args: { value: number; from_unit: string; to_unit: string }) => {
    try {
      const cleanUnitName = (u: string) => {
        const lower = u.trim().toLowerCase();
        if (lower === 'c' || lower === 'celsius' || lower === '°c') return 'degC';
        if (lower === 'f' || lower === 'fahrenheit' || lower === '°f') return 'degF';
        if (lower === 'k' || lower === 'kelvin') return 'K';
        return u;
      };

      const from = cleanUnitName(args.from_unit);
      const to = cleanUnitName(args.to_unit);

      const resultUnit = unit(args.value, from).to(to);

      return {
        original_value: args.value,
        from_unit: args.from_unit,
        converted_value: parseFloat(resultUnit.toNumber().toFixed(4)),
        to_unit: args.to_unit,
        formatted_string: resultUnit.toString(),
      };
    } catch (error: any) {
      return {
        error: `Failed to convert ${args.value} ${args.from_unit} to ${args.to_unit}. Ensure both units belong to the same category (e.g. you cannot convert mass to length). Details: ${error.message}`,
      };
    }
  },
};
