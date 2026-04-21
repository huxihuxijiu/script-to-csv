// Splits a script text into individual episode objects by scanning for episode headers.

const EPISODE_HEADER_RE = /^第\s*(\d+)\s*集[：:]\s*(.+)$/mg;

export function splitEpisodes(text) {
  const matches = [];
  let m;
  // Reset lastIndex because the regex has the 'g' flag
  EPISODE_HEADER_RE.lastIndex = 0;

  while ((m = EPISODE_HEADER_RE.exec(text)) !== null) {
    matches.push({
      index: m.index,
      rawHeader: m[0],
      num: parseInt(m[1], 10),
      title: m[2].trim(),
    });
  }

  if (matches.length === 0) return [];

  return matches.map((match, i) => {
    const contentStart = match.index + match.rawHeader.length;
    const contentEnd = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const content = text.slice(contentStart, contentEnd).trim();
    return {
      num: match.num,
      rawHeader: match.rawHeader,
      title: match.title,
      content,
    };
  });
}
