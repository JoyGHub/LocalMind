import { Component, Element, h, Prop, State } from '@stencil/core';
import { Message } from '../../types/interfaces';
import { MarkdownService } from '../../services/markdown.service';

@Component({
  tag: 'localmind-message',
  styleUrl: 'localmind-message.css',
  shadow: true,
  assetsDirs: ['assets'],
})
export class LocalMindMessage {
  @Element() el!: HTMLElement;
  @Prop() message!: Message;
  @Prop() isWritingAnswer!: boolean;
  @State() isHovered = false;
  @State() isExecutionOutputOpen = true;
  @Prop() isLastMessage!: boolean;
  previousResponseText: string | null = null;

  componentDidRender() {
    const content = this.el.shadowRoot?.querySelector('.assistant-response-content');
    if (!content) return;

    const currentText = content.textContent || '';
    if (this.previousResponseText === null) {
      this.previousResponseText = currentText;
      if (this.isWritingAnswer && this.isLastMessage) this.animateTextFrom(content, 0);
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
      this.animateTextFrom(content, sharedPrefixLength);
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

  getCodeExecutionResult(): {
    language: string;
    stdout: string;
    stderr: string;
    exit_code: number | null;
    success: boolean;
    error: string | null;
    duration_ms: number;
    running?: boolean;
  } | null {
    if (this.message.role !== 'tool' || this.message.name !== 'execute_code') return null;
    try {
      return JSON.parse(this.message.content);
    } catch {
      return null;
    }
  }

  render() {
    const executionResult = this.getCodeExecutionResult();
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
        {/* Thinking Block */}
        {this.message.thinking && (
          <sl-details summary="Thinking Process" class="thinking-block">
            {this.message.thinking}
          </sl-details>
        )}

        {/* Tool Execution Indicator */}
        {this.message.tool_calls?.map((call, index) =>
          call.function.name === 'execute_code' ? (
            <sl-details class="code-execution" summary={`Run ${String(call.function.arguments.language || 'code')}`}>
              <pre><code>{String(call.function.arguments.code || '')}</code></pre>
            </sl-details>
          ) : !this.message.content && !this.message.thinking && index === 0 ? (
            <div class="tool-indicator">Using tool: {call.function.name}...</div>
          ) : null,
        )}

        {/* Main Content */}
        {this.message.role === 'user' ? (
          this.message.content.trim() !== '' && <p>{this.message.content}</p>
        ) : (
          this.message.content && <div class="assistant-response-content" innerHTML={MarkdownService.render(this.message.content)}></div>
        )}

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
            {executionResult.stdout && <section><strong>stdout</strong><pre>{executionResult.stdout}</pre></section>}
            {executionResult.stderr && <section><strong>stderr</strong><pre>{executionResult.stderr}</pre></section>}
            {executionResult.error && <p class="execution-error">{executionResult.error}</p>}
            <p class="execution-status">
              {executionResult.running
                ? executionResult.stdout || executionResult.stderr
                  ? 'Execution in progress...'
                  : 'Waiting for output...'
                : `Exit code: ${executionResult.exit_code === null ? 'timed out' : executionResult.exit_code}`}
            </p>
          </sl-details>
        )}

        {this.message.role === 'assistant' && (
          <div class="map-widgets">
            {(this.message.mapWidgets ?? []).map((mapData, index) => (
              <localmind-map key={index} mapData={mapData}></localmind-map>
            ))}
          </div>
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
        {this.message.attachment ? (
          <div class="file-attachment-card">
            <div class="file-icon">📄</div>
            <div class="file-details">
              <span class="file-name">{this.message.attachment.name}</span>
              <span class="file-size">{this.message.attachment.size}</span>
            </div>
            <a href={this.message.attachment.url} download={this.message.attachment.name} class="download-btn">
              Download
            </a>
          </div>
        ) : null}

        {/* Actions: Hidden while streaming is active, and only visible if actual content exists */}
        {this.message.role === 'assistant' && !this.isWritingAnswer && this.message.content && (
          <localmind-message-actions
            message={this.message}
            visible={this.isHovered}
            isLastMessage={this.isLastMessage}>
          </localmind-message-actions>
        )}
      </div>
    );
  }
}
