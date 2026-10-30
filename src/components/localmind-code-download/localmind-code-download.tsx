import { Component, h, Prop } from '@stencil/core';
import { FILE_EXTENSIONS_MAP } from '../../constants/constants';

@Component({
  tag: 'localmind-code-download',
  shadow: true,
})
export class LocalMindCodeDownload {
  @Prop() code!: string;
  @Prop() extension: string = 'txt';

  downloadCode() {
    const text = decodeURIComponent(this.code);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;

    const rawExt = this.extension.toLowerCase();
    const finalExt = FILE_EXTENSIONS_MAP[rawExt] || rawExt || 'txt';

    a.download = `localmind-code-${Date.now()}.${finalExt}`;

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  render() {
    return (
      <sl-tooltip content="Download" placement="top">
        <sl-button variant="text" size="medium" circle onClick={() => this.downloadCode()}>
          <sl-icon name="download" label="Download" style={{ color: 'var(--sl-color-neutral-600)' }}></sl-icon>
        </sl-button>
      </sl-tooltip>
    );
  }
}
