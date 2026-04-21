import { HEADER_LINES } from './header.js';

const BOM = '\uFEFF';
const CRLF = '\r\n';

/**
 * CSV-escapes a single field value.
 * Wraps in double quotes if the value contains comma, double-quote, CR, or LF.
 * Internal double-quotes are doubled.
 */
function escapeField(value) {
  const str = String(value ?? '');
  if (/[,"\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Builds one CSV data row from a result object (8 columns).
 */
function buildDataRow(row) {
  const fields = [
    row.episode,      // col 1: 剧集
    row.story,        // col 2: 剧情
    row.assets,       // col 3: 资产库人物
    row.ratio,        // col 4: 宽高比
    row.style,        // col 5: 画风
    row.model,        // col 6: 模型
    row.resolution,   // col 7: 分辨率
    row.analysisMode, // col 8: 剧本分析模式
  ];
  return fields.map(escapeField).join(',');
}

/**
 * Assembles the complete CSV string:
 *   UTF-8 BOM + 6 fixed header rows + N data rows, each terminated by CRLF.
 *
 * @param {object[]} rows - Array of episode result objects
 * @returns {string} Complete CSV string (starts with BOM)
 */
export function buildCSV(rows) {
  const lines = [];

  // 6 fixed header rows — text in col 1, 7 empty cols to make 8 total
  for (const h of HEADER_LINES) {
    lines.push(h + ',,,,,,,');
  }

  // One data row per episode
  for (const row of rows) {
    lines.push(buildDataRow(row));
  }

  return BOM + lines.join(CRLF) + CRLF;
}

/**
 * Generates a timestamped filename: 批量导入_YYYYMMDD_HHmmss.csv
 */
export function buildFilename() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `批量导入_${date}_${time}.csv`;
}
