import { ERROR_CODES, ParseError } from '../utils/errors.js';

/**
 * Builds the column-3 assets string by matching each name to the link table.
 * Uses full-width pipe ｜ as separator per Q5 decision.
 *
 * @param {string[]} names       - Ordered, deduplicated list of characters + scenes
 * @param {Map<string,string>} linkMap
 * @param {number} episodeNum
 * @returns {{ assets: string, warnings: ParseError[] }}
 */
export function matchLinks(names, linkMap, episodeNum) {
  const warnings = [];
  const lines = [];

  for (const name of names) {
    if (linkMap.size === 0) {
      // No link table present at all → leave col 3 empty (user Q8)
      break;
    }

    if (linkMap.has(name)) {
      lines.push(`${name}｜${linkMap.get(name)}`);
    } else {
      lines.push(`[${name}]｜未找到链接`);
      warnings.push(new ParseError(
        ERROR_CODES.W_MISSING_LINK, episodeNum,
        `第${episodeNum}集的"${name}"在链接表中未找到`
      ));
    }
  }

  // Entries separated by one blank line as per PRD §5.1 example
  const assets = lines.join('\n\n');
  return { assets, warnings };
}
