import { parseScript }              from './parser/index.js';
import { buildCSV, buildFilename }  from './generator/csv-builder.js';
import { initForm, getParams, resetDefaults } from './ui/form.js';
import { showResults, hideResults }  from './ui/renderer.js';
import { downloadCSV }               from './io/downloader.js';
import { readTextFile }              from './io/text-reader.js';
import { readDocxFile }              from './io/docx-reader.js';

// ── App state ─────────────────────────────────────────────────────────────────

let fileMode = false;   // true: content came from uploaded file (textarea locked)
let pendingCSV = null;
let pendingFilename = null;

// ── Boot ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initForm();
  bindEvents();
});

// ── Event wiring ──────────────────────────────────────────────────────────────

function bindEvents() {
  const dropZone    = document.getElementById('drop-zone');
  const fileInput   = document.getElementById('file-input');
  const textarea    = document.getElementById('script-input');
  const btnClear    = document.getElementById('btn-clear');
  const btnConvert  = document.getElementById('btn-convert');
  const btnReset    = document.getElementById('btn-reset-defaults');
  const btnDownload = document.getElementById('btn-download');

  // ── Drop zone ──────────────────────────────────────────────────────────────
  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    if (!fileMode) dropZone.classList.add('ss-drag-over');
  });
  dropZone.addEventListener('dragleave', e => {
    if (!dropZone.contains(e.relatedTarget)) {
      dropZone.classList.remove('ss-drag-over');
    }
  });
  dropZone.addEventListener('drop', async e => {
    e.preventDefault();
    dropZone.classList.remove('ss-drag-over');
    if (fileMode) return;
    const file = e.dataTransfer.files[0];
    if (file) await handleFile(file);
  });

  // Click anywhere inside drop zone triggers file picker
  dropZone.addEventListener('click', e => {
    if (fileMode) return;
    // Don't re-fire if the click target is already the <label> (it opens the picker itself)
    if (e.target.tagName === 'LABEL') return;
    fileInput.click();
  });

  // ── File input ────────────────────────────────────────────────────────────
  fileInput.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (file) await handleFile(file);
    fileInput.value = '';   // reset so same file can be re-selected
  });

  // ── Textarea mutual exclusion ─────────────────────────────────────────────
  textarea.addEventListener('input', () => {
    if (fileMode) return;
    const hasText = textarea.value.trim().length > 0;
    dropZone.classList.toggle('ss-disabled', hasText);
    if (hasText) resetResults();
  });

  // ── Buttons ───────────────────────────────────────────────────────────────
  btnClear.addEventListener('click', clearAll);

  btnConvert.addEventListener('click', handleConvert);

  btnReset.addEventListener('click', () => {
    resetDefaults();
    showToast('已恢复默认参数');
  });

  btnDownload.addEventListener('click', () => {
    if (pendingCSV && pendingFilename) {
      downloadCSV(pendingCSV, pendingFilename);
    }
  });
}

// ── File handling ─────────────────────────────────────────────────────────────

async function handleFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['txt', 'docx'].includes(ext)) {
    showToast('仅支持 .txt 或 .docx 文件', 'error');
    return;
  }

  setFileStatusMsg(`正在读取 ${file.name}…`);

  try {
    const text = ext === 'docx' ? await readDocxFile(file) : await readTextFile(file);
    setFileMode(file.name, text);
  } catch (err) {
    showToast(err.message, 'error');
    setFileStatusMsg('');
  }
}

function setFileMode(filename, text) {
  fileMode = true;
  const textarea = document.getElementById('script-input');
  textarea.value = text;
  textarea.disabled = true;
  textarea.classList.add('ss-disabled');
  document.getElementById('drop-zone').classList.add('ss-file-loaded');
  setFileStatusMsg(filename, true);
  resetResults();
}

function setFileStatusMsg(msg, isFile = false) {
  const el = document.getElementById('file-name-display');
  el.textContent = msg;
  el.classList.toggle('hidden', !msg);
  el.classList.toggle('ss-filename-active', isFile);
}

// ── Clear ─────────────────────────────────────────────────────────────────────

function clearAll() {
  fileMode = false;
  const textarea = document.getElementById('script-input');
  const dropZone = document.getElementById('drop-zone');
  textarea.value = '';
  textarea.disabled = false;
  textarea.classList.remove('ss-disabled');
  dropZone.classList.remove('ss-file-loaded', 'ss-drag-over', 'ss-disabled');
  setFileStatusMsg('');
  resetResults();
}

function resetResults() {
  hideResults();
  pendingCSV = null;
  pendingFilename = null;
}

// ── Convert ───────────────────────────────────────────────────────────────────

async function handleConvert() {
  const text = document.getElementById('script-input').value.trim();
  if (!text) {
    showToast('请先上传剧本文件或粘贴剧本文本', 'error');
    return;
  }

  setConverting(true);
  // yield to browser to paint the loading state before heavy work
  await new Promise(r => setTimeout(r, 16));

  try {
    const params = getParams();
    const { results, errors, usedLLM, llmError } = await parseScript(text, params);

    if (usedLLM) showToast('已使用 AI 辅助识别完成转换', 'info');
    if (llmError) showToast(`AI 识别失败，已用规则解析：${llmError}`, 'warn');

    if (results.length > 0) {
      const csv = buildCSV(results);
      pendingFilename = buildFilename();
      pendingCSV = csv;
    } else {
      pendingCSV = null;
      pendingFilename = null;
    }

    showResults(results, errors, pendingFilename);
  } catch (err) {
    showToast(`转换出错：${err.message}`, 'error');
  } finally {
    setConverting(false);
  }
}

function setConverting(on, label = '转换中…') {
  const btn     = document.getElementById('btn-convert');
  const lbl     = document.getElementById('btn-label');
  const spinner = document.getElementById('btn-spinner');
  btn.disabled = on;
  lbl.textContent = on ? label : '开始转换';
  spinner.classList.toggle('hidden', !on);
}

// ── Toast notifications ───────────────────────────────────────────────────────

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `ss-toast ss-toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('ss-toast-show'));
  setTimeout(() => {
    toast.classList.remove('ss-toast-show');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3500);
}
