#!/usr/bin/env python3
"""
Runs all edge-case fixtures through the parser and verifies expected outcomes.
Each fixture has a declared spec: expected success count, fatal error codes, warning codes.
"""
import re, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tests'))

# ── Import shared parser (reuse run-test.py functions via exec) ───────────────
# We copy only the pure-function parser logic here (no main), keeping it DRY.

import importlib.util

def load_parser():
    path = os.path.join(ROOT, 'tests', 'run-test.py')
    spec = importlib.util.spec_from_file_location('run_test', path)
    mod  = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

p = load_parser()

# ── Test spec format ──────────────────────────────────────────────────────────
# Each spec: (fixture_file, description, expected_success, expected_fatal_codes, expected_warning_codes)
SPECS = [
    (
        'assets/sample/sample-script.txt',
        '正常单集（来自 Q1 真实样例）',
        1,            # 1 episode succeeds
        [],           # no fatal errors
        [],           # no warnings
    ),
    (
        'tests/fixtures/missing-characters.txt',
        '缺人物行（第2集缺人物行，第1/3集正常）',
        2,            # ep1 + ep3 succeed
        ['E_NO_CHARACTERS'],
        [],
    ),
    (
        'tests/fixtures/missing-link.txt',
        '链接表缺失孙八（应生成占位符 + 警告）',
        1,
        [],
        ['W_MISSING_LINK'],
    ),
    (
        'tests/fixtures/duplicate-episode.txt',
        '集号重复（第1集出现两次，第2集正常）',
        2,            # ep1 (first) + ep2 succeed
        ['E_BAD_EPISODE_NUM'],
        [],
    ),
    (
        'tests/fixtures/link-table-only.txt',
        '仅链接表无剧本（应返回 E_NO_EPISODES）',
        0,
        ['E_NO_EPISODES'],
        [],
    ),
    (
        'tests/fixtures/inline-characters.txt',
        '人物内嵌在分镜头信息行末尾（如 "1-1 傍晚／内 院长公馆·主卧【慢】人物：林煜风、艾奈"）',
        1,
        [],
        [],
    ),
]

DEFAULTS = p.DEFAULTS

def run_spec(fixture_rel, description, exp_ok, exp_fatal, exp_warn):
    fixture_path = os.path.join(ROOT, fixture_rel)
    with open(fixture_path, encoding='utf-8') as f:
        raw = f.read()

    results, errors = p.parse_script(raw, DEFAULTS)

    fatal_codes  = [e['code'] for e in errors if e.get('fatal')]
    warn_codes   = [e['code'] for e in errors if not e.get('fatal')]
    ok_count     = len(results)

    checks = []

    # 1. Success count
    if ok_count == exp_ok:
        checks.append(('✅', f'成功集数 = {ok_count}'))
    else:
        checks.append(('❌', f'成功集数期望 {exp_ok}，实际 {ok_count}'))

    # 2. Fatal error codes
    for code in exp_fatal:
        if code in fatal_codes:
            checks.append(('✅', f'触发预期致命错误 {code}'))
        else:
            checks.append(('❌', f'未触发预期致命错误 {code}（实际致命: {fatal_codes}）'))

    # 3. No unexpected fatal errors
    unexpected_fatal = [c for c in fatal_codes if c not in exp_fatal]
    if unexpected_fatal:
        checks.append(('❌', f'出现意外致命错误: {unexpected_fatal}'))

    # 4. Warning codes
    for code in exp_warn:
        if code in warn_codes:
            checks.append(('✅', f'触发预期警告 {code}'))
        else:
            checks.append(('❌', f'未触发预期警告 {code}（实际警告: {warn_codes}）'))

    # 5. No unexpected warnings
    unexpected_warn = [c for c in warn_codes if c not in exp_warn]
    if unexpected_warn:
        checks.append(('❌', f'出现意外警告: {unexpected_warn}'))

    # 6. If W_MISSING_LINK expected, verify placeholder is in col 3
    if 'W_MISSING_LINK' in exp_warn and results:
        placeholders = [r for r in results if '未找到链接' in r.get('assets', '')]
        if placeholders:
            checks.append(('✅', f'第3列含占位符 "[孙八]｜未找到链接"'))
        else:
            checks.append(('❌', '第3列未找到占位符'))

    passed = all(icon == '✅' for icon, _ in checks)
    return passed, checks, errors, results

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print('═' * 64)
    print('  边界用例测试套件')
    print('═' * 64)

    total, passed_count = len(SPECS), 0

    for fixture_rel, desc, exp_ok, exp_fatal, exp_warn in SPECS:
        print(f'\n📋 {desc}')
        print(f'   文件: {fixture_rel}')
        print('   ' + '─' * 50)

        passed, checks, errors, results = run_spec(
            fixture_rel, desc, exp_ok, exp_fatal, exp_warn)

        for icon, msg in checks:
            print(f'   {icon} {msg}')

        # Print any error messages for visibility
        if errors:
            print('   错误详情:')
            for e in errors:
                tag = '致命' if e.get('fatal') else '警告'
                print(f'     [{tag}] {e["code"]} 第{e["num"]}集: {e["msg"]}')

        # Show col-3 snippet for missing-link case
        if 'W_MISSING_LINK' in exp_warn and results:
            assets_preview = results[0].get('assets', '')[:120].replace('\n', '↵')
            print(f'   第3列预览: {assets_preview}')

        print(f'   {"✅ 通过" if passed else "❌ 失败"}')
        if passed:
            passed_count += 1

    print('\n' + '═' * 64)
    print(f'  结果: {passed_count}/{total} 通过')
    if passed_count == total:
        print('  ✅ 所有边界用例全部通过，可进入第四步。')
    else:
        print('  ❌ 有用例未通过，请检查上方错误信息。')
    print('═' * 64)

if __name__ == '__main__':
    main()
