# VS Code Remote-SSH 下扩展快捷键报 command not found

本文基于 Windows 本机 + Linux 远端的 VS Code Remote-SSH，VS Code 版本 1.145 / 1.146。远端主机在本机 SSH 配置中的别名记为 `gpu-server`。

## 现象

在远端窗口里打开 Markdown 文件，按两个扩展提供的快捷键都没反应，右下角提示 `command 'xxx' not found`：

- `ctrl+shift+v`：Markdown Preview Enhanced 的 `markdown-preview-enhanced.openPreview`；
- `ctrl+shift+alt+m`：Markdown Editor 的 `markdown-editor.openEditor`。

此前这两个快捷键一直可用，扩展列表里两个扩展也都显示为已安装。

## 排查

### 扩展本身完好

远端扩展装在 `~/.vscode-server/extensions/`。检查了三处：

1. 两个扩展的目录都在，入口文件（`package.json` 里 `main` 指向的 js）存在且可读；
2. 注册表 `~/.vscode-server/extensions/extensions.json` 里有这两个扩展，路径正确，也没有 `.obsolete` 标记把它们标成待删除；
3. 两个扩展的 `package.json` 里 `contributes.keybindings` 都还声明着上面两个快捷键。

快捷键能被识别、却报命令不存在，说明问题出在扩展有没有被加载。原因在于 VS Code 的快捷键声明来自 `package.json`，UI 端直接读取，不需要扩展运行；命令则要等扩展在扩展宿主（extension host）里激活后，由扩展代码调用 `registerCommand` 注册。扩展宿主没加载扩展时，就会出现"按键有响应、命令找不到"。

### 远端扩展宿主的日志

远端每次启动 server 会在 `~/.vscode-server/data/logs/<时间戳>/` 下建一个日志目录，扩展宿主的日志在其中的 `exthost*/remoteexthost.log`。扩展正常激活时能看到：

```text
ExtensionService#_doActivateExtension shd101wyy.markdown-preview-enhanced, startup: false, activationEvent: 'onLanguage:markdown'
ExtensionService#_doActivateExtension zaaack.markdown-editor, startup: false, activationEvent: 'onLanguage:markdown'
```

前一天晚上那次连接的日志里有这两行，扩展当时是正常的。出问题之后的情况是：

1. 新起的一次连接用的是另一个版本的 server（1.146.0），它的日志目录里只有 agent host 相关的日志，没有任何 `exthost*` 子目录，也就是这次连接根本没有启动扩展宿主；
2. 旧版本 server（1.145.2）同时又拉起了第二个扩展宿主，它在获取工作区存储的锁时失败：

   ```text
   Error: EEXIST: file already exists, open '.../workspaceStorage/<hash>/vscode.lock'
   Lock '.../workspaceStorage/<hash>/vscode.lock': The lock does not look stale, elapsed: 965 ms, giving up.
   Lock '.../workspaceStorage/<hash>-1/vscode.lock': Lock acquired.
   ```

   锁被第一个扩展宿主持有，第二个只好改用 `<hash>-1` 这个新的存储目录，之后日志里再没有任何扩展激活记录。

`ps` 也印证了这一点：远端同时跑着 1.145.2 和 1.146.0 两套 server 进程。

### 本机日志

本机窗口日志在 `%APPDATA%\Code\logs\<时间戳>\window<N>\renderer.log`。出问题前后能看到：

```text
resolveAuthority(ssh-remote) returned an error after 143319 ms
[remote-connection][ExtensionHost][reconnect] A RemoteAuthorityResolverError occurred while trying to reconnect. Will give up now!
```

即窗口和远端扩展宿主的连接断开后重连失败，VS Code 放弃了重连。此后日志中一直是 `[RemoteAgentHostProtocol] Transport lost ... Reconnecting ...` 的循环。

另外本机 `D:\Microsoft VS Code\` 下有三个版本目录（1.145.2、1.145.3、1.146.0），其中正在运行的是 1.145.2，`new_Code.exe` 为 1.146.0，是一个已经下载、但还没切换过去的更新。远端 `~/.vscode-server/cli/servers/` 下则攒了 6 个版本的 server。

## 原因

窗口与远端扩展宿主的连接断开并放弃重连后，窗口还保持着远端界面，但它此时连接的远端环境里没有加载扩展的扩展宿主：新版本 server 那次连接没有启动扩展宿主，旧版本 server 补起的扩展宿主又因为抢不到工作区锁而没有加载扩展。于是快捷键仍然生效，对应的命令却从未注册。

本机和远端多个 VS Code 版本并存（本机还有待应用的更新），使得一次重连可能落到另一个版本的 server 上，增加了出现这种半连接状态的机会。

## 处理

关闭远端连接后重新连接，让 server 和扩展宿主重新完整地启动一次。命令面板执行 `Remote: Close Remote Connection`，再重新连接 `gpu-server`；直接关掉窗口重开也可以。

如果重连后仍有残留进程，可以先结束自己账号下的 VS Code server 进程再连接（会中断远端正在运行的 VS Code 终端）：

```bash
ssh gpu-server 'pkill -u "$USER" -f ".vscode-server/cli/servers"'
```

重连后检查最新日志目录下的 `exthost*/remoteexthost.log`，出现上文两行 `_doActivateExtension` 即恢复正常。本次重连之后的几次会话中，两个扩展都已正常激活，快捷键恢复。

## 清理旧版本

顺带清理了两端多余的版本，减少版本错位。

远端：`~/.vscode-server/cli/servers/` 下每个 `Stable-<commit>` 目录是一个版本的 server，约 650 MB。只保留有进程在用的版本，其余删除。判断是否在用时，用进程命令行里是否出现该目录路径来统计：

```bash
ps -u "$USER" -o args= | grep -F "Stable-<commit>/" | grep -v grep | wc -l
```

不要用 `pgrep -f "Stable-<commit>"` 判断后接 `rm`：如果这条判断和 `rm` 写在同一条 `ssh` 命令里，`pgrep` 会匹配到这条命令自身的命令行，把所有目录都判成"在用"。本次删掉 4 个旧版本后，`~/.vscode-server` 从 5.7 GB 降到 3.1 GB。

本机：`D:\Microsoft VS Code\` 下的版本目录中，正在运行的版本和 `new_Code.exe` 对应的待更新版本要保留，其余可以删除。当前运行实例实际加载的是哪个目录，可以从 `Code.exe` 进程加载的模块路径看出来：

```powershell
(Get-Process Code | Select-Object -First 1).Modules |
  Where-Object FileName -like '*Microsoft VS Code\*\resources*' |
  Select-Object -First 1 -ExpandProperty FileName
```

此外 `%APPDATA%\Code\CachedExtensionVSIXs` 存放扩展安装包的下载缓存，旧版本的安装包可以清空；`%APPDATA%\Code\CachedData` 下按 commit 命名的目录，只需保留当前版本和待更新版本对应的两个。
