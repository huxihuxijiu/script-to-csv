import { extractLinkTable } from './link-extractor.js';
import { splitEpisodes } from './episode-splitter.js';
import { extractCharacters, extractSceneNames } from './scene-parser.js';
import { splitShots } from './shot-splitter.js';
import { validateEpisode } from '../utils/validator.js';
import { matchLinks } from '../matcher/link-matcher.js';
import { ParseError, ERROR_CODES } from '../utils/errors.js';
import { normalizeScript } from '../llm/normalizer.js';

/**
 * Main entry point: parse raw script text and return CSV row data + error list.
 * If rule-based parsing has fatal errors, automatically retries with AI normalization.
 *
 * @param {string} rawText - Raw script text (any line endings, optional BOM)
 * @param {object} params  - { ratio, style, model, resolution, analysisMode }
 * @returns {Promise<{ results: object[], errors: ParseError[], usedLLM: boolean, llmError?: string }>}
 */
export async function parseScript(rawText, params) {
  // Normalize: strip BOM, unify line endings
  const text = rawText
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Separate link table from script body (do this once; LLM only sees scriptText)
  const { scriptText, linkMap } = extractLinkTable(text);

  // First pass: rule-based parsing
  const firstPass = runCoreParser(scriptText, linkMap, params);

  // If no fatal errors, we're done
  const hasFatal = firstPass.errors.some(e => e.isFatal);
  if (!hasFatal) {
    return { ...firstPass, usedLLM: false };
  }

  // LLM fallback: normalize script and retry
  try {
    const normalized = await normalizeScript(scriptText);
    const secondPass = runCoreParser(normalized, linkMap, params);
    return { ...secondPass, usedLLM: true };
  } catch (llmErr) {
    // LLM failed — return original rule-based results with LLM error attached
    return { ...firstPass, usedLLM: false, llmError: llmErr.message };
  }
}

/**
 * Pure synchronous parser core. Takes already-extracted scriptText + linkMap.
 */
function runCoreParser(scriptText, linkMap, params) {
  const episodeRaws = splitEpisodes(scriptText);

  if (episodeRaws.length === 0) {
    return {
      results: [],
      errors: [new ParseError(
        ERROR_CODES.E_NO_EPISODES, 0,
        '未找到任何集头（如"第1集：集名"），请检查文档格式'
      )],
    };
  }

  const results = [];
  const errors = [];
  const seenNums = new Set();

  for (const raw of episodeRaws) {
    // Duplicate episode number check
    if (seenNums.has(raw.num)) {
      errors.push(new ParseError(
        ERROR_CODES.E_BAD_EPISODE_NUM, raw.num,
        `第${raw.num}集出现多次，请检查`
      ));
      continue;
    }
    seenNums.add(raw.num);

    // Validate structure
    const validationErrors = validateEpisode(raw);
    const fatalErrors = validationErrors.filter(e => e.isFatal);
    errors.push(...validationErrors);
    if (fatalErrors.length > 0) continue;

    // Extract characters and scenes (order: characters first, then new scenes)
    const characters = extractCharacters(raw.content);
    const scenes = extractSceneNames(raw.content);
    const allNames = dedupe([...characters, ...scenes]);

    // Match links
    const { assets, warnings } = matchLinks(allNames, linkMap, raw.num);
    errors.push(...warnings);

    // Normalize story: split on double blank lines, rejoin with triple newlines
    const shots = splitShots(raw.content);
    const story = shots.join('\n\n\n');

    results.push({
      episode: raw.rawHeader,   // col 1: preserved as-is
      story,                    // col 2: full episode content
      assets,                   // col 3: name｜url entries
      ratio: params.ratio,
      style: params.style,
      model: params.model,
      resolution: params.resolution,
      analysisMode: params.analysisMode,
    });
  }

  return { results, errors };
}

function dedupe(arr) {
  const seen = new Set();
  return arr.filter(x => {
    if (seen.has(x)) return false;
    seen.add(x);
    return true;
  });
}
