# AutoZhihu

自动发现知乎问题、用大模型写高质量回答并发布。

## 用法

环境是 conda 环境 `autozhihu`（python 3.11，playwright、anthropic、openai、markdown），浏览器用本机 Chrome。

```bash
conda activate autozhihu
python -m autozhihu login              # 首次使用：在弹出的 Chrome 里登录知乎
python -m autozhihu run -n 3           # 抓问题 → 选 3 个写 → 依次发布
```

也可以分步执行：

```bash
python -m autozhihu discover           # 抓热榜、邀请回答、创作中心推荐，合并进候选池
python -m autozhihu write -n 3         # 模型选题并写作；--qid 可指定问题
python -m autozhihu publish --dry-run  # 走完发布流程但不点发布，截图检查
python -m autozhihu publish            # 发布所有已写好未发布的回答
```

### 每日自动发布

`python -m autozhihu daily` 是每天跑一次的任务：先抓新问题，凑够 `daily_count` 篇待发回答（优先用之前写好没发的，不够再写），然后在 `publish_window` 时间窗口内随机挑时刻逐篇发布，任意两篇至少相隔 `min_gap_minutes` 分钟。这三个参数都在 `config.toml` 里。运行期间电脑不会自动睡眠，日志写在 `data/logs/<日期>.log`。如果知乎登录失效，任务会直接退出并在日志里提示重新登录。某篇发布失败会在之后的运行中重试，连续失败 3 次就放弃。

当天进度存在 `data/today.json`。任务中途被打断（关机、重启、进程被杀）后再运行，会接着发当天剩下的篇数，在剩余窗口内重新随机排时刻，与上一篇的间隔仍不少于 `min_gap_minutes`。

用 Windows 计划任务让它每天 08:30（`-At` 可改）和每次登录 Windows 时自动启动：

```bash
powershell -ExecutionPolicy Bypass -File scripts/schedule.ps1
powershell -ExecutionPolicy Bypass -File scripts/schedule.ps1 -Remove   # 取消
```

临时暂停和恢复：

```bash
python -m autozhihu pause    # 正在运行的任务会在一分钟内、下一篇发布之前退出；之后定时或登录时启动也直接退出
python -m autozhihu resume   # 恢复，下次启动时接着发当天剩下的篇数
```

暂停不会打断正在进行中的发布，也不影响手动运行的 `publish`、`run` 等命令。

登录时启动是为了关机重启后恢复当天的发布；当天已经发完、窗口已过或任务已在运行时，它什么也不做。任务只在你登录 Windows 时运行，因为发布要打开有界面的 Chrome。08:30 时电脑在睡眠会被唤醒，关着机则开机后补跑。不论哪种中断，只要剩余窗口排得开间隔，当天的篇数都会发满；排不开时，没发的回答留到第二天，并占用第二天的篇数。

## 流程

选题时，模型从候选池里挑出能在“不编造经历、不依赖实时信息”的前提下写出明显优于已有回答的问题。每个问题的写作分五步：读问题和前 5 个高赞回答，制定写作计划（真实需求、已有回答的不足、自己的角度、结构）；按计划写初稿；以挑剔编辑的身份审稿（事实、编造、空话、AI 味）；根据审稿意见修订；最后只做句子级润色，去掉拟人化、强调词、自我预告、格言口号、教练口吻这几类 AI 腔，得到终稿。所有步骤共用 `autozhihu/prompts/style.md` 中的身份和文风规则。

发布时把终稿转成 HTML 粘贴进知乎编辑器（公式、标题、列表、代码块都会转成原生格式），按配置勾选“包含 AI 辅助创作”，两篇之间随机间隔。

## 文件

- `config.toml`：模型、每次篇数、发布间隔、抓取来源、最低关注数等。
- `.env`：模型接口地址和 key。接口格式在 `config.toml` 的 `api` 里选：`anthropic` 走 `/v1/messages`，地址不带 `/v1`（如 `https://api.anthropic.com`）；`openai` 走 `/v1/chat/completions`，地址带 `/v1`（如 `https://api.deepseek.com/v1`），DeepSeek、GPT 等 OpenAI 兼容接口都用这个。
- `autozhihu/`：代码；`prompts/` 是各步骤的提示词。
- `scripts/schedule.ps1`：注册或删除每日计划任务。
- `data/candidates.json`：候选问题池，`status` 记录每个问题的进度（new / written / published / skipped / failed）。
- `data/answers/<问题id>/`：每篇回答的全部中间产物（context、plan、draft、review、revised、polish 改动清单、final）和 `meta.json`。
- `data/logs/`：每日任务的日志；`data/today.json`：当天的发布进度；`data/paused`：存在即表示已暂停。
- `browser/`：Chrome 登录态。

`.env`、`browser/`、`data/` 都不进 git。
