# Codex CLI

按科研工作中的实际收益筛选，官方文档核对日期：2026-10-06。下文命令适用于终端 CLI；以 `/` 开头的命令在 Codex 对话中输入。示例路径需替换为实际路径，输出目录需已存在。

## 从已有讨论分叉，或临时开一条旁支

讨论完一个 idea 的背景后，用 `/fork` 创建带有当前对话历史的新会话，分别探索两种解释或实验设计，不必重新讲背景。也可以从终端运行：

```powershell
codex fork --last
```

如果只是临时追问一个细节，用 `/side 这个消融能否排除数据泄漏的解释？`，也可写 `/btw ...`。它建立临时旁支，对话记录与主会话分开，适合主任务还在执行时问一个局部问题。

输入框为空时连按两次 `Esc`，还能选取先前的用户消息，修改后从那里分叉。

**对话分叉不等于代码隔离，也不会把磁盘文件回滚到那一轮。** 两条路线都要改代码时，应使用不同的 Git worktree。

来源：[会话分叉、旁支与快捷键](https://learn.chatgpt.com/docs/developer-commands)。

## 把 Codex 放进实验流水线，并约束结果格式

`codex exec` 可以在脚本里完成一次任务后退出。很适合训练结束后分析日志、检查结果是否完整、生成实验摘要。默认把过程信息写到 stderr，最终回答写到 stdout；`-o` 可以直接保存最终回答。

```powershell
Get-Content -LiteralPath './runs/train.log' -Tail 200 | codex exec "分析日志中的异常，引用原始数值；只分析，不修改文件" -o './reports/diagnosis.md'
```

值得区分两个选项：`--json` 输出整个执行过程的 JSONL 事件流；`--output-schema` 约束最终回答的数据结构。后者适合把多个实验的结论接入自己的汇总脚本。

例如，将下面的内容保存为 `reports/summary.schema.json`：

```json
{
  "type": "object",
  "properties": {
    "summary": { "type": "string" },
    "missing_evidence": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["summary", "missing_evidence"],
  "additionalProperties": false
}
```

然后运行：

```powershell
codex exec "读取 runs 下的实验记录，概括结论及缺失证据" --output-schema './reports/summary.schema.json' -o './reports/summary.json'
```

多阶段任务可以用 `codex exec resume <SESSION_ID> "结合新结果更新分析"` 延续上下文。并发任务应记录各自的 session ID，避免用 `--last` 接错会话。一次性批处理不想留下会话记录时，加 `--ephemeral`。

`exec` 默认使用只读沙箱；任务需要修改项目时显式加 `--sandbox workspace-write`。它默认要求在 Git 仓库内运行，普通日志目录可显式加 `--skip-git-repo-check`。结构化输出只约束格式，不保证分析结论正确。

来源：[非交互模式](https://learn.chatgpt.com/docs/non-interactive-mode)。

## 单独审查一个实验分支的改动

不用重新写一段“请帮我 review”的提示词，可以直接选定 Git 范围：

```powershell
codex review --uncommitted
codex review --base main
```

前者检查未提交改动，后者审查相对指定基础分支的改动。适合在开始长时间训练前，先检查新实现是否引入行为变化；测试集混入训练、指标计算口径变化、配置没有真正生效等科研问题，可以另用自定义审查提示明确要求检查。

交互会话里可用 `/review`，再用 `/diff` 查看实际改动。CLI 的 `--uncommitted`、`--base`、`--commit` 和自定义审查提示互斥，不要拼在同一次调用里。

来源：[代码审查命令](https://learn.chatgpt.com/docs/developer-commands#codex-review)。

## 为不同工作保存配置组合，并查清谁覆盖了设置

可以分别保存“只读分析”“实验开发”等配置，启动时一次切换。例如在 `~/.codex/analysis.config.toml` 中写：

```toml
sandbox_mode = "read-only"
web_search = "live"
```

```powershell
codex --profile analysis
```

Profile 只需写与基础配置不同的项目，也可以指定自己可用的模型和推理强度。**Codex 0.134.0 起，profile 使用独立的 `名称.config.toml` 文件**；旧教程中的 `[profiles.名称]` 写法不适用于此版本及以后。

Profile 会覆盖用户基础配置，但项目配置和 CLI 参数仍可继续覆盖它。觉得“明明改了配置却不生效”时，在会话中运行 `/debug-config` 查看配置层和策略来源，用 `/status` 检查当前实际设置。

来源：[Profiles](https://learn.chatgpt.com/docs/config-file/config-advanced#profiles)、[配置诊断](https://learn.chatgpt.com/docs/developer-commands#inspect-config-layers-with-debug-config)。

## 把重复科研流程做成按需加载的技能

适合封装“实验启动前检查”“从运行目录生成可复现记录”“按证据审查论文结论”等反复使用的流程。技能正文只有被使用时才加载，长流程不必全部塞进每轮都带着的 `AGENTS.md`。

项目技能放在 `.agents/skills/<名称>/SKILL.md`；跨项目的个人技能放在 `~/.agents/skills/`。文件包含 `name`、`description` 和操作步骤，可用 `/skills` 选择，或在对话里直接写 `$技能名`。也可以让内置 `$skill-creator` 帮忙创建。

一个容易忽略的控制项：在技能目录的 `agents/openai.yaml` 中写：

```yaml
policy:
  allow_implicit_invocation: false
```

这样只能显式调用该技能，Codex 不会仅因描述匹配就自行启用。适合提交训练任务、整理并修改实验记录等希望亲自触发的流程。

来源：[技能加载、目录与调用控制](https://learn.chatgpt.com/docs/build-skills)。

## 用 hooks 确保检查在指定时机运行

如果某件事必须发生，例如编辑后运行格式检查、结束前检查实验记录是否缺少 seed 或代码版本，可以把已有检查脚本挂到 hooks 上。触发脚本由程序负责，不依赖模型记得遵守一句提示。

项目配置放在 `.codex/hooks.json` 或 `.codex/config.toml`，个人配置放在 `~/.codex/`。常用事件包括：

| 事件 | 适合的用途 |
| --- | --- |
| `PostToolUse` | 在相应工具执行后运行格式或配置检查 |
| `Stop` | 在本轮准备结束时检查交付内容；按协议反馈未完成事项 |
| `SessionStart` | 启动、恢复或压缩上下文后重新注入项目状态 |

用 `/hooks` 查看、信任和管理 hooks。新建或修改的非托管 hook 必须经过信任审查才会执行；仅写入文件不代表已经生效。当前支持 `command` 和 `mcp_tool` 处理器，`prompt`、`agent` 类型会被跳过。检查规则本身仍需自己实现。

来源：[Hooks](https://learn.chatgpt.com/docs/hooks)。

## 搜最新论文时显式启用实时检索

Codex CLI 的网页搜索默认使用缓存索引。需要核对近期论文、最新 release 或变化中的 API 时，可启动：

```powershell
codex --search
```

也可在配置中设置 `web_search = "live"`。这允许实时获取网页，但不会自动保证检索完整或来源可靠；提示中仍应明确时间范围，并要求打开论文或官方原文。

来源：[CLI 搜索模式](https://learn.chatgpt.com/docs/developer-commands#codex-interactive)。

## 为多轮任务设置持续目标，并查看后台命令

对于验收条件清楚的工作，可以把目标附着在会话上：

```text
/goal 实现已讨论的消融开关，相关测试通过，并将配置和验证结果记入 exps.md
```

用 `/goal` 查看，`/goal edit` 修改，`/goal pause` 暂停，`/goal resume` 恢复。比反复发送“继续”更适合推进一项边界清楚的工作。

如果 Codex 启动了长时间运行的命令，用 `/ps` 查看后台终端及最近输出。`/stop` 会停止当前会话的全部后台终端，并非只停止某一个训练任务。

来源：[持续目标与后台终端](https://learn.chatgpt.com/docs/developer-commands)。

## 从 Claude Code 导入已有配置和对话

在本地 CLI 会话中运行 `/import`，选择 Claude Code，再选择要迁移的受支持配置、项目文件或近期对话。适合两种工具交替使用时复用已经整理好的工作环境和背景。

导入器最多发现最近 30 天的 50 个会话；任务执行中、远程会话，以及连接本地 app-server daemon 的会话中不可用。以导入列表实际显示的项目为准。

来源：[导入入口与限制](https://learn.chatgpt.com/docs/developer-commands#import-claude-code-setup-with-import)。

## 几个能减少打断的小操作

| 操作 | 用途 |
| --- | --- |
| 工作中按 `Enter` 发送新指令 | 立即补充或纠正当前任务 |
| 工作中按 `Tab` 发送后续内容 | 排队到下一轮；也支持斜杠命令和 shell 命令 |
| `/raw` | 切换为更方便终端选择、复制的输出形式 |
| `/copy` 或 `Ctrl+O` | 复制最近一次完成的回答 |
| `/statusline` | 把模型、上下文、额度、Git 等信息放到页脚 |

长任务不想一直盯终端，可以在用户 `config.toml` 中启用通知：

```toml
[tui]
notifications = ["agent-turn-complete", "approval-requested"]
```

通知能否显示为桌面提示取决于终端支持情况；需要自定义本机提醒时可配置外部 `notify` 程序，目前该入口只支持 `agent-turn-complete` 事件。

来源：[快捷键](https://learn.chatgpt.com/docs/developer-commands#interactive-shortcuts)、[通知](https://learn.chatgpt.com/docs/config-file/config-advanced#notifications)。
