# Claude Code Router 配置与会话恢复手册

本文记录如何使用 `musistudio/claude-code-router`（CCR）让 Claude Code 通过 OpenAI Responses 兼容的 GPT 中转服务运行，以及配置、恢复旧会话和处理上下文压缩问题的完整过程。

本文基于以下已验证环境：

- CCR：`@musistudio/claude-code-router@3.0.20`
- Node.js：`v22.23.2`
- Node ABI：`127`
- Claude Code：`2.1.226`
- 中转协议：OpenAI Responses
- 中转 Base URL：`https://api.sudorelay.com/v1`
- 模型：`gpt-5.6-sol`
- CCR 配置目录：`~/.claude-code-router`

> 安全提示：本文只使用 `$OPENAI_API_KEY`，不要把真实 API Key 写进文档、命令历史或 Git。曾经直接发到 Claude 对话里的 Key 会保存在会话 JSONL 中，应视情况轮换。

## 1. 关键结论

使用 CCR 3 时，先记住以下几点：

1. CCR 3 要求 Node.js 22 或更高版本。
2. CCR 3 的正式配置存储是 `~/.claude-code-router/config.sqlite`。
3. `config.json` 只用于首次迁移；成功导入后，继续修改 JSON 不会生效。
4. Claude Code 参数必须放在 CCR 参数分隔符 `--` 后面。
5. `scope: "ccr"` 会为 profile 创建独立的 Claude 数据目录，因此默认看不到原 Claude 会话。
6. `managedCompact: true` 只能接管压缩请求，不能绕过上游模型自身的上下文上限。
7. 不要使用 `ccr version`。CCR 3 会把 `version` 当作 profile 名称。

## 2. 安装和检查版本

安装或升级 CCR：

```bash
npm install -g @musistudio/claude-code-router
```

CCR 3 没有 `ccr version` 子命令。使用 npm 查看版本：

```bash
npm list -g @musistudio/claude-code-router --depth=0
```

本次验证输出为：

```text
@musistudio/claude-code-router@3.0.20
```

查看 CCR 支持的命令：

```bash
ccr --help
```

主要命令格式：

```text
ccr start [--no-open]
ccr stop
ccr <profile-name-or-id> [cli|app] [-- <agent args>]
```

## 3. 固定使用 Node.js 22

CCR 的 `better-sqlite3` 是原生 Node 模块，运行时 Node ABI 必须与安装时一致。

当前机器可直接将 Node 22 放到 `PATH` 最前面：

```bash
export PATH="/home/zangyihe/.nvm/versions/node/v22.23.2/bin:$PATH"
hash -r

node --version
node -p 'process.versions.modules'
```

预期输出：

```text
v22.23.2
127
```

也可以使用 NVM：

```bash
source ~/.nvm/nvm.sh
nvm use --delete-prefix v22.23.2
```

这里需要 `--delete-prefix`，因为 `~/.npmrc` 中存在 `prefix` 或 `globalconfig` 设置，普通的 `nvm use 22` 会报告与 NVM 不兼容。

### Node ABI 不匹配报错

典型错误：

```text
better_sqlite3.node was compiled against NODE_MODULE_VERSION 127
This version of Node.js requires NODE_MODULE_VERSION 115
```

其中：

- ABI `127` 对应本次使用的 Node 22。
- ABI `115` 表示当前命令实际由 Node 20 执行。

解决方法是切换到 Node 22 后重新运行 CCR。不要在 Node 20 下重编译 `better-sqlite3`，否则会破坏 Node 22 下的安装。

## 4. CCR 3 的配置存储方式

CCR 3 的主要运行文件：

```text
~/.claude-code-router/config.sqlite
~/.claude-code-router/app-data/
~/.claude-code-router/bin/
~/.claude-code-router/profiles/
~/.claude-code-router/service.json
```

与旧版不同，CCR 3 不会持续读取 `config.json`：

1. 当 `config.sqlite` 不存在时，CCR 查找旧格式 `config.json`。
2. CCR 将 JSON 导入 SQLite。
3. JSON 会被归档为带时间戳的备份文件。
4. 以后以 SQLite 为准。

因此，文件配置在 CCR 3 中应理解为“一次性导入”。不要直接编辑正在使用的 SQLite 数据库。

## 5. 通过 config.json 一次性导入配置

### 5.1 停止 CCR 并备份现有数据库

```bash
ccr stop

CCR_BACKUP="$HOME/.claude-code-router/backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$CCR_BACKUP"

for file in config.sqlite config.sqlite-wal config.sqlite-shm; do
  if [ -e "$HOME/.claude-code-router/$file" ]; then
    mv "$HOME/.claude-code-router/$file" "$CCR_BACKUP/"
  fi
done

echo "CCR backup: $CCR_BACKUP"
```

该操作会重建 CCR 配置，但旧数据库保留在备份目录中，可恢复。

### 5.2 设置上游 API Key

```bash
read -rsp 'OPENAI_API_KEY: ' OPENAI_API_KEY
echo
export OPENAI_API_KEY
```

确保该变量在首次启动并导入 JSON 时存在：

```bash
test -n "$OPENAI_API_KEY" && echo 'OPENAI_API_KEY is set'
```

### 5.3 创建迁移配置

在 `~/.claude-code-router/config.json` 中写入：

```json
{
  "API_TIMEOUT_MS": 600000,
  "Providers": [
    {
      "id": "sudocode",
      "name": "sudocode",
      "baseUrl": "https://api.sudorelay.com/v1",
      "apiKey": "$OPENAI_API_KEY",
      "models": [
        "gpt-5.6-sol"
      ],
      "protocol": "openai_responses",
      "protocolDetectionMode": "manual"
    }
  ],
  "preferredProvider": "sudocode",
  "Router": {
    "builtInRules": {
      "claude-code": {
        "enabled": true
      },
      "codex": {
        "enabled": true
      }
    },
    "fallback": {
      "mode": "off",
      "models": [],
      "retryCount": 1
    },
    "rules": []
  },
  "profile": {
    "enabled": true,
    "profiles": [
      {
        "id": "claude-sudocode",
        "name": "Claude via sudocode",
        "agent": "claude-code",
        "enabled": true,
        "surface": "cli",
        "scope": "ccr",
        "model": "sudocode/gpt-5.6-sol",
        "managedCompact": true,
        "settingsFile": "~/.claude/settings.json",
        "env": {
          "CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY": "1"
        }
      }
    ]
  }
}
```

保护配置文件：

```bash
chmod 600 ~/.claude-code-router/config.json
```

字段说明：

- `baseUrl` 使用 `/v1` 根地址，不要写成 `/v1/responses`。
- `protocol` 使用 CCR 3 名称 `openai_responses`。
- `protocolDetectionMode: "manual"` 禁止依赖中转的模型自动发现接口。
- `models` 显式列出模型，解决 UI 或 `/models` 接口返回“未找到模型”的问题。
- profile 模型必须使用 `provider/model` 形式，即 `sudocode/gpt-5.6-sol`。
- `managedCompact: true` 让 CCR 3 接管该 profile 的压缩请求。
- `API_TIMEOUT_MS: 600000` 是 600 秒请求超时，不是 60 万 token 的上下文设置。

导入后，SQLite 中协议可能表现为如下能力项，而不是顶层 `protocol` 字段，这是正常的规范化结果：

```json
{
  "capabilities": [
    {
      "baseUrl": "https://api.sudorelay.com/v1",
      "type": "openai_responses"
    }
  ]
}
```

### 5.4 启动并执行导入

```bash
export PATH="/home/zangyihe/.nvm/versions/node/v22.23.2/bin:$PATH"
read -rsp 'OPENAI_API_KEY: ' OPENAI_API_KEY
echo
export OPENAI_API_KEY

ccr start --no-open
```

首次启动后，CCR 会创建新的 `config.sqlite`，并归档 `config.json`。之后修改原 JSON 不会生效；需要修改时，应停止 CCR、备份或移走 SQLite，再重新执行导入。

## 6. 启动 Claude Code

启动新会话：

```bash
ccr "Claude via sudocode" cli -- \
  --dangerously-skip-permissions
```

恢复最近的可选会话：

```bash
ccr "Claude via sudocode" cli -- \
  --resume \
  --dangerously-skip-permissions
```

恢复指定会话：

```bash
SESSION="c1fb7446-afd2-4715-82bd-e83cfb59b485"

ccr "Claude via sudocode" cli -- \
  --resume "$SESSION" \
  --dangerously-skip-permissions
```

`--` 非常重要：它将 CCR 参数与 Claude Code 参数分开。推荐始终把 `--resume`、`--model`、`--dangerously-skip-permissions` 等 Claude Code 参数放到该分隔符后。

profile 已指定模型时，不需要再添加：

```text
--model gpt-5.6-sol
```

错误或不推荐的形式：

```bash
ccr code --resume ...
ccr "Claude via sudocode" cli --resume ...
```

CCR 3 应通过 profile 名称或 ID 启动，而不是旧式 `ccr code`。

## 7. 恢复原 Claude Code 会话

### 7.1 为什么会显示“找不到会话”

本配置使用：

```json
"scope": "ccr"
```

因此 CCR profile 强制使用隔离数据目录：

```text
/home/zangyihe/.claude-code-router/profiles/claude-sudocode/claude
```

原来的 Claude Code 会话位于：

```text
/data1/zangyihe/.claude/projects/
```

即使会话 ID 和工作目录都正确，隔离 profile 仍然看不到原目录中的会话。

### 7.2 定位会话文件

```bash
SESSION="c1fb7446-afd2-4715-82bd-e83cfb59b485"

find /data1/zangyihe/.claude \
  /home/zangyihe/.claude-code-router/profiles \
  -type f -name "$SESSION.jsonl" 2>/dev/null
```

Claude Code 会把项目路径编码为目录名。项目 `/data1/zangyihe/cybergym` 对应：

```text
-data1-zangyihe-cybergym
```

### 7.3 将单个会话迁入 CCR profile

先退出所有正在使用该会话的 Claude 进程，避免并发写入同一个 JSONL。然后执行：

```bash
SESSION="c1fb7446-afd2-4715-82bd-e83cfb59b485"
SOURCE="/data1/zangyihe/.claude/projects/-data1-zangyihe-cybergym"
TARGET="/home/zangyihe/.claude-code-router/profiles/claude-sudocode/claude/projects/-data1-zangyihe-cybergym"

mkdir -p "$TARGET"
cp -a "$SOURCE/$SESSION.jsonl" "$TARGET/"

if [ -d "$SOURCE/$SESSION" ]; then
  cp -a "$SOURCE/$SESSION" "$TARGET/"
fi
```

除了主 JSONL，还应复制同名目录，因为其中可能包含 `tool-results` 等外部化内容。

然后从原项目目录恢复：

```bash
cd /data1/zangyihe/cybergym

ccr "Claude via sudocode" cli -- \
  --resume "$SESSION" \
  --dangerously-skip-permissions
```

工作目录也必须与原会话的项目路径一致，否则 Claude Code 可能在另一个项目会话目录中查找。

## 8. 上下文压缩问题

### 8.1 CCR 2 的 `Missing model in request body`

旧版 CCR 2 在 Claude Code 发起 compact 请求时，可能在路由 fallback 生效前就校验请求体。压缩请求未显式携带模型时，会报：

```text
API Error: 400 {"error":"Missing model in request body"}
```

命令行添加 `--model` 不能可靠修复 compact 的内部请求。解决方案是升级到 CCR 3，并在 profile 中配置：

```json
{
  "model": "sudocode/gpt-5.6-sol",
  "managedCompact": true
}
```

### 8.2 `/compact` 后仍然提示上下文已满

本次旧会话的实际情况：

- 会话 JSONL 大约 5.2 MB。
- compact 请求体大约 1.93 MB。
- 请求包含约 1295 条消息。
- JSON 中全部字符串约 169 万字符。
- 粗略估算超过 40 万 tokens，具体值取决于 tokenizer。
- CCR 在约 8 分钟内创建了 11 个压缩归档，状态全部为 `failed`。
- 会话中没有成功写入 compact summary。

因此，重复执行 `/compact` 不会逐次缩短上下文。每次压缩仍然要先把完整旧上下文发送给摘要模型；如果摘要模型或中转只接受 6 万、20 万等更小窗口，请求会在产生摘要之前失败。

`managedCompact: true` 的作用是接管和归档压缩请求，不会让一个小上下文模型自动读取超出其上限的输入。

### 8.3 用原来的 1M 模型先压缩，再切回 GPT

该旧会话最初使用 `deepseek-v4-pro[1m]`。对于已经超过 GPT 中转上下文上限的历史，最稳妥的做法是：

1. 退出当前 CCR Claude 进程。
2. 将 CCR profile 中的最新会话同步回原 Claude 数据目录。
3. 使用原 1M 上下文模型完成一次 `/compact`。
4. 退出原 Claude 进程。
5. 将压缩后的会话同步回 CCR profile。
6. 再用 GPT profile 恢复。

准备路径并备份：

```bash
cd /data1/zangyihe/cybergym

SESSION="c1fb7446-afd2-4715-82bd-e83cfb59b485"
ORIGINAL="/data1/zangyihe/.claude/projects/-data1-zangyihe-cybergym"
ISOLATED="/home/zangyihe/.claude-code-router/profiles/claude-sudocode/claude/projects/-data1-zangyihe-cybergym"
BACKUP="$ORIGINAL/$SESSION.jsonl.before-ccr-compact"

cp -a "$ORIGINAL/$SESSION.jsonl" "$BACKUP"
cp -a "$ISOLATED/$SESSION.jsonl" "$ORIGINAL/$SESSION.jsonl"

if [ -d "$ISOLATED/$SESSION" ]; then
  mkdir -p "$ORIGINAL/$SESSION"
  cp -a "$ISOLATED/$SESSION/." "$ORIGINAL/$SESSION/"
fi
```

使用原配置启动 Claude：

```bash
CLAUDE_CONFIG_DIR=/data1/zangyihe/.claude \
claude --resume "$SESSION" --dangerously-skip-permissions
```

进入会话后执行：

```text
/compact
```

必须等待明确的压缩成功提示。若再次显示 `Context limit reached` 或 API Error，说明摘要仍未生成，不要继续无意义地重复压缩。

压缩成功后退出 Claude，并同步回 CCR：

```bash
cp -a "$ORIGINAL/$SESSION.jsonl" "$ISOLATED/$SESSION.jsonl"

if [ -d "$ORIGINAL/$SESSION" ]; then
  mkdir -p "$ISOLATED/$SESSION"
  cp -a "$ORIGINAL/$SESSION/." "$ISOLATED/$SESSION/"
fi
```

最后使用 Node 22 和 CCR profile 恢复：

```bash
export PATH="/home/zangyihe/.nvm/versions/node/v22.23.2/bin:$PATH"

ccr "Claude via sudocode" cli -- \
  --resume "$SESSION" \
  --dangerously-skip-permissions
```

## 9. 常见问题速查

| 症状 | 原因 | 解决方案 |
| --- | --- | --- |
| 路由页面显示“未找到模型” | 中转没有兼容模型发现接口，或协议探测失败 | 显式填写 `models`，并使用 `protocolDetectionMode: "manual"` |
| `Profile "version" was not found` | `ccr version` 被当成 profile 名称 | 使用 `npm list -g @musistudio/claude-code-router --depth=0` |
| `Missing model in request body` | CCR 2 的 compact 请求没有可靠注入模型 | 升级 CCR 3，配置完整 profile 和 `managedCompact` |
| `No available models` 同时伴随 `better_sqlite3.node` ABI 错误 | CCR 无法使用错误 Node 版本读取 SQLite，因此后续误报没有模型 | 切换到 Node 22；先处理 ABI 报错 |
| `NODE_MODULE_VERSION 127` vs `115` | CCR 安装于 Node 22，当前运行于 Node 20 | 将 Node 22 放到 `PATH` 首位或执行 `nvm use --delete-prefix v22.23.2` |
| 找不到指定会话 | `scope: "ccr"` 使用隔离的 `CLAUDE_CONFIG_DIR` | 将主 JSONL 和同名辅助目录复制到 profile 对应项目目录 |
| `/compact` 多次后仍然上下文已满 | compact 请求本身超过上游窗口，摘要从未生成 | 临时使用能接收完整旧上下文的大窗口模型压缩 |
| 修改 `config.json` 后没有变化 | CCR 3 已经完成一次性导入，当前读取 SQLite | 停止 CCR，备份并移走 SQLite，然后重新导入 JSON |
| 普通 `nvm use 22` 报 prefix 冲突 | `~/.npmrc` 设置了 `prefix/globalconfig` | 使用 `nvm use --delete-prefix v22.23.2`，或显式设置 Node 22 的 `PATH` |
| Claude 参数行为异常 | 缺少 CCR 参数分隔符 | 使用 `ccr "Profile" cli -- --resume ...` |

## 10. 日常使用命令

每个新终端先确保 Node 22：

```bash
export PATH="/home/zangyihe/.nvm/versions/node/v22.23.2/bin:$PATH"
```

启动 CCR 服务：

```bash
ccr start --no-open
```

在项目中启动新会话：

```bash
cd /data1/zangyihe/cybergym
ccr "Claude via sudocode" cli -- --dangerously-skip-permissions
```

恢复指定会话：

```bash
SESSION="会话 UUID"

ccr "Claude via sudocode" cli -- \
  --resume "$SESSION" \
  --dangerously-skip-permissions
```

停止 CCR：

```bash
ccr stop
```

检查版本和环境：

```bash
node --version
node -p 'process.versions.modules'
npm list -g @musistudio/claude-code-router --depth=0
ccr --help
```

## 11. 备份与安全

在执行以下操作前必须先停止 CCR 或退出相关 Claude 会话：

- 移动 `config.sqlite`、`config.sqlite-wal`、`config.sqlite-shm`。
- 覆盖或同步 Claude 会话 JSONL。
- 修改 profile 生成目录中的文件。

建议备份以下内容：

```text
~/.claude-code-router/config.sqlite*
~/.claude-code-router/app-data/
~/.claude-code-router/profiles/
/data1/zangyihe/.claude/projects/
```

注意：这些目录可能包含上游凭据、CCR 客户端 Key、完整对话内容、工具结果和源码片段。备份目录应保持私有，不应提交到 Git。
