# Fresh

用 Astro 构建的简洁文章博客。包含文章列表、独立标签总览、文章正文、个人简历、GitHub 入口、RSS 和明暗主题。界面采用圆角卡片；主题切换使用从按钮中心扩散的圆形动画，不支持 View Transitions 或设置减少动态效果时直接切换。

## 本地运行

使用 Node.js 24（至少 22.23.4）。

```sh
npm ci
npm run dev
npm run check
npm run build
npm run preview
```

## 发布文章

可以用命令创建带有写作结构的草稿：

```sh
npm run post:new -- agent-memory-notes "Agent Memory 学习笔记" "AI Agent" "Memory"
```

日期自动使用上海时区；同名文件不会被覆盖。默认 `draft: true`，完成正文与摘要后改为 `false`。目前草稿不会显示在网站预览中，可先在编辑器预览 Markdown。

在 `content/posts/` 新建 Markdown 文件，文件名会成为 `/posts/文件名/` 的地址。使用小写英文和连字符。

```yaml
---
title: 我的新文章
description: 用一句话介绍文章
date: 2026-11-09
draft: false
tags: [工程实践]
updated: 2026-11-09 # 可选，实际修订文章时填写，不应早于 date
---
```

正文使用 Markdown。代码围栏支持语言、`title="main.go"` 和高亮行。二三级标题自动组成折叠目录。`draft: true` 的文章不会出现在生产页面、RSS 或标签页。

图片放在 `public/images/`，正文通过 `/images/文件名.png` 引用。标签建议每篇 1–3 个，优先复用已有标签。

## 组件

文章页区分首次发布和最后更新，并按中英文内容估算阅读时长。目录跳转后目标标题会突出显示，文末提供回到顶部和 RSS 入口。浏览器打印时隐藏导航和操作控件。

- `Base.astro`：页头、主题切换、SEO、RSS 发现与页脚。
- `PostList.astro`：纯文字文章列表，日期、摘要和标签。
- 文章模板：折叠目录、Expressive Code 代码块、相邻文章。

无需 React、组件库或运行时后端。将来文章较多时可考虑 Pagefind；出现公式或流程图时再接入 KaTeX、Mermaid。

## 部署

推送 `main` 后由 GitHub Actions 检查、构建并发布 GitHub Pages。仓库 Pages 的 Source 应设为 GitHub Actions。站点域名配置在 `astro.config.mjs`，更改域名时同步更新 `public/robots.txt`。

迁移保留了 4 篇原始文章及 `/posts/` 路径；开篇文章已补充 Astro 改版说明，并保留最初的发布日期与地址。个人介绍恢复在 `/about/` 个人简历页，标签总览位于 `/tags/`。移除了兴趣展示、旧布局和旧静态资源。
