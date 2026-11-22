# ChatGPT Codex 订阅额度折算为 API 费用的完整调查报告

> 调查与资料核对日期：2026-07-16（Asia/Shanghai）  
> 研究对象：ChatGPT 基础 1×（官方当前称 Plus）、Pro 5×、Pro 20× 中的 Codex 本地消息额度  
> 计价口径：同模型、Standard 服务等级下的 OpenAI API token 费用，单位均为美元  
> 结论性质：OpenAI 没有公开订阅额度的绝对 credits 数，因此本文给出的是有证据约束的估算，不是官方承诺

[TOC]

---

## 一、结论摘要

在排除 Fast mode、图片生成、GPT-5.3-Codex-Spark 独立额度和明显的计量故障样本后，最合理的中心估计如下。

| 套餐 | 单个 5h 窗口的 Standard API 等值 | Weekly limit 的 Standard API 等值 | 建议采用的保守范围 |
|---|---:|---:|---:|
| 基础 1× / Plus | **约 $20** | **约 $125** | 5h：$15–25；weekly：$100–150 |
| Pro 5× | **约 $100** | **约 $625** | 5h：$75–125；weekly：$500–750 |
| Pro 20× | **约 $400** | **约 $2,500** | 5h：$300–500；weekly：$2,000–3,000 |

粗略按 `1 美元 ≈ 7.2 元人民币` 换算，中心值约为：

| 套餐 | 5h | Weekly |
|---|---:|---:|
| 基础 1× / Plus | ¥145 | ¥900 |
| Pro 5× | ¥720 | ¥4,500 |
| Pro 20× | ¥2,880 | ¥18,000 |

一句话概括：

> **5h 额度约等于 $20 / $100 / $400 的 Standard API 调用；weekly 额度约等于 $125 / $625 / $2,500。部分账户正在出现 weekly-only，但现有证据只说明 5h 短窗口被移除，没有说明 weekly 总量同步增加。**

### 结论置信度

| 结论 | 置信度 | 原因 |
|---|---|---|
| ChatGPT credits 与 Standard API 美元成本基本一一对应 | 高 | 官方 credits rate card 与 API price card 逐项完全吻合，另有官方 `2,500 credits = $100` 交叉验证 |
| 基础 1× 的 5h 约 $20 | 中高 | 由官方 GPT-5.6 消息范围和官方每消息 credits 范围直接夹出约 $18–24 |
| Pro 5× / 20× 的 5h 约 $100 / $400 | 中高 | 官方明确为 Plus 的 5×/20×，且公开的 5h/weekly 比例提供独立验证 |
| Pro 20× weekly 约 $2,500 | 中高 | 有一份包含缓存输入、未缓存输入、输出和 reasoning 的完整公开遥测，可按 API 价格重算 |
| Plus / Pro 5× weekly 约 $125 / $625 | 中 | 从 Pro 20× 实测按官方 20×/5×关系缩放；OpenAI 没公开各档 weekly 的绝对 denominator |
| 5h 已永久、全量取消 | 低 | 后端样本证明部分账户已变成 weekly-only，但官方文档仍写 5h，且公开报告称其为临时移除 |

---

## 二、问题定义与套餐命名

用户问题中的“pro/5x/20x”容易和 OpenAI 当前命名混淆。本文采用官方当前文档中的三档：

1. **Plus / 基础 1×**：Codex 的基准订阅额度；
2. **Pro 5×**：相对于 Plus 有 5 倍 Codex 使用量；
3. **Pro 20×**：相对于 Plus 有 20 倍 Codex 使用量。

OpenAI 的 [Codex pricing 页面](https://learn.chatgpt.com/docs/pricing)把 Pro 描述为“从 $100/月起”，并允许选择 5× 或 20× 的 Codex rate limits。公开客户端遥测和 issue 中常见的内部映射是：

- `plus`：基础 1×；
- `prolite`：Pro 5×；
- `pro`：Pro 20×。

这些内部字符串不是稳定的公开产品合同，只用于理解后文的公开遥测。例如 [issue #29243](https://github.com/openai/codex/issues/29243)记录了 `prolite` entitlement 被错误映射成 `plus` rate limit 的故障。

### “API 等值”的含义

本文所说的“等值 $X API 调用”是指：

> 如果使用 API key，以相同模型、相同未缓存输入 token、缓存输入 token、输出及 reasoning token 构成完成同样的推理工作，按 Standard API 单价大约会支付多少钱。

它不是：

- 可以提现或转入 API 账户的余额；
- OpenAI 保证每个订阅用户都能稳定消耗完的现金价值；
- 对云虚拟机、Web Search、容器、图片生成等附加成本的完整估价；
- 对 Fast/Priority 服务等级的直接估价。

---

## 三、证据分级与研究方法

为了避免把宣传文案、用户感觉和后端计量混在一起，本文把证据分成四级。

### A 级：OpenAI 官方定价和产品文档

用于确定：

- 套餐倍率；
- 5h 消息范围；
- credits 对 token 的 rate card；
- API 对 token 的 price card；
- Fast mode、图片生成等倍率；
- 官方是否仍声称存在 5h 窗口。

### B 级：可复算的公开遥测

必须同时具备：

- 明确的模型和套餐；
- 额度百分比；
- 未缓存输入、缓存输入、输出、reasoning 等 token 分类；
- 时间点和窗口信息；
- 能排除或切掉 entitlement 变化、重置和明显异常的区间。

这类证据可用于定量反推 denominator。

### C 级：只有部分数字的公开实测

例如只给出“520M tokens 用掉 67% weekly”，但没有缓存/输出构成。由于 1M 缓存输入和 1M 输出的 API 价格可能相差几十倍，这类数据只能作为一致性检查，不能单独决定美元等值。

### D 级：主观体验或发生在已知故障期的样本

例如“以前能用一天，现在两条消息就没了”。这类记录能证明计量系统发生过异常，却不能代表套餐设计容量。

本文的核心结论只依赖 A 级和 B 级证据；C/D 级只用于验证、反驳或解释误差。

---

## 四、官方已知事实

### 4.1 官方当前仍公布 5h 消息范围

OpenAI 的 [What are the usage limits for my plan?](https://learn.chatgpt.com/docs/pricing#what-are-the-usage-limits-for-my-plan)说明，消息消耗受模型、任务规模、上下文、reasoning、工具、检索和缓存影响；相似任务也可能消耗不同额度。当前本地消息表为：

| 模型 | Plus / 1× 每 5h | Pro 5× 每 5h | Pro 20× 每 5h |
|---|---:|---:|---:|
| GPT-5.6 Sol | 15–90 | 75–450 | 300–1,800 |
| GPT-5.6 Terra | 20–110 | 100–550 | 400–2,200 |
| GPT-5.6 Luna | 50–280 | 250–1,400 | 1,000–5,600 |
| GPT-5.5 | 15–80 | 75–400 | 300–1,600 |
| GPT-5.4 | 20–100 | 100–500 | 400–2,000 |
| GPT-5.4 mini | 60–350 | 300–1,750 | 1,200–7,000 |

表格脚注明确写着：本地消息和云任务共享一个 **five-hour window**，并且可能另有 weekly limits。

这里最重要的两个事实是：

1. 官方没有给固定“请求数”，给的是受任务复杂度影响的范围；
2. 5× 和 20× 在每一行都是精确倍率，不是模糊营销语。

### 4.2 官方 credits rate card

同一 [Codex pricing 页面 credits 部分](https://learn.chatgpt.com/docs/pricing#credits-overview)给出了每百万 token 消耗的 ChatGPT credits：

| 模型 | 输入 credits / 1M | 缓存输入 credits / 1M | 输出 credits / 1M |
|---|---:|---:|---:|
| GPT-5.6 Sol | 125 | 12.5 | 750 |
| GPT-5.6 Terra | 62.5 | 6.25 | 375 |
| GPT-5.6 Luna | 25 | 2.5 | 150 |
| GPT-5.5 | 125 | 12.5 | 750 |
| GPT-5.4 | 62.5 | 6.25 | 375 |
| GPT-5.4 mini | 18.75 | 1.875 | 113（官方显示值经过取整） |

页面同时说明：GPT-5.6 平均每条消息约消耗 **5–40 credits**。

### 4.3 官方 API price card

OpenAI 的 [API Pricing](https://platform.openai.com/docs/pricing)给出的 Standard 单价为：

| 模型 | 输入 $ / 1M | 缓存输入 $ / 1M | 输出 $ / 1M |
|---|---:|---:|---:|
| GPT-5.6 Sol | 5.00 | 0.50 | 30.00 |
| GPT-5.6 Terra | 2.50 | 0.25 | 15.00 |
| GPT-5.6 Luna | 1.00 | 0.10 | 6.00 |
| GPT-5.5 | 5.00 | 0.50 | 30.00 |
| GPT-5.4 | 2.50 | 0.25 | 15.00 |
| GPT-5.4 mini | 0.75 | 0.075 | 4.50 |

### 4.4 一 credit 等于多少 API 美元

OpenAI 的 [Codex for Students](https://developers.openai.com/community/students)页面明确写过：`2,500 credits` 等价于 `$100`。因此：

```text
$100 / 2,500 credits = $0.04 / credit
```

这个换算还能被两张官方 rate card 独立验证。以 GPT-5.6 Sol 为例：

```text
输入：     125 credits × $0.04 = $5.00
缓存输入：12.5 credits × $0.04 = $0.50
输出：     750 credits × $0.04 = $30.00
```

结果与 Standard API 定价逐项完全相同。Terra、Luna、GPT-5.5、GPT-5.4 也全部匹配；GPT-5.4 mini 输出项的两分钱差异来自官方 credits 表把 `112.5` 显示为 `113`。

所以，Standard 模式下可采用：

```text
API 美元等值 ≈ Codex credits × $0.04
```

这是整份推导最关键的桥梁。它避免了“用订阅月费猜价值”这种没有依据的方法。

---

## 五、问题一：单个 5h limit 等同多少 API 费用

OpenAI 没公开 5h 桶的绝对 credits，但官方同时公开了：

- GPT-5.6 Sol 在 Plus 下每 5h 约 15–90 条消息；
- GPT-5.6 平均每条消息约 5–40 credits；
- 1 credit ≈ $0.04 Standard API 成本。

消息数范围和每消息 credits 范围都由任务轻重造成，因此不能把两个范围同方向相乘。合理的端点配对应该是：

- 轻任务：单条 credits 较少，所以能发接近 90 条；
- 重任务：单条 credits 较多，所以只能发接近 15 条。

### 5.1 Plus / 基础 1×

轻任务端：

```text
90 messages × 5 credits/message
= 450 credits
= $18
```

重任务端：

```text
15 messages × 40 credits/message
= 600 credits
= $24
```

因此官方数据直接夹出的基础 1× 5h 桶约为：

```text
$18–24，取一位有效数字约 $20
```

这不是说每条消息固定花 5 或 40 credits，而是用两个官方范围的反相关端点估算共同的额度池。

### 5.2 Pro 5× 与 Pro 20×

官方表格中的消息数为精确 5×/20×，所以同步缩放：

| 套餐 | 由官方端点得到的窄范围 | 建议记忆的中心值 | 考虑产品波动后的保守范围 |
|---|---:|---:|---:|
| Plus / 1× | $18–24 | **$20** | $15–25 |
| Pro 5× | $90–120 | **$100** | $75–125 |
| Pro 20× | $360–480 | **$400** | $300–500 |

### 5.3 为什么没有用“订阅费 × 某个倍率”

订阅费包含 ChatGPT 的其他能力，且订阅服务采用统计复用，不可能从月费直接反推出一个 5h 桶。本文的 $20/$100/$400 来自：

```text
官方消息范围
× 官方 credits/message 范围
× 官方 $0.04/credit 换算
```

与订阅档位价格接近只是结果，不是推导前提。

---

## 六、问题二：整个 weekly limit 等同多少 API 费用

Weekly 是难点：官方只说“additional weekly limits may apply”，没有公布消息数或 credits 总量。要估算 weekly，必须找到一个带 token 构成和 weekly 百分比的公开样本。

### 6.1 采用的核心遥测：OpenAI Codex issue #21216

[Issue #21216](https://github.com/openai/codex/issues/21216)的环境为：

- 套餐：Pro；公开上下文说明原本是 Pro 20×；
- 模型：GPT-5.5 xhigh；
- 客户端：Codex CLI 0.128.0；
- weekly 窗口：10,080 分钟；
- 日志字段包含 input、cached input、output、reasoning 和 weekly used percent。

这个 issue 后半段发生了 `plan_type: pro → prolite` 的 entitlement 切换，weekly meter 从 9% 突跳到 27%。这段显然不能用于推导。本文只截取切换前、`plan_type=pro`、weekly meter 仍为 9% 的数据。

该用户在 [详细评论](https://github.com/openai/codex/issues/21216#issuecomment-4381210275)中逐小时列出了 token 分类。把周重置后到 16:44:41、套餐仍为 `pro` 的所有行相加，得到：

| 类别 | Token 数 |
|---|---:|
| 未缓存输入 | 10,104,831 |
| 缓存输入 | 285,850,752 |
| 可见输出 + reasoning | 1,078,626 |
| 合计 | 297,034,209 |
| 当时 weekly used | 9% |

为什么将 reasoning 与输出一起按输出价计费：OpenAI Responses usage 中 reasoning token 属于生成侧消耗；该公开表的 `total` 也正好等于 input + visible output + reasoning，不能把 reasoning 免费丢掉。

### 6.2 将 token 遥测重算为 API 美元

GPT-5.5 Standard API 单价为：

```text
未缓存输入：$5 / 1M
缓存输入：  $0.50 / 1M
输出：      $30 / 1M
```

代入：

```text
未缓存输入 = 10.104831M × $5    = $50.524155
缓存输入   = 285.850752M × $0.5 = $142.925376
输出+推理  = 1.078626M × $30    = $32.358780

合计 = $225.808311
```

这 $225.81 对应约 9% weekly：

```text
$225.808311 / 0.09 = $2,508.98
```

所以该 Pro 20× 周桶的中心估计为：

```text
约 $2,500 Standard API 费用
```

### 6.3 百分比取整与合理区间

客户端只显示整数百分比，9% 可能代表约 8.5%–9.5%，还可能存在刷新延迟。仅考虑四舍五入：

```text
$225.81 / 9.5% ≈ $2,377
$225.81 / 8.5% ≈ $2,656
```

再考虑隐藏初始化、meter 延迟、并行线程归属和日志可能没有覆盖的调用，采用更宽的：

```text
Pro 20× weekly ≈ $2,000–3,000
```

是比伪精确的 `$2,508.98` 更诚实的表达。

### 6.4 缩放到 1× 与 5×

OpenAI 对 Pro 的公开描述是相对于 Plus 有 5× 或 20× 的 Codex usage。以 Pro 20× 的中心值反推：

```text
基础 1×：$2,500 / 20 = $125
Pro 5×：$125 × 5 = $625
Pro 20×：$125 × 20 = $2,500
```

结果：

| 套餐 | Weekly 中心估计 | 保守范围 |
|---|---:|---:|
| Plus / 1× | **$125** | $100–150 |
| Pro 5× | **$625** | $500–750 |
| Pro 20× | **$2,500** | $2,000–3,000 |

这里的主要假设是：官方 5×/20×“Codex usage”同样适用于 weekly denominator，而不是只适用于 5h。官方没有公布绝对 denominator，因此这一步置信度低于 Pro 20× 原始实测，但它是当前最自然、与公开产品描述最一致的解释。

### 6.5 用 5h/weekly 比例做独立一致性检查

中心估计隐含：

```text
$125 weekly / $20 per 5h = 6.25
```

即一整个 weekly 桶约等于 6.25 个完整 5h 桶。

公开数据中有两个相近的比例：

1. [Issue #32392](https://github.com/openai/codex/issues/32392)记录 Pro 20× 用完 100% 5h 时，weekly 增加约 15%，对应 weekly/5h ≈ 6.67；
2. [Issue #28879 的一条详细评论](https://github.com/openai/codex/issues/28879#issuecomment-4761813647)记录 Business/Plus 级账户用完 5h 时，weekly 增加约 16%，对应 weekly/5h ≈ 6.25。

第二份样本位于计量异常讨论中，所以本文不采用它报告的绝对 $9.5/$13 作为正常 5h 桶大小；但两个独立账户都观察到 15%–16% 的跨窗口比例，与本文从完全不同路径得到的 6.25 倍非常接近。

窗口起点不同、整数取整和异步刷新会让单次比例波动，所以不能要求每次恰好为 16%。它的价值在于验证数量级，而不是证明一个精确常数。

---

## 七、“最近在取消 5h 限制”究竟意味着什么

### 7.1 强证据：部分账户后端确实移除了 300 分钟桶

[Issue #32707](https://github.com/openai/codex/issues/32707)提供了同一 Pro 账户、同一运行任务前后的 `account/rateLimits/read` 数据。

变化前：

```json
{
  "primary": {
    "usedPercent": 74,
    "windowDurationMins": 300
  },
  "secondary": {
    "usedPercent": 16,
    "windowDurationMins": 10080
  }
}
```

变化后：

```json
{
  "primary": {
    "usedPercent": 16,
    "windowDurationMins": 10080
  },
  "secondary": null
}
```

这比“UI 没显示”更强：不仅界面隐藏了 5h，后端返回结构本身也从 `300 + 10080` 变成只剩 `10080` 分钟。

类似现象还出现在：

- [Issue #32791](https://github.com/openai/codex/issues/32791)：Plus 账户只显示 weekly，任务直接扣 weekly；
- [Issue #32840](https://github.com/openai/codex/issues/32840)：Plus 账户的 CLI `/status` 和 Usage 页面都不再显示 5h；
- 两个报告都发生在 2026-07-13 前后，说明它不像单一客户端渲染 bug。

### 7.2 反证：官方当前文档仍写 5h

截至本报告核对日期，OpenAI 的 [Codex pricing 官方文档](https://learn.chatgpt.com/docs/pricing#what-are-the-usage-limits-for-my-plan)仍然：

- 用 `/ 5h` 列出全部本地消息范围；
- 明确说本地消息和云任务共享 five-hour window；
- 只把 weekly 描述为额外限制。

所以不能把部分账户的后端变化直接上升为“全量、永久取消 5h”的官方政策。

### 7.3 临时活动或渐进 rollout 的迹象

[Issue #33017](https://github.com/openai/codex/issues/33017)把当时的现象描述为 “5-hour usage limit was temporarily removed”，并把它与 Build Week、700 万活跃用户和 banked reset 活动联系起来。这是用户报告，不是 OpenAI 正式公告，但至少说明当时用户接收到的是“临时移除”的产品语境。

综合证据，最稳妥的表述是：

> **OpenAI 正在对部分账户临时或分阶段切换 weekly-only；截至 2026-07-16，尚没有足够官方证据证明所有 Plus、Pro 账户都将永久取消 5h。**

### 7.4 取消 5h 会不会增加 weekly 总量

现有后端样本只证明：

```text
300 分钟 primary + 10080 分钟 secondary
→ 只剩 10080 分钟 primary
```

没有证据显示 10,080 分钟桶的 denominator 同时变大。因此本文对 weekly 的判断是：

- 取消 5h 很可能只是移除短时 burst cap；
- 用户可以更集中地消耗原有 weekly 桶；
- weekly 总量仍约为 $125 / $625 / $2,500；
- 不能理解成“每 5 小时获得一份新额度”或“取消后 weekly 自动乘几倍”。

如果未来 OpenAI 公布 weekly-only 同时重设 denominator，这一节需要更新。

---

## 八、没有用于中心估计的证据，以及原因

### 8.1 2026 年 6 月的大规模异常扣量报告

[Issue #28879](https://github.com/openai/codex/issues/28879)汇总了大量 Plus/Pro 用户反馈。原报告给出的对照包括：

- 2026-06-12：约 57K token 的 GPT-5.5 请求只移动约 1% 5h；
- 2026-06-18：约 20K token、几乎零 reasoning 的请求却移动 10%–27% 5h；
- 报告者估计单位 token 的 meter 消耗突然增加 10–20 倍。

[Issue #28823](https://github.com/openai/codex/issues/28823)也记录了同一类现象：一个 `prolite` 账户在约 13.8M 本地 token 下显示 79% 5h，而历史上 75M–91M 的相似窗口未出现同样耗尽。

这些记录很可信地证明了“计量曾经异常”，但正因它们是异常样本，不能拿来估算套餐正常容量。

### 8.2 Entitlement 映射错误

[Issue #29243](https://github.com/openai/codex/issues/29243)记录：OAuth token 声明 `prolite`，但 rate-limit response 返回 `plus`；[issue #29968](https://github.com/openai/codex/issues/29968)中也有大量 Pro 5×/20× 被当成较小档位的报告。

如果直接拿这类账户的“用完额度时 token 数”做估算，会把 Plus 大小的桶误认为 Pro 桶，所以必须排除。

### 8.3 只有总 token、没有 token 构成的样本

[Issue #33473](https://github.com/openai/codex/issues/33473)记录一个 Pro 20× 用户在约 520M tokens 后只剩 33% weekly。这个数量级与 weekly 约数千美元并不矛盾，但不能精确换算：

- 520M 全是 GPT-5.5 缓存输入约值 $260；
- 520M 全是未缓存输入约值 $2,600；
- 若有较多输出，价格还会更高。

缺少缓存/输出比例时，直接把“总 token”乘一个统一单价是错误的。

### 8.4 用户对 5h/weekly 比例的主观预期

有些 issue 作者认为用完一个 5h 应该恰好花掉 20% weekly，但这只是用户假设，不是官方规则。本文只采用这些 issue 的实际观测百分比，不采用作者对“正常比例”的主张。

---

## 九、适用边界和会显著改变结果的因素

### 9.1 Fast mode

官方 [Speed / Fast mode](https://learn.chatgpt.com/docs/agent-configuration/speed#fast-mode)说明：

- GPT-5.6 和 GPT-5.5 的 ChatGPT Fast mode 以 Standard 的 2.5× credits 消耗；
- GPT-5.4 以 2× credits 消耗；
- API Priority 对 GPT-5.6 当前是 Standard API token price 的 2×。

因此本文表格只适用于 Standard。若比较相同低延迟服务，不能简单把 Fast credits 直接当成 API Priority 美元。

### 9.2 图片生成

官方 pricing 页面说明，图片生成平均会以普通消息约 3–5 倍速度消耗 included limits，具体取决于图片质量和尺寸。本文没有把图片生成计入一般 coding token 桶的美元等值。

### 9.3 GPT-5.3-Codex-Spark

Spark 是 Pro 专属 research preview，使用独立限额，且推出时没有 API 价格。没有同模型 API 对照，因此本文不对 Spark 做美元折算。

### 9.4 共享额度

官方说明 ChatGPT Work 与 Codex 共享 pricing、credits 和 usage limits；当前 ChatGPT for Excel 等 agentic feature 也可能与 Codex 共用额度。因此 meter 的变化不一定全部来自 CLI 中肉眼可见的 coding turn。

### 9.5 缓存命中率

缓存输入价格通常只有未缓存输入的十分之一。两个“总 token 数相同”的工作流，若一个有 95% 缓存、另一个频繁 cache miss，API 美元价值和额度消耗会显著不同。任何不区分 cached input 的估算都不可靠。

### 9.6 Reasoning 和输出

GPT-5.5/Sol 的输出价格是输入的 6 倍、缓存输入的 60 倍。xhigh reasoning、长代码生成和反复 compaction 会显著提高每条消息成本，正是官方只给消息范围而不承诺固定消息数的原因。

### 9.7 工具和隐藏上下文

工具 schema、工具结果、MCP 说明、AGENTS.md、conversation history、检索结果和 compaction 都可能变成模型输入。用户只看自己输入的几句话，会系统性低估实际 token 消耗。

---

## 十、最终推导链

把整份报告压缩为一条可审计的链条：

### 10.1 5h

```text
官方 Plus / GPT-5.6 Sol：15–90 messages / 5h
官方 GPT-5.6 平均：5–40 credits / message
官方 credits/API 对照：$0.04 / credit

轻任务端：90 × 5 × $0.04 = $18
重任务端：15 × 40 × $0.04 = $24

Plus / 1× ≈ $20 / 5h
Pro 5×    ≈ $100 / 5h
Pro 20×   ≈ $400 / 5h
```

### 10.2 Weekly

```text
公开 Pro 20×、GPT-5.5、plan_type=pro 的有效遥测：
10.104831M 未缓存输入
285.850752M 缓存输入
1.078626M 输出+reasoning
weekly used ≈ 9%

API 成本：
10.104831 × $5
+ 285.850752 × $0.5
+ 1.078626 × $30
= $225.808311

全周：$225.808311 / 9% ≈ $2,509

Pro 20× ≈ $2,500 / week
Pro 5×  ≈ $625 / week
Plus 1× ≈ $125 / week
```

### 10.3 交叉检查

```text
$125 weekly / $20 per 5h ≈ 6.25 个 5h 桶

公开实际观测：
用完 5h 对应 weekly 增加约 15%–16%
=> weekly / 5h ≈ 6.25–6.67
```

三条路径在同一数量级上收敛。

---

## 十一、报告结论与使用建议

在需要比较“买 ChatGPT 订阅还是直接走 API”时，可采用以下心算值：

```text
                    5h             weekly
Plus / 1×           $20            $125
Pro 5×              $100           $625
Pro 20×             $400           $2,500
```

实际决策时建议：

1. 按中心值比较长期价值，但按保守下界规划生产容量；
2. 不要根据单次 meter 跳动反推总额度，至少观察完整窗口并区分缓存/输出；
3. 使用 `/status`、`/usage` 或 Codex usage dashboard 记录窗口重置点；
4. Fast、图片、多 agent、长 MCP schema、反复 compaction 应单独记账；
5. 如果账户只剩 weekly 桶，把它理解为 burst cap 被移除，不要假定总周额度增加；
6. 如果实测和本文相差数倍，先排查 plan mapping、计量延迟和服务端异常，而不是立即认为估算失效。

---

## 十二、来源索引

### OpenAI 官方资料

1. [Codex Pricing：套餐、5h 消息范围、weekly 提示、credits rate card](https://learn.chatgpt.com/docs/pricing)
2. [Codex Pricing：What are the usage limits for my plan?](https://learn.chatgpt.com/docs/pricing#what-are-the-usage-limits-for-my-plan)
3. [Codex Pricing：Credits overview](https://learn.chatgpt.com/docs/pricing#credits-overview)
4. [OpenAI API Pricing](https://platform.openai.com/docs/pricing)
5. [Codex for Students：2,500 credits = $100](https://developers.openai.com/community/students)
6. [Codex Speed：Fast mode credits 倍率](https://learn.chatgpt.com/docs/agent-configuration/speed#fast-mode)

### OpenAI Codex 官方仓库中的公开遥测与问题报告

1. [#21216：Pro 20× / Pro 5× 切换与逐类 token、weekly 百分比明细](https://github.com/openai/codex/issues/21216)
2. [#21216 详细逐小时 token 表](https://github.com/openai/codex/issues/21216#issuecomment-4381210275)
3. [#28823：5h meter 与历史 token 使用不一致](https://github.com/openai/codex/issues/28823)
4. [#28879：2026-06 计量突然加速 10–20× 的集中报告](https://github.com/openai/codex/issues/28879)
5. [#28879 评论：5h 用完对应 weekly 约 16%](https://github.com/openai/codex/issues/28879#issuecomment-4761813647)
6. [#29243：Pro 5× entitlement 被 rate limiter 映射为 Plus](https://github.com/openai/codex/issues/29243)
7. [#29968：Pro 5×/20× 被按更小额度限制的集中报告](https://github.com/openai/codex/issues/29968)
8. [#32392：Pro 20× 用完 5h 时 weekly 约增加 15%](https://github.com/openai/codex/issues/32392)
9. [#32707：后端 300 分钟桶消失，只剩 10,080 分钟桶](https://github.com/openai/codex/issues/32707)
10. [#32791：Plus 账户只剩 weekly meter](https://github.com/openai/codex/issues/32791)
11. [#32840：Plus 的 CLI 与 Usage 页面都不再显示 5h](https://github.com/openai/codex/issues/32840)
12. [#33017：公开报告将 5h 移除描述为 temporary](https://github.com/openai/codex/issues/33017)
13. [#33473：Pro 20× 的 520M token / 67% weekly 样本](https://github.com/openai/codex/issues/33473)

---

## 十三、更新条件

出现以下任一情况时，应重新计算本文结论：

1. OpenAI 公布 Plus、Pro 5×、Pro 20× 的绝对 included credits；
2. OpenAI 正式宣布永久取消 5h 并说明新的 weekly denominator；
3. credits rate card 与 Standard API price card 不再按 `$0.04/credit` 对齐；
4. 5×/20× 不再同时适用于短窗口和 weekly usage；
5. GPT-5.6 的消息范围或平均 credits/message 发生显著调整；
6. 有新的、可复算的服务端 usage ledger 取代整数百分比 meter。

在这些信息出现之前，`$20/$100/$400 per 5h` 与 `$125/$625/$2,500 per week` 是目前公开证据下最自洽、可复算且保留了合理误差带的一组估计。
