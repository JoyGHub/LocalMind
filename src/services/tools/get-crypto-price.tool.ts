import { ToolDefinition } from './tool.interface';

const fetchCryptoPrice = async (coinId: string) => {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId.toLowerCase())}&vs_currencies=usd`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch crypto data');
  }

  return await response.json();
};

export const getCryptoPriceTool: ToolDefinition = {
  name: 'get_crypto_price',
  description: 'Get the current real-time price of a cryptocurrency in USD (e.g., bitcoin, ethereum, solana).',
  parameters: {
    type: 'object',
    properties: {
      coin_id: {
        type: 'string',
        description: 'The API ID of the cryptocurrency on CoinGecko (e.g., "bitcoin", "ethereum", "solana", "ripple"). Use lowercase.',
      },
    },
    required: ['coin_id'],
  },
  execute: async (args: { coin_id: string }) => {
    try {
      const data = await fetchCryptoPrice(args.coin_id);
      const targetId = args.coin_id.toLowerCase();

      if (!data[targetId] || data[targetId].usd === undefined) {
        return { error: `Could not find price data for "${args.coin_id}". Make sure to use the valid asset identifier name.` };
      }

      return {
        crypto_id: targetId,
        currency: 'USD',
        current_price: `$${data[targetId].usd}`,
        timestamp: Date.now(),
      };
    } catch (error) {
      return { error: `Failed to fetch real-time market data for ${args.coin_id}` };
    }
  },
};
