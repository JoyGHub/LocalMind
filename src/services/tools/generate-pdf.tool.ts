import { ToolDefinition } from './tool.interface';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import html2pdf from 'html2pdf.js';
import { bytesToGbMb } from '../../utils/utils';
import {
  PDF_THEMES,
  THEME_IDS,
  ThemeId,
  buildCover,
  buildCss,
  ensureFonts,
  escapeHtml,
  hexToRgb,
  isHexColor,
} from '../../utils/pdf-themes';

/** Below this the model gets sent back to write more. Tune or set to 0 to disable. */
const MIN_CONTENT_CHARS = 1200;

interface PdfArgs {
  title: string;
  content: string;
  subtitle?: string;
  author?: string;
  theme?: ThemeId;
  accent_color?: string;
  cover_page?: boolean;
  table_of_contents?: boolean;
}

interface TocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

/** Adds heading ids (for the TOC) and turns `> [!NOTE]` style quotes into callout boxes. */
function enhanceHtml(html: string): { html: string; toc: TocEntry[] } {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const toc: TocEntry[] = [];

  doc.body.querySelectorAll('h2, h3').forEach((h, i) => {
    h.id = `sec-${i}`;
    toc.push({
      id: h.id,
      text: h.textContent?.trim() ?? '',
      level: h.tagName === 'H2' ? 2 : 3,
    });
  });

  doc.body.querySelectorAll('blockquote').forEach((bq) => {
    const first = bq.querySelector('p');
    if (!first) return;
    const m = first.innerHTML.match(/^\s*\[!(NOTE|TIP|WARNING|IMPORTANT)\]\s*(<br\s*\/?>|\n)?/i);
    if (!m) return;

    const kind = m[1].toLowerCase();
    first.innerHTML = first.innerHTML.slice(m[0].length);
    if (!first.textContent?.trim()) first.remove();

    const box = doc.createElement('div');
    box.className = `callout callout-${kind}`;
    box.innerHTML = `<div class="callout-title">${kind}</div>${bq.innerHTML}`;
    bq.replaceWith(box);
  });

  return { html: doc.body.innerHTML, toc };
}

function buildToc(toc: TocEntry[]): string {
  const items = toc
    .map((t) => `<li class="lvl${t.level}">${escapeHtml(t.text)}</li>`)
    .join('');
  return `
    <section class="toc">
      <div class="toc-title">Contents</div>
      <ol>${items}</ol>
    </section>
    <div class="html2pdf__page-break"></div>
  `;
}

const themeGuide = THEME_IDS.map((id) => `${id} (${PDF_THEMES[id].description})`).join(' ');

export const generatePdfTool: ToolDefinition = {
  name: 'generate_pdf_report',
  description:
    'Creates a professionally designed, multi-page PDF document (report, guide, article, brief, study, cheat sheet...). ' +
    'The look is controlled by "theme" (fonts, colors, cover page layout), so pick the theme that fits the topic. ' +
    'WRITING RULES: write a thorough, well-structured document, not a short summary. Aim for 800+ words with 4 or more ## sections, ' +
    'each with real substance (several paragraphs, lists or tables). Open with a short overview, end with a conclusion or next steps. ' +
    'MARKDOWN YOU CAN USE: # ## ### headings (## and ### feed the table of contents), **bold**, *italic*, lists, tables, `code`, fenced code blocks, ' +
    '> quotes, images ![alt](url), horizontal rules (---). ' +
    'CALLOUT BOXES: start a quote with [!NOTE], [!TIP], [!WARNING] or [!IMPORTANT], e.g. "> [!TIP]\\n> Text here". ' +
    'PAGE BREAK: put <!-- pagebreak --> on its own line. ' +
    'Do NOT repeat the title as a # heading in the content, it is placed on the cover automatically. Start with ## sections.',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'The main title of the document.',
      },
      subtitle: {
        type: 'string',
        description: 'Optional one-line subtitle shown under the title on the cover.',
      },
      author: {
        type: 'string',
        description: 'Optional author or organization name shown on the cover.',
      },
      content: {
        type: 'string',
        description:
          'The full body of the document in rich Markdown. Long, structured and detailed. Use ## for sections, tables for comparisons, callouts for key points.',
      },
      theme: {
        type: 'string',
        enum: THEME_IDS as unknown as string[],
        description: `Visual style. Choose by topic: ${themeGuide}`,
      },
      accent_color: {
        type: 'string',
        description:
          'Optional hex color like "#0f766e" to override the theme accent (headings, tables, cover). Omit to use the theme default.',
      },
      cover_page: {
        type: 'boolean',
        description: 'Add a designed cover page. Default true. Use false for short one-page style documents.',
      },
      table_of_contents: {
        type: 'boolean',
        description: 'Add a table of contents page. Default: automatic when the document has 4 or more sections.',
      },
    },
    required: ['title', 'content'],
  },

  execute: async (args: PdfArgs) => {
    try {
      const theme = PDF_THEMES[args.theme && args.theme in PDF_THEMES ? args.theme : 'modern'];
      const accent = isHexColor(args.accent_color) ? args.accent_color : theme.accent;
      const withCover = args.cover_page !== false;

      // Make weak/short drafts bounce back to the model instead of producing a thin PDF
      if (MIN_CONTENT_CHARS > 0 && args.content.trim().length < MIN_CONTENT_CHARS) {
        return {
          error:
            `The content is too short (${args.content.trim().length} characters). ` +
            `Write a much more detailed document: at least 4 "##" sections with several paragraphs, lists or tables each, ` +
            `then call generate_pdf_report again.`,
        };
      }

      // 1. Markdown -> sanitized HTML
      const withBreaks = args.content.replace(
        /^\s*<!--\s*pagebreak\s*-->\s*$/gim,
        '\n<div class="page-break html2pdf__page-break"></div>\n',
      );
      const rawHtml = await marked.parse(withBreaks);
      const safeHtml = DOMPurify.sanitize(rawHtml);

      // 2. Callouts + table of contents
      const { html: bodyHtml, toc } = enhanceHtml(safeHtml);
      const withToc = args.table_of_contents ?? toc.filter((t) => t.level === 2).length >= 4;

      const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // 3. Assemble the document
      const htmlString = `
        <div class="pdf-root">
          <style>${buildCss(theme, accent)}</style>
          ${withCover
          ? buildCover(theme, {
            title: args.title,
            subtitle: args.subtitle,
            author: args.author,
            date: dateStr,
          })
          : ''
        }
          ${withToc && toc.length ? buildToc(toc) : ''}
          ${bodyHtml}
        </div>
      `;

      // 4. Fonts must be loaded before html2canvas captures anything
      await ensureFonts(theme);

      const filename = `${args.title
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .toLowerCase() || 'document'}.pdf`;

      const opt = {
        margin: [18, 16, 18, 16] as [number, number, number, number], // top, left, bottom, right (mm)
        filename,
        image: { type: 'jpeg' as const, quality: 0.97 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm' as const, format: 'a4', orientation: 'portrait' as const },
        pagebreak: {
          mode: ['css', 'legacy'],
          avoid: ['tr', 'img', 'pre', 'blockquote', '.callout', 'h1', 'h2', 'h3', 'h4'],
        },
      };

      // 5. Render, then stamp running header/footer + metadata onto the finished pages
      const [mr, mg, mb] = hexToRgb(theme.muted);
      const [ar, ag, ab] = hexToRgb(accent);
      const firstContentPage = withCover ? 2 : 1;

      const blob: Blob = await (html2pdf()
        .set(opt)
        .from(htmlString)
        .toPdf()
        .get('pdf') as any)
        .then((pdf: any) => {
          const total: number = pdf.internal.getNumberOfPages();
          const w: number = pdf.internal.pageSize.getWidth();
          const h: number = pdf.internal.pageSize.getHeight();
          const shortTitle = args.title.length > 60 ? `${args.title.slice(0, 57)}...` : args.title;

          pdf.setProperties({ title: args.title, author: args.author ?? '', subject: args.subtitle ?? '' });

          for (let i = firstContentPage; i <= total; i++) {
            pdf.setPage(i);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);

            // header
            pdf.setTextColor(mr, mg, mb);
            pdf.text(shortTitle, 16, 10);
            pdf.setDrawColor(ar, ag, ab);
            pdf.setLineWidth(0.4);
            pdf.line(16, 12, w - 16, 12);

            // footer
            pdf.text(`${i - firstContentPage + 1}`, w - 16, h - 9, { align: 'right' });
            if (args.author) pdf.text(args.author, 16, h - 9);
          }
        })
        .output('blob');

      // 6. Hand the file to the UI card
      const rawSize = bytesToGbMb(blob.size);
      const fileSize = rawSize.startsWith('0.00') ? `${(blob.size / 1024).toFixed(1)} KB` : rawSize;

      return {
        status: 'success',
        message: `PDF generated with the "${theme.id}" theme.`,
        attachment: {
          name: filename,
          size: fileSize,
          url: URL.createObjectURL(blob),
          type: 'pdf',
        },
      };
    } catch (error: any) {
      return { error: `Failed to generate PDF: ${error.message}` };
    }
  },
};
