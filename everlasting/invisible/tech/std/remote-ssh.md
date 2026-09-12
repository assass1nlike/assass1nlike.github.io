# Remote-SSH 连接故障排查与修复记录

## 1. 问题描述

本机通过 PowerShell 执行 SSH 可以连接远程服务器，但 VS Code Remote-SSH 无法稳定连接服务器 `182.18.81.126`。

连接账号：`zangyihe`

本机 SSH 配置别名：`tstar_003`

## 2. 排查过程

### 2.1 检查本机 SSH 配置

读取了以下配置：

```text
Host tstar_003
  HostName 182.18.81.126
  User zangyihe
  IdentityFile C:/Users/15951/.ssh/id_ed25519
```

本机使用 Windows OpenSSH：

```text
C:\Windows\System32\OpenSSH\ssh.exe
OpenSSH_for_Windows_9.5p2
```

### 2.2 使用详细日志测试 SSH 握手

执行：

```powershell
ssh -vvv -o BatchMode=yes -o ConnectTimeout=15 tstar_003 exit
```

结果：

- TCP 连接建立成功。
- 远端 SSH 服务返回 `OpenSSH_8.9p1 Ubuntu`。
- 远端主机密钥与本机 `known_hosts` 匹配。
- `id_ed25519` 被服务器接受。
- 用户 `zangyihe` 公钥认证成功。
- 远程命令返回退出状态 `0`。

因此，网络、22 端口、用户名、私钥和 SSH 服务均正常，故障不在基础 SSH 连接层。

### 2.3 检查 VS Code Remote-SSH 日志

VS Code 版本为 `1.135.0`，Remote-SSH 扩展版本为 `0.129.2026082615`。

日志显示 VS Code 能够：

- 调用正确的 OpenSSH 可执行文件。
- 登录远程服务器。
- 找到并启动已有的 VS Code Server。
- 建立 SSH 动态转发和远程端口映射。

但随后反复出现：

```text
Installing extensions...
```

并在约 1 分钟后重连。

### 2.4 检查远端 VS Code Server 日志

远端日志显示扩展安装失败，访问 Marketplace CDN 时超时：

```text
https://ms-python.gallerycdn.vsassets.io/... - error GET AggregateError [ETIMEDOUT]
https://ms-toolsai.gallerycdn.vsassets.io/... - error GET AggregateError [ETIMEDOUT]
Error: Failed Installing Extensions: ms-toolsai.jupyter, ms-python.python
```

远端磁盘和内存资源正常，VS Code Server 进程也在运行，因此不是资源不足或服务端安装损坏。

### 2.5 定位触发配置

本机 `settings.json` 中存在：

```json
"remote.SSH.defaultExtensions": [
    "ms-python.python",
    "ms-toolsai.jupyter-renderers",
    "ms-toolsai.jupyter-keymap",
    "ms-toolsai.jupyter"
]
```

该配置会在每次 Remote-SSH 连接时要求远程端自动安装这些扩展。由于远程服务器访问扩展 CDN 超时，安装失败并阻塞了 Remote-SSH 的连接流程。

## 3. 根因结论

基础 SSH 连接完全正常。直接原因是：

1. 远程服务器无法稳定访问 VS Code Marketplace 的扩展 CDN。
2. 本机配置了 `remote.SSH.defaultExtensions`，导致 Remote-SSH 每次连接都强制执行扩展安装。
3. 扩展安装超时或失败后，Remote-SSH 进入重连循环，表现为“VS Code 连不上，但 PowerShell 可以”。

## 4. 已执行的修复

### 4.1 备份配置

已创建原始配置备份：

```text
C:\Users\15951\AppData\Roaming\Code\User\settings.json.bak-remote-ssh-20260907
```

### 4.2 移除自动安装扩展配置

从以下文件中移除了 `remote.SSH.defaultExtensions`：

```text
C:\Users\15951\AppData\Roaming\Code\User\settings.json
```

SSH 主机配置和 `remote.SSH.remotePlatform` 保持不变。

## 5. 修复验证

重新启动 `ssh-remote+tstar_003` 后，最新 Remote-SSH 日志显示：

```text
Extensions to install:
Remote server is listening on port ...
Exec server for ssh-remote+tstar_003 created and cached
Verified and reusing cached exec server
```

不再执行扩展自动安装，也不再出现因扩展安装失败导致的重连循环。SSH 命令行连接仍返回成功。

## 6. 后续策略

- 当前优先保证 Remote-SSH 连接稳定，扩展不再由连接流程自动安装。
- 如果远端 Marketplace 网络恢复，可以在 VS Code 连接成功后手动安装 Python/Jupyter 扩展。
- 如果远端网络长期受限，应为远程服务器配置可用的 HTTP/HTTPS 代理，或采用离线下载后传输 `.vsix` 文件的方式安装扩展。
- 不建议在远端网络不可用时恢复 `remote.SSH.defaultExtensions`，否则同类连接阻塞仍可能再次出现。

## 7. 回滚方式

如需恢复原配置，可用备份文件覆盖当前设置：

```powershell
Copy-Item `
  "$env:APPDATA\Code\User\settings.json.bak-remote-ssh-20260907" `
  "$env:APPDATA\Code\User\settings.json" `
  -Force
```

