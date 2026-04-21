// ── Public API ────────────────────────────────────────────────────────────────

export function showResults(results, errors, filename) {
  const section = document.getElementById('results-section');
  section.classList.remove('hidden');
  requestAnimationFrame(() => {
    section.classList.add('ss-fade-in');
    section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  const fatals   = errors.filter(e => e.isFatal);
  const warnings = errors.filter(e => !e.isFatal);

  renderSummary(results.length, fatals.length, warnings.length);
  renderEpisodeList(results, errors);
  renderDownloadBar(results.length, filename);
}

export function hideResults() {
  const section = document.getElementById('results-section');
  section.classList.add('hidden');
  section.classList.remove('ss-fade-in');
}

// ── Internal ──────────────────────────────────────────────────────────────────

function renderSummary(ok, fail, warn) {
  const el = document.getElementById('summary-row');
  el.innerHTML = `
    <div class="ss-chip ss-chip-ok">
      <span class="ss-chip-num">${ok}</span>集成功
    </div>
    <div class="ss-chip ss-chip-err">
      <span class="ss-chip-num">${fail}</span>集失败
    </div>
    <div class="ss-chip ss-chip-warn">
      <span class="ss-chip-num">${warn}</span>条警告
    </div>
  `;
}

function renderEpisodeList(results, errors) {
  const list = document.getElementById('episode-list');
  list.innerHTML = '';

  if (results.length === 0 && errors.length === 0) {
    list.innerHTML = '<p class="ss-empty">未找到任何内容，请检查输入格式。</p>';
    return;
  }

  // Build per-episode lookup (match by episode number)
  const warnsByEp  = groupBy(errors.filter(e => !e.isFatal), e => e.episodeNum);
  const fatalsByEp = groupBy(errors.filter(e => e.isFatal),  e => e.episodeNum);

  // Render successful episodes
  const succeededNums = new Set();
  for (const row of results) {
    const num = extractEpNum(row.episode);
    succeededNums.add(num);
    const warns = warnsByEp[num] ?? [];
    list.appendChild(episodeItem(
      row.episode,
      warns.length > 0 ? 'warning' : 'success',
      warns.map(e => e.message),
    ));
  }

  // Render failed episodes (fatal errors, not in results)
  for (const [numStr, epFatals] of Object.entries(fatalsByEp)) {
    const num = Number(numStr);
    if (succeededNums.has(num)) continue;
    const label = epFatals[0]?.episodeNum === 0
      ? '文档整体'
      : `第${num}集`;
    list.appendChild(episodeItem(label, 'error', epFatals.map(e => e.message)));
  }
}

function renderDownloadBar(okCount, filename) {
  const btn  = document.getElementById('btn-download');
  const name = document.getElementById('download-filename');
  btn.disabled = okCount === 0;
  name.textContent = filename
    ? `文件名：${filename}`
    : okCount === 0 ? '没有可下载的内容' : '';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function episodeItem(label, status, messages) {
  const icons = { success: '✅', error: '❌', warning: '⚠️' };
  const div = document.createElement('div');
  div.className = `ss-ep-item ss-ep-${status}`;

  const msgs = messages.length > 0
    ? `<ul class="ss-ep-msgs">${messages.map(m => `<li>${esc(m)}</li>`).join('')}</ul>`
    : '';

  div.innerHTML = `
    <div class="ss-ep-header">
      <span class="ss-ep-icon">${icons[status]}</span>
      <span class="ss-ep-label">${esc(label)}</span>
    </div>${msgs}`;
  return div;
}

function groupBy(arr, keyFn) {
  const map = {};
  for (const item of arr) {
    const k = keyFn(item);
    (map[k] ??= []).push(item);
  }
  return map;
}

function extractEpNum(header) {
  const m = header.match(/\d+/);
  return m ? Number(m[0]) : -1;
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
