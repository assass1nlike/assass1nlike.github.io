# Codex `resume` 卡死排查与修复

适用于 Linux / macOS 上的 Codex CLI（本文基于 0.16x 版本，以 Linux 命令为例）。

## 现象

执行 `codex resume` 后出现下列任意一种情况：

- 终端一直黑屏，会话列表加载不出来；
- 列表能出来，选中会话回车后一直停在 `resuming session`；
- 列表能出来，但最近的会话都不在里面；
- 恢复时提示 `This conversation is open in another app`。

这几种现象有不同的原因，需要分别处理。

## 先看日志

Codex 把运行日志写在 `~/.codex/logs_*.sqlite`，每次启动对应一个 `process_uuid`。用它可以确认卡在哪一步：

```bash
sqlite3 ~/.codex/logs_2.sqlite "
select datetime(ts,'unixepoch','localtime'), level, target, substr(replace(feedback_log_body,char(10),' '),1,200)
from logs
where ts > strftime('%s','now','-10 minutes') and level in ('WARN','ERROR')
order by ts, ts_nanos;"
```

要点：

- 看 `thread/resume`、`thread/list` 之后有没有后续日志；日志在某一步之后完全消失，说明在等外部响应或等锁。
- 报 `thread-store conflict: thread ... already has an active writer` 就是下面的第 2 种情况。
- `chatgpt authentication required for remote plugin catalog`、`failed to warm featured plugin ids cache` 之类的插件警告，在使用自定义 API 时是常态，与卡死无关。
- `OS file watch limit reached` 说明系统的 inotify 监听额度（`fs.inotify.max_user_watches`）被耗尽，常见于 VS Code Server 占满额度；它只会产生警告，会话照常恢复。

## 原因与处理

### 1. 选择器按模型提供方过滤，看不到近期会话

`codex resume` 默认只列出与当前配置使用同一 `model_provider` 的会话。如果平时用 `-c model_provider="xxx"` 临时切换提供方，而 `config.toml` 里的默认提供方是另一个，那么用 `xxx` 创建的会话在默认的选择器里都不可见。

这不是卡死，用同样的参数启动即可：

```bash
codex -c model_provider="xxx" resume --all
```

`--all` 取消按当前目录过滤。也可以直接按会话 id 恢复，id 可在 `~/.codex/session_index.jsonl` 中按标题查到：

```bash
codex resume <session-id>
```

### 2. 会话被守护进程占着：`already has an active writer`

守护进程会保留打开过的会话。如果使用该会话的客户端被强行结束，会话会继续被守护进程持有，之后用别的方式恢复就会报 `open in another app` 或 `active writer`。

重启守护进程释放它（`restart` 会把已加载的会话重新加载，不能清掉，需要 `stop` 再 `start`）：

```bash
codex app-server daemon stop && codex app-server daemon start
```

## 自检与绕过手段

- `codex resume --no-daemon`：不经过守护进程，在进程内读取会话。如果它正常而默认方式卡住，问题在守护进程。
- 直接问 app-server 要会话列表，可以排除会话数据本身的问题：

  ```bash
  codex app-server --listen stdio://
  # 然后依次发送（每行一条 JSON）：
  # {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"clientInfo":{"name":"diag","version":"0"}}}
  # {"jsonrpc":"2.0","method":"initialized"}
  # {"jsonrpc":"2.0","id":2,"method":"thread/list","params":{"limit":5}}
  ```

  正常情况下一秒内返回会话列表。
- 会话文件（`~/.codex/sessions/**/rollout-*.jsonl`）是逐行 JSON，可以逐行解析确认是否损坏；排查中会话文件和 `state_*.sqlite` 的 `integrity_check` 都是好的，不需要重建数据。

## 卡死本身的触发原因

上面两种情况都能确定原因并复现。真正的“黑屏”和“停在 `resuming session`”则没有找到单一的触发因素。以下情况单独存在时，都没能复现卡死，但它们属于不健康的状态，建议顺手清理：

- 守护进程版本落后于 CLI：`codex app-server daemon version` 中 `cliVersion` 与 `appServerVersion` 不一致。更新用 `codex app-server daemon update`，它会重启守护进程，正在其中运行的任务可能被中断。
- 长期不退出的旧 codex 进程，尤其是升级后 `/proc/<pid>/exe` 显示 `(deleted)` 的进程，会一直持有 `~/.codex/.sqlite-maintenance.lock` 和各会话的写锁。持有锁期间新的恢复仍然成功，但这些进程不再需要时应结束。查看持有者：

  ```bash
  for f in ~/.codex/.sqlite-maintenance.lock ~/.codex/thread-writer-locks/*.lock; do
    i=$(stat -c %i "$f"); echo "$f"; grep ":$i " /proc/locks
  done
  ```

  输出里的数字是持有锁的进程 PID，macOS 上用 `lsof <文件>` 代替 `/proc/locks`。

另外已经排除的因素：环境里有无代理变量、inotify 额度耗尽、会话历史索引（`thread_history_*.sqlite`）落后于会话文件。

如果再次卡死，先不要结束进程，按下面的顺序取证：

1. 用上面的日志查询看该进程最后一条日志停在哪一步、时间是多少；
2. 查看其线程是否全部处于等待状态：`for t in /proc/<pid>/task/*; do cat $t/wchan; echo; done | sort | uniq -c`；
3. 查看它持有和等待的锁：`grep -E " <pid> |->" /proc/locks`；
4. 记录当时的启动方式（终端类型、是否带 `--no-daemon`、`-c model_provider`）。
