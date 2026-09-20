import type { Recipe } from './types'

const TONE = ['真诚亲和', '专业权威', '活泼网感', '高级克制', '幽默调侃']
const LENGTH = ['短（200 字内）', '中（400-800 字）', '长（1200 字以上）']

/**
 * 内置配方 = 平台的「运作逻辑」。
 * 每个配方把一类内容需求固化成：需求表单 + 一条可复用的流水线。
 */
export const BUILTIN_RECIPES: Recipe[] = [
  {
    id: 'rcp_xhs_note',
    name: '小红书种草笔记',
    category: '社交内容',
    summary: '从产品卖点出发，产出带钩子的标题、分段正文、话题标签与配图建议。',
    outputs: ['标题 × 5', '正文', '话题标签', '配图脚本'],
    builtin: true,
    updatedAt: Date.now(),
    fields: [
      { key: 'product', label: '产品 / 主题', type: 'text', required: true, placeholder: '例：一款主打通勤的轻量笔记本电脑' },
      { key: 'audience', label: '目标人群', type: 'text', required: true, placeholder: '例：一线城市 25-32 岁通勤白领' },
      { key: 'selling', label: '核心卖点', type: 'textarea', required: true, placeholder: '每行一个卖点', hint: '按重要度排序，前 3 条会被重点展开' },
      { key: 'tone', label: '语气', type: 'select', options: TONE, defaultValue: '真诚亲和' },
      { key: 'taboo', label: '规避词 / 禁用表达', type: 'tags', placeholder: '最、第一、国家级…' },
    ],
    steps: [
      { id: 'plan', name: '需求拆解', kind: 'plan', temperature: 0.3, desc: '把产品卖点翻译成人群真实关心的价值点，并给出内容角度。', prompt: '你是资深社媒内容策略。针对产品「{{product}}」，目标人群「{{audience}}」。\n核心卖点：\n{{selling}}\n\n请输出：1) 人群的三个真实痛点；2) 每个痛点对应的价值主张；3) 推荐的内容切入角度（1 个）。用简洁的要点罗列。' },
      { id: 'brand', name: '品牌调性对齐', kind: 'retrieve', temperature: 0.2, desc: '调取品牌资产库中的调性与用词规范，约束后续生成。', prompt: '依据品牌资产，提炼本次创作必须遵守的语气、用词与表达边界。语气要求：{{tone}}；禁用表达：{{taboo}}。\n\n上一步结论：\n{{steps.plan}}' },
      { id: 'draft', name: '正文生成', kind: 'generate', temperature: 0.8, desc: '按小红书的分段节奏写出正文初稿。', prompt: '基于下面的策略与调性约束，写一篇小红书笔记正文。要求：开头三行内抛出钩子；中间分 3-4 段，每段一个小标题；结尾给出行动指引。不要出现营销腔套话。\n\n策略：\n{{steps.plan}}\n\n调性：\n{{steps.brand}}' },
      { id: 'titles', name: '标题矩阵', kind: 'generate', temperature: 0.9, desc: '围绕正文生成 5 个不同钩子类型的标题。', prompt: '为下面这篇笔记写 5 个标题，分别采用：数字型、反常识型、身份代入型、痛点提问型、结果承诺型。每个标题不超过 20 字。\n\n正文：\n{{steps.draft}}' },
      { id: 'check', name: '合规校验', kind: 'validate', temperature: 0.1, desc: '检查极限词、夸大承诺与禁用表达。', prompt: '检查以下内容是否包含广告法极限词、医疗功效暗示、或指定禁用表达（{{taboo}}）。逐条列出问题并给出替换建议；若无问题，输出「通过」。\n\n标题：\n{{steps.titles}}\n\n正文：\n{{steps.draft}}' },
      { id: 'pack', name: '成品打包', kind: 'format', temperature: 0.4, desc: '合并为可直接发布的成品，并补齐标签与配图建议。', prompt: '把以下素材整理成一份可直接发布的小红书笔记，结构为：标题候选、正文、话题标签（6-8 个）、配图脚本（每张图一句话）。应用校验意见后的修订版本。\n\n标题：{{steps.titles}}\n正文：{{steps.draft}}\n校验：{{steps.check}}' },
    ],
  },
  {
    id: 'rcp_article',
    name: '公众号深度长文',
    category: '长文内容',
    summary: '从选题到成稿：先搭提纲，再逐段写作，最后做事实与逻辑自检。',
    outputs: ['提纲', '正文', '导语与摘要'],
    builtin: true,
    updatedAt: Date.now(),
    fields: [
      { key: 'topic', label: '选题', type: 'text', required: true, placeholder: '例：为什么内容团队开始自建提示词资产库' },
      { key: 'angle', label: '核心观点', type: 'textarea', required: true, placeholder: '你想让读者记住的一句话' },
      { key: 'audience', label: '读者画像', type: 'text', required: true, placeholder: '例：中小企业市场负责人' },
      { key: 'length', label: '篇幅', type: 'select', options: LENGTH, defaultValue: '长（1200 字以上）' },
      { key: 'tone', label: '语气', type: 'select', options: TONE, defaultValue: '专业权威' },
    ],
    steps: [
      { id: 'outline', name: '提纲搭建', kind: 'plan', temperature: 0.4, desc: '确定论证主线与每一节要回答的问题。', prompt: '就选题「{{topic}}」为读者「{{audience}}」搭建一篇深度文章的提纲。核心观点：{{angle}}。\n输出：一句话主张 + 4-6 个小节，每节写明「本节回答的问题」与「支撑材料类型」。' },
      { id: 'evidence', name: '论据调取', kind: 'retrieve', temperature: 0.3, desc: '为每一节匹配案例、数据与引用方向。', prompt: '为下面提纲的每一节，各提出 2 条可用的论据方向（案例／数据／类比），并标注需要人工核实的事实点。\n\n提纲：\n{{steps.outline}}' },
      { id: 'body', name: '逐节写作', kind: 'generate', temperature: 0.7, desc: '按提纲展开正文，控制在目标篇幅内。', prompt: '按提纲与论据写出完整正文，篇幅要求：{{length}}，语气：{{tone}}。每节保留小标题，段落之间要有承接。避免空洞的总结句。\n\n提纲：\n{{steps.outline}}\n\n论据：\n{{steps.evidence}}' },
      { id: 'polish', name: '润色改写', kind: 'refine', temperature: 0.5, desc: '压缩冗余、替换陈词，强化开头与结尾。', prompt: '润色以下正文：删去重复与套话，把抽象表述换成具体描写，重写开头前 100 字使其更有吸引力，重写结尾使其落在行动或思考上。保留原结构。\n\n{{steps.body}}' },
      { id: 'audit', name: '逻辑自检', kind: 'validate', temperature: 0.1, desc: '检查论证链条与事实风险。', prompt: '审阅以下文章：1) 主张与论据是否匹配；2) 有无未经证实的断言；3) 有无逻辑跳跃。逐条指出并给出修改建议。\n\n{{steps.polish}}' },
      { id: 'pack', name: '成品打包', kind: 'format', temperature: 0.3, desc: '输出导语、摘要与正文终稿。', prompt: '整理为最终成品：一句话摘要、120 字导语、正文终稿（已吸收自检意见）、3 个备选标题。\n\n正文：{{steps.polish}}\n自检：{{steps.audit}}' },
    ],
  },
  {
    id: 'rcp_video_script',
    name: '短视频口播脚本',
    category: '视频内容',
    summary: '按黄金三秒结构产出分镜脚本，含口播词、画面提示与字幕。',
    outputs: ['分镜表', '口播词', '字幕'],
    builtin: true,
    updatedAt: Date.now(),
    fields: [
      { key: 'topic', label: '视频主题', type: 'text', required: true, placeholder: '例：三招让会议纪要不再返工' },
      { key: 'duration', label: '时长', type: 'select', options: ['30 秒', '60 秒', '90 秒', '3 分钟'], defaultValue: '60 秒' },
      { key: 'platform', label: '发布平台', type: 'select', options: ['抖音', '视频号', 'B 站', '小红书'], defaultValue: '抖音' },
      { key: 'audience', label: '目标观众', type: 'text', required: true, placeholder: '例：经常开会的职场新人' },
      { key: 'tone', label: '语气', type: 'select', options: TONE, defaultValue: '活泼网感' },
    ],
    steps: [
      { id: 'hook', name: '开场钩子', kind: 'plan', temperature: 0.9, desc: '为前 3 秒设计 3 个候选钩子并选出最优。', prompt: '为主题「{{topic}}」在「{{platform}}」面向「{{audience}}」设计 3 个前三秒钩子（悬念／冲突／结果前置各一），并说明选哪一个、为什么。' },
      { id: 'beats', name: '节奏拆分', kind: 'plan', temperature: 0.4, desc: '按时长把内容切成若干节拍。', prompt: '把内容按 {{duration}} 拆成节拍表，每个节拍写明：起止秒数、这一拍要传达的单一信息、观众情绪变化。\n\n钩子：\n{{steps.hook}}' },
      { id: 'script', name: '口播撰写', kind: 'generate', temperature: 0.8, desc: '逐拍写出可直接念的口播词。', prompt: '按节拍表写口播词，语气 {{tone}}，口语化、短句、每句不超过 18 字，去掉书面语。标注每句对应的秒数。\n\n节拍：\n{{steps.beats}}' },
      { id: 'visual', name: '画面配置', kind: 'generate', temperature: 0.6, desc: '为每句口播配画面与字幕。', prompt: '为下面的口播词逐句配：景别、画面内容、屏幕字幕（不超过 12 字）、音效或转场提示。用表格形式。\n\n{{steps.script}}' },
      { id: 'pack', name: '成品打包', kind: 'format', temperature: 0.3, desc: '合成拍摄可用的完整分镜表。', prompt: '合成一份拍摄用分镜表：秒数 / 口播词 / 景别 / 画面 / 字幕 / 提示，并在末尾附完整口播稿与纯字幕文件。\n\n口播：{{steps.script}}\n画面：{{steps.visual}}' },
    ],
  },
  {
    id: 'rcp_ecom',
    name: '电商详情页文案',
    category: '商业文案',
    summary: '把参数表翻译成购买理由，产出主图文案、卖点模块与 FAQ。',
    outputs: ['主图文案', '卖点模块', 'FAQ', '规格表'],
    builtin: true,
    updatedAt: Date.now(),
    fields: [
      { key: 'product', label: '商品名称', type: 'text', required: true },
      { key: 'specs', label: '参数与规格', type: 'textarea', required: true, placeholder: '每行一条参数', hint: '直接粘贴产品参数表即可' },
      { key: 'price', label: '价格带', type: 'text', placeholder: '例：299-399 元' },
      { key: 'competitor', label: '主要竞品', type: 'text', placeholder: '例：同价位的 X 品牌同款' },
      { key: 'channel', label: '投放渠道', type: 'select', options: ['天猫', '京东', '抖音商城', '独立站'], defaultValue: '天猫' },
    ],
    steps: [
      { id: 'translate', name: '参数转译', kind: 'plan', temperature: 0.3, desc: '把技术参数逐条翻译成用户能感知的好处。', prompt: '把「{{product}}」的参数逐条翻译成消费者能感知的利益点，格式：参数 → 意味着什么 → 什么场景下有用。\n\n参数：\n{{specs}}' },
      { id: 'diff', name: '竞品对位', kind: 'retrieve', temperature: 0.4, desc: '找出相对竞品最值得强调的差异。', prompt: '对比竞品「{{competitor}}」，在价格带 {{price}} 下，指出本品最值得强调的 3 个差异点，以及必须回避的 1 个弱项。\n\n利益点：\n{{steps.translate}}' },
      { id: 'copy', name: '卖点模块', kind: 'generate', temperature: 0.7, desc: '生成详情页的分屏卖点文案。', prompt: '为 {{channel}} 详情页写 5 屏卖点模块，每屏包含：大标题（不超过 12 字）、副标题（不超过 25 字）、说明文案（2-3 句）、配图建议。\n\n差异点：\n{{steps.diff}}' },
      { id: 'faq', name: '异议处理', kind: 'generate', temperature: 0.6, desc: '预判购买顾虑并写成 FAQ。', prompt: '列出消费者下单前最可能的 8 个顾虑，逐条写成 FAQ 问答，回答要具体、可验证，不回避弱项。\n\n产品信息：\n{{steps.translate}}' },
      { id: 'check', name: '合规校验', kind: 'validate', temperature: 0.1, desc: '检查绝对化用语与不可证实的承诺。', prompt: '检查以下文案的广告法合规风险（极限词、疗效暗示、无依据对比），逐条给出替换方案。\n\n{{steps.copy}}\n\n{{steps.faq}}' },
      { id: 'pack', name: '成品打包', kind: 'format', temperature: 0.3, desc: '输出可交付的详情页文案包。', prompt: '整理成详情页文案包：主图文案 3 版、5 屏卖点模块、FAQ、规格表。已应用合规修订。\n\n卖点：{{steps.copy}}\nFAQ：{{steps.faq}}\n合规：{{steps.check}}' },
    ],
  },
  {
    id: 'rcp_brand',
    name: '品牌命名与 Slogan',
    category: '品牌策略',
    summary: '从定位出发，产出命名候选、Slogan 矩阵与品牌故事。',
    outputs: ['命名候选', 'Slogan', '品牌故事'],
    builtin: true,
    updatedAt: Date.now(),
    fields: [
      { key: 'business', label: '业务描述', type: 'textarea', required: true, placeholder: '你做什么，为谁做' },
      { key: 'values', label: '品牌关键词', type: 'tags', placeholder: '可靠、轻盈、敢想…' },
      { key: 'style', label: '命名风格', type: 'select', options: ['中文双字', '中英混合', '生造词', '意象词', '创始人式'], defaultValue: '意象词' },
      { key: 'avoid', label: '需要避开的联想', type: 'text', placeholder: '例：不要医疗感' },
    ],
    steps: [
      { id: 'position', name: '定位提炼', kind: 'plan', temperature: 0.5, desc: '用一句话锁定品牌在用户心里的位置。', prompt: '基于业务描述提炼品牌定位：用户是谁、替代了什么、独特之处。输出一句定位陈述与三个支撑点。\n\n业务：\n{{business}}\n关键词：{{values}}' },
      { id: 'names', name: '命名生成', kind: 'generate', temperature: 1.0, desc: '按指定风格产出命名候选并解释含义。', prompt: '按「{{style}}」风格生成 12 个品牌命名候选，逐个说明含义、联想与潜在风险。避开：{{avoid}}。\n\n定位：\n{{steps.position}}' },
      { id: 'screen', name: '命名筛选', kind: 'validate', temperature: 0.2, desc: '按易读、易记、可注册三维度打分。', prompt: '对以下命名候选按易读性、易记性、可注册性（0-5 分）打分并排序，给出前 3 名推荐理由与需要人工核查的商标风险。\n\n{{steps.names}}' },
      { id: 'slogan', name: 'Slogan 矩阵', kind: 'generate', temperature: 0.9, desc: '为前三名命名各写一组 Slogan。', prompt: '为排名前 3 的命名各写 4 条 Slogan（功能型、情绪型、宣言型、场景型各一），每条不超过 14 字。\n\n{{steps.screen}}' },
      { id: 'pack', name: '成品打包', kind: 'format', temperature: 0.4, desc: '输出品牌基础包。', prompt: '整理成品牌基础包：推荐命名（含理由）、Slogan 矩阵、200 字品牌故事、语气规范三条。\n\n定位：{{steps.position}}\n筛选：{{steps.screen}}\nSlogan：{{steps.slogan}}' },
    ],
  },
  {
    id: 'rcp_repurpose',
    name: '一稿多投改写',
    category: '内容复用',
    summary: '把一份原稿改写成多个平台的适配版本，保持事实一致。',
    outputs: ['各平台版本', '差异说明'],
    builtin: true,
    updatedAt: Date.now(),
    fields: [
      { key: 'source', label: '原始稿件', type: 'textarea', required: true, placeholder: '粘贴已有的文章、通稿或脚本' },
      { key: 'targets', label: '目标平台', type: 'tags', defaultValue: '小红书,微博,公众号,LinkedIn', placeholder: '小红书,微博,公众号…' },
      { key: 'keep', label: '必须保留的信息', type: 'textarea', placeholder: '例：发布时间、价格、免责声明' },
    ],
    steps: [
      { id: 'extract', name: '事实抽取', kind: 'plan', temperature: 0.2, desc: '抽出必须在所有版本中保持一致的事实。', prompt: '从原稿中抽取所有事实性信息（数字、时间、名称、承诺），列成清单。额外必须保留：{{keep}}。\n\n原稿：\n{{source}}' },
      { id: 'profile', name: '平台规则匹配', kind: 'retrieve', temperature: 0.3, desc: '匹配各目标平台的篇幅、语气与格式约定。', prompt: '针对平台 {{targets}}，分别列出：建议篇幅、语气、格式惯例、禁忌。' },
      { id: 'rewrite', name: '多版本改写', kind: 'generate', temperature: 0.8, desc: '为每个平台生成一份适配稿。', prompt: '按各平台规则把原稿改写成对应版本，事实清单中的内容必须逐条保留且不得改写数值。\n\n事实清单：\n{{steps.extract}}\n\n平台规则：\n{{steps.profile}}\n\n原稿：\n{{source}}' },
      { id: 'diff', name: '一致性校验', kind: 'validate', temperature: 0.1, desc: '核对各版本与事实清单是否一致。', prompt: '逐个版本核对事实清单，指出遗漏或被改动的事实；若全部一致，输出「通过」。\n\n清单：{{steps.extract}}\n\n版本：{{steps.rewrite}}' },
      { id: 'pack', name: '成品打包', kind: 'format', temperature: 0.3, desc: '按平台分节输出终稿与差异说明。', prompt: '按平台分节输出终稿（已应用校验意见），并在末尾用一张表说明各版本的差异取舍。\n\n版本：{{steps.rewrite}}\n校验：{{steps.diff}}' },
    ],
  },
]

export const STEP_KIND_META: Record<
  string,
  { label: string; color: string; hint: string }
> = {
  plan:     { label: '拆解', color: 'var(--series-1)', hint: '把需求翻译成可执行的内容策略' },
  retrieve: { label: '调取', color: 'var(--series-3)', hint: '从品牌资产与参考资料中取上下文' },
  generate: { label: '生成', color: 'var(--series-2)', hint: '产出内容主体' },
  refine:   { label: '润色', color: 'var(--series-7)', hint: '压缩冗余、强化表达' },
  validate: { label: '校验', color: 'var(--series-4)', hint: '合规、事实与逻辑自检' },
  format:   { label: '成品', color: 'var(--series-6)', hint: '排版并打包为可交付物' },
}
