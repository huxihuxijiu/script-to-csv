# 剧本 → CSV 转换器

将编剧产出的分集剧本自动转换为 **SayStation 平台批量上传格式**的 CSV 文件。  
纯前端工具，无需安装，打开链接即用。

---

## 快速使用

### 在线版（GitHub Pages）

推送到 `main` 分支后 GitHub Actions 自动部署，访问：

```
https://<你的用户名>.github.io/script-to-csv/
```

### 本地运行

```bash
# 方法 1：Python（无需安装）
python3 serve.py
# 然后打开 http://localhost:3333

# 方法 2：任意静态服务器
npx serve .
```

> ⚠️ 必须通过 HTTP 服务器打开，直接双击 `index.html` 会因 ES Module 限制无法运行。

---

## 输入格式

### 剧本结构（每集）

```
第5集：清晨的越界
5-1 白天/内 林晨希卧室
人物：林晨希、苏夏妍
〔视觉状态〕……
▲[镜头描述] 场景描述
角色（动作）：台词

▲[下一个镜头]……
```

**关键规则：**
- 集头：`第X集：集名` 或 `第X集:集名`（冒号中英文均可）
- 分镜头信息行：`集号-镜号 时间/内外 场景名`，如 `5-1 白天/内 卧室`
- 人物行：`人物：张三、李四`（支持顿号、逗号分隔）
- 分镜分隔：空一行即可

### 链接表（附在文档末尾）

```
林晨希|https://cdn.example.com/lch.jpg
苏夏妍|https://cdn.example.com/sxy.jpg
林晨希卧室|https://cdn.example.com/room.jpg
```

- 分隔符支持半角 `|` 和全角 `｜`
- 人物名和场景名需与剧本中完全一致（区分大小写）

---

## 输出格式

- **编码**：UTF-8 with BOM（Excel 打开不乱码）
- **行数**：6 行固定头部 + 每集一行数据
- **列数**：8 列（剧集、剧情、资产库人物、宽高比、画风、模型、分辨率、剧本分析模式）
- **文件名**：`批量导入_YYYYMMDD_HHmmss.csv`

---

## 错误处理

| 错误 | 行为 |
|------|------|
| 某集缺分镜头信息行 | 该集跳过，其他集正常处理 |
| 某集缺人物行 | 该集跳过 |
| 集号重复 | 取首次出现，重复的跳过并警告 |
| 链接表缺某角色/场景 | 生成 `[名字]｜未找到链接` 占位，警告提示 |
| 无链接表 | 第3列留空，正常输出 |
| 空文档 / 仅链接表 | 友好错误提示，不崩溃 |

---

## 部署到 GitHub Pages

1. 在 GitHub 创建新仓库（public）
2. 将本项目推送到 `main` 分支
3. 进入仓库 **Settings → Pages → Source** 选择 **GitHub Actions**
4. 推送触发自动部署，完成后访问 `https://<用户名>.github.io/<仓库名>/`

> 首次部署需要手动在 Settings → Pages 开启 GitHub Actions 作为 Source。

---

## 项目结构

```
script-to-csv/
├── index.html                    # 入口页面
├── src/
│   ├── css/style.css             # 自定义样式
│   └── js/
│       ├── main.js               # 应用入口
│       ├── config.js             # 默认参数 & 选项
│       ├── parser/               # 纯函数解析器（不依赖 DOM）
│       ├── matcher/              # 人物/场景 ↔ 链接匹配
│       ├── generator/            # CSV 组装 & BOM 处理
│       ├── io/                   # 文件读取 & 下载
│       └── ui/                   # 界面渲染 & 表单 & localStorage
├── lib/
│   └── mammoth.browser.min.js    # docx 解析库（本地化）
├── tests/
│   ├── run-test.py               # 核心解析器测试
│   ├── run-fixtures.py           # 边界用例测试套件
│   └── fixtures/                 # 测试用例文件
├── assets/sample/                # 示例剧本
├── serve.py                      # 本地开发服务器
└── .github/workflows/deploy.yml  # GitHub Pages 自动部署
```

---

## 技术栈

- **前端**：原生 HTML + ES6 Module JS（无框架，无构建步骤）
- **样式**：Tailwind CSS CDN + 自定义 CSS
- **docx 解析**：[mammoth.js](https://github.com/mwilliamson/mammoth.js)（本地化）
- **部署**：GitHub Pages + GitHub Actions

---

## 开发 & 测试

```bash
# 运行核心解析器测试（需 Python 3.9+，无需其他依赖）
python3 tests/run-test.py

# 运行完整边界用例套件
python3 tests/run-fixtures.py
```
