import { marked, Renderer } from 'marked';
import katex from 'katex';
import hljs from 'highlight.js';

export class MarkdownService {
  static initialized = false;

  static initialize() {
    if (this.initialized) {
      return;
    }

    const renderer = new Renderer();

    const mathExtension = {
      name: 'math',
      level: 'inline',
      start(src: string) {
        return src.indexOf('$');
      },
      tokenizer(src: string) {
        const match = src.match(/^\$+([^$]+)\$+/);

        if (!match) {
          return;
        }

        return {
          type: 'math',
          raw: match[0],
          text: match[1].trim(),
          display: match[0].startsWith('$$'),
        };
      },
      renderer(token: any) {
        try {
          return katex.renderToString(token.text, {
            displayMode: token.display,
            throwOnError: false,
          });
        } catch {
          return token.raw;
        }
      },
    };

    marked.use({
      extensions: [mathExtension],
    });

    renderer.code = ({ text, lang }) => {
      const language = lang || '';
      let highlighted = text;

      try {
        const validLanguage = lang && hljs.getLanguage(lang);
        highlighted = validLanguage ? hljs.highlight(text, { language: lang }).value : hljs.highlightAuto(text).value;
      } catch { }

      const encodedText = encodeURIComponent(text);
      const fileExt = language || 'txt';

      return `
        <div class="code-block-container">
          <div class="code-header">
            <span class="language-tag">${language}</span>
            <div style="display: flex; gap: 4px;">
              <localmind-code-download code="${encodedText}" extension="${fileExt}"></localmind-code-download>
              <sl-copy-button value="${text.replace(/"/g, '&quot;')}"></sl-copy-button>
            </div>
          </div>
          <pre class="code-block"><code class="hljs ${language}">${highlighted}</code></pre>
        </div>`;
    };

    marked.setOptions({
      renderer,
    });

    this.initialized = true;
  }

  static render(markdown: string): string {
    this.initialize();
    return marked.parse(markdown).toString();
  }
}
