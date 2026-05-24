/**
 * 追问模块（parser / validator / fallback）单元测试
 * 对应 ClaudeCode 追问模块 spec 第八节验证用例。
 */
import assert from 'node:assert/strict';
import {
  validateQuestion,
  parseQuestionOutput,
} from '../src/modules/ai/question.validator';
import {
  pickFallbackQuestion,
  FALLBACK_LIBRARY,
} from '../src/modules/ai/question.fallback';
import { CRISIS_WORDS, checkCrisisKeywords } from '../src/common/crisis-words';

const tests: { name: string; fn: () => void }[] = [];
const test = (name: string, fn: () => void) => tests.push({ name, fn });

// ---------- parser ----------
test('parseQuestionOutput：标准两行（角度+问题）', () => {
  const r = parseQuestionOutput('动力型\n有什么事，你一直知道可以做，却还没动？');
  assert.equal(r.type, 'dynamic');
  assert.equal(r.question, '有什么事，你一直知道可以做，却还没动？');
});

test('parseQuestionOutput：三种角度都能识别', () => {
  assert.equal(parseQuestionOutput('空间型\n你站在哪一边？').type, 'spatial');
  assert.equal(parseQuestionOutput('动力型\n你想动哪一步？').type, 'dynamic');
  assert.equal(parseQuestionOutput('因果型\n你在等什么？').type, 'causal');
});

test('parseQuestionOutput：带"角度："前缀也能解析', () => {
  const r = parseQuestionOutput('角度：因果型\n问题：你在等什么消息？');
  assert.equal(r.type, 'causal');
  assert.equal(r.question, '你在等什么消息？');
});

test('parseQuestionOutput：只有一行（旧格式兼容）', () => {
  const r = parseQuestionOutput('你在等一个什么结果？');
  assert.equal(r.type, null);
  assert.equal(r.question, '你在等一个什么结果？');
});

test('parseQuestionOutput：第一行不是合法角度时，取含问号的那行', () => {
  const r = parseQuestionOutput('一些铺垫文字\n你在等一个什么消息？');
  assert.equal(r.type, null);
  assert.equal(r.question, '你在等一个什么消息？');
});

// ---------- validator ----------
test('validateQuestion：合法问题通过', () => {
  const r = validateQuestion('你在等一个什么消息？');
  assert.equal(r.ok, true);
});

test('validateQuestion：超过 20 字应拒绝', () => {
  const long = '在这件事里，你究竟是在主动推进还是在旁边等着观望？';
  const r = validateQuestion(long);
  assert.equal(r.ok, false);
});

test('validateQuestion：含禁词"成功"应拒绝', () => {
  const r = validateQuestion('这件事会成功吗？');
  assert.equal(r.ok, false);
});

test('validateQuestion：以"为什么"开头应拒绝', () => {
  const r = validateQuestion('为什么你还在等？');
  assert.equal(r.ok, false);
});

test('validateQuestion：非疑问句应拒绝', () => {
  const r = validateQuestion('你应当好好休息。');
  assert.equal(r.ok, false);
});

// ---------- fallback ----------
test('pickFallbackQuestion：六个主题都能返回非空问题', () => {
  for (const topic of [
    '工作与压力',
    '关系与情感',
    '自我与成长',
    '选择与犹豫',
    '失落与疗愈',
    '焦虑与平静',
  ]) {
    const r = pickFallbackQuestion(topic);
    assert.ok(r.question.text.length > 0, `主题 ${topic} 返回了空问题`);
    assert.equal(r.type, 'fallback');
  }
});

test('pickFallbackQuestion：未知主题回到 01 号', () => {
  const r = pickFallbackQuestion('未定义主题');
  assert.equal(r.question.id, '01');
});

test('FALLBACK_LIBRARY：共 10 条，编号唯一', () => {
  const all = [
    FALLBACK_LIBRARY.default,
    ...FALLBACK_LIBRARY.waiting,
    ...FALLBACK_LIBRARY.action,
    ...FALLBACK_LIBRARY.relation,
    ...FALLBACK_LIBRARY.self,
  ];
  assert.equal(all.length, 10);
  const ids = new Set(all.map((q) => q.id));
  assert.equal(ids.size, 10);
});

// ---------- crisis ----------
test('checkCrisisKeywords：spec 八个核心词全部命中', () => {
  for (const w of ['不想活', '去死', '自杀', '活不下去', '没意义', '结束一切', '不想继续了']) {
    assert.equal(checkCrisisKeywords(`我现在${w}`), true, `${w} 未命中`);
  }
});

test('checkCrisisKeywords：中性表达不命中', () => {
  assert.equal(checkCrisisKeywords('今天有点累，想休息一下'), false);
  assert.equal(checkCrisisKeywords('感觉工作没什么进展'), false);
});

test('CRISIS_WORDS：包含 spec 第六节全部八个核心词', () => {
  const specCore = ['不想活', '去死', '自杀', '活不下去', '没意义', '结束一切', '不想继续了'];
  for (const w of specCore) {
    assert.ok(CRISIS_WORDS.includes(w), `缺少 spec 核心词 ${w}`);
  }
});

(async () => {
  let pass = 0;
  let fail = 0;
  for (const t of tests) {
    try {
      t.fn();
      console.log(`  ✓ ${t.name}`);
      pass++;
    } catch (err) {
      console.error(`  ✗ ${t.name}`);
      console.error(err instanceof Error ? err.stack : err);
      fail++;
    }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})();
