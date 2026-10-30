import { ToolDefinition } from './tool.interface';
import { evaluate } from 'mathjs';

export const calculatorTool: ToolDefinition = {
  name: 'calculator',
  description:
    'Uses the library mathjs. Evaluates mathematical expressions safely and accurately. Use this tool whenever you need to perform calculations to avoid hallucinating math results.',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'The mathematical expression to evaluate (e.g., "2 + 2", "sqrt(144)", "sin(45 deg) ^ 2", "12.5% of 80").',
      },
    },
    required: ['expression'],
  },
  execute: async (args: { expression: string }) => {
    try {
      const rawResult = evaluate(args.expression);

      return {
        expression: args.expression,
        result: rawResult.toString(),
      };
    } catch (error: any) {
      return {
        error: `Failed to evaluate "${args.expression}". Ensure it is a standard mathematical formula. Details: ${error.message}`,
      };
    }
  },
};
