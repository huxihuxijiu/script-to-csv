// Extracts scene names and character names from episode content.

// Shot info line examples:
//   "5-1 白天/内 林晨希卧室"            →  scene = "林晨希卧室"
//   "1-1 傍晚／内 院长公馆·主卧【慢】人物：林煜风、艾奈"  →  scene = "院长公馆·主卧"
// Captures everything after the second token (time/location), then trims.
const SHOT_INFO_RE = /^\d+-\d+\s+\S+\s+(.+)$/;

// Character pattern — may appear anywhere in a line (e.g. end of shot info line)
// Captures names up to end of line, stopping before 【 markers
const CHARACTER_RE = /人物[：:]\s*([^\n\r【】]+)/;

export function extractSceneNames(content) {
  const scenes = [];
  const seen = new Set();
  for (const line of content.split('\n')) {
    const m = line.match(SHOT_INFO_RE);
    if (m) {
      let scene = m[1].trim();
      // Trim annotation brackets 【…】 and anything after 人物：
      const cutIdx = scene.search(/[【【]|人物[：:]/);
      if (cutIdx > 0) scene = scene.slice(0, cutIdx).trim();
      if (scene && !seen.has(scene)) {
        seen.add(scene);
        scenes.push(scene);
      }
    }
  }
  return scenes;
}

export function extractCharacters(content) {
  const characters = [];
  const seen = new Set();
  for (const line of content.split('\n')) {
    const m = line.match(CHARACTER_RE);
    if (m) {
      // Split by Chinese enumeration comma, full-width comma, or ASCII comma
      const names = m[1].split(/[、，,]/).map(n => n.trim()).filter(Boolean);
      for (const name of names) {
        if (!seen.has(name)) {
          seen.add(name);
          characters.push(name);
        }
      }
    }
  }
  return characters;
}
