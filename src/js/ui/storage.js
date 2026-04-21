const STORAGE_KEY = 'saystation_csv_params_v1';
const TOKEN_KEY   = 'saystation_api_token_v1';

export function saveParams(params) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(params)); } catch {}
}

export function loadParams() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch {}
}

export function loadToken() {
  try { return localStorage.getItem(TOKEN_KEY) ?? ''; } catch { return ''; }
}
