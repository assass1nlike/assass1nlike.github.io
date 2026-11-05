# 服务器上 Claude Code 更新失败的排查与修复

在服务器上执行 `npm install -g @anthropic-ai/claude-code` 失败。
日志显示，npm 更新时要使用的临时目录已存在且非空，导致 `ENOTEMPTY`。移走该目录后安装成功，随后核对 npm registry，将 Claude Code 更新到当时查询到的最新版 `2.1.310`。

## 确认环境与实际日志位置

通过 SSH 连接。以下 Bash 命令均在服务器上执行：

```bash
hostname
id
command -v node npm claude
node -v
npm -v
npm config get prefix
npm config get cache
npm config get registry
```

当时的环境为：

- Node：`/usr/bin/node`，版本 `v20.20.0`。
- npm：`/usr/bin/npm`，版本 `10.8.2`。
- 全局安装前缀：`/data1/zangyihe/npm-global`。
- npm 缓存：`/data1/zangyihe/.cache/npm`。
- registry：`https://registry.npmjs.org/`。

最初查看了默认位置 `~/.npm/_logs`，里面最新的日志仍是 7 月的 Codex 安装记录。查询 `npm config get cache` 后，才在实际缓存目录下找到这次 Claude Code 安装失败的日志：

```text
/data1/zangyihe/.cache/npm/_logs/2026-10-25T10_59_06_974Z-debug-0.log
```

查找当前 npm 日志可用：

```bash
ls -lt "$(npm config get cache)/_logs" | head -8
```

服务器虽然有 `~/.nvm`，但加载 `~/.nvm/nvm.sh` 后，实际使用的仍是上述系统 Node 和 npm。后续以命令实际解析到的路径和 npm 配置为准。

## 从报错定位目录冲突

失败日志的关键内容是：

```text
error code ENOTEMPTY
error syscall rename
error path /data1/zangyihe/npm-global/lib/node_modules/@anthropic-ai/claude-code
error dest /data1/zangyihe/npm-global/lib/node_modules/@anthropic-ai/.claude-code-eGcr3IA2
error errno -39
```

npm 在替换已安装的包之前，会先把旧目录移到一个临时位置。这次对应的操作是：

```text
claude-code → .claude-code-eGcr3IA2
```

但目标目录 `.claude-code-eGcr3IA2` 已存在且非空，因此重命名失败，安装停在替换旧包这一步。

检查相关目录与磁盘：

```bash
ls -la /data1/zangyihe/npm-global/lib/node_modules/@anthropic-ai
ls -la /data1/zangyihe/npm-global/lib/node_modules/@anthropic-ai/claude-code
ls -la /data1/zangyihe/npm-global/lib/node_modules/@anthropic-ai/.claude-code-eGcr3IA2
ls -l /data1/zangyihe/npm-global/bin/claude
df -h /data1/zangyihe/npm-global
```

现场状态进一步解释了失败原因：

- `claude-code` 目录只剩 `node_modules`，缺少包本身的入口与 `package.json`，安装已不完整。
- `.claude-code-eGcr3IA2` 中仍有 `package.json`、`cli-wrapper.cjs`、`install.cjs`、`bin` 等旧包文件，其时间戳为 8 月。
- 全局命令入口 `/data1/zangyihe/npm-global/bin/claude` 不存在。
- 相关目录属于当前用户；所在磁盘还有约 `828G` 可用空间。

这些证据确定了直接原因：旧安装残留占用了 npm 本次重命名的目标路径。残留最初由哪一次操作产生，现有日志没有确认。

## 移走残留并重新安装

先把冲突目录移到缓存目录下的临时备份，再重新运行安装命令：

```bash
set -e

backup_dir=$(mktemp -d /data1/zangyihe/.cache/claude-npm-repair.XXXXXX)
printf 'Repair backup: %s\n' "$backup_dir"

mv /data1/zangyihe/npm-global/lib/node_modules/@anthropic-ai/.claude-code-eGcr3IA2 \
   "$backup_dir/retired-package"

npm install -g @anthropic-ai/claude-code
/data1/zangyihe/npm-global/bin/claude --version
npm list -g @anthropic-ai/claude-code --depth=0
```

本次生成的备份目录是 `/data1/zangyihe/.cache/claude-npm-repair.B13E8A`。安装用时约 36 秒，输出：

```text
changed 9 packages in 36s
2.1.197 (Claude Code)
/data1/zangyihe/npm-global/lib
└── @anthropic-ai/claude-code@2.1.197
```

这一步消除了目录冲突，并恢复了 `claude` 命令。随后继续检查安装版本是否为最新版：

```bash
bash -ic 'command -v claude; claude --version'
npm view @anthropic-ai/claude-code version
```

交互式 Bash 解析到 `/data1/zangyihe/npm-global/bin/claude`，版本为 `2.1.197`；registry 查询却返回 `2.1.310`。此前安装日志有元数据缓存命中记录，但未进一步核实 npm 为何选中 `2.1.197`。因此直接指定刚查询到的版本安装：

```bash
npm install -g @anthropic-ai/claude-code@2.1.310
```

安装输出 `changed 2 packages in 5s`，同时出现 Node 版本要求提示：

```text
npm warn EBADENGINE Unsupported engine {
  package: '@anthropic-ai/claude-code@2.1.310',
  required: { node: '>=22.0.0' },
  current: { node: 'v20.20.0', npm: '10.8.2' }
}
```

该提示没有阻止安装。本次保留了原有 Node 环境，未升级 Node。

## 验证结果与清理

最终执行了命令路径、版本、全局安装记录和帮助命令检查：

```bash
bash -ic 'command -v claude; claude --version'
npm list -g @anthropic-ai/claude-code --depth=0
/data1/zangyihe/npm-global/bin/claude --help >/dev/null
ls -A /data1/zangyihe/npm-global/lib/node_modules/@anthropic-ai
```

结果为：

```text
/data1/zangyihe/npm-global/bin/claude
2.1.310 (Claude Code)
/data1/zangyihe/npm-global/lib
└── @anthropic-ai/claude-code@2.1.310
```

`claude --help` 退出码为 `0`，`@anthropic-ai` 目录下只剩正常的 `claude-code` 目录。首次恢复成功后，临时备份也已删除，并确认路径不再存在：

```bash
rm -rf -- /data1/zangyihe/.cache/claude-npm-repair.B13E8A
test ! -e /data1/zangyihe/.cache/claude-npm-repair.B13E8A
```

最终状态：原来的 `ENOTEMPTY` 已解决，Claude Code 已安装为 `2.1.310`，命令入口和基础启动检查正常。Node 仍为 `20.20.0`，低于该包声明的 `>=22.0.0`。
