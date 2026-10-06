import { sanitizeMedicalLatex } from '@/lib/youtubeService';

export function escapeHtml(value) {
  if (!value) return '';
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function extractTextFromChildren(children) {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractTextFromChildren).join(' ');
  if (children && typeof children === 'object' && children.props) return extractTextFromChildren(children.props.children);
  return '';
}

export function preprocessBidiMarkdown(markdown) {
  if (!markdown) return '';
  let text = markdown.replace(/^[ \t]*={3,}[ \t]*$/gm, '---');
  const codeBlocks = [];
  text = text.replace(/(```[\s\S]*?```)/g, (match) => {
    const cleaned = match.replace(/<mark[^>]*>([\s\S]*?)<\/mark>/gi, '$1').replace(/<mark[^>]*>/gi, '').replace(/<\/mark>/gi, '').replace(/==\[(?:green|yellow|red|cyan|orange)\]/gi, '').replace(/==/g, '');
    const placeholder = `__FENCED_CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(sanitizeMedicalLatex(cleaned));
    return placeholder;
  });
  const inlineCodes = [];
  text = text.replace(/(`[^`\n]+`)/g, (match) => {
    const placeholder = `__INLINE_CODE_${inlineCodes.length}__`;
    inlineCodes.push(sanitizeMedicalLatex(match));
    return placeholder;
  });
  text = sanitizeMedicalLatex(text).replace(/={3,}/g, '')
    .replace(/==\[green\]([^\n]+?)==/gi, '<mark class="hl-green">$1</mark>')
    .replace(/==\[yellow\]([^\n]+?)==/gi, '<mark class="hl-yellow">$1</mark>')
    .replace(/==\[red\]([^\n]+?)==/gi, '<mark class="hl-red">$1</mark>')
    .replace(/==\[cyan\]([^\n]+?)==/gi, '<mark class="hl-cyan">$1</mark>')
    .replace(/==\[orange\]([^\n]+?)==/gi, '<mark class="hl-orange">$1</mark>')
    .replace(/==([^=\n]+?)==/g, '<mark class="hl-yellow">$1</mark>')
    .replace(/<highlight>([\s\S]+?)<\/highlight>/gi, '<mark class="hl-yellow">$1</mark>')
    .replace(/<mark(?!\s+class=)>/gi, '<mark class="hl-yellow">')
    .replace(/<mark[^>]*>\s*<\/mark>/gi, '');
  inlineCodes.forEach((code, index) => { text = text.replace(`__INLINE_CODE_${index}__`, () => code); });
  codeBlocks.forEach((code, index) => { text = text.replace(`__FENCED_CODE_BLOCK_${index}__`, () => code); });
  return sanitizeMedicalLatex(text);
}

export function isEnglishNode(children) {
  const text = extractTextFromChildren(children);
  const arabicLetters = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const englishLetters = (text.match(/[a-zA-Z]/g) || []).length;
  return englishLetters > arabicLetters && englishLetters >= 5;
}
