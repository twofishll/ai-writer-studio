import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Home,
  PenLine,
  BookOpen,
  Database,
  Boxes,
  Layers,
  Activity,
  Users,
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
  Wand2,
  ShieldAlert,
  ListChecks,
  CheckCircle2,
  XCircle,
  MessageSquareQuote,
  Send,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Workbench,
  head: () => ({
    meta: [
      { title: "AI 智能写作工作台" },
      {
        name: "description",
        content:
          "面向政务与企业行政人员的结构化长文 AI 写作工具：写作、润色、审查一体化。",
      },
      { property: "og:title", content: "AI 智能写作工作台" },
      { property: "og:description", content: "结构化长文 AI 写作、润色与审查工作台" },
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
  docId: string;
  page: number;
  sliceIdx: number;
  section: string;
}

interface SourceDoc {
  id: string;
  name: string;
  pages: { page: number; paras: string[] }[];
}

interface FormatTemplate {
  value: string;
  label: string;
  custom?: boolean;
}

type RefMode = "upload" | "kb";

interface KnowledgeBase {
  id: string;
  name: string;
}

type Stage = "empty" | "summary" | "outline" | "generating" | "article";

type RightTab = "write" | "polish" | "review";
type PolishMode = "expand" | "condense" | "continue" | "summarize";

interface Para {
  text: string;
  cites?: string[];
}
interface Section {
  id: string;
  level: 1 | 2;
  title: string;
  paragraphs: Para[];
}

interface Selection {
  secId: string;
  paraIdx: number;
  start: number;
  end: number;
  text: string;
}

type ReviewCategory = "政治敏感" | "语法逻辑" | "格式规范" | "法律条款";
type ReviewStatus = "pending" | "accepted" | "ignored";

interface Suggestion {
  id: string;
  category: ReviewCategory;
  original: string;
  suggestion: string;
  explanation: string;
  status: ReviewStatus;
  secId: string;
  paraIdx: number;
}

interface Persisted {
  title: string;
  articleType: ArticleType;
  templates: FormatTemplate[];
  template: string;
  maxWords: number;
  summary: string;
  outline: OutlineNode[];
  outlineText: string;
  otherReq: string;
  refMode: RefMode;
  files: string[];
  kbDocs: string[];
  kb: string[];
  stage: Stage;
  rightTab: RightTab;
  sections: Section[];
  suggestions: Suggestion[];
  reviewStarted: boolean;
  savedAt?: string;
}

const STORAGE_KEY = "ai-writing-workbench:v3";

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

const TEMPLATES: FormatTemplate[] = [
  { value: "default", label: "默认格式" },
  { value: "official", label: "正式公文格式" },
  { value: "brief", label: "简洁汇报格式" },
];

const KB_OPTIONS: KnowledgeBase[] = [
  { id: "kb1", name: "企业制度与项目材料库" },
  { id: "kb2", name: "政策文件库" },
  { id: "kb3", name: "会议材料库" },
];

const DEFAULT_TITLE = "";
const DEFAULT_SUMMARY = "";
const DEFAULT_OTHER = "";

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

const SOURCE_DOCS: SourceDoc[] = [
  {
    id: "d1",
    name: "企业 AI 能力建设实施方案（2026）.pdf",
    pages: [
      {
        page: 1,
        paras: [
          "为深入贯彻集团数字化转型战略部署，加快推进人工智能能力体系建设，结合公司实际，制定本实施方案。",
          "本方案适用于集团总部及所属各单位在人工智能平台建设、场景应用与数据治理等方面的工作。",
        ],
      },
      {
        page: 3,
        paras: [
          "第二章 阶段目标。总体分为能力搭建、场景推广、深化运营三个阶段推进。",
          "到 2026 年底，形成覆盖办公、经营、研发等核心场景的 AI 能力基座，建成统一知识库与模型管理平台，实现主要业务领域的智能化辅助能力落地。",
          "各单位应按照阶段目标制定年度实施计划，并纳入年度重点工作考核。",
        ],
      },
      {
        page: 7,
        paras: [
          "第五章 运营与评估。建立以业务价值为导向的效果度量体系，定期开展场景运营复盘。",
          "办公类场景应优先纳入推广清单，复杂业务场景需同步开展数据治理与流程融合。",
        ],
      },
    ],
  },
  {
    id: "d2",
    name: "AI 项目阶段复盘会议纪要.docx",
    pages: [
      {
        page: 2,
        paras: [
          "议题三 场景与协同。会议指出，各业务线在 AI 应用中普遍存在数据分散、场景碎片化的问题，需要以知识库为中枢，建立跨部门的协同评审与效果度量机制。",
          "会议要求，信息化部门牵头，于下季度前完成跨部门协同评审流程的试运行。",
        ],
      },
    ],
  },
];

const CITATIONS: Citation[] = [
  { id: "1", docId: "d1", page: 3, sliceIdx: 1, section: "第二章 · 阶段目标" },
  { id: "2", docId: "d2", page: 2, sliceIdx: 0, section: "议题三 · 场景与协同" },
  { id: "3", docId: "d1", page: 7, sliceIdx: 1, section: "第五章 · 运营与评估" },
];

const MOCK_ARTICLE: Section[] = [
  { id: "s1", level: 1, title: "一、总体情况", paragraphs: [] },
  {
    id: "s1-1",
    level: 2,
    title: "1.1 建设背景",
    paragraphs: [
      {
        text: "近年来，人工智能技术加速演进，成为企业提质增效、构建新型核心竞争力的重要引擎。集团高度重视 AI 能力体系建设，明确将其作为数字化转型的关键抓手统筹推进。",
      },
      {
        text: "根据集团总体规划，本阶段以打造统一的 AI 能力基座为核心目标，重点建设知识库、模型管理与应用编排三大能力。",
        cites: ["1"],
      },
    ],
  },
  {
    id: "s1-2",
    level: 2,
    title: "1.2 总体目标与思路",
    paragraphs: [
      {
        text: "总体思路可概括为「平台先行、场景牵引、数据驱动、协同共建」，通过统一基座支撑多业务场景，以典型场景反哺平台迭代，形成可持续演进的能力闭环。",
      },
    ],
  },
  { id: "s2", level: 1, title: "二、阶段性成果", paragraphs: [] },
  {
    id: "s2-1",
    level: 2,
    title: "2.1 知识库建设",
    paragraphs: [
      {
        text: "已完成企业制度、项目材料、会议纪要等三类核心知识库的搭建，覆盖主要业务口径的结构化与非结构化文档，为大模型提供高质量的检索增强语料。",
      },
      {
        text: "建立文档接入、清洗、切分、向量化和权限管理的一体化流水线，支持部门级隔离与按需授权。",
      },
    ],
  },
  {
    id: "s2-2",
    level: 2,
    title: "2.2 典型场景落地",
    paragraphs: [
      {
        text: "围绕公文写作、会议纪要、经营分析等高频办公场景，完成首批 AI 助手上线，用户覆盖机关及主要业务单位。",
      },
      {
        text: "从复盘情况看，办公类场景的接受度和活跃度显著高于其他类别，但在复杂业务场景中仍需加强数据治理与流程融合。",
        cites: ["2", "3"],
      },
    ],
  },
  {
    id: "s2-3",
    level: 2,
    title: "2.3 组织与协同机制",
    paragraphs: [
      {
        text: "组建由信息化、业务、法务共同参与的 AI 应用评审小组，形成需求提报、评估立项、上线运营的闭环机制，保障合规、安全与业务价值三个维度的平衡。",
      },
    ],
  },
  { id: "s3", level: 1, title: "三、存在问题与下一步计划", paragraphs: [] },
  {
    id: "s3-1",
    level: 2,
    title: "3.1 主要问题",
    paragraphs: [
      {
        text: "一是跨部门数据资产整合度不足，部分业务领域仍存在数据孤岛；二是场景运营深度不够，尚未形成完整的价值度量体系；三是复合型 AI 人才储备偏薄。",
      },
    ],
  },
  {
    id: "s3-2",
    level: 2,
    title: "3.2 下一步举措",
    paragraphs: [
      {
        text: "下一阶段将以业务价值为核心牵引：持续沉淀领域知识库，完善模型评测与选型机制；深化 3—5 个重点业务场景的智能化改造；强化组织保障与人才培养，形成「平台—场景—组织」协同推进格局。",
      },
    ],
  },
];

const MOCK_SUGGESTIONS_FACTORY = (): Suggestion[] => [
  {
    id: "r1",
    category: "政治敏感",
    secId: "s1-1",
    paraIdx: 0,
    original: "成为企业提质增效、构建新型核心竞争力的重要引擎",
    suggestion:
      "成为推动企业高质量发展、构建新质生产力的重要引擎",
    explanation:
      "建议采用更贴合当前政策表述的规范提法，突出高质量发展与新质生产力的政治站位。",
    status: "pending",
  },
  {
    id: "r2",
    category: "语法逻辑",
    secId: "s2-1",
    paraIdx: 0,
    original: "为大模型提供高质量的检索增强语料",
    suggestion:
      "为大模型提供高质量的检索增强（RAG）语料支撑",
    explanation: "建议补充术语说明并使句尾更加完整，增强专业性与可读性。",
    status: "pending",
  },
  {
    id: "r3",
    category: "格式规范",
    secId: "s2-2",
    paraIdx: 0,
    original: "AI 助手",
    suggestion: "人工智能助手",
    explanation:
      "首次出现的英文缩略语建议使用中文全称并在括号内标注英文，符合正式公文写作规范。",
    status: "pending",
  },
  {
    id: "r4",
    category: "法律条款",
    secId: "s2-3",
    paraIdx: 0,
    original: "保障合规、安全与业务价值三个维度的平衡",
    suggestion:
      "依据《生成式人工智能服务管理暂行办法》，保障合规、安全与业务价值三个维度的平衡",
    explanation: "建议明确合规依据，引用现行法规名称以增强合规表述的严谨性。",
    status: "pending",
  },
  {
    id: "r5",
    category: "语法逻辑",
    secId: "s3-1",
    paraIdx: 0,
    original: "复合型 AI 人才储备偏薄",
    suggestion: "复合型人工智能人才储备相对不足",
    explanation:
      "「偏薄」为口语化表达，建议改为「相对不足」，符合公文语言风格。",
    status: "pending",
  },
  {
    id: "r6",
    category: "格式规范",
    secId: "s3-2",
    paraIdx: 0,
    original: "3—5 个重点业务场景",
    suggestion: "3 至 5 个重点业务场景",
    explanation:
      "根据《党政机关公文格式》，数字区间宜使用「至」字表达，避免使用连接符。",
    status: "pending",
  },
];

const POLISH_MOCKS: Record<PolishMode, (t: string) => string> = {
  expand: (t) =>
    `${t.replace(/。$/, "")}，这一举措不仅体现了责任担当，也为下一步工作提供了坚实基础。具体而言，需要在组织保障、资源投入和成效评估等方面持续发力，确保各项任务落地见效、取得实绩。`,
  condense: (t) => {
    const s = t.replace(/[，。；、].*$/g, "");
    return `${s}，成效显著。`;
  },
  continue: (t) =>
    `${t} 在此基础上，下一阶段将进一步完善顶层设计、优化推进机制，围绕重点场景开展深度赋能，切实把制度优势转化为治理效能与发展动能。`,
  summarize: (t) => {
    const s = t.slice(0, Math.min(30, t.length));
    return `本段主要观点：${s}⋯⋯（围绕核心任务，明确目标、路径与举措）。`;
  },
};

const POLISH_MODE_LABEL: Record<PolishMode, string> = {
  expand: "扩写",
  condense: "精简",
  continue: "续写",
  summarize: "总结",
};

const REVIEW_CATEGORIES: ReviewCategory[] = [
  "政治敏感",
  "语法逻辑",
  "格式规范",
  "法律条款",
];

const CATEGORY_STYLE: Record<
  ReviewCategory,
  { bg: string; fg: string; dot: string }
> = {
  政治敏感: { bg: "#FEF2F2", fg: "#DC2626", dot: "#DC2626" },
  语法逻辑: { bg: "#EFF6FF", fg: "#1D4ED8", dot: "#1D4ED8" },
  格式规范: { bg: "#F5F3FF", fg: "#6D28D9", dot: "#6D28D9" },
  法律条款: { bg: "#FFF7ED", fg: "#C2410C", dot: "#C2410C" },
};

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

function outlineToText(nodes: OutlineNode[]): string {
  const lines: string[] = [];
  nodes.forEach((n) => {
    lines.push(n.title);
    (n.children ?? []).forEach((c) => lines.push(`  ${c.title}`));
  });
  return lines.join("\n");
}

function textToOutline(text: string): OutlineNode[] {
  const roots: OutlineNode[] = [];
  text.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const isChild = /^\s/.test(raw) || /^\d+[.．]\d/.test(line);
    const node: OutlineNode = { id: `n${i}-${line.slice(0, 6)}`, title: line };
    if (isChild && roots.length) {
      const parent = roots[roots.length - 1];
      parent.children = [...(parent.children ?? []), node];
    } else {
      roots.push({ ...node, children: [] });
    }
  });
  return roots;
}

function cloneSections(s: Section[]): Section[] {
  return s.map((sec) => ({ ...sec, paragraphs: sec.paragraphs.map((p) => ({ ...p })) }));
}

/* ============================== component ============================== */

function Workbench() {
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [articleType, setArticleType] = useState<ArticleType>("工作报告");
  const [templates, setTemplates] = useState<FormatTemplate[]>(TEMPLATES);
  const [template, setTemplate] = useState("default");
  const [maxWords, setMaxWords] = useState(3000);
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [outline, setOutline] = useState<OutlineNode[]>([]);
  const [outlineText, setOutlineText] = useState("");
  const [otherReq, setOtherReq] = useState(DEFAULT_OTHER);
  const [refMode, setRefMode] = useState<RefMode>("upload");
  const [files, setFiles] = useState<string[]>([]);
  const [kbDocs, setKbDocs] = useState<string[]>([]);
  const [kb, setKb] = useState<string[]>(["kb1"]);
  const [stage, setStage] = useState<Stage>("empty");

  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingOutline, setLoadingOutline] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genSectionIdx, setGenSectionIdx] = useState(0);
  const [titleError, setTitleError] = useState(false);

  const [activeCiteId, setActiveCiteId] = useState<string | null>(null);
  const [collapsedSidebar, setCollapsedSidebar] = useState(false);

  /* new: shared article + tabs + polish + review */
  const [sections, setSections] = useState<Section[]>(() =>
    cloneSections(MOCK_ARTICLE),
  );
  const [rightTab, setRightTab] = useState<RightTab>("write");

  const [selection, setSelection] = useState<Selection | null>(null);
  const [polishMode, setPolishMode] = useState<PolishMode | null>(null);
  const [polishCustom, setPolishCustom] = useState("");
  const [polishLoading, setPolishLoading] = useState(false);
  const [polishResult, setPolishResult] = useState<string>("");

  const [reviewStarted, setReviewStarted] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [reviewFilter, setReviewFilter] = useState<"all" | ReviewCategory>(
    "all",
  );
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(
    null,
  );
  const [confirmDialog, setConfirmDialog] = useState<
    null | "acceptAll" | "ignoreAll"
  >(null);

  const articleRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const data = loadPersisted();
    if (!data) return;
    if (data.title !== undefined) setTitle(data.title);
    if (data.articleType) setArticleType(data.articleType);
    if (data.templates?.length) setTemplates(data.templates);
    if (data.template) setTemplate(data.template);
    if (data.maxWords) setMaxWords(data.maxWords);
    if (data.summary !== undefined) setSummary(data.summary);
    if (data.outline) setOutline(data.outline);
    if (data.outlineText !== undefined) setOutlineText(data.outlineText);
    else if (data.outline?.length) setOutlineText(outlineToText(data.outline));
    if (data.otherReq !== undefined) setOtherReq(data.otherReq);
    if (data.refMode) setRefMode(data.refMode);
    if (data.files) setFiles(data.files);
    if (data.kbDocs) setKbDocs(data.kbDocs);
    if (data.kb) setKb(data.kb);
    if (data.stage) setStage(data.stage);
    if (data.rightTab) setRightTab(data.rightTab);
    if (data.sections) setSections(data.sections);
    if (data.suggestions) setSuggestions(data.suggestions);
    if (data.reviewStarted) setReviewStarted(data.reviewStarted);
  }, []);

  const hasOutline = outline.length > 0;

  /* ---------- writing actions ---------- */

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
    const tree = JSON.parse(JSON.stringify(MOCK_OUTLINE)) as OutlineNode[];
    setOutline(tree);
    setOutlineText(outlineToText(tree));
    setLoadingOutline(false);
    toast.success("文章大纲已生成");
  };

  const handleOutlineTextChange = (text: string) => {
    setOutlineText(text);
    setOutline(textToOutline(text));
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
    setSections(cloneSections(MOCK_ARTICLE));
    setStage("article");
    toast.success("全文生成完成");
  };

  const handleSave = () => {
    const payload: Persisted = {
      title,
      articleType,
      templates,
      template,
      maxWords,
      summary,
      outline,
      outlineText,
      otherReq,
      refMode,
      files,
      kbDocs,
      kb,
      stage,
      rightTab,
      sections,
      suggestions,
      reviewStarted,
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
    const html = buildExportHtml(title, sections, CITATIONS);
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
    setKb((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(`sec-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openCitation = (id: string) => {
    setActiveCiteId(id);
  };

  const handlePickKbDoc = () => {
    const pool = [
      "集团数字化转型总体规划.pdf",
      "知识库运营管理办法.docx",
      "2026 年信息化预算说明.xlsx",
    ];
    const name = pool[kbDocs.length % pool.length];
    setKbDocs((arr) => [...arr, name]);
    toast.success(`已选择 ${name}`);
  };


  const totalSections = useMemo(() => flattenOutline(outline).length, [outline]);

  const wordCount = useMemo(() => {
    if (stage !== "article") return 0;
    return sections.reduce(
      (n, s) => n + s.title.length + s.paragraphs.reduce((m, p) => m + p.text.length, 0),
      0,
    );
  }, [sections, stage]);

  /* ---------- tab switching ---------- */

  const handleSwitchTab = (t: RightTab) => {
    setRightTab(t);
    if (t !== "polish") {
      setSelection(null);
      setPolishMode(null);
      setPolishResult("");
      setPolishCustom("");
    }
    if (t !== "review") {
      setActiveSuggestionId(null);
    }
    if (t === "polish" || t === "review") {
      if (stage !== "article") {
        setSections(cloneSections(MOCK_ARTICLE));
        setStage("article");
      }
    }
  };

  /* ---------- selection capture ---------- */

  const captureSelection = useCallback(() => {
    if (rightTab !== "polish") return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const text = sel.toString();
    if (!text.trim()) return;
    const range = sel.getRangeAt(0);
    // Find enclosing paragraph element with data attributes
    let node: Node | null = range.startContainer;
    let paraEl: HTMLElement | null = null;
    while (node && node !== articleRef.current) {
      if (
        node.nodeType === 1 &&
        (node as HTMLElement).dataset &&
        (node as HTMLElement).dataset.paraSecId
      ) {
        paraEl = node as HTMLElement;
        break;
      }
      node = node.parentNode;
    }
    if (!paraEl) return;
    const secId = paraEl.dataset.paraSecId!;
    const paraIdx = Number(paraEl.dataset.paraIdx || "0");
    const paraText = paraEl.dataset.paraText || "";
    // Compute offset by walking text nodes
    const preRange = document.createRange();
    preRange.selectNodeContents(paraEl);
    preRange.setEnd(range.startContainer, range.startOffset);
    const start = preRange.toString().length;
    const end = start + text.length;
    if (start < 0 || end > paraText.length) return;
    setSelection({ secId, paraIdx, start, end, text });
    setPolishResult("");
  }, [rightTab]);

  const handleClearSelection = () => {
    setSelection(null);
    setPolishResult("");
    window.getSelection()?.removeAllRanges();
  };

  /* ---------- polish actions ---------- */

  const handlePolish = async () => {
    if (!selection) {
      toast.error("请先在正文中选中需要润色的文本");
      return;
    }
    if (!polishMode && !polishCustom.trim()) {
      toast.error("请选择润色方式或填写自定义要求");
      return;
    }
    setPolishLoading(true);
    setPolishResult("");
    await delay(1500);
    const base = polishMode
      ? POLISH_MOCKS[polishMode](selection.text)
      : `${selection.text}（根据要求：${polishCustom.trim()}，已按公文语体作调整）。`;
    setPolishResult(base);
    setPolishLoading(false);
    toast.success("润色完成");
  };

  const handleReplaceSelection = () => {
    if (!selection || !polishResult) return;
    setSections((secs) =>
      secs.map((s) => {
        if (s.id !== selection.secId) return s;
        return {
          ...s,
          paragraphs: s.paragraphs.map((p, i) => {
            if (i !== selection.paraIdx) return p;
            const nt =
              p.text.slice(0, selection.start) +
              polishResult +
              p.text.slice(selection.end);
            return { ...p, text: nt };
          }),
        };
      }),
    );
    toast.success("已替换原文");
    setSelection(null);
    setPolishResult("");
    setPolishMode(null);
    setPolishCustom("");
  };

  /* ---------- review actions ---------- */

  const startReview = async () => {
    setReviewLoading(true);
    setReviewStarted(true);
    await delay(1500);
    setSuggestions(MOCK_SUGGESTIONS_FACTORY());
    setReviewLoading(false);
    toast.success("已完成审查，共发现 6 条建议");
  };

  const applySuggestion = (id: string) => {
    const s = suggestions.find((x) => x.id === id);
    if (!s) return;
    setSections((secs) =>
      secs.map((sec) => {
        if (sec.id !== s.secId) return sec;
        return {
          ...sec,
          paragraphs: sec.paragraphs.map((p, i) =>
            i === s.paraIdx
              ? { ...p, text: p.text.split(s.original).join(s.suggestion) }
              : p,
          ),
        };
      }),
    );
    setSuggestions((arr) =>
      arr.map((x) => (x.id === id ? { ...x, status: "accepted" } : x)),
    );
    toast.success("已采纳建议");
  };

  const ignoreSuggestion = (id: string) => {
    setSuggestions((arr) =>
      arr.map((x) => (x.id === id ? { ...x, status: "ignored" } : x)),
    );
  };

  const acceptAll = () => {
    let secs = sections;
    suggestions
      .filter((s) => s.status === "pending")
      .forEach((s) => {
        secs = secs.map((sec) =>
          sec.id !== s.secId
            ? sec
            : {
                ...sec,
                paragraphs: sec.paragraphs.map((p, i) =>
                  i === s.paraIdx
                    ? { ...p, text: p.text.split(s.original).join(s.suggestion) }
                    : p,
                ),
              },
        );
      });
    setSections(secs);
    setSuggestions((arr) =>
      arr.map((x) => (x.status === "pending" ? { ...x, status: "accepted" } : x)),
    );
    toast.success("已全部采纳");
  };

  const ignoreAll = () => {
    setSuggestions((arr) =>
      arr.map((x) => (x.status === "pending" ? { ...x, status: "ignored" } : x)),
    );
    toast.success("已全部忽略");
  };

  const rerunReview = async () => {
    setActiveSuggestionId(null);
    await startReview();
  };

  /* ---------- highlights for article view ---------- */

  const highlights = useMemo(() => {
    if (rightTab === "polish" && selection) {
      return [
        {
          secId: selection.secId,
          paraIdx: selection.paraIdx,
          start: selection.start,
          end: selection.end,
          kind: "polish" as const,
          id: "sel",
        },
      ];
    }
    if (rightTab === "review" && reviewStarted && suggestions.length) {
      const hits: {
        secId: string;
        paraIdx: number;
        start: number;
        end: number;
        kind: "review" | "review-active";
        id: string;
      }[] = [];
      suggestions
        .filter((s) => s.status === "pending")
        .forEach((s) => {
          const sec = sections.find((x) => x.id === s.secId);
          if (!sec) return;
          const p = sec.paragraphs[s.paraIdx];
          if (!p) return;
          let idx = p.text.indexOf(s.original);
          while (idx !== -1) {
            hits.push({
              secId: s.secId,
              paraIdx: s.paraIdx,
              start: idx,
              end: idx + s.original.length,
              kind: activeSuggestionId === s.id ? "review-active" : "review",
              id: s.id,
            });
            idx = p.text.indexOf(s.original, idx + s.original.length);
          }
        });
      return hits;
    }
    return [];
  }, [rightTab, selection, reviewStarted, suggestions, sections, activeSuggestionId]);

  /* ============================== render ============================== */

  return (
    <TooltipProvider delayDuration={150}>
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      {/* ============ TOP BAR ============ */}
      <header
        className="flex h-14 shrink-0 items-center border-b"
        style={{
          background: "var(--color-topbar)",
          color: "var(--color-topbar-foreground)",
          borderColor: "var(--color-topbar-border)",
        }}
      >
        <div
          className={cn(
            "flex h-full items-center gap-2 border-r px-4 transition-all",
            collapsedSidebar ? "w-14" : "w-[200px]",
          )}
          style={{ borderColor: "var(--color-topbar-border)" }}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          {!collapsedSidebar && (
            <div className="truncate text-[13.5px] font-semibold tracking-wide text-white">
              AI 能力集约化管理平台
            </div>
          )}
        </div>

        <div className="flex flex-1 items-center gap-2 px-5">
          <button
            className="rounded-md p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
            onClick={() => setCollapsedSidebar((v) => !v)}
            aria-label="折叠侧边栏"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
          <ChevronLeft className="h-4 w-4 text-white/50" />
          <div className="flex items-center gap-2 text-[13px] text-white/70">
            <span>智能写作</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white">新建文章</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pr-4">
          <button
            className="flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] text-white/70 transition hover:bg-white/10 hover:text-white"
            title="历史记录"
          >
            <History className="h-4 w-4" /> 历史
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            className="h-8 gap-1.5 border-white/20 bg-transparent text-[13px] text-white hover:bg-white/10 hover:text-white"
          >
            <Save className="h-3.5 w-3.5" /> 保存
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            className="h-8 gap-1.5 bg-primary text-[13px] text-white hover:bg-[#115E59]"
          >
            <Download className="h-3.5 w-3.5" /> 导出全文
          </Button>
          <Separator orientation="vertical" className="mx-1 h-6 bg-white/15" />
          <button
            className="relative rounded-md p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            title="通知"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
          </button>
          <div className="flex items-center gap-2 pl-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[12px] font-medium text-white">
              梁
            </div>
            <span className="text-[13px] text-white">梁婷玉</span>
            <ChevronDown className="h-3.5 w-3.5 text-white/60" />
          </div>
        </div>
      </header>

      {/* ============ BODY ============ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ============ SIDEBAR ============ */}
        <aside
          className={cn(
            "flex shrink-0 flex-col overflow-y-auto transition-all scrollbar-thin",
            collapsedSidebar ? "w-14" : "w-[200px]",
          )}
          style={{
            background: "var(--color-sidebar)",
            color: "var(--color-sidebar-foreground)",
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
            <NavItem icon={Activity} label="运行监控" collapsed={collapsedSidebar} />
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
                className="w-full border-0 bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:text-muted-foreground/70"
              />
            </div>
            <div className="text-[12px] text-muted-foreground">{title.length}/50</div>
          </div>

          {titleError && (
            <div className="border-b border-destructive/20 bg-destructive/5 px-6 py-1.5 text-[12.5px] text-destructive">
              请输入文章标题（必填，最多 50 字）
            </div>
          )}

          <div className="flex flex-1 overflow-hidden">
            {stage === "article" ? (
              <ArticleView
                title={title}
                articleRef={articleRef}
                sections={sections}
                citations={CITATIONS}
                docs={SOURCE_DOCS}
                activeCiteId={activeCiteId}
                onScrollTo={scrollToSection}
                onOpenCitation={openCitation}
                onCloseCitation={() => setActiveCiteId(null)}
                highlights={highlights}
                onSelectionMouseUp={captureSelection}
              />

            ) : (
              <div className="flex flex-1 flex-col overflow-y-auto p-6 scrollbar-thin">
                <div className="mx-auto w-full max-w-[860px]">
                  <InfoBar stage={stage} />
                  {stage === "empty" && <EmptyState />}
                  {stage === "summary" && (
                    <SummaryPreview summary={summary} loading={loadingSummary} />
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
            <span>
              字数：{wordCount.toLocaleString()}/{maxWords}
            </span>
          </div>
        </main>

        {/* ============ RIGHT PANEL ============ */}
        <aside className="flex w-[360px] shrink-0 flex-col border-l bg-panel">
          {/* tabs — fixed */}
          <div className="flex h-11 shrink-0 items-center border-b">
            {(
              [
                { key: "write", label: "AI 写作" },
                { key: "polish", label: "改写润色" },
                { key: "review", label: "智能审查" },
              ] as { key: RightTab; label: string }[]
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => handleSwitchTab(t.key)}
                className={cn(
                  "relative h-full flex-1 text-[13.5px] transition",
                  rightTab === t.key
                    ? "font-semibold text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                {rightTab === t.key && (
                  <span className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>

          {rightTab === "write" && (
            <WritePanel
              articleType={articleType}
              setArticleType={setArticleType}
              templates={templates}
              setTemplates={setTemplates}
              template={template}
              setTemplate={setTemplate}
              title={title}
              setTitle={setTitle}
              titleError={titleError}
              setTitleError={setTitleError}
              maxWords={maxWords}
              setMaxWords={setMaxWords}
              summary={summary}
              setSummary={setSummary}
              handleGenSummary={handleGenSummary}
              loadingSummary={loadingSummary}
              outlineText={outlineText}
              setOutlineText={handleOutlineTextChange}
              hasOutline={hasOutline}
              handleGenOutline={handleGenOutline}
              loadingOutline={loadingOutline}
              refMode={refMode}
              setRefMode={setRefMode}
              files={files}
              setFiles={setFiles}
              kbDocs={kbDocs}
              setKbDocs={setKbDocs}
              onPickKbDoc={handlePickKbDoc}
              kb={kb}
              toggleKb={toggleKb}
              handleUpload={handleUpload}
              otherReq={otherReq}
              setOtherReq={setOtherReq}
              onGenArticle={handleGenArticle}
              generating={stage === "generating"}
            />
          )}


          {rightTab === "polish" && (
            <PolishPanel
              selection={selection}
              onClear={handleClearSelection}
              mode={polishMode}
              setMode={setPolishMode}
              custom={polishCustom}
              setCustom={setPolishCustom}
              loading={polishLoading}
              result={polishResult}
              setResult={setPolishResult}
              onRun={handlePolish}
              onReplace={handleReplaceSelection}
            />
          )}

          {rightTab === "review" && (
            <ReviewPanel
              started={reviewStarted}
              loading={reviewLoading}
              suggestions={suggestions}
              filter={reviewFilter}
              setFilter={setReviewFilter}
              activeId={activeSuggestionId}
              onActivate={(id) => {
                setActiveSuggestionId(id);
                const s = suggestions.find((x) => x.id === id);
                if (s) scrollToSection(s.secId);
              }}
              onAccept={applySuggestion}
              onIgnore={ignoreSuggestion}
              onStart={startReview}
              onAcceptAll={() => setConfirmDialog("acceptAll")}
              onIgnoreAll={() => setConfirmDialog("ignoreAll")}
              onRerun={rerunReview}
            />
          )}
        </aside>
      </div>

      {/* citation preview is rendered inline in ArticleView */}


      {/* ============ CONFIRM DIALOG ============ */}
      <AlertDialog
        open={!!confirmDialog}
        onOpenChange={(o) => !o && setConfirmDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog === "acceptAll" ? "确认全部采纳？" : "确认全部忽略？"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog === "acceptAll"
                ? "将采纳当前所有待处理的审查建议，并同步修改正文，操作不可撤销。"
                : "将忽略当前所有待处理的审查建议，正文不会被修改。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDialog === "acceptAll") acceptAll();
                else if (confirmDialog === "ignoreAll") ignoreAll();
                setConfirmDialog(null);
              }}
              className={cn(
                confirmDialog === "acceptAll"
                  ? "bg-primary hover:bg-[#115E59]"
                  : "bg-destructive hover:bg-destructive/90",
              )}
            >
              确定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
  );
}

/* ============================== right-panel subcomponents ============================== */

function WritePanel(props: {
  articleType: ArticleType;
  setArticleType: (v: ArticleType) => void;
  templates: FormatTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<FormatTemplate[]>>;
  template: string;
  setTemplate: (v: string) => void;
  title: string;
  setTitle: (v: string) => void;
  titleError: boolean;
  setTitleError: (v: boolean) => void;
  maxWords: number;
  setMaxWords: (v: number) => void;
  summary: string;
  setSummary: (v: string) => void;
  handleGenSummary: () => void;
  loadingSummary: boolean;
  outlineText: string;
  setOutlineText: (v: string) => void;
  hasOutline: boolean;
  handleGenOutline: () => void;
  loadingOutline: boolean;
  refMode: RefMode;
  setRefMode: (v: RefMode) => void;
  files: string[];
  setFiles: React.Dispatch<React.SetStateAction<string[]>>;
  kbDocs: string[];
  onPickKbDoc: () => void;
  setKbDocs: React.Dispatch<React.SetStateAction<string[]>>;
  kb: string[];
  toggleKb: (id: string) => void;
  handleUpload: () => void;
  otherReq: string;
  setOtherReq: (v: string) => void;
  onGenArticle: () => void;
  generating: boolean;
}) {
  const p = props;
  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
        <FieldLabel required>文章类型</FieldLabel>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {ARTICLE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => p.setArticleType(t)}
              className={cn(
                "h-8 rounded-md border text-[12.5px] transition",
                p.articleType === t
                  ? "border-primary bg-primary-soft font-medium text-primary"
                  : "border-border text-foreground hover:border-primary/40 hover:bg-muted",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ---- 格式模板 ---- */}
        <div className="mt-5 flex items-center justify-between">
          <FieldLabel required>格式模板</FieldLabel>
          <button
            onClick={() => {
              const idx =
                p.templates.filter((t) => t.custom).length + 1;
              const nt: FormatTemplate = {
                value: `custom-${Date.now()}`,
                label: `自定义格式 ${idx}`,
                custom: true,
              };
              p.setTemplates((arr) => [...arr, nt]);
              p.setTemplate(nt.value);
              toast.success("已新增自定义格式");
            }}
            className="flex items-center gap-1 text-[12.5px] text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> 自定义
          </button>
        </div>
        <div className="mt-2 divide-y rounded-md border border-border">
          {p.templates.map((t) => {
            const checked = p.template === t.value;
            return (
              <div
                key={t.value}
                onClick={() => p.setTemplate(t.value)}
                className={cn(
                  "group flex cursor-pointer items-center gap-2 px-3 py-2 text-[13px] transition",
                  checked ? "bg-primary-soft/60 text-primary" : "hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border",
                    checked ? "border-primary" : "border-border",
                  )}
                >
                  {checked && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </span>
                <span className="flex-1 truncate">{t.label}</span>
                {t.custom && (
                  <span className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.success(`预览「${t.label}」`);
                      }}
                      className="rounded p-1 text-muted-foreground hover:text-primary"
                      title="预览"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const name = window.prompt("重命名格式", t.label);
                        if (name?.trim())
                          p.setTemplates((arr) =>
                            arr.map((x) =>
                              x.value === t.value
                                ? { ...x, label: name.trim() }
                                : x,
                            ),
                          );
                      }}
                      className="rounded p-1 text-muted-foreground hover:text-primary"
                      title="编辑"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        p.setTemplates((arr) =>
                          arr.filter((x) => x.value !== t.value),
                        );
                        if (checked) p.setTemplate("default");
                      }}
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                      title="删除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <FieldLabel required className="mt-5">
          文章标题
        </FieldLabel>
        <Input
          value={p.title}
          onChange={(e) => {
            p.setTitle(e.target.value.slice(0, 50));
            if (e.target.value.trim()) p.setTitleError(false);
          }}
          placeholder="请输入文章标题"
          className={cn(
            "mt-2 h-9 text-[13px]",
            p.titleError && "border-destructive focus-visible:ring-destructive/30",
          )}
          maxLength={50}
        />
        {p.titleError && (
          <div className="mt-1 text-[12px] text-destructive">标题为必填项</div>
        )}

        <FieldLabel required className="mt-5">
          <span className="flex items-center gap-1">
            最大字数
            <Info className="h-3 w-3 text-muted-foreground" />
          </span>
        </FieldLabel>
        <div className="mt-2 flex items-center gap-3">
          <Slider
            value={[p.maxWords]}
            min={1000}
            max={10000}
            step={100}
            onValueChange={(v) => p.setMaxWords(v[0])}
            className="flex-1"
          />
          <Input
            type="number"
            value={p.maxWords}
            min={1000}
            max={10000}
            onChange={(e) => {
              const v = Math.max(
                1000,
                Math.min(10000, Number(e.target.value) || 1000),
              );
              p.setMaxWords(v);
            }}
            className="h-8 w-20 text-center text-[13px]"
          />
        </div>

        {/* ---- 内容概要 ---- */}
        <div className="mt-5 flex items-center justify-between">
          <FieldLabel required>内容概要</FieldLabel>
          <button
            onClick={p.handleGenSummary}
            disabled={p.loadingSummary}
            className="flex items-center gap-1 text-[12.5px] text-primary transition hover:underline disabled:opacity-50"
          >
            {p.loadingSummary ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            AI 生成
          </button>
        </div>
        <Textarea
          value={p.summary}
          onChange={(e) => p.setSummary(e.target.value.slice(0, 500))}
          placeholder="手动输入内容概要，或点击「AI 生成」"
          rows={4}
          className="mt-2 resize-none text-[13px]"
        />
        <div className="mt-1 text-right text-[11.5px] text-muted-foreground">
          {p.summary.length}/500
        </div>

        {/* ---- 文章大纲 ---- */}
        <div className="mt-3 flex items-center justify-between">
          <FieldLabel>文章大纲</FieldLabel>
          <button
            onClick={p.handleGenOutline}
            disabled={p.loadingOutline}
            className="flex items-center gap-1 text-[12.5px] text-primary transition hover:underline disabled:opacity-50"
          >
            {p.loadingOutline ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            AI 生成
          </button>
        </div>
        <Textarea
          value={p.outlineText}
          onChange={(e) => p.setOutlineText(e.target.value)}
          placeholder={"手动输入大纲，每行一节，子节以空格或缩进开头，例如：\n一、总体情况\n  1.1 建设背景"}
          rows={6}
          className="mt-2 resize-none text-[13px] leading-relaxed"
        />
        <div className="mt-1 text-[11.5px] text-muted-foreground">
          {p.hasOutline ? "大纲已同步至左侧，可在左侧继续编辑" : "支持手动输入或 AI 生成"}
        </div>

        {/* ---- 其他提示说明 ---- */}
        <FieldLabel className="mt-5">其他提示说明</FieldLabel>
        <Textarea
          value={p.otherReq}
          onChange={(e) => p.setOtherReq(e.target.value.slice(0, 200))}
          placeholder="如：语言风格、格式偏好等"
          rows={3}
          className="mt-2 resize-none text-[13px]"
        />
        <div className="mt-1 text-right text-[11.5px] text-muted-foreground">
          {p.otherReq.length}/200
        </div>

        {/* ---- 内容参考 ---- */}
        <FieldLabel className="mt-5">
          <span className="flex items-center gap-1">
            内容参考
            <Info className="h-3 w-3 text-muted-foreground" />
          </span>
        </FieldLabel>
        <div className="mt-2 flex items-center gap-5">
          {(
            [
              { v: "upload", label: "上传文件" },
              { v: "kb", label: "从知识库选择文档" },
            ] as { v: RefMode; label: string }[]
          ).map((o) => (
            <label
              key={o.v}
              className="flex cursor-pointer items-center gap-1.5 text-[13px] text-foreground"
            >
              <span
                className={cn(
                  "flex h-3.5 w-3.5 items-center justify-center rounded-full border",
                  p.refMode === o.v ? "border-primary" : "border-border",
                )}
                onClick={() => p.setRefMode(o.v)}
              >
                {p.refMode === o.v && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </span>
              <span onClick={() => p.setRefMode(o.v)}>{o.label}</span>
            </label>
          ))}
        </div>

        {p.refMode === "upload" ? (
          <div className="mt-2 space-y-2">
            <button
              onClick={p.handleUpload}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-border py-2 text-[13px] text-foreground transition hover:border-primary/50 hover:bg-primary-soft/60 hover:text-primary"
            >
              <Upload className="h-3.5 w-3.5" /> 上传文件
            </button>
            {p.files.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5 text-[12.5px]"
              >
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span className="flex-1 truncate">{f}</span>
                <button
                  onClick={() =>
                    p.setFiles((arr) => arr.filter((_, idx) => idx !== i))
                  }
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            <button
              onClick={p.onPickKbDoc}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-border py-2 text-[13px] text-foreground transition hover:border-primary/50 hover:bg-primary-soft/60 hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" /> 选择文档
            </button>
            {p.kbDocs.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5 text-[12.5px]"
              >
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span className="flex-1 truncate">{f}</span>
                <button
                  onClick={() =>
                    p.setKbDocs((arr) => arr.filter((_, idx) => idx !== i))
                  }
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ---- 引用知识库 ---- */}
        <FieldLabel className="mt-5">
          <span className="flex items-center gap-1">
            引用知识库
            <Info className="h-3 w-3 text-muted-foreground" />
          </span>
        </FieldLabel>
        <div className="mt-2 space-y-2">
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex w-full items-center justify-center gap-2 rounded-md border border-border py-2 text-[13px] text-foreground transition hover:border-primary/50 hover:bg-primary-soft/60 hover:text-primary">
                <Plus className="h-3.5 w-3.5" /> 添加知识库
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[280px] p-2">
              <div className="space-y-1">
                {KB_OPTIONS.map((o) => {
                  const checked = p.kb.includes(o.id);
                  return (
                    <label
                      key={o.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] transition",
                        checked ? "bg-primary-soft text-primary" : "hover:bg-muted",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="accent-[var(--color-primary)]"
                        checked={checked}
                        onChange={() => p.toggleKb(o.id)}
                      />
                      <span className="flex-1">{o.name}</span>
                    </label>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
          {p.kb.map((id) => {
            const o = KB_OPTIONS.find((x) => x.id === id);
            if (!o) return null;
            return (
              <div
                key={id}
                className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5 text-[12.5px]"
              >
                <Database className="h-3.5 w-3.5 text-primary" />
                <span className="flex-1 truncate">{o.name}</span>
                <button
                  onClick={() => p.toggleKb(id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
        <div className="h-2" />
      </div>

      <div className="border-t bg-panel p-3">
        {!p.hasOutline && (
          <div className="mb-2 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <Info className="h-3 w-3" /> 请先生成或填写文章大纲
          </div>
        )}
        <Button
          onClick={p.onGenArticle}
          disabled={!p.hasOutline || p.generating}
          className="h-10 w-full bg-primary text-[14px] font-medium text-white hover:bg-[#115E59] disabled:opacity-50"
        >
          {p.generating ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> 生成中…
            </>
          ) : (
            <>
              <Sparkles className="mr-1.5 h-4 w-4" /> 生成全文
            </>
          )}
        </Button>
      </div>
    </>
  );
}

function PolishPanel(props: {
  selection: Selection | null;
  onClear: () => void;
  mode: PolishMode | null;
  setMode: (v: PolishMode | null) => void;
  custom: string;
  setCustom: (v: string) => void;
  loading: boolean;
  result: string;
  setResult: (v: string) => void;
  onRun: () => void;
  onReplace: () => void;
}) {
  const {
    selection,
    mode,
    setMode,
    custom,
    setCustom,
    loading,
    result,
    setResult,
    onRun,
    onReplace,
    onClear,
  } = props;

  const canRun = !!selection && (!!mode || !!custom.trim()) && !loading;

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
        <div className="text-[14px] font-semibold text-foreground">改写润色</div>
        <div className="mt-3 rounded-md border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2.5 text-[12.5px] leading-relaxed text-[#1D4ED8]">
          请选中左侧正文的文本内容，并选择下方的操作或手动输入要求。
        </div>

        {selection && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-[#F5D67C] bg-[#FEF3C7] px-2.5 py-2 text-[12.5px] leading-relaxed text-[#78350F]">
            <span className="line-clamp-3 flex-1">「{selection.text}」</span>
            <button
              onClick={onClear}
              className="shrink-0 rounded p-0.5 text-[#92400E] hover:bg-[#FDE68A]"
              title="取消选择"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {loading && (
          <div className="mt-3 rounded-md border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-2 text-[13px] text-primary">
              <Loader2 className="h-4 w-4 animate-spin" /> AI 正在润色中…
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-3.5 w-full animate-pulse rounded bg-muted" />
              <div className="h-3.5 w-11/12 animate-pulse rounded bg-muted" />
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
            </div>
          </div>
        )}

        {!loading && result && (
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <FieldLabel>润色结果</FieldLabel>
              <button
                onClick={onRun}
                className="flex items-center gap-1 text-[12.5px] text-primary hover:underline"
              >
                <RefreshCw className="h-3 w-3" /> 重新生成
              </button>
            </div>
            <Textarea
              value={result}
              onChange={(e) => setResult(e.target.value)}
              rows={6}
              className="mt-2 resize-none border-primary/30 bg-primary-soft/40 text-[13px] leading-relaxed text-foreground"
            />
            <Button
              onClick={onReplace}
              className="mt-2 h-9 w-full bg-primary text-[13.5px] font-medium text-white hover:bg-[#115E59]"
            >
              <Check className="mr-1.5 h-3.5 w-3.5" /> 替换原文
            </Button>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t bg-panel px-3 py-2.5">
        <div className="flex items-center gap-2">
          {(["expand", "condense", "continue", "summarize"] as PolishMode[]).map(
            (m) => {
              const on = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => setMode(on ? null : m)}
                  className={cn(
                    "h-8 flex-1 rounded-md border text-[12.5px] transition",
                    on
                      ? "border-primary bg-primary font-medium text-white"
                      : "border-border bg-panel text-foreground hover:border-primary/40 hover:bg-muted",
                  )}
                >
                  {POLISH_MODE_LABEL[m]}
                </button>
              );
            },
          )}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value.slice(0, 200))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canRun) onRun();
            }}
            placeholder="告诉 AI 你想怎么修改"
            className="h-9 flex-1 rounded-full px-3.5 text-[13px]"
          />
          <button
            onClick={onRun}
            disabled={!canRun}
            title="开始润色"
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition",
              canRun
                ? "bg-primary text-white hover:bg-[#115E59]"
                : "cursor-not-allowed bg-muted text-muted-foreground",
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </>
  );
}

function ReviewPanel(props: {
  started: boolean;
  loading: boolean;
  suggestions: Suggestion[];
  filter: "all" | ReviewCategory;
  setFilter: (v: "all" | ReviewCategory) => void;
  activeId: string | null;
  onActivate: (id: string) => void;
  onAccept: (id: string) => void;
  onIgnore: (id: string) => void;
  onStart: () => void;
  onAcceptAll: () => void;
  onIgnoreAll: () => void;
  onRerun: () => void;
}) {
  const {
    started,
    loading,
    suggestions,
    filter,
    setFilter,
    activeId,
    onActivate,
    onAccept,
    onIgnore,
    onStart,
    onAcceptAll,
    onIgnoreAll,
    onRerun,
  } = props;

  const counts = useMemo(() => {
    const m: Record<ReviewCategory, number> = {
      政治敏感: 0,
      语法逻辑: 0,
      格式规范: 0,
      法律条款: 0,
    };
    suggestions.forEach((s) => (m[s.category] += 1));
    return m;
  }, [suggestions]);

  const filtered = suggestions.filter(
    (s) => filter === "all" || s.category === filter,
  );
  const pending = suggestions.filter((s) => s.status === "pending").length;

  if (!started && !loading) {
    return (
      <>
        <div className="flex flex-1 flex-col items-center justify-center px-8 py-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div className="mt-5 text-[15px] font-semibold text-foreground">
            智能审查
          </div>
          <div className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
            自动检查政治敏感、语法逻辑、
            <br />
            格式规范与法律条款四类问题，
            <br />
            并给出可采纳的修改建议。
          </div>
          <Button
            onClick={onStart}
            className="mt-6 h-10 gap-1.5 bg-primary px-6 text-[14px] font-medium text-white hover:bg-[#115E59]"
          >
            <ListChecks className="h-4 w-4" /> 开始审查
          </Button>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <div className="text-[13px] text-foreground">正在审查全文…</div>
        <div className="text-[12px] text-muted-foreground">
          分析政治敏感 · 语法逻辑 · 格式规范 · 法律条款
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between text-[12.5px] text-muted-foreground">
          <span>
            共 {suggestions.length} 条建议，
            <span className="text-primary">{pending}</span> 条待处理
          </span>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <FilterChip
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label={`全部 ${suggestions.length}`}
          />
          {REVIEW_CATEGORIES.map((c) => (
            <FilterChip
              key={c}
              active={filter === c}
              onClick={() => setFilter(c)}
              label={`${c} ${counts[c]}`}
              color={CATEGORY_STYLE[c].fg}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin">
        {filtered.length === 0 && (
          <div className="mt-10 text-center text-[13px] text-muted-foreground">
            当前分类下暂无建议
          </div>
        )}
        <div className="space-y-3">
          {filtered.map((s) => {
            const style = CATEGORY_STYLE[s.category];
            const active = activeId === s.id;
            const disabled = s.status !== "pending";
            return (
              <div
                key={s.id}
                onClick={() => onActivate(s.id)}
                className={cn(
                  "cursor-pointer rounded-lg border bg-panel p-3 transition",
                  active
                    ? "border-primary shadow-[0_4px_16px_-8px_var(--color-primary)]"
                    : "border-border hover:border-primary/40",
                  disabled && "opacity-70",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="rounded-full px-2 py-0.5 text-[11.5px] font-medium"
                    style={{ background: style.bg, color: style.fg }}
                  >
                    {s.category}
                  </span>
                  {s.status === "accepted" && (
                    <span className="flex items-center gap-1 text-[11.5px] text-[color:var(--color-success)]">
                      <CheckCircle2 className="h-3 w-3" /> 已采纳
                    </span>
                  )}
                  {s.status === "ignored" && (
                    <span className="flex items-center gap-1 text-[11.5px] text-muted-foreground">
                      <XCircle className="h-3 w-3" /> 已忽略
                    </span>
                  )}
                </div>
                <div className="mt-2 space-y-1.5 text-[12.5px] leading-relaxed">
                  <div className="rounded-md bg-[#FEF2F2] px-2 py-1.5 text-[#B91C1C] line-through decoration-[#DC2626]/60">
                    {s.original}
                  </div>
                  <div className="rounded-md bg-primary-soft px-2 py-1.5 text-[#115E59]">
                    {s.suggestion}
                  </div>
                </div>
                <div className="mt-2 flex items-start gap-1 text-[11.5px] text-muted-foreground">
                  <Info className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{s.explanation}</span>
                </div>
                {s.status === "pending" && (
                  <div className="mt-3 flex items-center justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onIgnore(s.id);
                      }}
                      className="h-7 border-border px-2.5 text-[12px]"
                    >
                      忽略
                    </Button>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAccept(s.id);
                      }}
                      className="h-7 bg-primary px-2.5 text-[12px] text-white hover:bg-[#115E59]"
                    >
                      采纳
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t bg-panel p-3">
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            onClick={onIgnoreAll}
            disabled={pending === 0}
            className="h-9 border-border text-[12.5px]"
          >
            全部忽略
          </Button>
          <Button
            variant="outline"
            onClick={onRerun}
            className="h-9 border-border text-[12.5px]"
          >
            <RefreshCw className="mr-1 h-3 w-3" /> 重新审查
          </Button>
          <Button
            onClick={onAcceptAll}
            disabled={pending === 0}
            className="h-9 bg-primary text-[12.5px] text-white hover:bg-[#115E59] disabled:opacity-50"
          >
            全部采纳
          </Button>
        </div>
      </div>
    </>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11.5px] transition",
        active
          ? "border-primary bg-primary-soft text-primary"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {color && !active && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: color }}
        />
      )}
      {label}
    </button>
  );
}

/* ============================== shared subcomponents ============================== */

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
    <div className={cn("text-[13px] font-medium text-foreground", className)}>
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
          ? "bg-primary text-primary-foreground"
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
              className={cn("h-3.5 w-3.5 transition", open && "rotate-180")}
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
      <Info className="h-4 w-4" /> {map[stage]}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-24 flex flex-col items-center text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <PenLine className="h-9 w-9" />
      </div>
      <div className="mt-6 text-[16px] font-semibold text-foreground">
        开始你的智能写作
      </div>
      <div className="mt-2 max-w-md text-[13px] leading-relaxed text-muted-foreground">
        在右侧配置文章类型、标题、字数等参数， 然后依次生成「内容概要 → 文章大纲 → 全文」。
      </div>
    </div>
  );
}

function SummaryPreview({ summary, loading }: { summary: string; loading: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-[13px] font-medium text-foreground">
        <Sparkles className="h-4 w-4 text-primary" /> 内容概要预览
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
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> 全文生成中
            </div>
            <div className="text-primary">{genProgress}%</div>
          </div>
          <Progress value={genProgress} className="h-1.5" />
          <div className="mt-4 space-y-1.5">
            {flat.map((n, i) => {
              const status =
                i < genSectionIdx ? "done" : i === genSectionIdx ? "loading" : "wait";
              return (
                <div key={n.id} className="flex items-center gap-2 text-[12.5px]">
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
            <FileText className="h-4 w-4 text-primary" /> 文章大纲
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
              className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[12.5px] text-primary-foreground transition hover:bg-[#115E59] disabled:opacity-40"
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

/* ============================== ArticleView ============================== */

interface Highlight {
  secId: string;
  paraIdx: number;
  start: number;
  end: number;
  kind: "polish" | "review" | "review-active";
  id: string;
}

function renderParaWithHighlights(text: string, hits: Highlight[]) {
  if (hits.length === 0) return text;
  const sorted = [...hits].sort((a, b) => a.start - b.start);
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  sorted.forEach((h, i) => {
    if (h.start < cursor) return;
    if (h.start > cursor) nodes.push(text.slice(cursor, h.start));
    const slice = text.slice(h.start, h.end);
    const cls =
      h.kind === "polish"
        ? "bg-[#FEF3C7] text-[#78350F] rounded-sm px-0.5"
        : h.kind === "review-active"
          ? "bg-[#FECACA] text-[#7F1D1D] rounded-sm px-0.5 outline outline-1 outline-[#DC2626]"
          : "bg-[#FEF2F2] text-[#B91C1C] rounded-sm px-0.5 underline decoration-[#DC2626]/50 decoration-dotted underline-offset-2";
    nodes.push(
      <mark key={`${i}-${h.id}`} className={cls}>
        {slice}
      </mark>,
    );
    cursor = h.end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function truncateDocName(name: string, max = 10) {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  return base.length > max ? `${base.slice(0, max)}…` : base;
}

function CiteTag({
  citation,
  doc,
  active,
  onClick,
}: {
  citation: Citation;
  doc: SourceDoc | undefined;
  active: boolean;
  onClick: () => void;
}) {
  const label = doc ? truncateDocName(doc.name) : "引用";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "mx-1 inline-flex max-w-[170px] translate-y-[-1px] items-center gap-1 rounded border px-1.5 py-[1px] align-middle text-[12px] leading-[18px] transition",
            active
              ? "border-[#1D4ED8] bg-[#DBEAFE] text-[#1D4ED8]"
              : "border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE]",
          )}
        >
          <FileText className="h-3 w-3 shrink-0" />
          <span className="truncate">{label}</span>
          <span className="opacity-70">[{citation.id}]</span>
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-[320px] border-0 bg-[#111827] text-white"
      >
        <div className="text-[12px] font-medium leading-relaxed">
          {doc?.name}
        </div>
        <div className="mt-0.5 text-[11.5px] text-white/70">
          第 {citation.page} 页 · {citation.section} · 引用 [{citation.id}]
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function DocPreviewPanel({
  citation,
  doc,
  onClose,
}: {
  citation: Citation;
  doc: SourceDoc;
  onClose: () => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = document.getElementById(
      `slice-${doc.id}-${citation.page}-${citation.sliceIdx}`,
    );
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [citation.id, citation.page, citation.sliceIdx, doc.id]);

  return (
    <div className="flex w-[380px] shrink-0 flex-col border-l bg-panel">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <FileCheck2 className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-foreground">
            {doc.name}
          </div>
          <div className="text-[11.5px] text-muted-foreground">
            第 {citation.page} 页 · 引用 [{citation.id}]
          </div>
        </div>
        <button
          onClick={() => toast.success("已开始下载源文档")}
          className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-primary"
          title="下载"
        >
          <Download className="h-4 w-4" />
        </button>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          title="关闭"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={bodyRef}
        className="flex-1 overflow-y-auto bg-muted/40 px-3 py-3 scrollbar-thin"
      >
        {doc.pages.map((pg) => (
          <div
            key={pg.page}
            className="mb-3 rounded-md border bg-panel px-4 py-4 shadow-sm"
          >
            <div className="mb-2 text-[11.5px] text-muted-foreground">
              第 {pg.page} 页
            </div>
            <div className="space-y-2.5 text-[12.5px] leading-[1.9] text-foreground">
              {pg.paras.map((t, i) => {
                const hit =
                  pg.page === citation.page && i === citation.sliceIdx;
                return (
                  <p
                    key={i}
                    id={`slice-${doc.id}-${pg.page}-${i}`}
                    className={cn(
                      "rounded px-1 py-0.5 transition",
                      hit &&
                        "bg-[#FEF3C7] outline outline-1 outline-[#F5D67C]",
                    )}
                  >
                    {t}
                  </p>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArticleView({
  title,
  sections,
  citations,
  docs,
  activeCiteId,
  onScrollTo,
  onOpenCitation,
  onCloseCitation,
  articleRef,
  highlights,
  onSelectionMouseUp,
}: {
  title: string;
  sections: Section[];
  citations: Citation[];
  docs: SourceDoc[];
  activeCiteId: string | null;
  onScrollTo: (id: string) => void;
  onOpenCitation: (id: string) => void;
  onCloseCitation: () => void;
  articleRef: React.RefObject<HTMLDivElement | null>;
  highlights: Highlight[];
  onSelectionMouseUp: () => void;
}) {
  const topSections = sections.filter((s) => s.level === 1);
  const activeCite = citations.find((c) => c.id === activeCiteId) ?? null;
  const activeDoc = activeCite
    ? docs.find((d) => d.id === activeCite.docId)
    : undefined;

  return (
    <div className="flex flex-1 overflow-hidden">
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

      <div
        ref={articleRef}
        onMouseUp={onSelectionMouseUp}
        className="flex-1 overflow-y-auto bg-background scrollbar-thin"
      >
        <div className="mx-auto max-w-[780px] px-10 py-10">
          <h1 className="text-[26px] font-bold leading-tight text-foreground">
            {title || "未命名文章"}
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
                {s.paragraphs.map((p, i) => {
                  const hits = highlights.filter(
                    (h) => h.secId === s.id && h.paraIdx === i,
                  );
                  return (
                    <p
                      key={i}
                      data-para-sec-id={s.id}
                      data-para-idx={i}
                      data-para-text={p.text}
                    >
                      {renderParaWithHighlights(p.text, hits)}
                      {(p.cites ?? []).map((cid) => {
                        const c = citations.find((x) => x.id === cid);
                        if (!c) return null;
                        return (
                          <CiteTag
                            key={cid}
                            citation={c}
                            doc={docs.find((d) => d.id === c.docId)}
                            active={activeCiteId === cid}
                            onClick={() => onOpenCitation(cid)}
                          />
                        );
                      })}
                    </p>
                  );
                })}
              </div>
            ))}

            <Separator className="my-8" />
            <div className="text-[13px] font-medium text-foreground">引用来源</div>
            <ol className="mt-2 space-y-1.5">
              {citations.map((c) => {
                const d = docs.find((x) => x.id === c.docId);
                const active = activeCiteId === c.id;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => onOpenCitation(c.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-[12.5px] transition",
                        active
                          ? "border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8]"
                          : "border-border text-muted-foreground hover:border-primary/40 hover:bg-muted",
                      )}
                    >
                      <span className="shrink-0 font-medium">[{c.id}]</span>
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 truncate">{d?.name}</span>
                      <span className="shrink-0 text-[11.5px] opacity-80">
                        第 {c.page} 页 · {c.section}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </article>
        </div>
      </div>

      {activeCite && activeDoc && (
        <DocPreviewPanel
          citation={activeCite}
          doc={activeDoc}
          onClose={onCloseCitation}
        />
      )}
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
      .map((n) => ({ ...n, children: n.children ? walk(n.children) : n.children }));
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
              { id: `c${Date.now()}`, title: `新子节 ${(n.children?.length ?? 0) + 1}` },
            ],
          }
        : { ...n, children: n.children ? walk(n.children) : n.children },
    );
  setter(walk(tree));
}

/* ============================== export ============================== */

function buildExportHtml(title: string, sections: Section[], citations: Citation[]) {
  const body = sections
    .map((s) => {
      const tag = s.level === 1 ? "h1" : "h2";
      const ps = s.paragraphs
        .map(
          (p) =>
            `<p>${p.text}${(p.cites ?? []).map((c) => `<sup>[${c}]</sup>`).join("")}</p>`,
        )
        .join("");
      return `<${tag}>${s.title}</${tag}>${ps}`;
    })
    .join("");
  const refs = citations
    .map(
      (c) =>
        `<li>[${c.id}] ${SOURCE_DOCS.find((d) => d.id === c.docId)?.name ?? ""} · 第 ${c.page} 页 · ${c.section}</li>`,
    )
    .join("");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;max-width:780px;margin:40px auto;padding:0 24px;color:#1F2937;line-height:1.9}h1{font-size:24px}h2{font-size:18px;margin-top:20px}sup{color:#0F766E;font-weight:600;margin:0 2px}ol{color:#4b5563;font-size:13px}</style></head><body><h1 style="font-size:26px;text-align:center">${title}</h1>${body}<hr/><h3>引用来源</h3><ol>${refs}</ol></body></html>`;
}
