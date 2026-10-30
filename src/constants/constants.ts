export const MAX_FILES_LIMIT = 5;
export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const WELCOME_MESSAGES = [
  'What can I help you with?',
  'How can I assist you today?',
  "What's on your mind?",
  'Ready to help you out.',
  'What would you like to know?',
  "Let's solve something together!",
  'How may I be of service?',
  'What brings you here today?',
  "I'm here to help.",
  'What can I do for you?',
  "Let's get started.",
  'Ask me anything.',
  'What would you like to explore?',
  'How can I make your day easier?',
  'What question can I answer?',
  "Let's tackle this together!",
  "What's your challenge today?",
  'Ready when you are.',
  'What are you curious about?',
  'How can I brighten your day?',
  "What's your next move?",
];
export const ACCEPTED_FILE_EXTENSIONS = [
  // =====================================================================
  // 1. NATIVE PLAIN TEXT (Zero dependencies)
  // Parser: Native Browser FileReader (readAsText)
  // =====================================================================
  'txt',
  'md',
  'mdx',
  'csv',
  'tsv',
  'json',
  'xml',
  'yaml',
  'yml',
  'ini',
  'log',
  'env',

  // =====================================================================
  // 2. SOURCE CODE (Zero dependencies)
  // Parser: Native Browser FileReader (readAsText)
  // =====================================================================
  'js',
  'ts',
  'jsx',
  'tsx',
  'py',
  'java',
  'c',
  'cpp',
  'cs',
  'go',
  'rs',
  'php',
  'rb',
  'sh',
  'bat',
  'ps1',
  'sql',
  'swift',
  'kt',
  'html',
  'htm',
  'css',
  'scss',
  'less',
  'svg',
  'vue',
  'svelte',

  // =====================================================================
  // 3. PDF DOCUMENTS
  // Parser (Frontend): pdf.js (Mozilla)
  // Parser (Backend): PyMuPDF, pdfplumber, or PyPDF2 (Python)
  // =====================================================================
  'pdf',

  // =====================================================================
  // 4. MICROSOFT WORD & RICH TEXT
  // Parser (Frontend): mammoth.js (only does .docx, skips legacy .doc)
  // Parser (Backend): python-docx (.docx). Legacy .doc or .rtf usually require headless LibreOffice or antiword.
  // =====================================================================
  'docx',
  'doc',
  'rtf',
  'odt',

  // =====================================================================
  // 5. EXCEL SPREADSHEETS
  // Parser (Frontend): SheetJS (xlsx package)
  // Parser (Backend): pandas, openpyxl, or xlrd (Python)
  // =====================================================================
  'xlsx',
  'xls',
  'ods',

  // =====================================================================
  // 6. POWERPOINT PRESENTATIONS
  // Parser (Frontend): Very difficult, no robust lightweight libraries.
  // Parser (Backend): python-pptx (Python) to extract slide text.
  // =====================================================================
  'pptx',
  'ppt',
  'odp',

  // =====================================================================
  // 7. E-BOOKS
  // Parser (Frontend): JSZip (to unzip) + DOMParser (to read inner HTML)
  // Parser (Backend): ebooklib or BeautifulSoup (Python)
  // =====================================================================
  'epub',

  // =====================================================================
  // 8. AUDIO (Requires AI Transcription)
  // Parser (Backend): OpenAI Whisper running locally via your Python Flask proxy.
  // =====================================================================
  'mp3',
  'wav',
  'ogg',
  'm4a',
  'flac',

  // =====================================================================
  // 9. VIDEO (Requires complex pipeline)
  // Parser (Backend): FFmpeg (to extract audio/frames) -> Whisper (for text) + Vision Model (for frames).
  // =====================================================================
  'mp4',
  'webm',
  'mov',
  'mkv',
];
export const FILE_EXTENSIONS_MAP: Record<string, string> = {
  python: 'py',
  javascript: 'js',
  typescript: 'ts',
  csharp: 'cs',
  c: 'c',
  cpp: 'cpp',
  ruby: 'rb',
  rust: 'rs',
  go: 'go',
  java: 'java',
  html: 'html',
  css: 'css',
  json: 'json',
  markdown: 'md',
  bash: 'sh',
  shell: 'sh',
  sql: 'sql',
  yaml: 'yml',
  xml: 'xml',
};
