# AutoGitter

自动给知名 AI/ML 开源项目提交修 bug 的 PR 和高质量 bug issue。复现、修复、写测试、写 PR 文本都由 headless Claude Code（`claude -p`）完成；提交前由另一个独立会话以项目维护者的标准审稿，打分达标才会提交。

## 用法

环境是 conda 环境 `autogitter`（python 3.11，只用标准库，外加给 agent 建 venv 用的 `uv`）。`gh` 需已登录 `config.toml` 里的账号。

```bash
conda activate autogitter
python -m autogitter run -n 1          # 先提交排队的，再发现 → 筛选 → 修复 → hunt，新增 1 个过审后提交
```

定时自动运行（Windows 任务计划程序，任务名 `AutoGitter`，每 `schedule_hours` 小时一轮，用 pythonw 在后台跑，不弹窗口，日志在 `data/logs/cron-<日期>.log`）：

```bash
python -m autogitter schedule install     # 注册
python -m autogitter schedule status      # 查看状态、上次和下次运行时间（python -m autogitter status 也会显示）
python -m autogitter schedule pause       # 暂停定时（正在跑的一轮继续跑完）；resume 恢复
python -m autogitter schedule start       # 立即跑一轮
python -m autogitter schedule stop        # 中断正在跑的一轮，连同它启动的 claude 子进程
python -m autogitter schedule uninstall   # 删除任务
```

睡眠时任务不会唤醒电脑；唤醒或重启后登录时，错过的轮次只补跑一次。被睡眠、重启或 stop 打断的任务在下一轮开始时标为 failed，对应的 issue 放回候选。建 PR 前会先查同一分支是否已有 PR，所以提交过程中被打断也不会重复建。

每轮先提交排队的；过审待提交的已有 `max_ready_backlog` 个时只提交不干活。否则修筛选分不低于 `min_pick_score` 的 issue，再轮流 hunt `hunts_per_run` 个 repo（最久没 hunt 过的优先，已有我方 open PR 的 repo 跳过），最后 followup。上一轮没跑完时下一轮跳过。只在你登录 Windows 时运行，因为要用 gh 的 keyring 登录态。

分步执行：

```bash
python -m autogitter discover          # 抓各 repo 近期无人认领、无关联 PR 的 open issue
python -m autogitter triage            # 模型挑出适合修的，打分
python -m autogitter work -n 2         # 按分数取 2 个去修；--issue owner/repo#123 可直接指定
python -m autogitter hunt owner/repo   # 不依赖现成 issue，在近期改动里找未报告的 bug
python -m autogitter submit            # 提交过审的（受每日上限、单 repo open PR 上限、间隔约束）
python -m autogitter followup          # 看已提交的 PR/issue 有没有新评论、review、合并
python -m autogitter status            # 列出所有任务
python -m autogitter clean             # 删除已结束任务的 worktree
```

## 流程

一个任务对应一个 issue（或一次 hunt）。worker 会话在独立的 git worktree 里工作：读 repo 的贡献规范和 AI 贡献政策（禁止 AI 贡献的直接放弃），判断 issue 是否适合（已有人认领、已有 PR、需要 GPU、需要维护者做设计决定的都放弃），在最新 upstream 上复现，找根因，做最小修复，补一个修复前失败、修复后通过的回归测试，跑相关测试和 lint，再按 `prompts/style.md` 写 PR 文本。hunt 模式从近期合并的 commit 里找 bug，查重后视修复难度产出 PR 或 issue。

worker 交付后，reviewer 会话（只读）自己重跑复现和测试，检查根因、改动范围、项目惯例、重复和文本质量，给出 submit / revise / reject 和 1-10 分。revise 时把意见交回 worker 的同一会话修改，最多 `max_revisions` 轮。最终 verdict 为 submit 且分数不低于 `min_review_score` 的进入 ready，由 pipeline 以你的 git 身份 commit（repo 要求 DCO 时自动 `-s`）。

提交受跨运行的节奏控制：最近 24 小时最多 `max_submissions_per_day` 个，每次提交后在 `submit_interval` 内随机取一段时间不再提交，时间没到就留给下一轮。提交前再确认一次 issue 仍开着、没人认领、没有新的关联 PR（open PR 正文里引用了它也算）；然后 fork、push、建 PR，按 `disclose_ai` 在末尾附上 AI 声明（repo 规定必须披露时总会附上）。

目标 repo 分两类，都在 `config.toml` 里。`pr_repos` 是贡献规范里没有反 agent 条款的 repo：凡是禁止全自动 agent、要求真人逐行审过或手写描述、要求先拿到维护者批准或 assign 的（transformers、trl、peft、diffusers、scikit-learn、langchain 等）都没收。`issue_repos` 不收外部 PR，只走 hunt、只提 issue。规范可能会变，所以 worker 每次都会重读 repo 当前的规范，发现上述条款就放弃。

worker 和 reviewer 拿不到 GitHub 凭据：`gh`、`git push` 被禁用，环境里清空了 git credential helper，读 GitHub 只能走未认证 API。所有写操作只在 `autogitter/gh.py` 里由 pipeline 执行。

## 文件

- `config.toml`：账号、模型、工作区路径、审稿门槛、提交频率、AI 声明文本、目标 repo 白名单、需要先评论认领的 repo。
- `.env`：headless Claude Code 的接口，`ANTHROPIC_BASE_URL` 和 `ANTHROPIC_API_KEY`（或 `ANTHROPIC_AUTH_TOKEN`）。不设则用 `claude` CLI 自己的登录。
- `autogitter/`：代码；`prompts/` 是各步骤的提示词（`env.md` 和 `style.md` 是 worker 与 reviewer 共用的环境说明和写作规范）。
- `data/candidates.json`：候选 issue 池及筛选结果。
- `data/tasks/<id>/`：每个任务的记录：`meta.json`（状态、分数、花费、PR 链接）、`issue.md`、每轮的 `result-*.json` 和 `review-*.json`、`change.patch`、完整事件流 `work.log` / `review.log`、agent 的复现脚本 `scratch/`。
- 工作区（`config.toml` 的 `workspace`，默认 `D:/ag`）：`repos/` 各 repo 的 base clone，`w/` 每个任务的 worktree，`envs/` 各 repo 的 venv。放在项目外是因为本机没开 Windows 长路径，深层路径会超过 260 字符。

`.env` 和 `data/` 不进 git。
