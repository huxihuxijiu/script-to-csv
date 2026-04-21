#!/usr/bin/env python3
"""
Python mirror of the JS parser for smoke-testing on machines without Node.js.
Mirrors: parser/*, matcher/link-matcher, generator/csv-builder.
"""
import re
import sys
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── config ────────────────────────────────────────────────────────────────────
DEFAULTS = {
    'ratio': '9:16',
    'style': '日漫二次元',
    'model': 'HM-Jimeng SD2.0 Fast Official',
    'resolution': '720p',
    'analysisMode': '剧本模式',
}

# ── generator/header ──────────────────────────────────────────────────────────
HEADER_LINES = [
    '上传 CSV 文件批量创建项目',
    '# 画面比例可选: 16:9 / 9:16',
    '# 画风可选: 美式卡通 / 2D古风 / 3D古风 / 韩流一次元 / 现代都市 / 3D卡通 / 日漫二次元 / 中国工笔画 / 写实风格 / 彩色水墨',
    '# 模型可选: say-video hot / HM-Jimeng SD2.0 Fast Official / say-video fast',
    '# 分辨率可选: 720p',
    '# 剧本分析模式可选(可留空): 批量创建项目 / 选择文件 / 下载模板文件',
]

# ── parser/link-extractor ─────────────────────────────────────────────────────
LINK_LINE_RE = re.compile(r'^(.+?)\s*[|｜]\s*(https?://\S+)\s*$')

def extract_link_table(text):
    lines = text.split('\n')
    entries = []
    script_end = len(lines)
    i = len(lines) - 1
    while i >= 0:
        trimmed = lines[i].strip()
        if not trimmed:
            i -= 1
            continue
        m = LINK_LINE_RE.match(trimmed)
        if not m:
            break
        script_end = i
        entries.append((m.group(1).strip(), m.group(2).strip()))
        i -= 1
    entries.reverse()
    link_map = {}
    for name, url in entries:
        if name not in link_map:
            link_map[name] = url
    script_text = '\n'.join(lines[:script_end])
    return script_text, link_map

# ── parser/episode-splitter ───────────────────────────────────────────────────
EPISODE_HEADER_RE = re.compile(r'^第\s*(\d+)\s*集[：:]\s*(.+)$', re.MULTILINE)

def split_episodes(text):
    matches = list(EPISODE_HEADER_RE.finditer(text))
    if not matches:
        return []
    episodes = []
    for idx, m in enumerate(matches):
        content_start = m.end()
        content_end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        content = text[content_start:content_end].strip()
        episodes.append({
            'num': int(m.group(1)),
            'rawHeader': m.group(0),
            'title': m.group(2).strip(),
            'content': content,
        })
    return episodes

# ── parser/scene-parser ───────────────────────────────────────────────────────
# Shot info line regex — captures everything after the 2nd token (time/location)
SHOT_INFO_RE = re.compile(r'^\d+-\d+\s+\S+\s+(.+)$')
# Character pattern — may appear anywhere in a line (end of shot info line too)
CHARACTER_RE  = re.compile(r'人物[：:]\s*([^\n\r【】]+)')

def extract_scene_names(content):
    scenes, seen = [], set()
    for line in content.split('\n'):
        m = SHOT_INFO_RE.match(line)
        if m:
            scene = m.group(1).strip()
            # Trim annotation brackets 【…】 and anything after 人物：
            cut = re.search(r'[【【]|人物[：:]', scene)
            if cut and cut.start() > 0:
                scene = scene[:cut.start()].strip()
            if scene and scene not in seen:
                seen.add(scene)
                scenes.append(scene)
    return scenes

def extract_characters(content):
    chars, seen = [], set()
    for line in content.split('\n'):
        m = CHARACTER_RE.search(line)
        if m:
            for name in re.split(r'[、，,]', m.group(1)):
                name = name.strip()
                if name and name not in seen:
                    seen.add(name)
                    chars.append(name)
    return chars

# ── parser/shot-splitter ──────────────────────────────────────────────────────
# Separator: two or more consecutive blank lines (3+ newlines).
# A single blank line inside a shot is preserved.
def split_shots(content):
    return [s.strip() for s in re.split(r'(?:\n[ \t]*){3,}', content) if s.strip()]

# ── utils/validator ───────────────────────────────────────────────────────────
VALIDATOR_SHOT_RE = re.compile(r'^\d+-\d+', re.MULTILINE)
VALIDATOR_CHAR_RE = re.compile(r'人物[：:]', re.MULTILINE)

def validate_episode(ep):
    errors = []
    content = ep['content']
    num = ep['num']
    if not content.strip():
        errors.append({'fatal': True, 'code': 'E_NO_SHOTS', 'msg': f"第{num}集没有识别到任何内容"})
        return errors
    if not VALIDATOR_SHOT_RE.search(content):
        errors.append({'fatal': True, 'code': 'E_NO_HEADER', 'msg': f"第{num}集找不到分镜头信息行"})
    if not VALIDATOR_CHAR_RE.search(content):
        errors.append({'fatal': True, 'code': 'E_NO_CHARACTERS', 'msg': f"第{num}集缺少人物行"})
    return errors

# ── matcher/link-matcher ──────────────────────────────────────────────────────
def match_links(names, link_map, ep_num):
    warnings, lines = [], []
    if not link_map:
        return '', []
    for name in names:
        if name in link_map:
            lines.append(f"{name}｜{link_map[name]}")
        else:
            lines.append(f"[{name}]｜未找到链接")
            warnings.append({'code': 'W_MISSING_LINK', 'msg': f'第{ep_num}集的\u201c{name}\u201d在链接表中未找到'})
    return '\n\n'.join(lines), warnings

# ── generator/csv-builder ─────────────────────────────────────────────────────
def escape_field(value):
    s = str(value) if value is not None else ''
    if any(c in s for c in (',', '"', '\n', '\r')):
        return '"' + s.replace('"', '""') + '"'
    return s

def build_data_row(row):
    fields = [
        row['episode'], row['story'], row['assets'],
        row['ratio'], row['style'], row['model'],
        row['resolution'], row['analysisMode'],
    ]
    return ','.join(escape_field(f) for f in fields)

def build_csv(rows):
    BOM = '\uFEFF'
    CRLF = '\r\n'
    lines = [h + ',,,,,,,' for h in HEADER_LINES]
    for row in rows:
        lines.append(build_data_row(row))
    return BOM + CRLF.join(lines) + CRLF

# ── parse_script (parser/index) ───────────────────────────────────────────────
def parse_script(raw_text, params):
    text = raw_text.lstrip('\uFEFF').replace('\r\n', '\n').replace('\r', '\n')
    script_text, link_map = extract_link_table(text)
    episode_raws = split_episodes(script_text)

    if not episode_raws:
        return [], [{'fatal': True, 'code': 'E_NO_EPISODES', 'num': 0,
                     'msg': '未找到任何集头（如"第1集：集名"）'}]

    results, errors, seen_nums = [], [], set()

    for raw in episode_raws:
        num = raw['num']
        if num in seen_nums:
            errors.append({'fatal': True, 'code': 'E_BAD_EPISODE_NUM', 'num': num,
                           'msg': f"第{num}集出现多次，请检查"})
            continue
        seen_nums.add(num)

        val_errors = validate_episode(raw)
        errors.extend({'fatal': e['fatal'], 'code': e['code'], 'num': num, 'msg': e['msg']}
                      for e in val_errors)
        if any(e['fatal'] for e in val_errors):
            continue

        chars  = extract_characters(raw['content'])
        scenes = extract_scene_names(raw['content'])
        seen, all_names = set(), []
        for n in chars + scenes:
            if n not in seen:
                seen.add(n)
                all_names.append(n)

        assets, warns = match_links(all_names, link_map, num)
        errors.extend({'fatal': False, 'code': w['code'], 'num': num, 'msg': w['msg']}
                      for w in warns)

        shots = split_shots(raw['content'])
        story = '\n\n\n'.join(shots)

        results.append({
            'episode': raw['rawHeader'],
            'story': story,
            'assets': assets,
            **params,
        })

    return results, errors

# ── main ──────────────────────────────────────────────────────────────────────
def main():
    sample = os.path.join(ROOT, 'assets', 'sample', 'sample-script.txt')
    with open(sample, encoding='utf-8') as f:
        raw = f.read()

    print('═' * 60)
    print('  剧本 → CSV 解析器 · Python 测试运行')
    print('═' * 60)

    results, errors = parse_script(raw, DEFAULTS)

    successes = [r for r in results]
    print(f"\n✅ 成功处理: {len(successes)} 集")
    if errors:
        print(f"⚠️  错误/警告: {len(errors)} 条")
        for e in errors:
            tag = '❌' if e['fatal'] else '⚠️ '
            print(f"  {tag} [{e['code']}] 第{e['num']}集: {e['msg']}")
    else:
        print("   无错误，无警告")

    if not results:
        print("\n没有可输出的集，退出。")
        sys.exit(1)

    csv = build_csv(results)
    display = csv.lstrip('\uFEFF')

    print('\n' + '─' * 60)
    print('  生成的 CSV（BOM 已移除以便显示）')
    print('─' * 60)
    print(display)

    # ── 头部 6 行逐字比对 ──────────────────────────────────────────
    ref6 = [h + ',,,,,,,' for h in HEADER_LINES]
    out_lines = display.replace('\r\n', '\n').split('\n')
    out6 = out_lines[:6]

    print('─' * 60)
    print('  头部 6 行逐字比对')
    print('─' * 60)
    all_match = True
    for i, (ref, out) in enumerate(zip(ref6, out6)):
        ok = ref == out
        if not ok:
            all_match = False
        status = '✅ MATCH' if ok else f'❌ MISMATCH\n  期望: {ref}\n  实际: {out}'
        print(f"行{i+1} {status}")

    print()
    if all_match:
        print('✅ 头部 6 行字符级完全一致')
    else:
        print('❌ 头部有差异，请检查')

    # ── 数据行列数检验（重建完整 CSV 记录再计列）───────────────────
    print('\n' + '─' * 60)
    print('  数据行列数检验（期望 8 列）')
    print('─' * 60)

    def iter_records(text):
        buf, in_q = [], False
        for line in text.split('\n'):
            buf.append(line)
            for ch in line:
                if ch == '"':
                    in_q = not in_q
            if not in_q:
                yield '\n'.join(buf)
                buf, in_q = [], False

    def count_cols(record):
        cols, in_q = 1, False
        for ch in record:
            if ch == '"':
                in_q = not in_q
            elif ch == ',' and not in_q:
                cols += 1
        return cols

    rec_num = 0
    for record in iter_records('\n'.join(out_lines[6:])):
        if not record.strip():
            continue
        rec_num += 1
        cols = count_cols(record)
        ok = cols == 8
        print(f"数据行{rec_num} {'✅' if ok else '❌'}: {cols} 列{'  ← 期望 8 列' if not ok else ''}")

    print('\n' + '═' * 60)

if __name__ == '__main__':
    main()
