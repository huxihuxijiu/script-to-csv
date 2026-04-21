// Scans document from the bottom up to extract the name|URL link table.
// Returns { scriptText, linkMap } where linkMap is Map<name, url>.

const LINK_LINE_RE = /^(.+?)\s*[|｜]\s*(https?:\/\/\S+)\s*$/;

// If a non-link line matches any of these it looks like script content → stop scanning
const SCRIPT_LINE_PATTERNS = [
  /[。！？…]/,       // Chinese sentence-ending punctuation
  /^第\s*\d+\s*集/,  // episode header
  /^▲/,             // shot description
  /^人物[：:]/,      // character line
  /^〔/,            // visual state bracket
];

function looksLikeScript(line) {
  return SCRIPT_LINE_PATTERNS.some(re => re.test(line));
}

export function extractLinkTable(text) {
  const lines = text.split('\n');
  const entries = []; // accumulated in reverse order while scanning upward
  let scriptEndIndex = lines.length;

  let i = lines.length - 1;
  while (i >= 0) {
    const trimmed = lines[i].trim();

    if (trimmed === '') {
      i--;
      continue;
    }

    const match = trimmed.match(LINK_LINE_RE);
    if (!match) break; // first non-empty non-link line: stop

    scriptEndIndex = i;
    const name = match[1].trim();
    const url = match[2].trim();
    entries.push({ name, url });
    i--;
  }

  // entries are in reverse document order; reverse to get top-to-bottom order
  entries.reverse();

  // Build map with first-occurrence wins for duplicates
  const linkMap = new Map();
  for (const { name, url } of entries) {
    if (!linkMap.has(name)) {
      linkMap.set(name, url);
    }
  }

  const scriptText = lines.slice(0, scriptEndIndex).join('\n');
  return { scriptText, linkMap };
}
