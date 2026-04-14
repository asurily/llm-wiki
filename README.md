# LLM Wiki

基于 LLM 的知识库编译器，将原始文件自动整理为结构化的 Wiki 知识库。

灵感来源于 [Andrej Karpathy 的 LLM Wiki 概念](https://gist.github.com/karpathy/6a0e1708b69c6b0e65d8c2b9a9b21b6b)。

## 核心理念

| 传统编程 | LLM Wiki |
|---------|----------|
| 源代码 | 原始笔记文件 |
| 编译器 | 大语言模型 (LLM) |
| 可执行程序 | Wiki 知识库 |

LLM Wiki 使用大语言模型自动从笔记中提取结构化信息，编译生成 Obsidian 兼容的 Wiki 知识库，包含双向链接、实体页面、概念页面等。

## 功能特性

- 🤖 **多模型支持** - Claude、OpenAI、智谱 AI、DeepSeek、月之暗面、Ollama 等
- 📄 **多格式解析** - Markdown、PDF、Word、图片 (视觉分析)
- 🔗 **自动链接** - 生成 Obsidian 兼容的双向链接
- 📊 **实体提取** - 自动识别人物、组织、地点、事件等
- 💡 **概念识别** - 提取核心概念和主题
- ⚡ **增量更新** - 仅处理变更文件，节省 API 调用
- 🔍 **智能查询** - 基于 Wiki 内容回答问题

## 安装

```bash
# 克隆仓库
git clone <repository-url>
cd llm-wiki

# 安装依赖
npm install

# 构建
npm run build

# 全局安装 (可选)
npm link
```

## 快速开始

```bash
# 1. 初始化项目
llm-wiki init

# 2. 将笔记放入 notes 目录

# 3. 构建 Wiki
llm-wiki build ./notes

# 4. 查询 Wiki
llm-wiki query "什么是机器学习？"

# 5. 检查 Wiki 健康状态
llm-wiki lint ./wiki
```

## 命令详解

### `llm-wiki init`

交互式初始化项目。

```bash
llm-wiki init
```

创建的文件：
- `llm-wiki.yaml` - 配置文件
- `notes/` - 源文件目录
- `wiki/` - 输出目录
- `notes/example.md` - 示例笔记

### `llm-wiki build [source]`

将源文件编译为 Wiki。

```bash
llm-wiki build ./notes              # 处理 notes 目录
llm-wiki build ./notes -o ./wiki    # 指定输出目录
llm-wiki build ./notes --incremental # 增量更新 (默认)
llm-wiki build ./notes --full       # 全量重建
llm-wiki build ./notes --model claude-sonnet-4-6  # 指定模型
llm-wiki build ./notes -v           # 详细输出
```

**选项说明**：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `-o, --output <dir>` | 输出目录 | `./wiki` |
| `--incremental` | 增量更新（仅处理变更文件） | 默认开启 |
| `--full` | 全量更新（处理所有文件） | - |
| `-m, --model <name>` | 使用的模型 | 配置文件默认值 |
| `-c, --config <path>` | 配置文件路径 | `./llm-wiki.yaml` |
| `-v, --verbose` | 详细输出 | false |

### `llm-wiki query <question>`

查询 Wiki 并生成回答。

```bash
llm-wiki query "什么是机器学习？"
llm-wiki query "对比 A 和 B 的区别" --save  # 保存结果到 wiki
```

**选项说明**：

| 参数 | 说明 |
|------|------|
| `-s, --save` | 保存回答到 synthesis 目录 |
| `-m, --model <name>` | 使用的模型 |
| `-c, --config <path>` | 配置文件路径 |
| `-v, --verbose` | 详细输出 |

### `llm-wiki lint [wiki]`

检查 Wiki 健康状态。

```bash
llm-wiki lint ./wiki
llm-wiki lint ./wiki --fix  # 自动修复问题
llm-wiki lint ./wiki -v     # 显示详细信息
```

检查项：
- ❌ 缺失 frontmatter
- ⚠️ 断开的链接
- ❌ 空白页面
- ℹ️ 孤立页面（无入链）
- ⚠️ 重复实体

## 配置文件

配置文件：`llm-wiki.yaml`

```yaml
# LLM 提供者配置
model:
  provider: claude  # claude | openai | openai-compatible | ollama
  name: claude-sonnet-4-6
  apiKey: $ANTHROPIC_API_KEY  # 支持环境变量
  baseUrl: null  # openai-compatible 或 ollama 时设置

# 路径配置
paths:
  source: ./notes    # 源文件目录
  output: ./wiki     # 输出目录
  cache: .llm-wiki/cache.json  # 缓存文件

# Wiki 配置
wiki:
  naming: kebab-case  # 命名规则
  pages:
    - entities    # 实体页面
    - concepts    # 概念页面
    - sources     # 源文件摘要
    - synthesis   # 综合分析
  linking:
    auto: true       # 自动创建链接
    threshold: 0.7   # 相关度阈值

# 增量更新
incremental:
  enabled: true
```

## 支持的文件类型

| 类型 | 扩展名 | 说明 |
|------|--------|------|
| Markdown | `.md`, `.markdown` | 完整支持，保留 frontmatter |
| PDF | `.pdf` | 提取文本内容和元数据 |
| Word | `.docx`, `.doc` | 提取文本内容 |
| 图片 | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp` | 使用 LLM 视觉能力分析 |

## 输出目录结构

```
wiki/
├── index.md              # 内容索引
├── log.md                # 处理日志
├── overview.md           # 总览页面
├── entities/             # 实体页面
│   ├── elon-musk.md      # 人物
│   ├── tesla.md          # 组织
│   └── spacex.md         # 组织
├── concepts/             # 概念页面
│   ├── electric-vehicles.md
│   └── space-exploration.md
├── sources/              # 源文件摘要
│   ├── article-2024.md
│   └── book-notes.md
└── synthesis/            # 综合分析（query 结果）
    └── query-2024-01-15.md
```

## LLM 提供者配置

### Claude (Anthropic)

```yaml
model:
  provider: claude
  name: claude-sonnet-4-6
  apiKey: $ANTHROPIC_API_KEY
```

设置环境变量：
```bash
export ANTHROPIC_API_KEY=sk-ant-xxxxx
```

### OpenAI

```yaml
model:
  provider: openai
  name: gpt-4-turbo-preview
  apiKey: $OPENAI_API_KEY
```

设置环境变量：
```bash
export OPENAI_API_KEY=sk-xxxxx
```

### OpenAI Compatible (智谱/DeepSeek/月之暗面等)

支持所有兼容 OpenAI API 格式的服务。

#### 智谱 AI (GLM)

```yaml
model:
  provider: openai-compatible
  name: glm-4
  apiKey: $ZHIPU_API_KEY
  baseUrl: https://open.bigmodel.cn/api/paas/v4
```

设置环境变量：
```bash
export ZHIPU_API_KEY=your-zhipu-api-key
```

#### DeepSeek

```yaml
model:
  provider: openai-compatible
  name: deepseek-chat
  apiKey: $DEEPSEEK_API_KEY
  baseUrl: https://api.deepseek.com/v1
```

设置环境变量：
```bash
export DEEPSEEK_API_KEY=your-deepseek-api-key
```

#### 月之暗面 (Moonshot)

```yaml
model:
  provider: openai-compatible
  name: moonshot-v1-8k
  apiKey: $MOONSHOT_API_KEY
  baseUrl: https://api.moonshot.cn/v1
```

设置环境变量：
```bash
export MOONSHOT_API_KEY=your-moonshot-api-key
```

#### 阿里云百炼

```yaml
model:
  provider: openai-compatible
  name: qwen-turbo
  apiKey: $DASHSCOPE_API_KEY
  baseUrl: https://dashscope.aliyuncs.com/compatible-mode/v1
```

设置环境变量：
```bash
export DASHSCOPE_API_KEY=your-dashscope-api-key
```

#### SiliconFlow

```yaml
model:
  provider: openai-compatible
  name: Qwen/Qwen2.5-72B-Instruct
  apiKey: $SILICONFLOW_API_KEY
  baseUrl: https://api.siliconflow.cn/v1
```

设置环境变量：
```bash
export SILICONFLOW_API_KEY=your-siliconflow-api-key
```

#### 自定义 OpenAI Compatible 服务

```yaml
model:
  provider: openai-compatible
  name: your-model-name
  apiKey: $YOUR_API_KEY
  baseUrl: https://your-api-endpoint.com/v1
```

### Ollama (本地部署)

```yaml
model:
  provider: ollama
  name: llama3
  baseUrl: http://localhost:11434
```

启动 Ollama：
```bash
ollama serve
ollama pull llama3
```

### OpenAI Compatible (智谱/DeepSeek/月之暗面等)

支持所有兼容 OpenAI API 格式的服务。

#### 智谱 AI (GLM)

```yaml
model:
  provider: openai-compatible
  name: glm-4-flash
  apiKey: $ZHIPU_API_KEY
  baseUrl: https://open.bigmodel.cn/api/paas/v4
```

设置环境变量：
```bash
export ZHIPU_API_KEY=your-zhipu-api-key
```

可用模型：`glm-4`, `glm-4-flash`, `glm-4-plus`, `glm-4-air`

#### DeepSeek

```yaml
model:
  provider: openai-compatible
  name: deepseek-chat
  apiKey: $DEEPSEEK_API_KEY
  baseUrl: https://api.deepseek.com/v1
```

设置环境变量：
```bash
export DEEPSEEK_API_KEY=your-deepseek-api-key
```

可用模型：`deepseek-chat`, `deepseek-coder`

#### 月之暗面 (Moonshot)

```yaml
model:
  provider: openai-compatible
  name: moonshot-v1-8k
  apiKey: $MOONSHOT_API_KEY
  baseUrl: https://api.moonshot.cn/v1
```

设置环境变量：
```bash
export MOONSHOT_API_KEY=your-moonshot-api-key
```

可用模型：`moonshot-v1-8k`, `moonshot-v1-32k`, `moonshot-v1-128k`

#### SiliconFlow

```yaml
model:
  provider: openai-compatible
  name: Qwen/Qwen2.5-72B-Instruct
  apiKey: $SILICONFLOW_API_KEY
  baseUrl: https://api.siliconflow.cn/v1
```

#### 阿里云百炼

```yaml
model:
  provider: openai-compatible
  name: qwen-turbo
  apiKey: $DASHSCOPE_API_KEY
  baseUrl: https://dashscope.aliyuncs.com/compatible-mode/v1
```

#### 自定义 OpenAI Compatible 服务

```yaml
model:
  provider: openai-compatible
  name: your-model-name
  apiKey: $YOUR_API_KEY
  baseUrl: https://your-api-endpoint.com/v1
```

**支持的 OpenAI Compatible 提供者**：

| 提供者 | Base URL | 模型示例 |
|--------|----------|----------|
| 智谱 AI | `https://open.bigmodel.cn/api/paas/v4` | glm-4, glm-4-flash |
| DeepSeek | `https://api.deepseek.com/v1` | deepseek-chat, deepseek-coder |
| 月之暗面 | `https://api.moonshot.cn/v1` | moonshot-v1-8k |
| SiliconFlow | `https://api.siliconflow.cn/v1` | Qwen2.5-72B-Instruct |
| 阿里云百炼 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | qwen-turbo, qwen-max |

### 支持的 OpenAI Compatible 提供者列表

| 提供者 | 名称 | Base URL | 推荐模型 |
|--------|------|----------|----------|
| 智谱 AI | zhipu | `https://open.bigmodel.cn/api/paas/v4` | glm-4, glm-4-flash |
| DeepSeek | deepseek | `https://api.deepseek.com/v1` | deepseek-chat, deepseek-coder |
| 月之暗面 | moonshot | `https://api.moonshot.cn/v1` | moonshot-v1-8k, moonshot-v1-32k |
| 阿里云百炼 | aliyun | `https://dashscope.aliyuncs.com/compatible-mode/v1` | qwen-turbo, qwen-max |
| SiliconFlow | siliconflow | `https://api.siliconflow.cn/v1` | Qwen2.5-72B-Instruct |

## 页面示例

### 实体页面

```markdown
---
type: entity
subtype: person
created: 2024-01-15
updated: 2024-01-15
sources:
  - sources/article-2024
---

# Elon Musk

Elon Musk 是一位企业家和工程师，是 Tesla 和 SpaceX 的创始人。

## 背景

1971年出生于南非，后移居加拿大和美国...

## 相关概念
- [[electric-vehicles|电动汽车]]
- [[space-exploration|太空探索]]

## 相关实体
- [[tesla|Tesla]] - 创始人
- [[spacex|SpaceX]] - 创始人

## 来源
- [[sources/article-2024|关于 Tesla 的文章]]
```

### 索引页面

```markdown
# Wiki Index

最后更新: 2024-01-15

## 实体

### 人物
- [[elon-musk|Elon Musk]] - 企业家、工程师

### 组织
- [[tesla|Tesla]] - 电动汽车公司
- [[spacex|SpaceX]] - 航天公司

## 概念
- [[electric-vehicles|电动汽车]]
- [[space-exploration|太空探索]]

## 统计
- 总页面数: 12
- 源文件数: 5
- 最后处理: 2024-01-15
```

## 工作流程

```
┌─────────────────────────────────────────────────────────┐
│                    源文件 (notes/)                       │
│                   Markdown, PDF, Word, 图片              │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    文件解析 (Parser)                      │
│              提取文本内容、元数据、图片                     │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  LLM 信息提取 (Extractor)                 │
│            识别实体、概念、关系、生成摘要                   │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Wiki 页面生成 (Generator)                │
│         创建实体页、概念页、源文件摘要、更新索引            │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Wiki 知识库 (wiki/)                    │
│           Obsidian 兼容的结构化知识库                      │
└─────────────────────────────────────────────────────────┘
```

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 监听模式
npm run dev

# 运行测试
npm test
```

## 项目结构

```
llm-wiki/
├── src/
│   ├── index.ts              # CLI 入口
│   ├── commands/             # CLI 命令
│   │   ├── init.ts           # init 命令
│   │   ├── build.ts          # build 命令
│   │   ├── query.ts          # query 命令
│   │   └── lint.ts           # lint 命令
│   ├── providers/            # LLM 提供者
│   │   ├── base.ts           # 基类
│   │   ├── claude.ts         # Claude
│   │   ├── openai.ts         # OpenAI
│   │   └── ollama.ts         # Ollama
│   ├── parsers/              # 文件解析器
│   │   ├── markdown.ts       # Markdown
│   │   ├── pdf.ts            # PDF
│   │   ├── word.ts           # Word
│   │   └── image.ts          # 图片
│   ├── wiki/                 # Wiki 生成
│   │   ├── generator.ts      # 页面生成
│   │   ├── indexer.ts        # 索引管理
│   │   └── linker.ts         # 链接管理
│   ├── utils/                # 工具函数
│   │   ├── config.ts         # 配置加载
│   │   ├── cache.ts          # 缓存管理
│   │   └── logger.ts         # 日志输出
│   └── types/                # 类型定义
│       └── index.ts          # TypeScript 类型
├── templates/
│   └── schema.md             # Wiki 模式模板
├── package.json
├── tsconfig.json
└── README.md
```

## 常见问题

### Q: 如何处理中文内容？

A: 工具完全支持中文内容。LLM 会自动识别中文实体和概念，生成的页面保留中文字符。

### Q: 增量更新如何工作？

A: 工具会计算每个文件的 SHA256 哈希值，并与缓存对比。只有内容变化的文件才会被重新处理。

### Q: 如何在 Obsidian 中使用？

A: 直接用 Obsidian 打开 `wiki/` 目录即可。所有链接都是 Obsidian 兼容的双向链接格式。

### Q: 支持哪些模型？

A:
- **Claude**: claude-sonnet-4-6, claude-opus-4-6, claude-haiku-4-5
- **OpenAI**: gpt-4-turbo-preview, gpt-4, gpt-3.5-turbo
- **OpenAI Compatible**:
  - 智谱 AI: glm-4, glm-4-flash, glm-4-plus
  - DeepSeek: deepseek-chat, deepseek-coder
  - 月之暗面: moonshot-v1-8k, moonshot-v1-32k
  - 阿里云百炼: qwen-turbo, qwen-max
  - SiliconFlow: Qwen2.5-72B-Instruct 等
- **Ollama**: llama3, mistral, codellama 等本地模型

## License

MIT
