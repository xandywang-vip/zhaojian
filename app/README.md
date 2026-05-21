# 「易见」MVP（M1–M3）

> 微信公众号 H5 / PC 自适应 · Vue 3 + NestJS · 基于 PRD《易见-产品策划方案.md》第 4–7、11、12 节实现。

本仓库覆盖 PRD 中 **M1（起卦引擎）→ M2（前端骨架）→ M3（AI 解卦 + 禁词过滤 + 兜底）** 三个里程碑，可在本地完整走通：
首页 → 提问 → 起卦（时间/三数）→ 卦象结果（免费预览 + 付费墙 + 开发模式解锁完整解读）。

M4（微信授权、JSAPI / Native 支付、会员体系）与 M5（后台、上线）需要真实资质，
**未在此阶段实现**，但接口/数据模型/合规边界都已为它们留好位置（见 §「下一步：M4 / M5」）。

---

## 目录结构

```
app/
├── backend/                  # NestJS + TypeScript
│   ├── src/
│   │   ├── engine/           # 起卦引擎：八卦、64 卦索引、本卦/变卦/互卦、时间起卦、三数起卦
│   │   ├── modules/
│   │   │   ├── divination/   # /api/divination/* 控制器与服务
│   │   │   └── ai/           # AI 解卦：System Prompt、JSON Schema、禁词、兜底
│   │   ├── common/           # 禁词表 + 内存 Store
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── data/gua-data.json    # 64 卦数据（卦辞/爻辞古籍原文 + 中性意象 + 关键词）
│   ├── test/                 # 引擎与 AI 解析的单元测试
│   └── .env.example          # 所有凭证走环境变量
├── frontend/                 # Vue 3 + Vite + Pinia + Vue Router
│   └── src/
│       ├── views/            # HomeView / AskView / CastView / ResultView / HistoryView
│       ├── components/       # DisclaimerDialog / GuaFigure
│       ├── stores/           # session.ts（提问草稿）
│       ├── api/              # 前端 API 客户端
│       ├── router/
│       └── styles/global.css # 新中式 / 莫兰迪低饱和主题
└── .claude/launch.json
```

---

## 快速启动

需要 Node ≥ 18。两端各自独立安装：

```bash
# 1. 后端
cd backend
cp .env.example .env       # 配置 LLM_API_BASE / LLM_API_KEY，其它项 M4 用
npm install
npm test                   # 跑起卦引擎单元测试（10 例）
npm run test:ai            # 跑 AI 解析 / 禁词 单元测试（7 例）
npm run start:dev          # 启动后端，监听 http://localhost:3001

# 2. 前端（新开一个终端）
cd frontend
npm install
npm run dev                # 启动前端，监听 http://localhost:5173
# Vite 已配置 /api → http://localhost:3001 反向代理
```

打开 <http://localhost:5173/> 即可走完：首页 → 提问 → 起卦 → 结果。

> 未配置 LLM key 时，AI 解卦会**自动走兜底解读**（PRD 6.4），前端依然正常运行。
> 这是设计行为，方便在没有大模型 key 的环境下做 UI 演示与回归。

---

## 后端 API（PRD §12）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/divination/cast` | 起卦，body 见下；返回包含本卦/变卦/互卦 + 免费预览（或完整解读） |
| GET  | `/api/divination/:id` | 取卦例；加 `?unlock=demo` 可在 M4 支付未接通前模拟解锁，仅本地用 |
| GET  | `/api/divination/history` | 历史列表（按时间倒序） |
| POST | `/api/divination/:id/unlock` | 标记卦例为已解锁（M4 阶段由支付回调调用，开发期可手动调用） |

`POST /api/divination/cast` body：

```jsonc
{
  "question": "要不要接这个 offer",
  "topic": "事业",          // 事业 / 感情 / 选择 / 人际 / 其他
  "mood":  "迷茫",          // 可选
  "method": "number",       // "time" | "number"
  "numbers": [15, 8, 23]    // method=number 必填；method=time 用 datetime（可选）
}
```

输出（节选）：

```jsonc
{
  "id": "uuid",
  "dongYao": 4,
  "benGua":  { "name": "山地剥", "yao": [0,0,0,0,0,1], "imageText": "...", "keywords": [...] },
  "bianGua": { "name": "火地晋", ... },
  "huGua":   { "name": "坤为地", ... },
  "reading": {
    "imagery": "...",
    "hints":   ["...仅第 1 条 / 完整 3–4 条 取决于是否已解锁..."],
    "reflections": ["...付费后展开..."],
    "direction":   "...",
    "bianHint":    "...",
    "locked":      true
  }
}
```

---

## 起卦引擎（PRD §4）

`backend/src/engine/`，纯函数 + 数据，不依赖 Nest。可单独引用。

- `trigrams.ts` — 八卦先天数与爻象。
- `hexagram-lookup.ts` — 64 卦 (upper, lower) → 卦名/id 表。
- `hexagram-build.ts` — 由爻象组装六爻、计算变卦、计算互卦。
- `hexagram-data.ts` — 从 `data/gua-data.json` 加载卦辞/爻辞/意象/关键词。
- `casting.ts` — 三数起卦 / 时间起卦（基于 `lunar-javascript` 转农历地支） + 统一卦象对象。

PRD §4.2 示例验证：
```
a=15, b=8, c=23
→ 上卦 15%8=7 (艮)
→ 下卦  8%8=0→8 (坤)
→ 动爻 (15+8+23)%6=46%6=4
→ 本卦 山地剥 / 变卦 火地晋 / 互卦 坤为地
```

引擎 10 例单元测试全部覆盖，含边界、64 卦穷举、PRD 示例。

---

## AI 解卦模块（PRD §6 + AI Prompt 文档）

`backend/src/modules/ai/`：

- `ai.prompt.ts` — System Prompt（完整版，含合规红线、措辞要求、卦象使用说明、输出 Schema 与自检步骤）+ User Message 模板。
  TONE / DEPTH 走环境变量（`LLM_TONE` / `LLM_DEPTH`），不需要发版即可调风格。
- `ai.client.ts` — OpenAI 协议兼容客户端（DeepSeek / 通义 / 智谱 / 豆包 任一可切换，
  默认 DeepSeek `/v1/chat/completions`，启用 `response_format: json_object`）。
- `ai.schema.ts` — JSON Schema（Ajv）+ 兜底解读常量。
- `ai.service.ts` — 完整流程：调模型 → 剥 ```json``` 包裹 → 解析 → Schema 校验 → 禁词扫描 →
  失败重试一次（追加 system 提示）→ 仍失败走兜底解读并记录日志。
- `../common/forbidden-words.ts` — 全站禁词表（24 词，覆盖 PRD 11.3 与 Prompt 红线 2）。

调试旋钮：
```
LLM_TONE=温和平实，像一位冷静的朋友   # 可改为"更感性细腻"/"更理性克制"
LLM_DEPTH=适中，每条提示 1 到 2 句     # 可改为"简洁"/"详细"
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=900
LLM_TIMEOUT_MS=20000
```

---

## 合规要点（PRD §11，已落地）

- ✅ 全站不出现"算命/占卜/预测/转运"等词，提问/起卦/结果页用"提示/参考/可能/思路"。
- ✅ 首次进入弹窗免责声明（localStorage 记录），结果页与首页底部常驻免责文案。
- ✅ AI 解读必须通过 Schema + 禁词双重校验；失败重试 1 次；仍失败用中性兜底模板。
- ✅ AI 输出落库后再发给前端，付费状态决定展开范围（未付费仅 `imagery` + `hints[0]`）。
- ⏳ M4 阶段："已成年"确认、商户经营类目"文化娱乐/软件服务"、支付回调验签 + 幂等。

---

## 数据模型（PRD §8）

M1–M3 用内存 Store（`common/store.ts`），重启即清空——足够 MVP 流程验证。

上生产前请将其替换为 MySQL/PostgreSQL，schema 直接照 PRD §8 的 SQL 建表即可：
`users` / `divinations` / `orders`。`Store` 类与控制器的接口已隔离，替换只需重写一个 Provider。

---

## 下一步：M4 / M5

接入真实资质后开发。Claude Code 不会注册任何账号；凭证全部走环境变量（`.env.example` 已列出占位项）。

| 阶段 | 待补 |
|---|---|
| M4 登录 | 微信网页授权 `snsapi_base` 取 openid；PC 手机号 + 短信验证码登录；JWT/Session。 |
| M4 支付 | 微信支付 JSAPI（微信内）+ Native 扫码（PC）；`notify_url` 验签 + 幂等发权益。 |
| M4 会员 | `users.member_type/member_expire_at/remaining_credits` + `orders` 表；单次/5 次卡/包月。 |
| M5 后台 | 只读看板：用户/卦例/订单/AI 失败率/命中禁词的记录。 |
| M5 上线 | 国内云 + 已备案域名 + HTTPS；商户号经营类目按"文化娱乐/软件服务"申请。 |

---

## 验证

```
cd backend
npm test       # 引擎：10 passed
npm run test:ai # AI/禁词：7 passed
```

并在浏览器走通了完整链路（首页 → 提问 → 报数起卦 a=7,b=3,c=15 → 山火贲 / 动爻 1 →
付费墙 → 开发模式解锁 → 反思 / 方向 / 变卦互卦小卡）。
