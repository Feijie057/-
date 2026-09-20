# 女娲工作台 · AI 内容生成平台

一个把「**输入需求 → 平台的运作逻辑 → 产出内容**」固化下来的工作台。

> ⚠️ 关于 `projectnvwa.ai`：该站点在构建本项目的环境中被出网策略拦截（`CONNECT tunnel failed 403`），
> 无法读取其真实页面。本项目是按「AI 内容生成平台」这一定位搭建的通用工作台，
> 详见 [`docs/platform-analysis.md`](docs/platform-analysis.md) 第 0 节。

## 快速开始

```bash
npm install
npm run dev     # http://localhost:5173
```

**不需要任何 API Key**：默认使用内置的本地模拟引擎，可以完整跑通一次流水线。
要接真实模型，在「模型接入」页添加 Anthropic 或任意 OpenAI 兼容服务即可。

```bash
npm run build      # 类型检查 + 产物构建
npm run typecheck  # 只做类型检查
npm run preview    # 预览构建产物
```

## 它是怎么运作的

```
需求(Brief) ──▶ 配方(Recipe) ──▶ 流水线(Job) ──▶ 产出物(Artifact)
                    ▲                │
                    │                ▼
              品牌资产(Assets)   运行记录（逐步可回看）
```

一个**配方** = 一份需求表单 + 一条流水线。流水线由六类步骤组成，顺序执行，
上一步的输出通过 `{{steps.步骤id}}` 流入下一步：

`拆解 → 调取 → 生成 → 润色 → 校验 → 成品`

内置六条配方：小红书笔记、公众号长文、短视频脚本、电商详情页、品牌命名、一稿多投改写。
内置配方只读，可复制成自定义配方后改提示词、加减步骤。

## 模块

| 模块 | 说明 |
| --- | --- |
| 工作台 | 产出量、成功率、耗时，以及常用配方入口 |
| 创作台 | 左填需求 / 中看流水线逐步执行 / 右取成品 |
| 配方库 | 编辑「运作逻辑」本身：步骤、提示词模板、发散度 |
| 产出库 | 成品归档、搜索、收藏、导出 |
| 品牌资产 | 语气、术语口径、参考资料，注入每一步作为长期上下文 |
| 模型接入 | 多服务商配置与连通性自检 |
| 运行记录 | 每次运行的完整轨迹，逐步回看中间产物 |
| 设置 | 主题、数据导入导出 |

## 代码结构

```
src/
├─ lib/
│  ├─ types.ts      领域模型：Recipe / Job / Artifact / Asset / ModelConfig
│  ├─ engine.ts     流水线执行器 —— 平台运作逻辑的核心
│  ├─ providers.ts  模型适配层：mock / anthropic / openai 兼容
│  ├─ recipes.ts    六条内置配方
│  └─ store.ts      zustand + localStorage 持久化
├─ components/      Layout、UI 原语、Markdown 渲染、柱状图
└─ pages/           八个模块各一页
```

## 技术栈

Vite 5 · React 18 · TypeScript（strict）· Tailwind CSS 3 · zustand · react-router

无后端依赖。明暗主题的配色取自一套经过对比度与色觉友好性校验的调色板，
工作台外壳与图表共用同一组 token（见 `src/index.css`）。

## 已知边界

- API Key 存在浏览器 `localStorage`，仅适合本地/内网演示；生产环境应由后端代理转发。
- 浏览器直连模型服务受 CORS 限制，部分服务商需自建代理。
- 数据存在 `localStorage`，清缓存即丢失；设置页提供导出/导入。
- 流水线目前只支持顺序执行，不支持分支与并行。
