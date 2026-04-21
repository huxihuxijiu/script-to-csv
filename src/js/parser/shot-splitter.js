// Splits episode content into individual shot blocks.
// Separator: two or more consecutive blank lines (3+ newlines).
// A single blank line inside a shot is preserved as-is (formatting habit / AI output).

export function splitShots(content) {
  return content
    .split(/(?:\n[ \t]*){3,}/)
    .map(s => s.trim())
    .filter(Boolean);
}
