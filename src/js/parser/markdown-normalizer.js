// Strips common Markdown syntax markers and decorative separator lines while
// preserving structural script content (episode headers, character lines, etc.).
// Runs before splitEpisodes so existing rule-based parsers see clean text.

const DECORATIVE_LINE_RE = /^\s*[═━─=*_\-]{3,}\s*$/;
const ATX_HEADING_RE = /^\s{0,3}#{1,6}\s+/;
const BLOCKQUOTE_RE = /^\s{0,3}>\s?/;
const LIST_ITEM_RE = /^\s{0,3}[-*+]\s+/;
const BOLD_AST_RE = /\*\*([^*\n]+)\*\*/g;
const BOLD_UND_RE = /__([^_\n]+)__/g;

export function normalizeMarkdown(text) {
  return text.split('\n').map(line => {
    if (DECORATIVE_LINE_RE.test(line)) return '';
    return line
      .replace(ATX_HEADING_RE, '')
      .replace(BLOCKQUOTE_RE, '')
      .replace(LIST_ITEM_RE, '')
      .replace(BOLD_AST_RE, '$1')
      .replace(BOLD_UND_RE, '$1');
  }).join('\n');
}
