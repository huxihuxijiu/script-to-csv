const STORAGE_KEY = 'saystation_csv_params_v1';

export function saveParams(params) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(params)); } catch {}
}

export function loadParams() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
