import { Component, Element, h, Prop } from '@stencil/core';
import { Message } from '../../types/interfaces';

@Component({
  tag: 'localmind-message-stats',
  styleUrl: 'localmind-message-stats.css',
  shadow: true,
})
export class LocalMindMessageStats {
  @Element() el!: HTMLElement;
  @Prop() message!: Message;

  private formatTokenCount(value?: number): string {
    return value === undefined ? '—' : `${value.toLocaleString('en-US')} tokens`;
  }

  private formatSeconds(value?: number): string {
    return value === undefined ? '—' : `${value.toFixed(3)}s`;
  }

  private positionStatsPanel() {
    const statsHover = this.el.shadowRoot?.querySelector<HTMLElement>('.stats-hover');
    const panel = this.el.shadowRoot?.querySelector<HTMLElement>('.stats-panel');
    if (!statsHover || !panel) return;

    const iconRect = statsHover.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const viewportMargin = 12;
    const gap = 8;
    const maxLeft = Math.max(viewportMargin, window.innerWidth - panelRect.width - viewportMargin);
    const left = Math.min(Math.max(iconRect.left, viewportMargin), maxLeft);
    const spaceAbove = iconRect.top - viewportMargin;
    const top =
      spaceAbove >= panelRect.height + gap
        ? iconRect.top - panelRect.height - gap
        : Math.min(iconRect.bottom + gap, window.innerHeight - panelRect.height - viewportMargin);

    panel.style.left = `${left}px`;
    panel.style.top = `${Math.max(viewportMargin, top)}px`;
  }

  render() {
    const stats = this.message.generationStats;

    return (
      <div
        class="stats-hover"
        tabIndex={0}
        aria-label="Message stats"
        onMouseEnter={() => this.positionStatsPanel()}
        onFocus={() => this.positionStatsPanel()}
        onMouseDown={(event: MouseEvent) => event.preventDefault()}
      >
        <sl-icon name="info-circle-fill" aria-hidden="true"></sl-icon>
        <div class="stats-panel" role="tooltip">
          <div class="stats-title">Message stats</div>
          <div class="stats-divider"></div>
          <div class="stats-section">
            <div class="stats-row"><span>Model</span><span>{stats?.model || this.message.modelUsed?.model || '—'}</span></div>
            <div class="stats-row"><span>Input</span><span>{this.formatTokenCount(stats?.inputTokens)}</span></div>
            <div class="stats-row"><span>Output</span><span>{this.formatTokenCount(stats?.outputTokens)}</span></div>
            <div class="stats-row"><span>Total</span><span>{this.formatTokenCount(stats?.totalTokens)}</span></div>
          </div>
          <div class="stats-divider"></div>
          <div class="stats-section">
            <div class="stats-row">
              <span>Speed (wall)</span>
              <span title={stats?.speedIsEstimated ? 'Estimated from response length' : undefined}>
                {stats?.speedTokensPerSecond === undefined
                  ? '—'
                  : `${stats.speedIsEstimated ? '≈' : ''}${stats.speedTokensPerSecond.toFixed(2)} tok/s`}
              </span>
            </div>
            <div class="stats-row"><span>Time (wall)</span><span>{this.formatSeconds(stats?.totalDurationSeconds)}</span></div>
            <div class="stats-row"><span>TTFT</span><span>{this.formatSeconds(stats?.ttftSeconds)}</span></div>
          </div>
          <div class="stats-divider"></div>
          <div class="stats-section">
            <div class="stats-row"><span>Tool schemas</span><span>{stats?.toolSchemaCount ?? '—'}</span></div>
            <div class="stats-row"><span>Agent rounds</span><span>{stats?.agentRounds ?? '—'}</span></div>
            <div class="stats-row"><span>Tool calls</span><span>{stats?.toolCalls ?? '—'}</span></div>
          </div>
        </div>
      </div>
    );
  }
}
