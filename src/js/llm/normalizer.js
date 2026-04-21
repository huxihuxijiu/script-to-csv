// AI-powered script normalizer — called when rule-based parsing fails.
// Uses the company's unified LLM API (tencent_gemini_pro).

const API_ENDPOINT =
  'https://sh-uat-llm-online.xverse.cn/uat-yunjing/aigc-saystation-apiserver' +
  '/api/xverse-ai/text/chat/completions';

// ── Shared API caller ─────────────────────────────────────────────────────────

async function callLLM(prompt) {
  const resp = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vendor: 'tencent_gemini_pro',
      params: { prompt },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`AI 接口请求失败 (${resp.status})${body ? '：' + body.slice(0, 100) : ''}`);
  }

  const data = await resp.json();
  if (!data.success) throw new Error(`AI 返回错误：${data.error || '未知错误'}`);
  return (data.message?.content ?? '').trim();
}

// ── Whole-document normalization (used when no episodes found at all) ─────────

const DOC_PROMPT = `你是一个剧本格式规范化助手。请将以下剧本文本转换为标准格式后直接返回，不要添加任何解释或修改剧情内容。

标准格式要求：
1. 集头格式：第X集：集名（示例：第1集：清晨的越界）
2. 分镜信息行格式：集号-镜号 时间/内外 场景名（示例：1-1 白天/内 林晨希卧室）
3. 人物行独立一行：人物：张三、李四
4. 分镜之间用两个连续空行分隔

只返回规范化后的文本，不要任何额外内容。

剧本内容：

`;

export async function normalizeScript(scriptText) {
  return callLLM(DOC_PROMPT + scriptText);
}

// ── Single-episode normalization (used for per-episode LLM with progress) ─────

const EPISODE_PROMPT = `你是一个剧本格式规范化助手。请将以下【单集剧本内容】转换为标准格式后直接返回，不要添加任何解释或修改剧情内容。

标准格式要求：
1. 第一行保持原有集头格式不变（如：第5集：清晨的越界）
2. 分镜信息行格式：集号-镜号 时间/内外 场景名（示例：5-1 白天/内 林晨希卧室）
3. 人物行独立一行：人物：张三、李四
4. 分镜之间用两个连续空行分隔

只返回规范化后的单集内容（含集头行），不要任何额外内容。

单集内容：

`;

/**
 * Normalize a single episode. Returns the episode content (WITHOUT the header line).
 * @param {string} header  - e.g. "第5集：清晨的越界"
 * @param {string} content - episode body text
 * @returns {Promise<string>} - normalized episode body (no header)
 */
export async function normalizeEpisode(header, content) {
  const raw = await callLLM(EPISODE_PROMPT + header + '\n' + content);

  // Strip the header line from LLM output so caller gets content only
  const lines = raw.split('\n');
  const hIdx = lines.findIndex(l => /^第\s*\d+\s*集/.test(l.trim()));
  if (hIdx >= 0) {
    return lines.slice(hIdx + 1).join('\n').trim();
  }
  return raw;
}
