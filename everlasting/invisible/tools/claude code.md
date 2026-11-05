# Claude Code

按科研工作中的实际收益筛选，官方文档核对日期：2026-10-06。下文以终端 CLI 为主；以 `/` 开头的命令在 Claude Code 对话中输入。示例路径需替换为实际路径，输出目录需已存在。

## 分别回退代码或对话，还能只压缩某段讨论

输入 `/rewind`，或在输入框为空时连按两次 `Esc`，选择一个历史节点，可以：

- 同时恢复代码和对话，重新尝试另一种实现。
- 只恢复代码，保留失败过程的讨论与教训。
- 只恢复对话，保留当前代码。
- 用 `Summarize from here` 压缩该点之后的讨论，或用 `Summarize up to here` 压缩之前的讨论。

对科研尤其有用的是“保留结论，压缩冗长排错过程”。选择压缩项时还能补充要求，例如保留数据划分、超参、seed、失败原因和已排除的假设。压缩不会修改文件。

**回退只覆盖受跟踪的文件编辑，不是整个工作目录的快照。** Bash 命令写出的文件、训练产物，以及大多数子代理修改不能通过它恢复；长期实验版本仍用 Git 记录。

来源：[Checkpointing](https://code.claude.com/docs/en/checkpointing)。

## 用 worktree 同时探索不同实现

在 Git 仓库中分别启动：

```powershell
claude --worktree ablation-a
claude --worktree ablation-b
```

每个会话得到独立工作目录和分支，默认位于 `.claude/worktrees/<名称>/`。适合同时实现不同消融、尝试另一种优化方法，避免多个会话覆盖同一份代码。

Worktree 是新 checkout，需要准备自己的运行环境；它不会自动复制主目录的未提交修改，也不会隔离 GPU、数据库或共享的绝对输出路径。并行实验仍应各自指定运行目录。

如果有少量被 Git 忽略、但新工作树必需的本地配置，可在仓库根目录用 `.worktreeinclude` 指定需要复制的文件；不要把整个数据集或环境目录复制进去。退出交互会话时，有改动或新提交的 worktree 会询问保留还是删除。

来源：[Worktrees](https://code.claude.com/docs/en/worktrees)。

## 分叉已有讨论，保留共同背景

在已经梳理完背景的会话里输入：

```text
/branch alternative-hypothesis
```

它复制当前对话并切换到副本，原会话保留。也可以从终端运行 `claude --continue --fork-session`，在新进程中分叉最近一次会话。适合从相同证据出发，分别推演两种解释。

用 `/rename` 给各条路线命名，以后可通过 `claude --resume <名称>` 返回。对话分叉不隔离磁盘文件；两条路线都要改代码时，配合 worktree。不要在两个终端直接恢复同一个 session 来冒充分叉，否则消息会写入同一份记录。

来源：[会话分叉与命名](https://code.claude.com/docs/en/sessions)。

## 将费上下文的检查做成独立运行的技能

读大量代码、扫描实验记录、核对多个配置时，可以让技能在子代理里完成，只向主对话返回结论。主对话就不必带着整段搜索输出和文件内容。

例如在 `.claude/skills/audit-exp/SKILL.md` 中保存：

```markdown
---
name: audit-exp
description: 检查指定实验目录的配置、结果与可复现记录是否一致。
disable-model-invocation: true
context: fork
agent: general-purpose
---

只读检查 $ARGUMENTS 指定的实验目录。
核对模型与数据版本、全部超参、seed、环境和代码版本是否有记录。
比较记录与实际配置、日志中的值；缺失信息明确标为未知。
返回有文件位置证据的不一致项和缺失项，不修改文件。
```

然后在对话里用 `/audit-exp runs/exp-01` 调用。`disable-model-invocation: true` 让它只能由你显式触发；`context: fork` 让它在独立子代理上下文中运行。技能中的“只读”是操作要求，不是工具权限隔离；需要强制限制时，可通过 `/agents` 创建只开放读取工具的专用子代理，再在 `agent` 字段中选择它。

**这里的 `fork` 不会复制主会话历史。** 所需背景应写进技能、参数或明确的输入文件。当前交互模式下此类技能默认在后台运行；需要当轮等它完成时添加 `background: false`。

来源：[技能与独立上下文](https://code.claude.com/docs/en/skills)、[自定义子代理](https://code.claude.com/docs/en/sub-agents)。

## 通过 hooks 固定执行检查、恢复关键上下文

把“每次都应该做”的事写成脚本，配置到 `.claude/settings.json` 的 `hooks` 中，能减少对模型记忆和自觉的依赖。个人通用配置则放在 `~/.claude/settings.json`。

| 事件 | 科研中的用途 |
| --- | --- |
| `PostToolUse` | 编辑文件后执行格式检查或配置验证 |
| `Stop` | 准备结束本轮时核对验收条件；未满足时反馈继续处理 |
| `SessionStart`，匹配 `compact` | 上下文压缩后，从状态文件重新注入当前实验和未解决问题 |
| `Notification` | 需要人工输入时触发本机提醒 |

这些检查逻辑需要自己实现；hook 的价值是让程序在事件发生时调用它。`Stop` hook 也不是永久不能绕过的验收屏障：存在连续阻止次数限制，并应处理 `stop_hook_active`，避免自己制造无限续跑。

来源：[Hooks 指南](https://code.claude.com/docs/en/hooks-guide)。

## 定时检查训练，用 /loop 代替反复询问

```text
/loop 10m 检查 runs/exp-01 的训练日志和进程状态；只报告新异常或完成状态，不重启训练
```

适合等待训练结束、定期检查远程队列，或在结果齐全时提醒你。固定间隔的任务会返回 job ID；需要停止时，让 Claude 删除对应任务。

它在会话运行且空闲时触发，繁忙时不会为每个错过的时间点补跑。退出会话后停止触发；通过 `--resume` 或 `--continue` 恢复时，未过期的固定定时任务可恢复。循环任务创建 7 天后过期；不指定间隔、让 Claude 自行决定等待时长的 `/loop` 不会在恢复会话时自动恢复。

这是会话内监控。需要独立于会话持续运行的定时作业，应使用系统调度或官方的云端 Routines 等持久调度方式。

来源：[定时任务与限制](https://code.claude.com/docs/en/scheduled-tasks)。

## 用 /goal 持续推进到可检验的终点

```text
/goal 修复评估脚本，使现有 tests/eval 测试全部通过；不修改测试，并记录根因和验证输出
```

Claude 每轮结束后会评估目标是否完成，未完成则自动继续。适合实现已确定的方法、修复测试、按明确验收条件补齐项目；完成条件最好能由测试输出或文件内容证明。

用 `/goal` 查看状态，`/goal clear` 停止目标循环。目标可能因判定不可实现或需要人工处理的错误而清除，并不保证一定达成。完成判断依赖模型看到的执行证据，重要验收仍应有确定性的检查。

它与 `/loop` 的区别是：`/goal` 按任务进展连续工作，`/loop` 按时间检查。不要把“等训练十小时”写成需要不断推理的目标循环。

来源：[Goals](https://code.claude.com/docs/en/goal)。

## 从脚本调用，并限制执行轮数和输出结构

`claude -p` 完成任务后退出，适合实验结束后的日志分析和自动报告：

```powershell
Get-Content -LiteralPath './runs/train.log' -Tail 200 | claude -p "概括异常，引用原始数值，不修改文件" --output-format json --max-turns 6
```

`--output-format json` 返回含结果、session ID 等信息的 JSON 外壳；要约束结果本身的字段，再用 `--json-schema` 传入 JSON Schema，结构化结果位于 `structured_output` 字段。`--output-format stream-json --verbose` 则输出执行事件流。

`--max-turns` 限制 print 模式的 agent 执行轮数；到上限会报错结束。`--max-budget-usd` 可限制本次运行的 API 成本估算，包含子代理开销，但估算不等于最终账单，也不是订阅额度的精确控制。

另一个容易混淆的区别：`--allowedTools` 预先允许指定工具免询问执行；`--tools` 才限制可用的内置工具集合，且不限制 MCP 工具。需要无人工介入时，必须把任务所需权限配置完整。

来源：[非交互调用](https://code.claude.com/docs/en/headless)、[CLI 参数](https://code.claude.com/docs/en/cli-reference)。

## 用一个界面管理多个后台会话

`claude agents` 打开 agent view，集中显示哪些会话在工作、哪些需要输入、哪些已完成。已有会话里用 `/bg` 可将它转到后台。选中一行按空格查看近况并回复，按 `Enter` 进入完整对话。

适合同时推进几个科研项目，或分别安排代码检查、结果核对和文献整理。退出列表界面后，后台会话仍可继续运行；机器本身需要保持运行。界面底部输入的新任务会创建新会话，给现有任务补充信息应进入对应行回复。

此功能仍处于 research preview。每个会话独立消耗额度；新派发的后台任务可能包含提交、推送和创建 draft PR 的默认工作流，不希望它发布结果时应在任务中明确交付范围。

来源：[Agent view](https://code.claude.com/docs/en/agent-view)。

## 从手机继续操作本机或服务器上的会话

正在工作的会话中输入 `/remote-control`（别名 `/rc`），按提示从手机或浏览器连接。也可以启动一个同时支持本地输入和远程控制的会话：

```powershell
claude --remote-control
```

程序执行、文件访问和本地工具仍在原机器上，适合离开工位后看实验进展、回答问题、调整下一步。原机器和 Claude Code 进程需要保持运行。

当前要求使用受支持的 Pro、Max、Team 或 Enterprise 订阅登录；不支持 API key、第三方模型平台或自定义 API 网关。Team、Enterprise 还需管理员启用。因此，用转发 API 的服务器不一定能用这个入口。

来源：[Remote Control](https://code.claude.com/docs/en/remote-control)。
