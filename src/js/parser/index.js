import { extractLinkTable } from './link-extractor.js';
import { splitEpisodes } from './episode-splitter.js';
import { extractCharacters, extractSceneNames } from './scene-parser.js';
import { splitShots } from './shot-splitter.js';
import { validateEpisode } from '../utils/validator.js';
import { matchLinks } from '../matcher/link-matcher.js';
import { ParseError, ERROR_CODES } from '../utils/errors.js';
import { normalizeScript, normalizeEpisode } from '../llm/normalizer.js';

/**
 * Main entry point: parse raw script text into CSV row data.
 *
 * Flow:
 *  1. Rule-based parse of all episodes.
 *  2. Episodes with fatal errors → per-episode LLM normalization (real progress).
 *  3. If NO episodes found at all → LLM normalizes whole document, then retry.
 *
 * @param {string}   rawText    - Raw script text
 * @param {object}   params     - { ratio, style, model, resolution, analysisMode }
 * @param {Function} onProgress - ({ current, total, message }) => void
 * @returns {Promise<{ results, errors, usedLLM }>}
 */
export async function parseScript(rawText, params, onProgress = null) {
  // ── Preprocess ──────────────────────────────────────────────────────────────
  const text = rawText
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const { scriptText, linkMap } = extractLinkTable(text);

  // ── Split episodes ──────────────────────────────────────────────────────────
  let episodeRaws = splitEpisodes(scriptText);

  // ── CASE A: No episodes found → LLM whole-doc normalization ────────────────
  if (episodeRaws.length === 0) {
    onProgress?.({ current: 0, total: 1, message: 'AI 正在识别文档结构…' });
    try {
      const normalized = await normalizeScript(scriptText);
      onProgress?.({ current: 1, total: 1, message: '识别完成，正在解析…' });
      const result = runEpisodePass(splitEpisodes(normalized), linkMap, params);
      return { ...result, usedLLM: true };
    } catch (llmErr) {
      return {
        results: [],
        errors: [new ParseError(
          ERROR_CODES.E_NO_EPISODES, 0,
          `未找到任何集头，AI 识别也未成功：${llmErr.message}`
        )],
        usedLLM: false,
        llmError: llmErr.message,
      };
    }
  }

  // ── CASE B: Episodes found — validate each, LLM-fix failures per episode ───
  // Deduplicate episode numbers first
  const seenNums = new Set();
  const dupErrors = [];
  const uniqueEpisodes = [];

  for (const raw of episodeRaws) {
    if (seenNums.has(raw.num)) {
      dupErrors.push(new ParseError(
        ERROR_CODES.E_BAD_EPISODE_NUM, raw.num, `第${raw.num}集出现多次，请检查`
      ));
    } else {
      seenNums.add(raw.num);
      uniqueEpisodes.push(raw);
    }
  }

  // Identify episodes that need LLM help
  const needsLLM = uniqueEpisodes.filter(
    raw => validateEpisode(raw).some(e => e.isFatal)
  );

  // Per-episode LLM normalization with real progress
  const normalizedMap = new Map(); // num → normalized content

  for (let i = 0; i < needsLLM.length; i++) {
    const raw = needsLLM[i];
    onProgress?.({
      current: i,
      total: needsLLM.length,
      message: `AI 正在识别第 ${raw.num} 集（${i + 1} / ${needsLLM.length}）…`,
    });

    try {
      const normalizedContent = await normalizeEpisode(raw.rawHeader, raw.content);
      normalizedMap.set(raw.num, normalizedContent);
    } catch {
      // LLM failed for this episode — will fall back to original content
    }

    onProgress?.({
      current: i + 1,
      total: needsLLM.length,
      message: `第 ${raw.num} 集识别完成（${i + 1} / ${needsLLM.length}）`,
    });
  }

  // Build effective episode list (replace content with LLM output where available)
  const effectiveEpisodes = uniqueEpisodes.map(raw =>
    normalizedMap.has(raw.num)
      ? { ...raw, content: normalizedMap.get(raw.num) }
      : raw
  );

  const result = runEpisodePass(effectiveEpisodes, linkMap, params);
  return {
    results: result.results,
    errors: [...dupErrors, ...result.errors],
    usedLLM: normalizedMap.size > 0,
  };
}

// ── Core episode processing (synchronous) ─────────────────────────────────────

function runEpisodePass(episodeRaws, linkMap, params) {
  const results = [];
  const errors = [];
  const seenNums = new Set();

  for (const raw of episodeRaws) {
    if (seenNums.has(raw.num)) {
      errors.push(new ParseError(
        ERROR_CODES.E_BAD_EPISODE_NUM, raw.num, `第${raw.num}集出现多次，请检查`
      ));
      continue;
    }
    seenNums.add(raw.num);

    const validationErrors = validateEpisode(raw);
    errors.push(...validationErrors);
    if (validationErrors.some(e => e.isFatal)) continue;

    const characters = extractCharacters(raw.content);
    const scenes = extractSceneNames(raw.content);
    const allNames = dedupe([...characters, ...scenes]);

    const { assets, warnings } = matchLinks(allNames, linkMap, raw.num);
    errors.push(...warnings);

    const shots = splitShots(raw.content);
    const story = shots.join('\n\n\n');

    results.push({
      episode: raw.rawHeader,
      story,
      assets,
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
