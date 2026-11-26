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

    const indicator = page.root!.shadowRoot!.querySelector('.tool-indicator');
    expect(indicator?.textContent).toContain('Searching for example...');
    expect(indicator?.querySelector('strong')?.textContent).toBe('example');
    expect(indicator?.querySelector('sl-icon')?.getAttribute('name')).toBe('search');
  });

  it('formats tool arguments into clear status messages', async () => {
    const page = await newSpecPage({
      components: [LocalMindMessage],
      html: '<localmind-message></localmind-message>',
    });
    page.rootInstance.message = {
      id: 'assistant-message',
      role: 'assistant',
      content: '',
      timestamp: 0,
      tool_calls: [
        { function: { name: 'convert_units', arguments: { from_unit: 'km', to_unit: 'mi' } } },
        { function: { name: 'generate_pdf_report', arguments: { title: 'A guide to gardening' } } },
      ],
    };
    await page.waitForChanges();

    const indicators = Array.from(page.root!.shadowRoot!.querySelectorAll('.tool-indicator'));
    expect(indicators[0].textContent).toContain('Converting from km to mi...');
    expect(Array.from(indicators[0].querySelectorAll('strong')).map(element => element.textContent)).toEqual(['km', 'mi']);
    expect(indicators[1].textContent).toContain('Generating a PDF about A guide to gardening...');
    expect(indicators[1].querySelector('strong')?.textContent).toBe('A guide to gardening');
  });

  it('updates code execution output as progress messages arrive', async () => {
    const page = await newSpecPage({
      components: [LocalMindMessage],
      html: '<localmind-message></localmind-message>',
    });
    page.rootInstance.message = {
      id: 'assistant-message',
      role: 'assistant',
      content: '',
      timestamp: 0,
      workflowId: 'workflow-1',
      tool_calls: [{ function: { name: 'execute_code', arguments: { language: 'python', code: 'print("hello")' } } }],
    };
    page.rootInstance.executionMessages = [
      {
        id: 'tool-message',
        role: 'tool',
        name: 'execute_code',
        content: JSON.stringify({
          language: 'python',
          stdout: 'hello',
          stderr: '',
          exit_code: null,
          success: false,
          error: null,
          duration_ms: 0,
          running: true,
        }),
        timestamp: 0,
        workflowId: 'workflow-1',
      },
    ];
    await page.waitForChanges();

    const codeExecution = page.root!.shadowRoot!.querySelector('.code-execution');
    expect(codeExecution?.textContent).toContain('print("hello")');
    expect(codeExecution?.textContent).toContain('Output');
    expect(codeExecution?.textContent).toContain('hello');
    expect(codeExecution?.textContent).toContain('Execution in progress...');

    page.rootInstance.executionMessages = [
      {
        ...page.rootInstance.executionMessages[0],
        content: JSON.stringify({
          language: 'python',
          stdout: 'hello world',
          stderr: '',
          exit_code: 0,
          success: true,
          error: null,
          duration_ms: 12,
          running: false,
        }),
      },
    ];
    await page.waitForChanges();

    expect(codeExecution?.textContent).toContain('hello world');
    expect(codeExecution?.textContent).toContain('Exit code: 0');
  });
});
