import { afterEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../store/store', () => ({
  __esModule: true,
  default: {},
  storeService: { updateMessageInUI: jest.fn() },
}));
jest.mock('nanoid', () => ({ nanoid: () => 'test-id' }));
jest.mock('./tools', () => ({ getOllamaToolsSchema: () => [] }));
jest.mock('./settings.service', () => ({ settingsState: {} }));

import { storeService } from '../store/store';
import { ChatService } from './chat.service';

describe('ChatService.readChatStream', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps thinking, text, and tool calls in stream order', async () => {
    const updates = jest.spyOn(storeService, 'updateMessageInUI').mockImplementation(() => {});
    const events = [
      { message: { thinking: 'first thought' } },
      { message: { content: 'first answer' } },
      { message: { thinking: 'second thought' } },
      { message: { content: 'second answer' } },
      {
        message: {
          tool_calls: [{ function: { name: 'search_web', arguments: { query: 'example' } } }],
        },
      },
    ];
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(events.map(event => `data: ${JSON.stringify(event)}\n\n`).join('')));
        controller.close();
      },
    });

    const chatService = new ChatService();
    jest.spyOn(chatService, 'scrollToBottom').mockImplementation(() => {});
    await chatService.readChatStream(stream, 'assistant-message');

    const lastUpdate = updates.mock.calls[updates.mock.calls.length - 1][1];
    expect(lastUpdate.parts).toEqual([
      { type: 'thinking', content: 'first thought' },
      { type: 'text', content: 'first answer' },
      { type: 'thinking', content: 'second thought' },
      { type: 'text', content: 'second answer' },
      { type: 'tool_call', call: { function: { name: 'search_web', arguments: { query: 'example' } } } },
    ]);
  });
});
