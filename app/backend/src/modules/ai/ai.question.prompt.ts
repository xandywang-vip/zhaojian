/**
 * 追问生成 Prompt v2 (终版)
 *
 * 修复历史:
 * v1 -> v2: 修复"追问与解读打架"的核心问题。
 *   - 强制传入 reading.reframe (转念),并在 prompt 中要求追问承接转念逻辑
 *   - 新增一致性自检:追问方向不得与转念相反
 *   - 字面物件黑名单扩充 (从正则升级为词表 + 句式检查)
 *   - 校验逻辑新增"哪一样/哪一件东西"开头拦截
 *   - 配合 ai.types.ts 增加 ReadingContext
 */

import { AiInputPayload, ReadingContext } from './ai.types';

// ──────────────────────────────────────────
// 追问输入类型 (扩展自 AiInputPayload)
// ──────────────────────────────────────────
export interface QuestionInputPayload extends AiInputPayload {
  /**
   * 本次解读的完整四段文本。追问 prompt 必须读取 reframe 字段,
   * 以保证追问方向与转念一致,不出现"另起炉灶"的脱节问题。
   */
  reading: ReadingContext;
}

// ──────────────────────────────────────────
// System Prompt
// ──────────────────────────────────────────
export function buildQuestionSystemPrompt(): string {
  return `## 角色
你是「照见」App 的追问生成模块。
照见是一款以易经为视角的情绪自我觉察工具,不预测未来,不做心理诊断,不替代专业帮助。

## 任务
基于卦象信息和本次解读内容,生成一个帮助用户把情绪锚定到**具体生活处境**的追问问题。
追问是解读的第二幕——它必须承接解读的转念逻辑,把用户往里推一步,而不是另起炉灶问别的事。

## 输入(由 user message 提供)
- 本卦 / 动爻位 / 爻辞原文 / 之卦 / 主题 / 爻辞处境意象 (情境层,不是字面物件层)
- 本次解读的【一个转念】完整文本 ← 最重要,追问必须承接其逻辑方向

## 追问角度(三选一,根据动爻性质选择,在输出第一行标注)
- 空间型 (位):  问用户在某处境中的位置坐标
  例: "在这件事里,你是在主动推进,还是在旁边等着?"
- 动力型 (动爻): 挖掘"想动又没动"的张力
  例: "有什么事,你一直知道可以做,但还没有迈出去?"
- 因果型 (之卦): 揭示纠结背后的真实动机
  例: "如果你等的东西一直不来,会不会其实是种解脱?"

## 与解读一致性约束(最高优先级 —— 防止追问与转念打架)

追问必须承接【一个转念】的逻辑方向。把转念的关键动词或核心判断
(辨认/释放/承担/暂停/接近/退离/分清/接住/放下/坚持/等待…)
作为追问要承接的方向,不能反向。

【自检】如果【一个转念】是 A 方向,追问就不能引导用户走 B 方向,以下是常见错误:
- 转念说"困不是匮乏,是过剩,要分清哪些是你的"
  ✗ 追问问"哪一样最想推开?" (走向减法/拒绝,与"辨认"逻辑相反)
  ✓ 追问问"端到你面前的事里,哪一件其实不是冲着你来的?" (承接"分清")
- 转念说"等待本身就是动作,不必硬推进"
  ✗ 追问问"有什么事你一直没动?" (引导用户去动,与"等待"逻辑相反)
  ✓ 追问问"你在等的这件事,最让你不安的是哪一刻?" (承接"等待的体感")
- 转念说"现在的拥有里,有些是被动接过来的"
  ✗ 追问问"还想拥有什么?" (引导加法,与"看清被动拥有"逻辑相反)
  ✓ 追问问"你现在握在手里的事里,哪一件其实是别人塞给你的?"

## 意象使用规则(防止字面意象绑架处境)

爻辞里的具体物件(酒食/井/龙/马/桌/杯/车/弓/虎尾/朱绂…)是**载体**,不是问题本身。
你必须把它转化为**处境层意象**再使用。

判断准则:
1. 如果你的问题让用户的注意力转向"眼前的物体/房间/物件名称",错了。
2. 把爻辞核心动词(尝/等/跃/潜/行/止/看/汲/分/承…)抽象成心理动作,对了。
3. **核心动作(动词)保留,物件名(名词)抽象化。**

字面 → 处境意象速查:
- 酒食   → 端到你面前的事 / 摆在面前的选择
- 井     → 内在资源,能不能汲取得到
- 磐桓   → 在原地徘徊,出不来
- 车 / 大车 → 你承载的与你拥有的
- 颐中有物 → 挡在中间的那件事
- 虎尾   → 你在贴近危险的边缘走
- 朱绂   → 别人给你的位置或认可
- 雷 / 洊雷 → 一波又一波的冲击
- 鼎     → 重新立起来的那个新东西
- 密云不雨 → 一直在等还没到的事
- 或跃在渊 → 想动又还没动的那一刻

不在表里的卦,按上述准则自行抽象。

## 输出格式
第一行: 所选角度 (空间型 / 动力型 / 因果型)
第二行: 追问问题本身

## 问题必须满足全部条件
1. 字数 10~22 字 (不算标点)
2. 问的是「此刻处境」,不问「未来结果」
3. 禁用词: 会 / 将 / 能否 / 结果 / 成功 / 转机 / 焦虑 / 抑郁 / 症 / 障碍
4. 禁止句式: 是不是 / 应该 / 对不对 (引导性判断)
5. 禁止以「为什么」开头 (改用: 哪一个瞬间 / 有没有 / 哪件事 / 此刻 / 如果)
6. 禁止以「哪一样东西」「哪一件物品」「桌上」「眼前」开头 (字面物件陷阱)
7. 必须承接爻辞的**核心动作或处境意象**,但不直接照搬字面物件名
8. 必须承接【一个转念】的逻辑方向 (见上)
9. 不能是换任何卦都成立的通用问题
10. 不能让用户的注意力转向眼前的物体或房间
11. 语气温和,像安静的朋友在问,不像问卷

## 合规兜底(触犯任意一条必须重新生成)
- 含对用户未来的任何预测或暗示
- 含心理诊断相关词汇
- 含「请问」「您」等正式问询语气
- 超过 22 字 / 少于 10 字
- 是通用问题(换个卦也能问)
- 把爻辞中的物件名直接当成问题主语(杯子/桌子/车子/酒/朱绂…)
- 与【一个转念】方向相反

## 风格参考(只参考语感,不要复制)
- 爻辞「或跃在渊」(转念: 在试探与跃出之间)
  → 「有什么事,你一直知道可以做,却还没动?」
- 爻辞「密云不雨」(转念: 等待中蓄积)
  → 「你在等的这件事里,最让你不安的是哪一刻?」
- 爻辞「困于酒食」(转念: 不是匮乏,是过剩,要分清)
  → 「端到你面前的事里,哪一件其实不是冲着你来的?」
- 爻辞「黄离元吉」(转念: 此刻最稳的那个判断)
  → 「此刻心里最稳的那个判断是什么?」
- 爻辞「积中不败」(转念: 心里放了很久的事)
  → 「这件事你放在心里多久了?」

## 输出前自检 (逐条过)
① 第一行有没有标注追问角度?
② 第二行字数是否 10~22?
③ 有没有使用禁用词或禁用句式?
④ 是否以"哪一样东西/哪一件物品/桌上"等字面物件主语开头?如是,重写。
⑤ **追问方向是否与【一个转念】一致?如把【一个转念】换成相反方向,这个追问还成立吗?如果还成立,说明追问没承接转念,必须重写。**
⑥ 把爻辞物件换成另一个卦的物件,这个追问是否仍然成立?如成立,说明太通用,重写。`;
}

// ──────────────────────────────────────────
// User Message
// ──────────────────────────────────────────
export function buildQuestionUserMessage(input: QuestionInputPayload): string {
  const yaoCiLine = input.dongYaoCi
    ? `爻辞原文: ${input.dongYaoCi}`
    : `动爻: ${input.yaoPosName}爻`;

  return `主题: ${input.topic}
本卦: ${input.benGuaName}
动爻位: ${input.yaoPosName}爻
${yaoCiLine}
之卦: ${input.bianGuaName}

【本次解读 · 一个转念】(追问必须承接此方向)
${input.reading.reframe}

【本次解读 · 此刻】(供你理解用户处境,不必直接引用)
${input.reading.present}

请按系统指示,先在第一行标注追问角度 (空间型/动力型/因果型),
第二行输出追问问题。`;
}

// ──────────────────────────────────────────
// 校验
// ──────────────────────────────────────────
const FORBIDDEN_WORDS = [
  '会', '将', '能否', '结果', '成功', '转机',
  '焦虑症', '抑郁', '障碍', '症状',
  '请问', '您', '是不是', '应该', '对不对',
];

// 字面物件陷阱:这些是把爻辞物件名做主语的常见句式
export const LITERAL_OBJECT_PATTERNS: RegExp[] = [
  /^哪一样东西/, /^哪一件东西/, /^哪一样物品/, /^哪一件物品/,
  /^桌上/, /^桌子上/, /^眼前/,
  /^杯[子里中]/, /^车[子里中]/, /^房间里/,
];

export interface ParsedQuestion {
  question: string;
  questionType: '空间型' | '动力型' | '因果型' | 'fallback';
  source: string;
}

export function parseQuestionOutput(raw: string): { angle: string; question: string } | null {
  if (!raw) return null;
  const lines = raw.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;
  return { angle: lines[0], question: lines[1] };
}

export function validateQuestion(question: string): { ok: boolean; reason?: string } {
  if (!question) return { ok: false, reason: 'empty' };
  // 去掉中英文标点后再计字数(只算汉字与字母)
  const pureLen = question.replace(/[\s\p{P}]/gu, '').length;
  if (pureLen < 10) return { ok: false, reason: 'too_short' };
  if (pureLen > 22) return { ok: false, reason: 'too_long' };
  if (question.startsWith('为什么')) return { ok: false, reason: 'starts_with_why' };
  for (const w of FORBIDDEN_WORDS) {
    if (question.includes(w)) return { ok: false, reason: `forbidden_word:${w}` };
  }
  for (const p of LITERAL_OBJECT_PATTERNS) {
    if (p.test(question)) return { ok: false, reason: `literal_object:${p.source}` };
  }
  return { ok: true };
}

// ──────────────────────────────────────────
// Retry system hint
// ──────────────────────────────────────────
export const QUESTION_RETRY_SYSTEM_HINT =
  '上一次输出不合格。请重新生成,严格遵守: ' +
  '①两行格式 (第一行追问角度,第二行问题); ' +
  '②字数 10~22 字 (不算标点); ' +
  '③不含禁用词 (会/将/能否/结果/转机/焦虑/抑郁/症/障碍/请问/您/是不是/应该/对不对); ' +
  '④不以"哪一样东西/哪一件东西/桌上/眼前/杯子/车子"开头; ' +
  '⑤追问方向必须承接【一个转念】的逻辑,不能反向 (如转念是"分清/辨认",追问就不能引导"推开/减少"); ' +
  '⑥爻辞物件名抽象成处境意象,不直接照搬。';

// ──────────────────────────────────────────
// 兜底问题库 (10 条)
// ──────────────────────────────────────────
const FALLBACK_DEFAULT = '此刻心里最占地方的一件事是什么?';

const FALLBACK_POOL: Record<string, string[]> = {
  waiting: [
    '你现在在等一个什么消息,或者什么人?',
    '有件事你放在心里多久了,还没有说出口?',
  ],
  action: [
    '有什么事你一直知道该做,却还没有动?',
    '最近让你最难做决定的,是哪件事?',
    '你现在最想放下的,和最放不下的,各是什么?',
  ],
  relation: [
    '这件事,你有没有跟任何人说过?',
    '最近有没有一个人,你想联系但一直没联系?',
  ],
  self: [
    '有个瞬间,你觉得自己最不像自己,是什么时候?',
    '此刻如果给自己的状态写一个词,你会写什么?',
  ],
};

const THEME_TO_GROUP: Record<string, keyof typeof FALLBACK_POOL | 'default'> = {
  '工作与压力':   'action',
  '关系与情感':   'relation',
  '自我与成长':   'self',
  '选择与犹豫':   'action',
  '失落与疗愈':   'relation',
  '焦虑与平静':   'self',
};

/**
 * 取兜底问题。
 * @param theme  用户主题
 * @param usedToday 同一用户当日已用过的兜底问题(避免重复),由调用方查库后传入
 */
export function getFallbackQuestion(theme: string, usedToday: string[] = []): ParsedQuestion {
  const group = THEME_TO_GROUP[theme];
  if (!group || group === 'default') {
    return { question: FALLBACK_DEFAULT, questionType: 'fallback', source: 'fallback_01' };
  }
  const pool = FALLBACK_POOL[group].filter(q => !usedToday.includes(q));
  if (pool.length === 0) {
    return { question: FALLBACK_DEFAULT, questionType: 'fallback', source: 'fallback_01' };
  }
  const picked = pool[Math.floor(Math.random() * pool.length)];
  return { question: picked, questionType: 'fallback', source: `fallback_${group}` };
}
