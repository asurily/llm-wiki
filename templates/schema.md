# LLM Wiki Schema

This schema guides the LLM in organizing the wiki structure.

## Page Types

### Entities (`entities/`)

实体页面代表知识库中的具体对象。

**类型**:
- `person`: 人物
- `org`: 组织
- `place`: 地点
- `event`: 事件
- `product`: 产品
- `other`: 其他

**页面结构**:
```markdown
---
type: entity
subtype: person|org|place|event|product|other
created: YYYY-MM-DD
updated: YYYY-MM-DD
sources:
  - sources/source-file-name
---

# 实体名称

简短描述。

## 背景

详细背景信息。

## 相关概念
- [[concept-name|概念名]]

## 相关实体
- [[related-entity|相关实体]] - 关系描述

## 来源
- [[sources/source-name|来源名称]]
```

### Concepts (`concepts/`)

概念页面代表知识库中的抽象概念或主题。

**页面结构**:
```markdown
---
type: concept
created: YYYY-MM-DD
updated: YYYY-MM-DD
sources:
  - sources/source-file-name
---

# 概念名称

概念定义和解释。

## 要点

- 要点1
- 要点2

## 相关实体
- [[entity-name|实体名]]

## 相关概念
- [[related-concept|相关概念]]

## 来源
- [[sources/source-name|来源名称]]
```

### Sources (`sources/`)

源文件页面记录原始输入文件的摘要和提取的信息。

**页面结构**:
```markdown
---
type: source
original_path: /path/to/original/file
title: 文件标题
created: YYYY-MM-DD
processed: YYYY-MM-DD
---

# 文件标题

## 摘要

文档摘要。

## 提取的实体

- [[entity-name|实体名]]

## 提取的概念

- [[concept-name|概念名]]

## 原始内容

原始文档内容（可截断）。
```

### Synthesis (`synthesis/`)

综合分析页面由 `query` 命令生成或手动创建。

**页面结构**:
```markdown
---
type: synthesis
query: 用户问题
created: YYYY-MM-DD
---

# 问题标题

## 问题

用户提出的问题。

## 回答

基于 Wiki 内容生成的回答。
```

## Index (`index.md`)

索引页面提供 Wiki 的导航入口。

```markdown
# Wiki Index

最后更新: YYYY-MM-DD

## 概览
- [[overview|Wiki 总览]]

## 实体

### 人物
- [[person-name|人名]]

### 组织
- [[org-name|组织名]]

## 概念
- [[concept-name|概念名]]

## 源文件
- [[sources/source-name|来源名称]]

## 统计
- 总页面数: N
- 源文件数: N
- 最后处理: YYYY-MM-DD
```

## Log (`log.md`)

日志页面记录所有处理历史。

```markdown
# Wiki Log

记录所有处理历史。

## YYYY-MM-DDTHH:mm:ss.sssZ

处理文件: [[sources/source-name]]

提取实体: 实体1, 实体2
提取概念: 概念1, 概念2
```

## Linking Conventions

1. **双向链接**: 使用 `[[page-name]]` 或 `[[page-name|显示名称]]` 格式
2. **命名约定**: 使用 kebab-case（小写 + 连字符）
3. **中文页面**: 保留中文字符，不转换

## Best Practices

1. 每个实体/概念页面应至少有一个来源引用
2. 相关实体和概念应该相互链接
3. 保持摘要简洁，详细内容放在正文
4. 定期运行 `lint` 检查 Wiki 健康状态
