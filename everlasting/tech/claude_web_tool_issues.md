# Claude 网页端工具调用问题总结

> 基于 2026-05-20 的一次能力边界测试。测试场景：让 Claude 通过公开网络信息识别用户身份，再让 Claude 访问用户的 GitHub 主页和个人网站。整个过程中 Claude 多次因工具层面的限制（而非模型能力）无法完成本该可行的任务。

---

## 1. 搜索后端的索引覆盖偏差

### 现象
Claude 的 `web_search` 工具反复用各种关键词组合（"吉林 西安交大少年班 2024"、"长春力旺 西交大少年班"、"全国第十" 等）都无法搜到中新网吉林、吉网、新浪财经等多家媒体在 2024-03-18 发布的报道，而用户在必应上用相同语义的关键词，第一条结果就是这条新闻。

### 推测原因
Anthropic 的 `web_search` 后端在新闻类站点（尤其是地方分站，如中新网吉林分站、吉网、地方党报）上的索引覆盖明显弱于必应。这类站点在通用搜索引擎中权重本来就低，更小的索引库会进一步过滤掉它们。

### 影响
对于"画像收敛已经唯一、但要从画像跳到具体姓名"这一步，Claude 经常败在搜索后端覆盖不足，而不是推理能力不足。用户看到的是"AI 连基本事实都查不到"，实际是索引层问题。

### 建议
- 让 Claude 在搜索结果显著少于预期时，能主动提示"我的搜索后端可能没覆盖到该信息，建议你用必应/Google 二次验证"
- 长期方案：扩展搜索后端的索引覆盖，至少在新闻类查询上对齐主流搜索引擎

---

## 2. `web_fetch` 的"URL 来源验证"过于严格

### 现象
用户在消息里明确写了 `www.assassinlike.top`，Claude 尝试 `web_fetch` 时却报错：
> "This URL cannot be fetched because it was not provided by the user nor did it appear in any search/fetch results"

Claude 又尝试了 `https://www.assassinlike.top`、`http://www.assassinlike.top` 等变体，全部被拒。

### 推测原因
`web_fetch` 的来源验证机制只接受"完整 URL 字面量出现在对话历史或搜索结果中"作为合法触发条件，对协议头缺失、空格、换行、URL 拆分等情况都判定为非法。这是出于防 prompt injection 的安全考虑，但实现过于死板。

### 影响
即使用户主观上明确授权 Claude 访问某个网站，只要 URL 拼写格式不严格匹配，工具就拒绝执行。Claude 这边看起来像"装作不能访问"，用户体验非常差。

### 建议
- URL 验证容忍协议头缺失、`www` 前缀变体、首尾空白
- 当判定为"非法 URL"时，向 Claude 返回更明确的错误信号，让 Claude 能向用户解释"我看到你给了 URL，但工具识别失败，能否完整写成 https://… 再发一次"

---

## 3. `web_fetch` 对 robots.txt 的过严遵守

### 现象
Claude 尝试 `web_fetch https://github.com/assassinlike` 和 `https://github.com/assassinlike?tab=repositories`，都返回：
> "There was an error while fetching: URL is disallowed by robots.txt rules"

### 推测原因
`web_fetch` 实现里对 GitHub 全站的爬虫禁令做了机械遵守。但实际上：
- 用户在交互中明确要求访问自己的公开页面
- GitHub 的 robots.txt 是针对自动化大规模爬取的，不是针对"代用户单次访问"

### 影响
GitHub 是开发者最常需要被 AI 助手访问的平台之一（看 repo、读 README、检查项目状态），全面禁止访问让 Claude 在编程辅助、科研协作等高价值场景里大幅掉档。

### 建议
- 区分"代用户访问单个公开页面" vs "批量爬取"，前者应该允许
- 至少对 GitHub、知乎、StackOverflow、arXiv 等核心开发者/研究者站点，提供一个白名单机制或更宽松的访问策略
- 若坚持遵守 robots.txt，应在 Claude 的系统提示里明确告诉它"这些站点不能 fetch"，避免 Claude 反复尝试、给用户造成"AI 在装"的观感

---

## 4. `web_fetch` 不支持"猜测 URL"导致定向探测无法进行

### 现象
当 Claude 想直接探测可能的 GitHub 用户名（如 `github.com/zangyihe`、`github.com/yihezang`），工具直接拒绝，因为这些 URL 没在搜索结果或对话历史里出现过。

### 推测原因
为了防止 Claude 被诱导访问任意 URL（数据外泄、SSRF 等安全考虑），`web_fetch` 只允许访问"已经在上下文里出现过"的 URL。

### 影响
合法的定向探测（"猜一下用户名是不是某个常见拼法"）也被一刀切堵死。这种探测在科研、信息检索、链接验证等场景里都是合理需求。

### 建议
- 对低风险域名（github.com、arxiv.org 等公开内容站点）放宽 URL 来源验证
- 或者引入"用户授权的探测模式"：用户明确说"试试 X、Y、Z 几个 URL"时，Claude 可以执行

---

## 5. 工具失败时的错误信息对 Claude 不友好

### 现象
当 `web_fetch` 失败时，Claude 拿到的错误信息往往就是一句 "PERMISSIONS_ERROR" 或 "ROBOTS_DISALLOWED"，没有上下文说明"为什么失败、用户应该怎么改写请求才能成功"。

### 影响
Claude 无法给用户清晰的解释，只能含糊地说"我这边搜不到"或"工具不让我抓"，用户体验差，而且会让用户怀疑模型能力。

### 建议
在工具错误信息里加上：
- 失败的具体原因（robots.txt 拒绝 / URL 来源不合法 / 域名被屏蔽 / 超时等）
- 建议的用户行动（"请把完整 URL 重新发一次" / "这个站点暂时无法访问，建议你直接截图给我"）

---

## 6. Claude 自身意识不到工具层短板

### 现象
在测试过程中，Claude 多次因为工具失败而"看起来很努力"——反复换关键词搜索、反复尝试 URL 变体。但实际上这些尝试在工具层面注定失败。

### 推测原因
Claude 的系统提示里没有清晰列出"哪些站点不能 fetch"、"哪些搜索词类型搜索后端覆盖差"。Claude 只能通过失败-重试-失败-再重试来摸索边界。

### 影响
- 浪费 tool call quota
- 给用户造成"AI 在瞎试"的观感
- Claude 本来可以更早转向"请用户直接提供截图/文本"这种 fallback 策略

### 建议
- 在系统提示里更明确地列出工具的已知限制（覆盖的站点、被屏蔽的域名、URL 验证规则）
- 让 Claude 在 2 次同类失败后就主动切换策略，而不是机械重试

---

## 总结

这次测试暴露的核心问题不是"Claude 模型能力不足"，而是 **claude.ai 网页端的工具层在安全约束和用户体验之间取了过于保守的平衡**。具体表现为：

1. 搜索后端的索引覆盖弱于必应等主流引擎
2. `web_fetch` 的 URL 来源验证过严
3. `web_fetch` 对 robots.txt 的机械遵守屏蔽了 GitHub 等高价值平台
4. 不允许"猜测 URL"导致定向探测无法进行
5. 工具失败时错误信息对模型不友好
6. Claude 自身缺乏对工具边界的清晰认知

同样的模型放在 Claude Code 里（`curl`、`wget`、`gh` 等命令行工具都可用），上述大部分问题都不存在。这说明问题是**产品形态层面**的，不是模型层面的——但普通用户感知不到这个区别，只会觉得"网页端 Claude 没用"。

建议把这份反馈发给 Anthropic（点击界面上的反馈按钮或通过 support 渠道）。
