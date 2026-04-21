// AI-powered script normalizer — called only when rule-based parsing fails.
// Uses the company's unified LLM API (tencent_gemini_pro / Gemini 3.1 Pro Preview).

const API_ENDPOINT =
  'https://sh-uat-llm-online.xverse.cn/uat-yunjing/aigc-saystation-apiserver' +
  '/api/xverse-ai/text/chat/completions';

const VENDOR = 'tencent_gemini_pro';

const NORMALIZE_PROMPT = `你是一个剧本格式规范化助手。请将以下剧本文本转换为标准格式后直接返回，不要添加任何解释、说明或修改剧情内容。

标准格式要求：
1. 集头格式：第X集：集名（示例：第1集：清晨的越界）
2. 分镜信息行格式：集号-镜号 时间/内外 场景名（示例：1-1 白天/内 林晨希卧室）
3. 人物行独立一行：人物：张三、李四
4. 分镜之间用【两个连续空行】分隔（即三个换行符）
5. 不修改剧情内容，仅调整格式

待规范化的剧本内容：

`;

/**
 * Send script text to LLM for format normalization.
 * @param {string} scriptText - Script text WITHOUT link table
 * @param {string} apiToken   - Bearer token (may be empty for no-auth APIs)
 * @returns {Promise<string>} - Normalized script text
 */
export async function normalizeScript(scriptText, apiToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiToken && apiToken.trim()) {
    headers['Authorization'] = `Bearer ${apiToken.trim()}`;
  }

  const resp = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      vendor: VENDOR,
      params: {
        prompt: NORMALIZE_PROMPT + scriptText,
        max_tokens: 8192,
        stream: false,
      },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`AI 接口请求失败 (${resp.status})${body ? '：' + body.slice(0, 100) : ''}`);
  }

  const data = await resp.json();

  if (!data.success) {
    throw new Error(`AI 返回错误：${data.error || '未知错误'}`);
  }

  return (data.message?.content ?? '').trim();
}
