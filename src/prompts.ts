export interface QuickPrompt {
  id: string;
  label: string;
  icon: string;
  prompt: string;
  enabled: boolean;
}

export const DEFAULT_QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: 'summary',
    label: '总结要点',
    icon: 'list-checks',
    enabled: true,
    prompt: '用不超过 7 条项目符号总结核心要点。每条先写结论，结论加粗并用双引号，再换行后用「依据：」开头写一句话说明。\n要求：保留关键事实、数据、人名和出处；用有序编号标记每一条；如果原文有明确的主旨句，优先引用；如果原文信息不足，请明确说“原文未提及”，不要编造；依据字段不要加编号。'
  },
  {
    id: 'structure',
    label: '结构解析',
    icon: 'network',
    enabled: true,
    prompt: '解析这篇内容的结构。请按以下格式输出：\n1. 整体结构类型（如总分、递进、对比、问题—解决等）\n2. 每个部分的核心功能（用一句话）\n3. 段落之间的逻辑关系（因果/并列/转折/递进）\n4. 作者的论证路径：从哪个前提出发？经过哪些步骤？得出什么结论？\n5. 请引用原文中的过渡句或关键词作为依据。\n输出前先判断内容类型（论述/叙事/说明/评论），并根据类型调整侧重点。'
  },
  {
    id: 'mindmap',
    label: '生成思维导图',
    icon: 'git-branch',
    enabled: true,
    prompt: '生成 Mermaid mindmap 代码块，层级不超过 4 层。要求：\n1. 根节点为文章标题或核心主题\n2. 第一层为 3—5 个主要分支\n3. 每个分支下只保留最关键的 2—3 个子节点\n4. 节点文字尽量短，不超过 12 个字\n5. 不要添加原文中没有的内容'
  },
  {
    id: 'terms',
    label: '术语解释',
    icon: 'book-open',
    enabled: true,
    prompt: '列出文中出现的 5—10 个重要术语或概念。请严格按以下格式输出，术语用有序编号，字段用固定标签加冒号，字段之间换行，不要给字段加编号：\n\n1. **术语**：xxx\n**文中含义**：xxx\n**一句话理解**：xxx\n**相关概念**：xxx\n**特殊用法**：xxx\n\n2. **术语**：xxx\n**文中含义**：xxx\n**一句话理解**：xxx\n**相关概念**：xxx\n**特殊用法**：xxx\n\n（以此类推）\n\n要求：\n- 每个术语之间空一行\n- 字段标题统一用「文中含义 / 一句话理解 / 相关概念 / 特殊用法」，不要写成「2. 文中含义」\n- 结合上下文解释，不要只给词典定义\n- 一句话理解用大白话或类比\n- 如果原文信息不足，请明确说“原文未提及”，不要编造'
  },
  {
    id: 'quotes',
    label: '提炼金句',
    icon: 'quote',
    enabled: true,
    prompt: '提炼 5—8 句值得摘录的关键句。请严格按以下格式输出，金句用有序编号，字段用固定标签加冒号，字段之间换行，不要给字段加编号：\n\n1. **原句**：“xxx”\n**为什么重要**：xxx\n**可迁移场景**：xxx\n\n2. **原句**：“xxx”\n**为什么重要**：xxx\n**可迁移场景**：xxx\n\n（以此类推）\n\n要求：\n- 每个金句之间空一行\n- 字段标题统一用「为什么重要 / 可迁移场景」，不要写成「2. 为什么重要」\n- 优先选择有洞察力、可独立传播、能引发思考的句子\n- 如果原文信息不足，请明确说“原文未提及”，不要编造'
  },
  {
    id: 'self-dialogue',
    label: '与我对话',
    icon: 'messages-square',
    enabled: true,
    prompt: '基于当前内容，提出 3 个能让我把内容与自身经验、已有知识或当前问题连接起来的问题。每个问题要具体、开放，不要问“你有什么感想”这类空泛问题。每个问题后附一句“为什么问这个”，说明它想帮我打通什么。'
  },
  {
    id: 'critical-questions',
    label: '批判性问题',
    icon: 'message-circle-question',
    enabled: true,
    prompt: '提出 5 个有助于深入理解或质疑本文的批判性问题。要求：\n1. 至少 1 个针对前提假设\n2. 至少 1 个针对证据充分性\n3. 至少 1 个针对论证逻辑\n4. 至少 1 个针对替代解释或反例\n5. 至少 1 个针对现实应用或边界条件\n每个问题后附一句“追问方向”，说明可以从哪个角度继续思考。'
  },
  {
    id: 'one-sentence',
    label: '一句话带走',
    icon: 'sparkles',
    enabled: true,
    prompt: '用一句话概括这篇内容最值得记住的东西。要求：不超过 40 字，必须包含核心结论，尽量口语化，能直接复述给别人听。如果原文信息不足，请明确说“原文未提及”，不要编造。'
  },
];

export function cloneDefaultQuickPrompts(): QuickPrompt[] {
  return DEFAULT_QUICK_PROMPTS.map(prompt => ({ ...prompt }));
}
