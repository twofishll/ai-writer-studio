<div align="center">

# AI Writer Studio

面向政务与企业场景的结构化 AI 长文写作工作台

**✨ 查看产品原型：** https://ai-writer-studio-lake.vercel.app/

[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TanStack Start](https://img.shields.io/badge/TanStack-Start-FF4154?logo=reactquery&logoColor=white)](https://tanstack.com/start)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

## 项目简介

AI Writer Studio 是一个面向政府部门、国企及企业行政人员的桌面端 Web 原型，主要包括 **AI 写作、改写润色、智能审查** 三大功能。

产品针对长文写作中结构难控制、业务资料难调用、生成内容难溯源以及审查修改效率低等问题，将通用 Chatbot 的开放式对话转化为“任务配置—大纲规划—分章生成—引用溯源—润色审查”的结构化写作工作台。

> 当前仓库为可交互的前端产品原型，使用 Mock 数据模拟 AI 生成与知识引用，不包含真实大模型、RAG、文件解析及数据库服务。

## 核心功能

| 功能类型 | 模块     | 已实现能力                                                                                                            |
| -------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| 主功能   | AI 写作  | 配置文章类型、格式模板、标题、字数、概要、大纲、参考资料与其他要求；支持概要/大纲生成、目录编辑、分章节生成及进度展示 |
| 主功能   | 改写润色 | 划词选择正文，支持扩写、精简、续写、总结及自定义修改要求，并将生成结果替换至原文                                      |
| 主功能   | 智能审查 | 提供政治敏感、语法逻辑、格式规范、法律条款四类检查，支持问题定位、修改建议、采纳、忽略及批量处理                      |
| 配套能力 | 引用溯源 | 正文展示引用标记，悬停查看文档全称，点击打开来源详情并定位对应原文切片                                                |
| 配套能力 | 保存导出 | 使用 `localStorage` 恢复写作状态，提供操作反馈与 HTML 全文导出                                                        |

## 设计亮点

- 结构化写作配置：将文章类型、格式、字数、大纲、参考资料等转化为配置项，降低长文写作门槛。
- 目录式长文生成：支持先编辑大纲，再按章节生成正文，减少结构偏移，便于局部调整。
- 引用来源追溯：正文标注引用来源，支持查看文档详情并定位原文片段。
- 上下文改写润色：支持划词选择内容，通过快捷指令或自定义要求完成改写并替换原文。
- 审查修改闭环：将问题位置、类型和修改建议与正文关联，支持逐条处理和批量采纳。
- 完整原型交互：覆盖加载、校验、保存、恢复、反馈和导出等状态，保证核心流程完整可演示。

## 原型演示

1. 配置文章标题、类型、字数与参考资料，生成内容概要和文章大纲。
2. 编辑目录后生成全文，查看分章节生成进度与正文结果。
3. 点击正文引用标记，查看来源文档及对应原文切片。
4. 选中正文进行改写润色，再运行智能审查并处理修改建议。
5. 保存当前写作状态或导出 HTML 全文。

## 技术栈

- React 19 + TypeScript
- TanStack Start + TanStack Router
- Tailwind CSS 4
- Radix UI / shadcn/ui
- Lucide React
- Vite 8

## 本地运行

推荐使用 [Bun](https://bun.sh/)：

```bash
git clone https://github.com/twofishll/ai-writer-studio.git
cd ai-writer-studio
bun install
bun run dev
```

根据终端提示打开本地地址即可查看原型。

## 项目结构

```text
src/
├── components/ui/      # 通用 UI 组件
├── lib/                # 工具与错误处理
├── routes/index.tsx    # 工作台页面、状态与核心交互
├── routes/__root.tsx   # 应用根布局
└── styles.css          # 全局样式与设计变量
```

## 后续规划

- 继续设计知识库模块原型，补充资料上传与解析状态、知识库及文档管理、切片预览，以及写作侧选择资料与引用定位的完整交互。

---

本项目用于 AI 产品方案、交互设计与前端原型能力展示。
