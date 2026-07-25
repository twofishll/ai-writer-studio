import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Home,
  PenLine,
  BookOpen,
  Database,
  BarChart3,
  Boxes,
  Radio,
  Play,
  Server,
  Layers,
  Activity,
  Users,
  Building2,
  UserCog,
  ShieldCheck,
  PanelLeftClose,
  Bell,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Save,
  Download,
  History,
  Sparkles,
  Plus,
  Upload,
  FileText,
  Trash2,
  RefreshCw,
  Pencil,
  Check,
  X,
  Loader2,
  Quote,
  MapPin,
  FileCheck2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Workbench,
  head: () => ({
    meta: [
      { title: "AI 智能写作工作台" },
      {
        name: "description",
        content:
          "面向政务与企业行政人员的结构化长文 AI 写作工具：大纲、正文、引用来源一体化。",
      },
      { property: "og:title", content: "AI 智能写作工作台" },
      {
        property: "og:description",
        content: "结构化长文 AI 写作与协同工作台",
      },
    ],
  }),
});

/* ============================== types ============================== */

type ArticleType =
  | "会议纪要"
  | "演讲稿"
  | "工作报告"
  | "调研报告"
  | "工作总结"
  | "通告"
  | "请示"
  | "通知";

interface OutlineNode {
  id: string;
  title: string;
  children?: OutlineNode[];
}

interface Citation {
  id: string;
  source: string;
  section: string;
  snippet: string;
}

interface KnowledgeBase {
  id: string;
  name: string;
}

type Stage = "empty" | "summary" | "outline" | "generating" | "article";

interface Persisted {
  title: string;
  articleType: ArticleType;
  template: string;
  maxWords: number;
  summary: string;
  outline: OutlineNode[];
  otherReq: string;
  files: string[];
  kb: string[];
  stage: Stage;
  savedAt?: string;
}

const STORAGE_KEY = "ai-writing-workbench:v1";

const ARTICLE_TYPES: ArticleType[] = [
  "会议纪要",
  "演讲稿",
  "工作报告",
  "调研报告",
  "工作总结",
  "通告",
  "请示",
  "通知",
];

const TEMPLATES = [
  { value: "default", label: "默认格式" },
  { value: "official", label: "正式公文格式" },
  { value: "brief", label: "简洁汇报格式" },
];

const KB_OPTIONS: KnowledgeBase[] = [
  { id: "kb1", name: "企业制度与项目材料库" },
  { id: "kb2", name: "政策文件库" },
  { id: "kb3", name: "会议材料库" },
];

const DEFAULT_TITLE = "关于推进企业 AI 能力建设的阶段性工作报告";
const DEFAULT_SUMMARY =
  "总结企业 AI 能力建设的背景、阶段成果、现存问题和下一步计划，突出知识库建设、场景落地和组织协同。";
const DEFAULT_OTHER =
  "语言正式、结构清晰、避免虚构具体数据。";

const MOCK_SUMMARY =
  "本报告围绕企业 AI 能力建设的总体目标，梳理阶段性成果与关键抓手，重点介绍知识库建设、典型场景落地以及组织协同机制。同时结合当前问题与外部趋势，提出下一阶段以业务价值为牵引的推进方向与保障措施。";

const MOCK_OUTLINE: OutlineNode[] = [
  {
    id: "s1",
    title: "一、总体情况",
    children: [
      { id: "s1-1", title: "1.1 建设背景" },
      { id: "s1-2", title: "1.2 总体目标与思路" },
    ],
  },
  {
    id: "s2",
    title: "二、阶段性成果",
    children: [
      { id: "s2-1", title: "2.1 知识库建设" },
      { id: "s2-2", title: "2.2 典型场景落地" },
      { id: "s2-3", title: "2.3 组织与协同机制" },
    ],
  },
  {
    id: "s3",
    title: "三、存在问题与下一步计划",
    children: [
      { id: "s3-1", title: "3.1 主要问题" },
      { id: "s3-2", title: "3.2 下一步举措" },
    ],
  },
];

const CITATIONS: Citation[] = [
  {
    id: "1",
    source: "企业 AI 能力建设实施方案（2026）.pdf",
    section: "第二章 · 阶段目标",
    snippet:
      "到 2026 年底，形成覆盖办公、经营、研发等核心场景的 AI 能力基座，建成统一知识库与模型管理平台，实现主要业务领域的智能化辅助能力落地。",
  },
  {
    id: "2",
    source: "AI 项目阶段复盘会议纪要.docx",
    section: "议题三 · 场景与协同",
    snippet:
      "会议指出，各业务线在 AI 应用中普遍存在数据分散、场景碎片化的问题，需要以知识库为中枢，建立跨部门的协同评审与效果度量机制。",
  },
];

/* Article content is fixed mock data */
interface Section {
  id: string;
  level: 1 | 2;
  title: string;
  paragraphs: (string | { text: string; cite?: string })[];
}

const MOCK_ARTICLE: Section[] = [
  { id: "s1", level: 1, title: "一、总体情况", paragraphs: [] },
  {
    id: "s1-1",
    level: 2,
    title: "1.1 建设背景",
    paragraphs: [
      "近年来，人工智能技术加速演进，成为企业提质增效、构建新型核心竞争力的重要引擎。集团高度重视 AI 能力体系建设，明确将其作为数字化转型的关键抓手统筹推进。",
      {
        text: "根据集团总体规划，本阶段以打造统一的 AI 能力基座为核心目标，重点建设知识库、模型管理与应用编排三大能力。",
        cite: "1",
      },
    ],
  },
  {
    id: "s1-2",
    level: 2,
    title: "1.2 总体目标与思路",
    paragraphs: [
      "总体思路可概括为「平台先行、场景牵引、数据驱动、协同共建」，通过统一基座支撑多业务场景，以典型场景反哺平台迭代，形成可持续演进的能力闭环。",
    ],
  },
  { id: "s2", level: 1, title: "二、阶段性成果", paragraphs: [] },
  {
    id: "s2-1",
    level: 2,
    title: "2.1 知识库建设",
    paragraphs: [
      "已完成企业制度、项目材料、会议纪要等三类核心知识库的搭建，覆盖主要业务口径的结构化与非结构化文档，为大模型提供高质量的检索增强语料。",
      "建立文档接入、清洗、切分、向量化和权限管理的一体化流水线，支持部门级隔离与按需授权。",
    ],
  },
  {
    id: "s2-2",
    level: 2,
    title: "2.2 典型场景落地",
    paragraphs: [
      "围绕公文写作、会议纪要、经营分析等高频办公场景，完成首批 AI 助手上线，用户覆盖机关及主要业务单位。",
      {
        text: "从复盘情况看，办公类场景的接受度和活跃度显著高于其他类别，但在复杂业务场景中仍需加强数据治理与流程融合。",
        cite: "2",
      },
    ],
  },
  {
    id: "s2-3",
    level: 2,
    title: "2.3 组织与协同机制",
    paragraphs: [
      "组建由信息化、业务、法务共同参与的 AI 应用评审小组，形成需求提报、评估立项、上线运营的闭环机制，保障合规、安全与业务价值三个维度的平衡。",
    ],
  },
  { id: "s3", level: 1, title: "三、存在问题与下一步计划", paragraphs: [] },
  {
    id: "s3-1",
    level: 2,
    title: "3.1 主要问题",
    paragraphs: [
      "一是跨部门数据资产整合度不足，部分业务领域仍存在数据孤岛；二是场景运营深度不够，尚未形成完整的价值度量体系；三是复合型 AI 人才储备偏薄。",
    ],
  },
  {
    id: "s3-2",
    level: 2,
    title: "3.2 下一步举措",
    paragraphs: [
      "下一阶段将以业务价值为核心牵引：持续沉淀领域知识库，完善模型评测与选型机制；深化 3—5 个重点业务场景的智能化改造；强化组织保障与人才培养，形成「平台—场景—组织」协同推进格局。",
    ],
  },
];

/* ============================== helpers ============================== */

function loadPersisted(): Partial<Persisted> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ============================== component ============================== */

function Workbench() {
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [articleType, setArticleType] = useState<ArticleType>("工作报告");
  const [template, setTemplate] = useState("default");
  const [maxWords, setMaxWords] = useState(3000);
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [outline, setOutline] = useState<OutlineNode[]>([]);
  const [otherReq, setOtherReq] = useState(DEFAULT_OTHER);
  const [files, setFiles] = useState<string[]>([]);
  const [kb, setKb] = useState<string[]>(["kb1"]);
  const [stage, setStage] = useState<Stage>("empty");

  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingOutline, setLoadingOutline] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genSectionIdx, setGenSectionIdx] = useState(0);
  const [titleError, setTitleError] = useState(false);

  const [activeCite, setActiveCite] = useState<Citation | null>(null);
  const [collapsedSidebar, setCollapsedSidebar] = useState(false);

  const articleRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef(false);

  /* Restore from localStorage on mount */
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const data = loadPersisted();
    if (!data) return;
    if (data.title !== undefined) setTitle(data.title);
    if (data.articleType) setArticleType(data.articleType);
    if (data.template) setTemplate(data.template);
    if (data.maxWords) setMaxWords(data.maxWords);
    if (data.summary !== undefined) setSummary(data.summary);
    if (data.outline) setOutline(data.outline);
    if (data.otherReq !== undefined) setOtherReq(data.otherReq);
    if (data.files) setFiles(data.files);
    if (data.kb) setKb(data.kb);
    if (data.stage) setStage(data.stage);
  }, []);

  const hasOutline = outline.length > 0;

  /* ---------- actions ---------- */

  const handleGenSummary = async () => {
    setLoadingSummary(true);
    await delay(1000);
    setSummary(MOCK_SUMMARY);
    setLoadingSummary(false);
    if (stage === "empty") setStage("summary");
    toast.success("内容概要已生成");
  };

  const handleGenOutline = async () => {
    if (!title.trim()) {
      setTitleError(true);
      toast.error("请先填写文章标题");
      return;
    }
    setLoadingOutline(true);
    setStage("outline");
    await delay(1200);
    setOutline(JSON.parse(JSON.stringify(MOCK_OUTLINE)));
    setLoadingOutline(false);
    toast.success("文章大纲已生成");
  };

  const handleGenArticle = async () => {
    if (!title.trim()) {
      setTitleError(true);
      toast.error("请先填写文章标题");
      return;
    }
    if (!hasOutline) {
      toast.error("请先生成或填写文章大纲");
      return;
    }
    setStage("generating");
    setGenProgress(0);
    setGenSectionIdx(0);
    const total = flattenOutline(outline).length;
    const stepMs = Math.max(120, Math.floor(2400 / Math.max(1, total)));
    for (let i = 0; i < total; i++) {
      await delay(stepMs);
      setGenSectionIdx(i + 1);
      setGenProgress(Math.round(((i + 1) / total) * 100));
    }
    await delay(200);
    setStage("article");
    toast.success("全文生成完成");
  };

  const handleSave = () => {
    const payload: Persisted = {
      title,
      articleType,
      template,
      maxWords,
      summary,
      outline,
      otherReq,
      files,
      kb,
      stage,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      toast.success("已保存");
    } catch {
      toast.error("保存失败");
    }
  };

  const handleExport = () => {
    if (stage !== "article") {
      toast.success("导出成功");
      return;
    }
    const html = buildExportHtml(title, MOCK_ARTICLE, CITATIONS);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "article"}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("导出成功");
  };

  const handleUpload = () => {
    const fake = ["市场调研初稿.docx", "2026 年度 AI 规划.pdf", "培训方案.xlsx"];
    const name = fake[files.length % fake.length];
    setFiles((f) => [...f, name]);
    toast.success(`已上传 ${name}`);
  };

  const toggleKb = (id: string) => {
    setKb((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(`sec-${id}`);
    if (el && articleRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const openCitation = (id: string) => {
    const c = CITATIONS.find((x) => x.id === id);
    if (c) setActiveCite(c);
  };

  const totalSections = useMemo(() => flattenOutline(outline).length, [outline]);

  /* ============================== render ============================== */

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      {/* ============ TOP BAR ============ */}
      <header
        className="flex h-14 shrink-0 items-center border-b bg-topbar"
        style={{ borderColor: "var(--color-topbar-border)" }}
      >
        {/* Logo area matches sidebar width */}
        <div
          className={cn(
            "flex h-full items-center gap-2 border-r px-4 text-white transition-all",
            collapsedSidebar ? "w-14" : "w-[200px]",
          )}
          style={{
            background:
              "linear-gradient(180deg, var(--color-sidebar) 0%, color-mix(in oklab, var(--color-sidebar) 92%, black) 100%)",
            borderColor: "var(--color-sidebar-border)",
          }}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-[0_2px_10px_-2px_var(--color-primary)]">
            <Sparkles className="h-4 w-4" />
          </div>
          {!collapsedSidebar && (
            <div className="truncate text-[13.5px] font-semibold tracking-wide">
              AI 能力集约化管理平台
            </div>
          )}
        </div>

        {/* Breadcrumb + doc title */}
        <div className="flex flex-1 items-center gap-2 px-5">
          <button
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted"
            onClick={() => setCollapsedSidebar((v) => !v)}
            aria-label="折叠侧边栏"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <span>智能写作</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground">新建文章</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pr-4">
          <button
            className="flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
            title="历史记录"
          >
            <History className="h-4 w-4" />
            历史
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            className="h-8 gap-1.5 border-border text-[13px]"
          >
            <Save className="h-3.5 w-3.5" /> 保存
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            className="h-8 gap-1.5 bg-primary text-[13px] hover:bg-primary/90"
          >
            <Download className="h-3.5 w-3.5" /> 导出全文
          </Button>
          <Separator orientation="vertical" className="mx-1 h-6" />
          <button
            className="relative rounded-md p-2 text-muted-foreground transition hover:bg-muted"
            title="通知"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
          </button>
          <div className="flex items-center gap-2 pl-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[color-mix(in_oklab,var(--color-primary)_60%,black)] text-[12px] font-medium text-white">
              傅
            </div>
            <span className="text-[13px] text-foreground">梁婷玉</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      </header>

      {/* ============ BODY ============ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ============ SIDEBAR ============ */}
        <aside
          className={cn(
            "flex shrink-0 flex-col overflow-y-auto text-sidebar-foreground transition-all scrollbar-thin",
            collapsedSidebar ? "w-14" : "w-[200px]",
          )}
          style={{
            background:
              "linear-gradient(180deg, var(--color-sidebar) 0%, color-mix(in oklab, var(--color-sidebar) 94%, black) 100%)",
          }}
        >
          <nav className="flex flex-col gap-0.5 px-2 py-3">
            <NavItem icon={Home} label="首页" collapsed={collapsedSidebar} />
            <NavItem icon={Layers} label="工作空间" collapsed={collapsedSidebar} />
            <NavItem
              icon={PenLine}
              label="智能写作"
              active
              collapsed={collapsedSidebar}
            />
            <NavGroup
              icon={BookOpen}
              label="知识库"
              collapsed={collapsedSidebar}
              items={["知识库管理", "知识库应用", "数据分析"]}
            />
            <NavGroup
              icon={Boxes}
              label="模型管理"
              collapsed={collapsedSidebar}
              items={["注册模型", "启动模型", "运行模型", "集群信息"]}
            />
            <NavItem
              icon={Activity}
              label="运行监控"
              collapsed={collapsedSidebar}
            />
            <NavGroup
              icon={Users}
              label="系统管理"
              collapsed={collapsedSidebar}
              items={["用户管理", "权限管理", "角色管理"]}
            />
          </nav>
        </aside>

        {/* ============ WORKSPACE ============ */}
        <main className="flex flex-1 flex-col overflow-hidden bg-background">
          {/* doc header */}
          <div className="flex h-12 shrink-0 items-center gap-3 border-b bg-panel px-6">
            <button className="text-muted-foreground transition hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex flex-1 flex-col">
              <input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value.slice(0, 50));
                  if (e.target.value.trim()) setTitleError(false);
                }}
                placeholder="请输入文章标题"
                maxLength={50}
                className={cn(
                  "w-full border-0 bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:text-muted-foreground/70",
                )}
              />
            </div>
            <div className="text-[12px] text-muted-foreground">
              {title.length}/50
            </div>
          </div>

          {titleError && (
            <div className="border-b border-destructive/20 bg-destructive/5 px-6 py-1.5 text-[12.5px] text-destructive">
              请输入文章标题（必填，最多 50 字）
            </div>
          )}

          {/* content area */}
          <div className="flex flex-1 overflow-hidden">
            {stage === "article" ? (
              <ArticleView
                title={title}
                articleRef={articleRef}
                sections={MOCK_ARTICLE}
                citations={CITATIONS}
                onScrollTo={scrollToSection}
                onOpenCitation={openCitation}
              />
            ) : (
              <div className="flex flex-1 flex-col overflow-y-auto p-6 scrollbar-thin">
                <div className="mx-auto w-full max-w-[860px]">
                  <InfoBar stage={stage} />

                  {stage === "empty" && <EmptyState />}

                  {stage === "summary" && (
                    <SummaryPreview
                      summary={summary}
                      loading={loadingSummary}
                    />
                  )}

                  {(stage === "outline" || stage === "generating") && (
                    <OutlineEditor
                      outline={outline}
                      setOutline={setOutline}
                      loading={loadingOutline}
                      onRegenerate={handleGenOutline}
                      generating={stage === "generating"}
                      genProgress={genProgress}
                      genSectionIdx={genSectionIdx}
                      totalSections={totalSections}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex h-9 shrink-0 items-center justify-between border-t bg-panel px-6 text-[12px] text-muted-foreground">
            <span>以上内容由 AI 生成，仅供参考</span>
            <span>字数：{stage === "article" ? "3,428" : "0"}/{maxWords}</span>
          </div>
        </main>

        {/* ============ RIGHT PANEL ============ */}
        <aside className="flex w-[360px] shrink-0 flex-col border-l bg-panel">
          {/* tabs */}
          <div className="flex h-11 shrink-0 items-center gap-6 border-b px-5 text-[13.5px]">
            <button className="relative h-full font-semibold text-primary">
              AI 写作
              <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-primary" />
            </button>
            <button className="h-full text-muted-foreground transition hover:text-foreground">
              改写润色
            </button>
            <button className="h-full text-muted-foreground transition hover:text-foreground">
              智能审查
            </button>
          </div>

          {/* scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
            {/* article type */}
            <FieldLabel required>文章类型</FieldLabel>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {ARTICLE_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setArticleType(t)}
                  className={cn(
                    "h-8 rounded-md border text-[12.5px] transition",
                    articleType === t
                      ? "border-primary bg-primary-soft font-medium text-primary"
                      : "border-border text-foreground hover:border-primary/40 hover:bg-muted",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* template */}
            <div className="mt-5 flex items-center justify-between">
              <FieldLabel required>格式模板</FieldLabel>
              <button className="flex items-center gap-1 text-[12.5px] text-primary hover:underline">
                <Plus className="h-3.5 w-3.5" /> 自定义
              </button>
            </div>
            <div className="mt-2">
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* title */}
            <FieldLabel required className="mt-5">
              文章标题
            </FieldLabel>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value.slice(0, 50));
                if (e.target.value.trim()) setTitleError(false);
              }}
              placeholder="请输入文章标题"
              className={cn(
                "mt-2 h-9 text-[13px]",
                titleError && "border-destructive focus-visible:ring-destructive/30",
              )}
              maxLength={50}
            />
            {titleError && (
              <div className="mt-1 text-[12px] text-destructive">
                标题为必填项
              </div>
            )}

            {/* max words */}
            <FieldLabel required className="mt-5">
              <span className="flex items-center gap-1">
                最大字数
                <Info className="h-3 w-3 text-muted-foreground" />
              </span>
            </FieldLabel>
            <div className="mt-2 flex items-center gap-3">
              <Slider
                value={[maxWords]}
                min={1000}
                max={10000}
                step={100}
                onValueChange={(v) => setMaxWords(v[0])}
                className="flex-1"
              />
              <Input
                type="number"
                value={maxWords}
                min={1000}
                max={10000}
                onChange={(e) => {
                  const v = Math.max(
                    1000,
                    Math.min(10000, Number(e.target.value) || 1000),
                  );
                  setMaxWords(v);
                }}
                className="h-8 w-20 text-center text-[13px]"
              />
            </div>

            {/* summary */}
            <div className="mt-5 flex items-center justify-between">
              <FieldLabel required>内容概要</FieldLabel>
              <button
                onClick={handleGenSummary}
                disabled={loadingSummary}
                className="flex items-center gap-1 text-[12.5px] text-primary transition hover:underline disabled:opacity-50"
              >
                {loadingSummary ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                AI 生成
              </button>
            </div>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value.slice(0, 500))}
              placeholder="手动输入"
              rows={4}
              className="mt-2 resize-none text-[13px]"
            />
            <div className="mt-1 text-right text-[11.5px] text-muted-foreground">
              {summary.length}/500
            </div>

            {/* outline */}
            <div className="mt-3 flex items-center justify-between">
              <FieldLabel>文章大纲</FieldLabel>
              <button
                onClick={handleGenOutline}
                disabled={loadingOutline}
                className="flex items-center gap-1 text-[12.5px] text-primary transition hover:underline disabled:opacity-50"
              >
                {loadingOutline ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                AI 生成
              </button>
            </div>
            <div className="mt-2 rounded-md border border-dashed border-border bg-muted/40 px-3 py-2.5 text-[12.5px] text-muted-foreground">
              {hasOutline
                ? `已生成 ${outline.length} 个章节，可在左侧编辑`
                : "点击「AI 生成」或在左侧手动输入大纲"}
            </div>

            {/* references */}
            <FieldLabel className="mt-5">内容参考</FieldLabel>
            <div className="mt-2 space-y-2">
              <button
                onClick={handleUpload}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border py-2 text-[13px] text-muted-foreground transition hover:border-primary/50 hover:bg-primary-soft/60 hover:text-primary"
              >
                <Upload className="h-3.5 w-3.5" /> 上传文件
              </button>
              {files.length > 0 && (
                <div className="space-y-1">
                  {files.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5 text-[12.5px]"
                    >
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <span className="flex-1 truncate">{f}</span>
                      <button
                        onClick={() =>
                          setFiles((arr) => arr.filter((_, idx) => idx !== i))
                        }
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-md border border-border p-2">
                <div className="mb-1.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <Database className="h-3 w-3" /> 选择知识库
                </div>
                <div className="space-y-1">
                  {KB_OPTIONS.map((o) => {
                    const checked = kb.includes(o.id);
                    return (
                      <label
                        key={o.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] transition",
                          checked
                            ? "bg-primary-soft text-primary"
                            : "hover:bg-muted",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="accent-[var(--color-primary)]"
                          checked={checked}
                          onChange={() => toggleKb(o.id)}
                        />
                        <span className="flex-1">{o.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* other */}
            <FieldLabel className="mt-5">其他要求</FieldLabel>
            <Textarea
              value={otherReq}
              onChange={(e) => setOtherReq(e.target.value.slice(0, 200))}
              placeholder="如：语言风格、格式偏好等"
              rows={3}
              className="mt-2 resize-none text-[13px]"
            />
            <div className="mt-1 mb-2 text-right text-[11.5px] text-muted-foreground">
              {otherReq.length}/200
            </div>
          </div>

          {/* bottom action */}
          <div className="border-t bg-panel p-3">
            {!hasOutline && (
              <div className="mb-2 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                <Info className="h-3 w-3" />
                请先生成或填写文章大纲
              </div>
            )}
            <Button
              onClick={handleGenArticle}
              disabled={!hasOutline || stage === "generating"}
              className="h-10 w-full bg-primary text-[14px] font-medium shadow-[0_6px_18px_-6px_var(--color-primary)] hover:bg-primary/90 disabled:opacity-50 disabled:shadow-none"
            >
              {stage === "generating" ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  生成中…
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  生成全文
                </>
              )}
            </Button>
          </div>
        </aside>
      </div>

      {/* ============ CITATION DRAWER ============ */}
      <Sheet
        open={!!activeCite}
        onOpenChange={(o) => !o && setActiveCite(null)}
      >
        <SheetContent side="right" className="w-[420px] sm:max-w-none">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-[15px]">
              <Quote className="h-4 w-4 text-primary" />
              引用来源 [{activeCite?.id}]
            </SheetTitle>
          </SheetHeader>
          {activeCite && (
            <div className="mt-6 space-y-5">
              <div className="rounded-lg border bg-muted/40 p-4">
                <div className="flex items-start gap-2">
                  <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-medium text-foreground">
                      {activeCite.source}
                    </div>
                    <div className="mt-0.5 text-[12px] text-muted-foreground">
                      {activeCite.section}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 text-[12px] font-medium text-muted-foreground">
                  引用片段
                </div>
                <blockquote className="rounded-md border-l-2 border-primary bg-primary-soft/40 px-4 py-3 text-[13.5px] leading-relaxed text-foreground">
                  {activeCite.snippet}
                </blockquote>
              </div>

              <Button
                variant="outline"
                className="w-full gap-1.5"
                onClick={() => toast.success("已在来源文件中定位")}
              >
                <MapPin className="h-4 w-4" /> 定位原文
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ============================== subcomponents ============================== */

function FieldLabel({
  children,
  required,
  className,
}: {
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-[13px] font-medium text-foreground",
        className,
      )}
    >
      {required && <span className="mr-0.5 text-destructive">*</span>}
      {children}
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  active,
  collapsed,
}: {
  icon: typeof Home;
  label: string;
  active?: boolean;
  collapsed?: boolean;
}) {
  return (
    <button
      className={cn(
        "flex h-9 items-center gap-2.5 rounded-md px-3 text-[13px] transition",
        active
          ? "bg-primary text-primary-foreground shadow-[0_2px_10px_-2px_var(--color-primary)]"
          : "text-sidebar-foreground/85 hover:bg-sidebar-hover hover:text-white",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

function NavGroup({
  icon: Icon,
  label,
  items,
  collapsed,
}: {
  icon: typeof Home;
  label: string;
  items: string[];
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-full items-center gap-2.5 rounded-md px-3 text-[13px] text-sidebar-foreground/85 transition hover:bg-sidebar-hover hover:text-white"
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left">{label}</span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition",
                open && "rotate-180",
              )}
            />
          </>
        )}
      </button>
      {open && !collapsed && (
        <div className="mt-0.5 space-y-0.5 pl-4">
          {items.map((it) => (
            <button
              key={it}
              className="flex h-8 w-full items-center rounded-md px-3 text-[12.5px] text-sidebar-foreground/70 transition hover:bg-sidebar-hover hover:text-white"
            >
              {it}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoBar({ stage }: { stage: Stage }) {
  const map: Record<Stage, string> = {
    empty: "请在右侧配置参数，先生成文章大纲",
    summary: "已生成内容概要，可继续生成文章大纲",
    outline: "已生成文章大纲，可编辑后生成全文",
    generating: "正在按照大纲生成全文，请稍候…",
    article: "",
  };
  if (!map[stage]) return null;
  return (
    <div className="mb-5 flex items-center gap-2 rounded-md border border-primary/20 bg-primary-soft/60 px-3.5 py-2.5 text-[13px] text-primary">
      <Info className="h-4 w-4" />
      {map[stage]}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-24 flex flex-col items-center text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-soft text-primary shadow-[0_10px_30px_-12px_var(--color-primary)]">
        <PenLine className="h-9 w-9" />
      </div>
      <div className="mt-6 text-[16px] font-semibold text-foreground">
        开始你的智能写作
      </div>
      <div className="mt-2 max-w-md text-[13px] leading-relaxed text-muted-foreground">
        在右侧配置文章类型、标题、字数等参数，
        然后依次生成「内容概要 → 文章大纲 → 全文」。
      </div>
    </div>
  );
}

function SummaryPreview({
  summary,
  loading,
}: {
  summary: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-[13px] font-medium text-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        内容概要预览
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-3.5 w-full animate-pulse rounded bg-muted" />
          <div className="h-3.5 w-11/12 animate-pulse rounded bg-muted" />
          <div className="h-3.5 w-4/5 animate-pulse rounded bg-muted" />
        </div>
      ) : (
        <p className="text-[14px] leading-[1.9] text-foreground">{summary}</p>
      )}
    </div>
  );
}

function OutlineEditor({
  outline,
  setOutline,
  loading,
  onRegenerate,
  generating,
  genProgress,
  genSectionIdx,
  totalSections,
}: {
  outline: OutlineNode[];
  setOutline: (o: OutlineNode[]) => void;
  loading: boolean;
  onRegenerate: () => void;
  generating: boolean;
  genProgress: number;
  genSectionIdx: number;
  totalSections: number;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-[13px] text-primary">
          <Loader2 className="h-4 w-4 animate-spin" /> 正在生成大纲…
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              <div className="ml-6 h-3 w-2/3 animate-pulse rounded bg-muted" />
              <div className="ml-6 h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const flat = flattenOutline(outline);

  return (
    <div className="space-y-4">
      {generating && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-[13px]">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              全文生成中
            </div>
            <div className="text-primary">{genProgress}%</div>
          </div>
          <Progress value={genProgress} className="h-1.5" />
          <div className="mt-4 space-y-1.5">
            {flat.map((n, i) => {
              const status =
                i < genSectionIdx
                  ? "done"
                  : i === genSectionIdx
                    ? "loading"
                    : "wait";
              return (
                <div
                  key={n.id}
                  className="flex items-center gap-2 text-[12.5px]"
                >
                  {status === "done" && (
                    <Check className="h-3.5 w-3.5 text-[color:var(--color-success)]" />
                  )}
                  {status === "loading" && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  )}
                  {status === "wait" && (
                    <div className="h-3.5 w-3.5 rounded-full border border-border" />
                  )}
                  <span
                    className={cn(
                      status === "done"
                        ? "text-muted-foreground line-through"
                        : status === "loading"
                          ? "text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    {n.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13px] font-medium text-foreground">
            <FileText className="h-4 w-4 text-primary" />
            文章大纲
            <span className="text-[12px] font-normal text-muted-foreground">
              共 {outline.length} 章 / {flat.length} 节
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRegenerate}
              disabled={generating}
              className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[12.5px] text-muted-foreground transition hover:border-primary/50 hover:text-primary disabled:opacity-40"
            >
              <RefreshCw className="h-3 w-3" /> 重新生成
            </button>
            <button
              onClick={() =>
                setOutline([
                  ...outline,
                  {
                    id: `s${Date.now()}`,
                    title: `新章节 ${outline.length + 1}`,
                    children: [],
                  },
                ])
              }
              disabled={generating}
              className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[12.5px] text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
            >
              <Plus className="h-3 w-3" /> 新增章节
            </button>
          </div>
        </div>

        <div className="space-y-1">
          {outline.map((node, idx) => (
            <OutlineRow
              key={node.id}
              node={node}
              level={1}
              onRename={(t) => renameNode(outline, setOutline, node.id, t)}
              onDelete={() => deleteNode(outline, setOutline, node.id)}
              onAddChild={() => addChild(outline, setOutline, node.id)}
              disabled={generating}
              index={idx}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function OutlineRow({
  node,
  level,
  onRename,
  onDelete,
  onAddChild,
  disabled,
}: {
  node: OutlineNode;
  level: number;
  onRename: (t: string) => void;
  onDelete: () => void;
  onAddChild?: () => void;
  disabled?: boolean;
  index?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(node.title);

  const save = () => {
    onRename(val.trim() || node.title);
    setEditing(false);
  };

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-muted",
          level === 1
            ? "text-[14px] font-medium text-foreground"
            : "ml-6 text-[13px] text-foreground/85",
        )}
      >
        <div className="h-1 w-1 rounded-full bg-primary/60" />
        {editing ? (
          <>
            <Input
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") {
                  setVal(node.title);
                  setEditing(false);
                }
              }}
              className="h-7 flex-1 text-[13px]"
              autoFocus
            />
            <button
              onClick={save}
              className="rounded p-1 text-[color:var(--color-success)] hover:bg-muted"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                setVal(node.title);
                setEditing(false);
              }}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <>
            <span className="flex-1 truncate">{node.title}</span>
            {!disabled && (
              <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                <button
                  onClick={() => setEditing(true)}
                  className="rounded p-1 text-muted-foreground hover:bg-background hover:text-primary"
                  title="重命名"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {onAddChild && (
                  <button
                    onClick={onAddChild}
                    className="rounded p-1 text-muted-foreground hover:bg-background hover:text-primary"
                    title="新增子节"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={onDelete}
                  className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive"
                  title="删除"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {node.children?.map((child) => (
        <OutlineRow
          key={child.id}
          node={child}
          level={2}
          disabled={disabled}
          onRename={(t) =>
            (node.children = node.children!.map((c) =>
              c.id === child.id ? { ...c, title: t } : c,
            ))
          }
          onDelete={() => {
            node.children = node.children!.filter((c) => c.id !== child.id);
          }}
        />
      ))}
    </div>
  );
}

function ArticleView({
  title,
  sections,
  citations,
  onScrollTo,
  onOpenCitation,
  articleRef,
}: {
  title: string;
  sections: Section[];
  citations: Citation[];
  onScrollTo: (id: string) => void;
  onOpenCitation: (id: string) => void;
  articleRef: React.RefObject<HTMLDivElement | null>;
}) {
  const topSections = sections.filter((s) => s.level === 1);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* TOC */}
      <div className="w-[220px] shrink-0 overflow-y-auto border-r bg-panel/60 px-4 py-5 scrollbar-thin">
        <div className="mb-3 text-[12px] font-medium text-muted-foreground">
          目录导航
        </div>
        <div className="space-y-0.5">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => onScrollTo(s.id)}
              className={cn(
                "block w-full truncate rounded px-2 py-1.5 text-left text-[12.5px] transition hover:bg-primary-soft hover:text-primary",
                s.level === 1
                  ? "font-medium text-foreground"
                  : "pl-5 text-muted-foreground",
              )}
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* article body */}
      <div
        ref={articleRef}
        className="flex-1 overflow-y-auto bg-background scrollbar-thin"
      >
        <div className="mx-auto max-w-[780px] px-10 py-10">
          <h1 className="text-[26px] font-bold leading-tight text-foreground">
            {title}
          </h1>
          <div className="mt-3 flex items-center gap-3 text-[12.5px] text-muted-foreground">
            <span>AI 生成</span>
            <span>·</span>
            <span>{new Date().toLocaleDateString("zh-CN")}</span>
            <span>·</span>
            <span>共 {topSections.length} 章</span>
          </div>
          <Separator className="my-6" />

          <article className="article-prose">
            {sections.map((s) => (
              <div key={s.id} id={`sec-${s.id}`} className="scroll-mt-4">
                {s.level === 1 ? <h1>{s.title}</h1> : <h2>{s.title}</h2>}
                {s.paragraphs.map((p, i) =>
                  typeof p === "string" ? (
                    <p key={i}>{p}</p>
                  ) : (
                    <p key={i}>
                      {p.text}
                      {p.cite && (
                        <sup
                          onClick={() => onOpenCitation(p.cite!)}
                          title="查看引用来源"
                        >
                          [{p.cite}]
                        </sup>
                      )}
                    </p>
                  ),
                )}
              </div>
            ))}

            <Separator className="my-8" />
            <div className="text-[13px] font-medium text-foreground">
              引用来源
            </div>
            <ol className="mt-2 space-y-1.5 text-[12.5px] text-muted-foreground">
              {citations.map((c) => (
                <li key={c.id}>
                  [{c.id}]{" "}
                  <button
                    className="text-primary hover:underline"
                    onClick={() => onOpenCitation(c.id)}
                  >
                    {c.source}
                  </button>{" "}
                  · {c.section}
                </li>
              ))}
            </ol>
          </article>
        </div>
      </div>
    </div>
  );
}

/* ============================== outline utils ============================== */

function flattenOutline(nodes: OutlineNode[]): OutlineNode[] {
  const out: OutlineNode[] = [];
  const walk = (arr: OutlineNode[]) => {
    for (const n of arr) {
      out.push(n);
      if (n.children) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

function renameNode(
  tree: OutlineNode[],
  setter: (o: OutlineNode[]) => void,
  id: string,
  title: string,
) {
  const walk = (arr: OutlineNode[]): OutlineNode[] =>
    arr.map((n) =>
      n.id === id
        ? { ...n, title }
        : { ...n, children: n.children ? walk(n.children) : n.children },
    );
  setter(walk(tree));
}

function deleteNode(
  tree: OutlineNode[],
  setter: (o: OutlineNode[]) => void,
  id: string,
) {
  const walk = (arr: OutlineNode[]): OutlineNode[] =>
    arr
      .filter((n) => n.id !== id)
      .map((n) => ({
        ...n,
        children: n.children ? walk(n.children) : n.children,
      }));
  setter(walk(tree));
}

function addChild(
  tree: OutlineNode[],
  setter: (o: OutlineNode[]) => void,
  parentId: string,
) {
  const walk = (arr: OutlineNode[]): OutlineNode[] =>
    arr.map((n) =>
      n.id === parentId
        ? {
            ...n,
            children: [
              ...(n.children ?? []),
              {
                id: `c${Date.now()}`,
                title: `新子节 ${(n.children?.length ?? 0) + 1}`,
              },
            ],
          }
        : { ...n, children: n.children ? walk(n.children) : n.children },
    );
  setter(walk(tree));
}

/* ============================== export ============================== */

function buildExportHtml(
  title: string,
  sections: Section[],
  citations: Citation[],
) {
  const body = sections
    .map((s) => {
      const tag = s.level === 1 ? "h1" : "h2";
      const ps = s.paragraphs
        .map((p) =>
          typeof p === "string"
            ? `<p>${p}</p>`
            : `<p>${p.text}${p.cite ? `<sup>[${p.cite}]</sup>` : ""}</p>`,
        )
        .join("");
      return `<${tag}>${s.title}</${tag}>${ps}`;
    })
    .join("");
  const refs = citations
    .map((c) => `<li>[${c.id}] ${c.source} · ${c.section}</li>`)
    .join("");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;max-width:780px;margin:40px auto;padding:0 24px;color:#111827;line-height:1.9}h1{font-size:24px}h2{font-size:18px;margin-top:20px}sup{color:#4f46e5;font-weight:600;margin:0 2px}ol{color:#4b5563;font-size:13px}</style></head><body><h1 style="font-size:26px;text-align:center">${title}</h1>${body}<hr/><h3>引用来源</h3><ol>${refs}</ol></body></html>`;
}
