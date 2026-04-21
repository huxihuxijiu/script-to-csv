import { DEFAULTS, OPTIONS } from '../config.js';
import { loadParams, saveParams } from './storage.js';

const PARAM_FIELDS = [
  { key: 'ratio',        label: '宽高比' },
  { key: 'style',        label: '画风' },
  { key: 'model',        label: '模型' },
  { key: 'resolution',   label: '分辨率' },
  { key: 'analysisMode', label: '剧本分析模式' },
];

export function initForm() {
  const grid = document.getElementById('params-grid');
  grid.innerHTML = '';

  for (const { key, label } of PARAM_FIELDS) {
    const wrapper = document.createElement('div');
    wrapper.className = 'ss-param-item';

    const lbl = document.createElement('label');
    lbl.htmlFor = `param-${key}`;
    lbl.className = 'ss-param-label';
    lbl.textContent = label;

    const sel = document.createElement('select');
    sel.id = `param-${key}`;
    sel.className = 'ss-select';
    sel.dataset.key = key;

    for (const opt of OPTIONS[key]) {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      sel.appendChild(o);
    }

    sel.addEventListener('change', () => saveParams(getParams()));

    wrapper.appendChild(lbl);
    wrapper.appendChild(sel);
    grid.appendChild(wrapper);
  }

  // Restore saved or defaults
  setParams(loadParams() ?? DEFAULTS);
}

export function getParams() {
  const params = {};
  for (const { key } of PARAM_FIELDS) {
    const el = document.getElementById(`param-${key}`);
    if (el) params[key] = el.value;
  }
  return params;
}

export function setParams(params) {
  for (const { key } of PARAM_FIELDS) {
    const el = document.getElementById(`param-${key}`);
    if (el && params[key] !== undefined) el.value = params[key];
  }
  saveParams(getParams());
}

export function resetDefaults() {
  setParams(DEFAULTS);
}

