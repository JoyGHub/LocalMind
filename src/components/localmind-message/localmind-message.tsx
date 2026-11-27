import { Component, Element, h, Prop, State } from '@stencil/core';
import { Message, MessagePart, ToolCall } from '../../types/interfaces';
import { MarkdownService } from '../../services/markdown.service';
import { getMessageParts } from '../../utils/message-parts';
import { downloadImageAsFormat, ImageDownloadFormat } from '../../utils/image-download';

type ToolStatusPart = { text: string; emphasis?: boolean };
type ToolStatus = { icon: string; parts: ToolStatusPart[] };
type CodeExecutionResult = {
  language: string;
  stdout: string;
  stderr: string;
  exit_code: number | null;
  success: boolean;
  error: string | null;
  duration_ms: number;
  running?: boolean;
};

@Component({
  tag: 'localmind-message',
  styleUrl: 'localmind-message.css',
  shadow: true,
  assetsDirs: ['assets'],
})
export class LocalMindMessage {
  @Element() el!: HTMLElement;
  @Prop() message!: Message;
  @Prop() executionMessages: Message[] = [];
  @Prop() isWritingAnswer!: boolean;
  @Prop() isLastMessage!: boolean;

  @State() isHovered = false;
  @State() isExecutionOutputOpen = true;
  @State() isImageFullscreen = false;

  downloadMenuEl!: HTMLElement;
  previousResponseText: string | null = null;

  componentDidLoad() {
    if (this.downloadMenuEl) {
      this.downloadMenuEl.addEventListener('sl-select', this.boundHandleDownloadSelect);
    }
  }

  disconnectedCallback() {
    if (this.downloadMenuEl) {
      this.downloadMenuEl.removeEventListener('sl-select', this.boundHandleDownloadSelect);
    }
  }

  boundHandleDownloadSelect = (event: Event) => {
    const generatedImage = this.message?.attachment?.type === 'generated-image' ? this.message.attachment : null;
    if (!generatedImage) return;

    const customEvent = event as CustomEvent<{ item: { value?: string } }>;
    const format = customEvent.detail?.item?.value as ImageDownloadFormat | undefined;
    if (!format) return;

    downloadImageAsFormat(generatedImage.url, format, generatedImage.name);
  };

  handleImageClick = () => {
    this.isImageFullscreen = true;
  };

  handleDownloadControlClick = (event: MouseEvent) => {
    event.stopPropagation();
  };

  handleCloseFullscreen = () => {
    this.isImageFullscreen = false;
  };

  componentDidRender() {
    const contentElements = this.el.shadowRoot?.querySelectorAll('.assistant-response-content');
    if (!contentElements?.length) return;

    const currentText = Array.from(contentElements)
      .map(content => content.textContent || '')
      .join('');
    if (this.previousResponseText === null) {
      this.previousResponseText = currentText;
      if (this.isWritingAnswer && this.isLastMessage) {
        contentElements.forEach(content => this.animateTextFrom(content, 0));
      }
      return;
    }

    if (currentText === this.previousResponseText) return;

    let sharedPrefixLength = 0;
    const sharedLimit = Math.min(this.previousResponseText.length, currentText.length);
    while (sharedPrefixLength < sharedLimit && this.previousResponseText[sharedPrefixLength] === currentText[sharedPrefixLength]) {
      sharedPrefixLength++;
    }

    this.previousResponseText = currentText;
    if (this.isWritingAnswer && this.isLastMessage && sharedPrefixLength < currentText.length) {
      let offset = 0;
      contentElements.forEach(content => {
        this.animateTextFrom(content, Math.max(0, sharedPrefixLength - offset));
        offset += content.textContent?.length ?? 0;
      });
    }
  }

  animateTextFrom(content: Element, startIndex: number) {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    let textNode: Node | null;
    while ((textNode = walker.nextNode())) {
      if (textNode instanceof Text) textNodes.push(textNode);
    }

    let position = 0;
    for (const node of textNodes) {
      const textLength = node.textContent?.length || 0;
      const offset = Math.max(0, startIndex - position);
      position += textLength;
      if (offset >= textLength) continue;

      const animatedNode = offset > 0 ? node.splitText(offset) : node;
      const wrapper = document.createElement('span');
      wrapper.className = 'assistant-response-token';
      animatedNode.parentNode?.replaceChild(wrapper, animatedNode);
      wrapper.appendChild(animatedNode);
    }
  }

  getToolStatus(call: ToolCall): ToolStatus {
    const args = call.function.arguments;
    const getText = (key: string) => {
      const value = args[key];
      return typeof value === 'string' && value.trim() ? value.trim() : undefined;
    };
    const withDetail = (icon: string, prefix: string, detail: string | undefined, fallback: string) => ({
      icon,
      parts: [{ text: prefix }, { text: detail || fallback, emphasis: Boolean(detail) }, { text: '...' }],
    });

    switch (call.function.name) {
      case 'search_web':
        return withDetail('search', 'Searching for ', getText('query'), 'information');
      case 'search_place_by_query':
        return withDetail('geo-alt', 'Finding places matching ', getText('query'), 'your search');
      case 'search_nearby_places':
        return withDetail('geo-alt', 'Finding nearby ', getText('category'), 'places');
      case 'get_weather':
        return withDetail('cloud-sun', 'Getting weather for ', getText('location'), 'your location');
      case 'get_country_info':
        return withDetail('globe', 'Getting info on ', getText('country_name'), 'the requested country');
      case 'get_wikipedia_summary':
        return withDetail('book', 'Looking up ', getText('topic'), 'that topic');
      case 'get_world_time':
        return withDetail('clock', 'Checking the time in ', getText('timezone'), 'the requested location');
      case 'get_crypto_price':
        return withDetail('currency-bitcoin', 'Checking the price of ', getText('coin_id'), 'that cryptocurrency');
      case 'search_memories':
        return withDetail('journal-text', 'Searching your memories for ', getText('query'), 'relevant details');
      case 'generate_pdf_report':
        return withDetail('file-earmark-pdf', 'Generating a PDF about ', getText('title'), 'your topic');
      case 'generate_image':
        return withDetail('image', 'Generating an image of ', getText('prompt'), 'your description');
      case 'calculator':
        return { icon: 'calculator', parts: [{ text: 'Calculating...' }] };
      case 'convert_units': {
        const from = getText('from_unit');
        const to = getText('to_unit');
        return {
          icon: 'arrow-left-right',
          parts: [
            { text: 'Converting from ' },
            { text: from || 'one unit', emphasis: Boolean(from) },
            { text: ' to ' },
            { text: to || 'another unit', emphasis: Boolean(to) },
            { text: '...' },
          ],
        };
      }
      case 'convert_timestamp_to_date':
        return { icon: 'calendar3', parts: [{ text: 'Converting timestamp...' }] };
      case 'get_user_latitude_and_longitude':
        return { icon: 'geo-alt', parts: [{ text: 'Getting your location...' }] };
      case 'get_all_memories':
        return { icon: 'journal-text', parts: [{ text: 'Retrieving your saved memories...' }] };
      case 'add_memory':
        return { icon: 'bookmark-plus', parts: [{ text: 'Saving a memory...' }] };
      default:
        return {
          icon: 'gear',
          parts: [{ text: `Running ${call.function.name.replace(/_/g, ' ')}...` }],
        };
    }
  }

  getCodeExecutionResult(message?: Message): CodeExecutionResult | null {
    if (!message) return null;
    if (message.role !== 'tool' || message.name !== 'execute_code') return null;
    try {
      return JSON.parse(message.content);
    } catch {
      return null;
    }
  }

  renderExecutionOutput(result: CodeExecutionResult | null) {
    return (
      <section class="execution-output">
        <strong>Output</strong>
        {result?.stdout && (
          <section>
            <strong>stdout</strong>
            <pre>{result.stdout}</pre>
          </section>
        )}
        {result?.stderr && (
          <section>
            <strong>stderr</strong>
            <pre>{result.stderr}</pre>
          </section>
        )}
        {result?.error && <p class="execution-error">{result.error}</p>}
        <p class="execution-status">
          {result
            ? result.running
              ? result.stdout || result.stderr
                ? 'Execution in progress...'
                : 'Waiting for output...'
              : `Exit code: ${result.exit_code === null ? 'timed out' : result.exit_code}`
            : 'Waiting for output...'}
        </p>
      </section>
    );
  }

  renderPart(part: MessagePart, index: number, executionResult: CodeExecutionResult | null = null) {
    switch (part.type) {
      case 'thinking':
        return (
          <sl-details key={index} summary="Thinking..." class="thinking-block">
            {part.content}
          </sl-details>
        );
      case 'text':
        return <div key={index} class="assistant-response-content" innerHTML={MarkdownService.render(part.content)}></div>;
      case 'tool_call': {
        if (part.call.function.name === 'execute_code') {
          return (
            <sl-details key={index} class="code-execution" summary={`Run ${String(part.call.function.arguments.language || 'code')}`}>
              <pre>
                <code>{String(part.call.function.arguments.code || '')}</code>
              </pre>
              {this.renderExecutionOutput(executionResult)}
            </sl-details>
          );
        }

        const status = this.getToolStatus(part.call);
        return (
          <div key={index} class="tool-indicator">
            <sl-icon name={status.icon} aria-hidden="true"></sl-icon>
            <span>{status.parts.map(part => (part.emphasis ? <strong>{part.text}</strong> : part.text))}</span>
          </div>
        );
      }
      case 'map':
        return (
          <div key={index} class="map-widgets">
            <localmind-map mapData={part.mapData}></localmind-map>
          </div>
        );
    }
  }

  render() {
    if (!this.message) return null;

    const executionResult = this.getCodeExecutionResult(this.message);
    const messageParts = getMessageParts(this.message);
    let codeExecutionIndex = 0;
    const generatedImage = this.message.attachment?.type === 'generated-image' ? this.message.attachment : null;
    return (
      <div
        class={{
          'message': true,
          'user-message': this.message.role === 'user',
          'assistant-message': this.message.role === 'assistant',
        }}
        onMouseEnter={() => (this.isHovered = true)}
        onMouseLeave={() => (this.isHovered = false)}
        id={this.message.id}
      >
        {this.message.role === 'user'
          ? this.message.content.trim() !== '' && <p>{this.message.content}</p>
          : messageParts.map((part, index) => {
              const callResult =
                part.type === 'tool_call' && part.call.function.name === 'execute_code' ? this.getCodeExecutionResult(this.executionMessages[codeExecutionIndex++]) : null;
              return this.renderPart(part, index, callResult);
            })}

        {executionResult && (
          <sl-details
            open={this.isExecutionOutputOpen}
            onSlShow={() => (this.isExecutionOutputOpen = true)}
            onSlHide={() => (this.isExecutionOutputOpen = false)}
            class={{
              'code-execution': true,
              'code-execution-failed': !executionResult.success && !executionResult.running,
            }}
            summary={
              executionResult.running
                ? `${executionResult.language} running`
                : `${executionResult.language} ${executionResult.success ? 'completed' : 'failed'} · ${executionResult.duration_ms} ms`
            }
          >
            {this.renderExecutionOutput(executionResult)}
          </sl-details>
        )}

        {/* User Attached Files (Read-Only) */}
        {this.message.attachedFiles && this.message.attachedFiles.length > 0 && (
          <div class="attached-files-container">
            {this.message.attachedFiles.map(file => {
              const extension = file.name.split('.').pop()?.toLowerCase();

              let iconName = 'file-earmark';
              if (extension === 'pdf') iconName = 'file-earmark-pdf';
              else if (['txt', 'md', 'csv', 'json', 'xml', 'js', 'ts', 'html', 'css', 'py'].includes(extension || '')) iconName = 'file-earmark-code';

              return (
                <div class="file-card read-only">
                  <div class="file-icon-container">
                    <sl-icon name={iconName} class="icon-preview"></sl-icon>
                  </div>
                  <div class="file-details">
                    <span class="file-name">{file.name}</span>
                    <span class="file-size">{(file.size / 1024).toFixed(2)} KB</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* File Attachment Card (Ensure it's outside the text elements) */}
        {generatedImage ? (
          <div class="generated-image-card">
            <div class="generated-image-media" onClick={this.handleImageClick}>
              <img class="generated-image-preview" src={generatedImage.url} alt={generatedImage.prompt || 'Generated image'} />
              <div class="generated-image-download-overlay" onClick={this.handleDownloadControlClick}>
                <sl-dropdown placement="top-end" hoist>
                  <span slot="trigger" class="image-download-icon-btn" role="button" tabindex={0} aria-label="Download image">
                    <sl-icon name="download"></sl-icon>
                  </span>
                  <sl-menu ref={(el: any) => (this.downloadMenuEl = el as any)}>
                    <sl-menu-item value="png">PNG</sl-menu-item>
                    <sl-menu-item value="jpg">JPG</sl-menu-item>
                    <sl-menu-item value="webp">WEBP</sl-menu-item>
                    <sl-menu-item value="bmp">BMP</sl-menu-item>
                    <sl-menu-item value="gif">GIF</sl-menu-item>
                    <sl-menu-item value="ico">ICO</sl-menu-item>
                  </sl-menu>
                </sl-dropdown>
              </div>
            </div>
            <div class="generated-image-footer">
              <div class="generated-image-meta">
                {generatedImage.modelName && <span class="generated-image-badge">{generatedImage.modelName}</span>}
                {generatedImage.width && generatedImage.height && (
                  <span class="generated-image-resolution">
                    {generatedImage.width}x{generatedImage.height}
                  </span>
                )}
              </div>
            </div>
            {this.isImageFullscreen && (
              <localmind-fullscreen-image
                src={generatedImage.url}
                alt={generatedImage.prompt || 'Generated image'}
                fileName={generatedImage.name}
                onCloseFullscreen={this.handleCloseFullscreen}
              ></localmind-fullscreen-image>
            )}
          </div>
        ) : null}

        {/* Actions: Hidden while streaming is active, and only visible if actual content exists */}
        {this.message.role === 'assistant' && !this.isWritingAnswer && this.message.content && (
          <localmind-message-actions message={this.message} visible={this.isHovered} isLastMessage={this.isLastMessage}></localmind-message-actions>
        )}
      </div>
    );
  }
}
