export type CoverStyle = 'band' | 'stripe' | 'centered' | 'minimal';
export type HeadingStyle = 'rule' | 'plain' | 'caps';

export interface PdfTheme {
  id: string;
  description: string;
  headingFont: string;
  bodyFont: string;
  monoFont: string;
  googleFonts: string[];
  accent: string;
  text: string;
  heading: string;
  muted: string;
  border: string;
  surface: string;
  cover: CoverStyle;
  headingStyle: HeadingStyle;
}

const MONO_STACK = `'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace`;

export const PDF_THEMES = {
  corporate: {
    id: 'corporate',
    description: 'Business reports, proposals, summaries. Navy, clean sans-serif.',
    headingFont: `'Montserrat', 'Helvetica Neue', Arial, sans-serif`,
    bodyFont: `'Open Sans', 'Helvetica Neue', Arial, sans-serif`,
    monoFont: MONO_STACK,
    googleFonts: ['Montserrat:wght@500;700', 'Open+Sans:wght@400;600;700'],
    accent: '#1f4e79',
    text: '#2b2f36',
    heading: '#14304d',
    muted: '#6b7280',
    border: '#d9dee5',
    surface: '#f3f6fa',
    cover: 'band',
    headingStyle: 'rule',
  },
  modern: {
    id: 'modern',
    description: 'Product docs, tech overviews, general purpose. Vibrant violet, Inter.',
    headingFont: `'Inter', 'Helvetica Neue', Arial, sans-serif`,
    bodyFont: `'Inter', 'Helvetica Neue', Arial, sans-serif`,
    monoFont: MONO_STACK,
    googleFonts: ['Inter:wght@400;500;600;700'],
    accent: '#7a4dff',
    text: '#25262b',
    heading: '#16161a',
    muted: '#6e7079',
    border: '#e4e4ea',
    surface: '#f6f4ff',
    cover: 'stripe',
    headingStyle: 'plain',
  },
  editorial: {
    id: 'editorial',
    description: 'Articles, essays, long reads, magazine feel. Serif with a deep red accent.',
    headingFont: `'Playfair Display', Georgia, serif`,
    bodyFont: `'Source Serif 4', Georgia, serif`,
    monoFont: MONO_STACK,
    googleFonts: ['Playfair+Display:wght@600;800', 'Source+Serif+4:wght@400;600;700'],
    accent: '#b3261e',
    text: '#2a2a2a',
    heading: '#151515',
    muted: '#707070',
    border: '#e0dcd5',
    surface: '#faf7f2',
    cover: 'centered',
    headingStyle: 'plain',
  },
  minimal: {
    id: 'minimal',
    description: 'Notes, briefs, anything that should feel quiet and uncluttered. Black and white.',
    headingFont: `'DM Sans', 'Helvetica Neue', Arial, sans-serif`,
    bodyFont: `'DM Sans', 'Helvetica Neue', Arial, sans-serif`,
    monoFont: MONO_STACK,
    googleFonts: ['DM+Sans:wght@400;500;700'],
    accent: '#111111',
    text: '#2e2e2e',
    heading: '#000000',
    muted: '#7a7a7a',
    border: '#e5e5e5',
    surface: '#f7f7f7',
    cover: 'minimal',
    headingStyle: 'plain',
  },
  tech: {
    id: 'tech',
    description: 'Code, engineering, APIs, technical specs, cheat sheets. Monospace headings, teal.',
    headingFont: `'JetBrains Mono', ${MONO_STACK}`,
    bodyFont: `'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif`,
    monoFont: `'JetBrains Mono', ${MONO_STACK}`,
    googleFonts: ['JetBrains+Mono:wght@500;700', 'IBM+Plex+Sans:wght@400;600'],
    accent: '#0f9d7a',
    text: '#22282e',
    heading: '#0b1f1a',
    muted: '#64707a',
    border: '#d8e2de',
    surface: '#f1f7f5',
    cover: 'stripe',
    headingStyle: 'caps',
  },
  warm: {
    id: 'warm',
    description: 'Guides, recipes, travel, lifestyle, friendly content. Terracotta and soft serif.',
    headingFont: `'Lora', Georgia, serif`,
    bodyFont: `'Nunito Sans', 'Helvetica Neue', Arial, sans-serif`,
    monoFont: MONO_STACK,
    googleFonts: ['Lora:wght@500;700', 'Nunito+Sans:wght@400;600;700'],
    accent: '#c4572a',
    text: '#3a322d',
    heading: '#2a1d16',
    muted: '#857a72',
    border: '#eadfd6',
    surface: '#fcf4ee',
    cover: 'band',
    headingStyle: 'rule',
  },
  academic: {
    id: 'academic',
    description: 'Research, studies, formal papers, reports with citations. Classic serif, burgundy.',
    headingFont: `'Libre Baskerville', 'Times New Roman', serif`,
    bodyFont: `'Crimson Pro', 'Times New Roman', serif`,
    monoFont: MONO_STACK,
    googleFonts: ['Libre+Baskerville:wght@400;700', 'Crimson+Pro:wght@400;600;700'],
    accent: '#7a1f2b',
    text: '#222222',
    heading: '#111111',
    muted: '#666666',
    border: '#d6d6d6',
    surface: '#f6f4f1',
    cover: 'centered',
    headingStyle: 'plain',
  },
} as const satisfies Record<string, PdfTheme>;

export type ThemeId = keyof typeof PDF_THEMES;
export const THEME_IDS = Object.keys(PDF_THEMES) as ThemeId[];

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function isHexColor(s: unknown): s is string {
  return typeof s === 'string' && /^#[0-9a-f]{6}$/i.test(s);
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mixes a hex color with white. amount 0..1 (1 = original color) */
export function tint(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) => Math.round(255 - (255 - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

const loadedFontLinks = new Set<string>();

/**
 * Injects the Google Fonts stylesheet and waits (max 5s) until the faces are
 * usable. html2canvas can only draw fonts the document has already loaded.
 * If you're offline this silently falls back to the system font stack.
 * For a fully offline setup, self-host the fonts (e.g. @fontsource/*) instead.
 */
export async function ensureFonts(theme: PdfTheme): Promise<void> {
  if (typeof document === 'undefined') return;

  const href = `https://fonts.googleapis.com/css2?${theme.googleFonts
    .map((f) => `family=${f}`)
    .join('&')}&display=swap`;

  if (!loadedFontLinks.has(href)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
    loadedFontLinks.add(href);
  }

  const names = theme.googleFonts.map((f) => f.split(':')[0].replace(/\+/g, ' '));
  const loads = names.flatMap((n) => [
    document.fonts.load(`400 16px "${n}"`),
    document.fonts.load(`700 16px "${n}"`),
  ]);

  try {
    await Promise.race([
      Promise.all(loads).then(() => document.fonts.ready),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  } catch {
    /* fall back to system fonts */
  }
}

/* ------------------------------------------------------------------ */
/* Cover page                                                          */
/* ------------------------------------------------------------------ */

export function buildCover(
  theme: PdfTheme,
  meta: { title: string; subtitle?: string; author?: string; date: string },
): string {
  const metaLine = [meta.author, meta.date].filter(Boolean).map((s) => escapeHtml(s as string)).join('  •  ');
  return `
    <section class="cover cover-${theme.cover}">
      <div class="cover-main">
        <div class="cover-rule"></div>
        <div class="cover-title">${escapeHtml(meta.title)}</div>
        ${meta.subtitle ? `<div class="cover-subtitle">${escapeHtml(meta.subtitle)}</div>` : ''}
      </div>
      <div class="cover-meta">${metaLine}</div>
    </section>
    <div class="html2pdf__page-break"></div>
  `;
}

/* ------------------------------------------------------------------ */
/* CSS                                                                 */
/* ------------------------------------------------------------------ */

export function buildCss(theme: PdfTheme, accent: string): string {
  const t = theme;
  const soft = tint(accent, 0.12);
  const h2Extra =
    t.headingStyle === 'rule'
      ? `border-bottom: 2px solid ${accent}; padding-bottom: 6px;`
      : t.headingStyle === 'caps'
        ? `text-transform: uppercase; letter-spacing: 0.06em; font-size: 18px;`
        : '';

  return `
    .pdf-root { font-family: ${t.bodyFont}; color: ${t.text}; font-size: 14px; line-height: 1.65; }
    .pdf-root * { box-sizing: border-box; }

    /* Headings */
    .pdf-root h1, .pdf-root h2, .pdf-root h3, .pdf-root h4 {
      font-family: ${t.headingFont}; color: ${t.heading}; line-height: 1.25; break-after: avoid; page-break-after: avoid;
    }
    .pdf-root h1 { font-size: 30px; margin: 34px 0 14px; padding-bottom: 8px; border-bottom: 3px solid ${accent}; }
    .pdf-root h2 { font-size: 22px; margin: 30px 0 12px; ${h2Extra} }
    .pdf-root h3 { font-size: 17px; margin: 22px 0 8px; color: ${accent}; }
    .pdf-root h4 { font-size: 13px; margin: 18px 0 6px; text-transform: uppercase; letter-spacing: 0.08em; color: ${t.muted}; }
    .pdf-root > :first-child { margin-top: 0; }

    /* Text */
    .pdf-root p { margin: 0 0 12px; }
    .pdf-root strong { color: ${t.heading}; }
    .pdf-root a { color: ${accent}; text-decoration: none; border-bottom: 1px solid ${soft}; }
    .pdf-root hr { border: none; border-top: 1px solid ${t.border}; margin: 24px 0; }
    .pdf-root ul, .pdf-root ol { margin: 0 0 14px; padding-left: 22px; }
    .pdf-root li { margin-bottom: 5px; }
    .pdf-root li::marker { color: ${accent}; font-weight: 700; }

    /* Images */
    .pdf-root img { max-width: 100%; height: auto; display: block; margin: 16px auto; border-radius: 6px; break-inside: avoid; }

    /* Tables */
    .pdf-root table { width: 100%; border-collapse: collapse; margin: 16px 0 20px; font-size: 12.5px; break-inside: avoid; }
    .pdf-root th { background: ${accent}; color: #fff; text-align: left; padding: 9px 12px; font-family: ${t.headingFont}; font-weight: 600; }
    .pdf-root td { padding: 8px 12px; border-bottom: 1px solid ${t.border}; vertical-align: top; }
    .pdf-root tbody tr:nth-child(even) td { background: ${t.surface}; }
    .pdf-root tr { break-inside: avoid; }

    /* Code */
    .pdf-root code { font-family: ${t.monoFont}; font-size: 0.88em; background: ${soft}; color: ${t.heading}; padding: 1px 5px; border-radius: 3px; }
    .pdf-root pre { background: ${t.surface}; border: 1px solid ${t.border}; border-left: 4px solid ${accent}; border-radius: 4px; padding: 12px 14px; margin: 14px 0; white-space: pre-wrap; word-break: break-word; break-inside: avoid; }
    .pdf-root pre code { background: none; padding: 0; font-size: 12px; }

    /* Quotes + callouts */
    .pdf-root blockquote { margin: 16px 0; padding: 10px 16px; border-left: 4px solid ${accent}; background: ${t.surface}; color: ${t.muted}; font-style: italic; break-inside: avoid; }
    .pdf-root blockquote p:last-child { margin-bottom: 0; }
    .pdf-root .callout { margin: 16px 0; padding: 12px 16px 12px 16px; border-radius: 6px; border-left: 5px solid var(--c); background: var(--bg); color: ${t.text}; font-style: normal; break-inside: avoid; }
    .pdf-root .callout p:last-child { margin-bottom: 0; }
    .pdf-root .callout-title { font-family: ${t.headingFont}; font-weight: 700; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--c); margin-bottom: 4px; }
    .pdf-root .callout-note { --c: ${accent}; --bg: ${soft}; }
    .pdf-root .callout-tip { --c: #2e9e6b; --bg: #eaf7f0; }
    .pdf-root .callout-warning { --c: #c27c00; --bg: #fff5e0; }
    .pdf-root .callout-important { --c: #c93a3a; --bg: #fdeeee; }

    /* Table of contents */
    .pdf-root .toc-title { font-family: ${t.headingFont}; font-size: 26px; color: ${t.heading}; margin: 0 0 18px; padding-bottom: 8px; border-bottom: 3px solid ${accent}; }
    .pdf-root .toc ol { list-style: none; padding: 0; margin: 0; }
    .pdf-root .toc li { padding: 7px 0; border-bottom: 1px dotted ${t.border}; margin: 0; }
    .pdf-root .toc li.lvl2 { font-weight: 600; font-family: ${t.headingFont}; color: ${t.heading}; font-size: 14px; }
    .pdf-root .toc li.lvl3 { padding-left: 22px; color: ${t.muted}; font-size: 13px; }

    /* Manual page break */
    .pdf-root .page-break { height: 0; break-after: page; page-break-after: always; }

    /* Cover */
    .pdf-root .cover { height: 930px; display: flex; flex-direction: column; justify-content: space-between; }
    .pdf-root .cover-rule { width: 64px; height: 5px; background: ${accent}; margin-bottom: 28px; }
    .pdf-root .cover-title { font-family: ${t.headingFont}; font-size: 44px; line-height: 1.15; font-weight: 700; color: ${t.heading}; margin-bottom: 16px; }
    .pdf-root .cover-subtitle { font-size: 19px; color: ${t.muted}; line-height: 1.4; }
    .pdf-root .cover-meta { font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: ${t.muted}; }

    .pdf-root .cover-band .cover-main { flex: 0 0 58%; background: ${accent}; border-radius: 8px; padding: 48px; display: flex; flex-direction: column; justify-content: flex-end; }
    .pdf-root .cover-band .cover-title { color: #fff; }
    .pdf-root .cover-band .cover-subtitle { color: rgba(255,255,255,0.85); }
    .pdf-root .cover-band .cover-rule { background: #fff; }
    .pdf-root .cover-band .cover-meta { padding: 0 8px 8px; }

    .pdf-root .cover-stripe { border-left: 16px solid ${accent}; padding-left: 44px; }
    .pdf-root .cover-stripe .cover-main { margin-top: 300px; }
    .pdf-root .cover-stripe .cover-meta { padding-bottom: 8px; }

    .pdf-root .cover-centered { text-align: center; align-items: center; }
    .pdf-root .cover-centered .cover-main { margin-top: 260px; }
    .pdf-root .cover-centered .cover-rule { margin: 0 auto 28px; }
    .pdf-root .cover-centered .cover-meta { padding-bottom: 8px; }

    .pdf-root .cover-minimal { padding: 10px 0 8px; }
    .pdf-root .cover-minimal .cover-main { margin-top: 220px; }
    .pdf-root .cover-minimal .cover-title { font-size: 58px; letter-spacing: -0.02em; }
  `;
}