import { newSpecPage } from '@stencil/core/testing';
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('../../services/markdown.service', () => ({
  MarkdownService: { render: (markdown: string) => markdown },
}));

import { LocalMindMessage } from './localmind-message';

describe('localmind-message', () => {
  it('renders interleaved message parts in their original order', async () => {
    const page = await newSpecPage({
      components: [LocalMindMessage],
      html: '<localmind-message></localmind-message>',
    });
    page.rootInstance.message = {
      id: 'assistant-message',
      role: 'assistant',
      content: 'first answer second answer',
      timestamp: 0,
      parts: [
        { type: 'thinking', content: 'first thought' },
        { type: 'text', content: 'first answer' },
        { type: 'map', mapData: { center: [0, 0], userLocation: null, places: [] } },
        { type: 'thinking', content: 'second thought' },
        { type: 'text', content: 'second answer' },
      ],
    };
    await page.waitForChanges();

    const renderedOrder = Array.from(
      page.root!.shadowRoot!.querySelectorAll('.thinking-block, .assistant-response-content, .map-widgets'),
    ).map(element => {
      if (element.classList.contains('thinking-block')) return 'thinking';
      if (element.classList.contains('map-widgets')) return 'map';
      return 'text';
    });
    expect(renderedOrder).toEqual(['thinking', 'text', 'map', 'thinking', 'text']);
  });

  it('shows tool calls even when the assistant also returned text', async () => {
    const page = await newSpecPage({
      components: [LocalMindMessage],
      html: '<localmind-message></localmind-message>',
    });
    page.rootInstance.message = {
      id: 'assistant-message',
      role: 'assistant',
      content: 'I will look that up.',
      timestamp: 0,
      tool_calls: [{ function: { name: 'search_web', arguments: { query: 'example' } } }],
    };
    await page.waitForChanges();

    expect(page.root!.shadowRoot!.querySelector('.tool-indicator')?.textContent).toContain('search_web');
  });
});
