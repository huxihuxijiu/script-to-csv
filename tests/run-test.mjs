/**
 * Quick smoke-test for the core parser + CSV generator.
 * Run with: node tests/run-test.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

import { parseScript } from '../src/js/parser/index.js';
import { buildCSV } from '../src/js/generator/csv-builder.js';
import { DEFAULTS } from '../src/js/config.js';

const samplePath = join(root, 'assets/sample/sample-script.txt');
const rawText = readFileSync(samplePath, 'utf-8');

console.log('═'.repeat(60));
console.log('  剧本 → CSV 解析器 · 测试运行');
console.log('═'.repeat(60));

const { results, errors } = parseScript(rawText, DEFAULTS);

console.log(`\n✅ 成功处理: ${results.length} 集`);
if (errors.length > 0) {
  console.log(`⚠️  错误/警告: ${errors.length} 条`);
  errors.forEach(e => {
    const tag = e.isFatal ? '❌' : '⚠️ ';
    console.log(`  ${tag} [${e.code}] 第${e.episodeNum}集: ${e.message}`);
  });
} else {
  console.log('   无错误，无警告');
}

if (results.length === 0) {
  console.log('\n没有可输出的集，退出。');
  process.exit(1);
}

const csv = buildCSV(results);

// Strip BOM for display
const display = csv.replace(/^\uFEFF/, '');

console.log('\n' + '─'.repeat(60));
console.log('  生成的 CSV（BOM 已移除以便显示）');
console.log('─'.repeat(60));
console.log(display);

// ── 验收检验：前 6 行与真实样本逐字比对 ──────────────────────
const refFirstSixLines = [
  '上传 CSV 文件批量创建项目,,,,,,,',
  '# 画面比例可选: 16:9 / 9:16,,,,,,,',
  '# 画风可选: 美式卡通 / 2D古风 / 3D古风 / 韩流一次元 / 现代都市 / 3D卡通 / 日漫二次元 / 中国工笔画 / 写实风格 / 彩色水墨,,,,,,,',
  '# 模型可选: say-video hot / HM-Jimeng SD2.0 Fast Official / say-video fast,,,,,,,',
  '# 分辨率可选: 720p,,,,,,,',
  '# 剧本分析模式可选(可留空): 批量创建项目 / 选择文件 / 下载模板文件,,,,,,,',
];

// Split on CRLF (our output) or LF (just in case)
const outputLines = display.split(/\r\n|\n/);
const outputFirstSix = outputLines.slice(0, 6);

console.log('\n' + '─'.repeat(60));
console.log('  头部 6 行逐字比对');
console.log('─'.repeat(60));

let allMatch = true;
refFirstSixLines.forEach((ref, i) => {
  const out = outputFirstSix[i];
  const ok = out === ref;
  if (!ok) allMatch = false;
  console.log(`行${i + 1} ${ok ? '✅' : '❌'}: ${ok ? 'MATCH' : `MISMATCH\n  期望: ${ref}\n  实际: ${out}`}`);
});

console.log('\n' + (allMatch ? '✅ 头部 6 行字符级完全一致' : '❌ 头部有差异，请检查'));

// Check column count on data rows
console.log('\n' + '─'.repeat(60));
console.log('  数据行列数检验（期望 8 列）');
console.log('─'.repeat(60));

// Simple column counter that respects quoted fields
function countCSVColumns(line) {
  let cols = 1;
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQuote = !inQuote; continue; }
    if (!inQuote && line[i] === ',') cols++;
  }
  return cols;
}

outputLines.slice(6).filter(Boolean).forEach((line, i) => {
  const cols = countCSVColumns(line);
  // For multi-line quoted fields the continuation lines won't show 8 cols —
  // only check lines that start a new record (first col is 第X集)
  if (/^第\s*\d+\s*集/.test(line) || i === 0) {
    const ok = cols === 8;
    console.log(`数据行${i + 1} ${ok ? '✅' : '❌'}: ${cols} 列${ok ? '' : ' ← 期望 8 列'}`);
  }
});

console.log('\n' + '═'.repeat(60));
