# Claude Code 读 PDF 误报 "PDF is password-protected" 的定位与解决

## 现象

在 Windows 上用 Claude Code 的 Read 工具读取 PDF,报错:

```
PDF is password-protected. Please provide an unprotected version.
```

但这些 PDF 并没有加密,换别的 PDF 也是同样的错。

## 定位过程

### 1. 先排除文件本身有问题

| 检查 | 结果 |
| --- | --- |
| `pypdf.PdfReader(...).is_encrypted` | `False` |
| `pdfinfo` | `Encrypted: no` |
| 原始字节中搜索 `/Encrypt` | 0 处 |
| trailer 字典 | 只有 `/Size /Info /Root /ID`,没有 `/Encrypt` |
| `pdftoppm -png` 渲染第 1 页 | 成功 |
| `pdftotext -layout` 抽取文字 | 成功 |

同时换了另外两份无关的 PDF 用 Read 读,报同样的错。结论:问题出在 Read 工具所依赖的环境,而不是某个 PDF。

### 2. 找到报错的来源

Read 读 PDF 时会调用外部命令 `pdftoppm`(poppler 的一部分)把页面渲染成图片。在 Claude Code 的可执行文件里,我找到了对应的逻辑,大意如下(已简化):

```text
args = ["-jpeg", "-r", "100", ("-f", 起始页), ("-l", 结束页), PDF 路径, 输出前缀]
调用 pdftoppm(args)
如果返回码不为 0:
    如果 stderr 匹配 /password/i  ->  报 "PDF is password-protected"
    (其他分支:页数超范围、文件损坏、I/O 错误等)
```

也就是说,只要 `pdftoppm` 调用失败,且 stderr 里出现 "password" 这个词,就会被归类为"密码保护"。

### 3. 找到触发条件

本机 PATH 里最先被找到的 `pdftoppm`,是 TeX Live 自带的构建(poppler 25.02.0)。它**不支持 `-jpeg` 选项**,`-h` 里只列出了 `-png`,没有 `-jpeg`、`-tiff`。

手动复现:

```bash
pdftoppm -r 60 -f 1 -l 1 -jpeg some.pdf out    # 返回码 99,打印完整用法说明
pdftoppm -r 60 -f 1 -l 1 -png  some.pdf out    # 返回码 0,正常
```

不支持的选项会让 `pdftoppm` 打印用法说明。而这份用法说明里恰好有两行:

```
-opw <string> : owner password (for encrypted files)
-upw <string> : user password (for encrypted files)
```

用法说明里的 "password" 命中了上面的正则,所以被误判成"文件有密码"。

### 因果链

```
PATH 中的 pdftoppm 来自 TeX Live,不支持 -jpeg
  -> Read 调用 pdftoppm -jpeg ... 失败(返回码 99),stderr 是用法说明
  -> 用法说明里含 "-opw / -upw ... password"
  -> 命中 /password/i
  -> 被误报为 "PDF is password-protected"
```

## 解决方案

核心思路:让 PATH 中**优先**被找到的 `pdftoppm` 是支持 `-jpeg` 的构建。

选择了"独立目录 + 只加这一个路径"的方式,避免把一个装满 DLL 的大目录放进 PATH 而覆盖其他程序用到的同名 DLL。

### 步骤

1. 下载支持 JPEG 的 Windows 预编译 poppler,用的是 GitHub 上 `oschwartz10612/poppler-windows` 的发布包(本次是 26.09.0)。
   - 下载到一个全新的临时目录里解压,不要在里面运行任何东西。
2. 只取出压缩包里的 `Library/bin`,放到独立目录,例如 `<TOOLS_DIR>\poppler\bin`。
3. 先验证新构建确实支持 `-jpeg`:

   ```bash
   <TOOLS_DIR>/poppler/bin/pdftoppm -jpeg -r 100 -f 1 -l 1 some.pdf out
   # 返回码 0,生成 out-1.jpg
   ```

4. 备份当前用户 PATH,再把新目录加到**用户 PATH 的最前面**:

   ```powershell
   $old = [Environment]::GetEnvironmentVariable('Path','User')
   Set-Content -Path '<TOOLS_DIR>\poppler\user_path_backup.txt' -Value $old -Encoding utf8
   [Environment]::SetEnvironmentVariable('Path', '<TOOLS_DIR>\poppler\bin;' + $old, 'User')
   ```

   - 需要先确认旧的 `pdftoppm`(这里是 TeX Live)在**用户** PATH 还是**系统** PATH 里。Windows 的有效 PATH 是"系统在前、用户在后"。如果旧的在系统 PATH 里,只改用户 PATH 是压不过它的,要改系统 PATH。
   - 本机的情况是旧的在用户 PATH 里,系统 PATH 里没有别的 `pdftoppm`,所以放在用户 PATH 最前面即可生效。
5. 在新开的进程里确认解析结果:

   ```powershell
   $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
   (Get-Command pdftoppm).Source      # 应指向 <TOOLS_DIR>\poppler\bin\pdftoppm.exe
   ```

6. 删除下载的压缩包和解压出来的临时目录,只保留 `bin` 和 PATH 备份。
7. **让新 PATH 真正传到 Claude Code 进程里**。它在启动时继承环境变量,已经运行的会话看不到新的 PATH。注意"重启 Claude Code"往往还不够,见下一节。

### 改了 PATH 之后新会话仍然报错:环境变量没有传到进程

这一步最容易踩坑。注册表里的用户 PATH 改好了,新开的 Claude Code 会话照样报同样的错。

**现象**:新会话里 `(Get-Command pdftoppm).Source` 仍然指向 TeX Live,进程的 PATH 里没有新目录。

**原因**:Windows 进程只在**启动时**继承环境变量,之后不会再更新。如果 Claude Code 是在 VS Code 集成终端里启动的,它的环境来自"VS Code 主进程 -> 终端 -> Claude Code"这条链。VS Code 主进程如果是修改 PATH 之前启动的,下面所有子进程拿到的都是旧 PATH。

**怎么诊断**:沿着进程祖先链看每一级的启动时间。

```powershell
$p = $PID
1..6 | % {
  $pr = Get-CimInstance Win32_Process -Filter "ProcessId=$p"
  if ($pr) { "$($pr.ProcessId) $($pr.Name) start=$($pr.CreationDate)"; $p = $pr.ParentProcessId }
}
```

如果链上出现 `Code.exe`,且它的启动时间早于你修改 PATH 的时间,就是这个问题。再用下面的命令看有没有 VS Code 主进程残留:

```powershell
Get-CimInstance Win32_Process -Filter "Name='Code.exe'" | Select-Object ProcessId,ParentProcessId,CreationDate
```

本次的情况是:**关窗口、重载窗口并没有让 VS Code 主进程退出**,只有渲染进程(`--type=renderer`)是新起的,主进程还是几天前启动的那个。

**两个能生效的做法**

1. **彻底退出 VS Code 再重开**。关掉所有窗口,到任务管理器里确认没有 `Code.exe` 残留,再打开。新的主进程会重新读取用户 PATH,之后所有会话自动带上新目录,不用再维护。
2. **在 Claude Code 的设置文件里写 `env.PATH`**。对 `--settings` 指定的文件(或默认的 `settings.json`)的 `env` 加一个 `PATH` 键:

   ```json
   {
     "env": {
       "PATH": "<TOOLS_DIR>\\poppler\\bin;<你当前完整的 PATH>"
     }
   }
   ```

   - `env` 里**不支持** `${env:PATH}` 这类展开,必须写成完整的字面量 PATH。因此它是一份快照,以后 PATH 变了要重新生成。
   - 生成方式:读取现有设置文件,只改 `env.PATH`,其余键保持不变。
   - 写文件时用 UTF-8 **无 BOM**,避免部分 JSON 解析器报错。
   - 验证时用一个只含 `env.PATH` 的临时设置文件启动无界面 Claude Code(`claude -p ... --settings tmp.json`),在 shell 的 PATH 仍是旧的情况下 Read 能读 PDF,即说明这条路可行。
   - 要确认你启动时真正传给 `--settings` 的是哪个文件。命令行里写的文件和你改的文件不是同一个时,改动不会生效。

**一个常见的误配置**:把 VS Code 的设置项 `terminal.integrated.env.windows` 写进 Claude Code 的设置文件。这个键只在 **VS Code 自己的 `settings.json`** 里有效,Claude Code 不认,写了没有任何效果。

### 撤销

恢复备份的用户 PATH:

```powershell
[Environment]::SetEnvironmentVariable('Path', (Get-Content '<TOOLS_DIR>\poppler\user_path_backup.txt' -Raw).Trim(), 'User')
```

或者在系统环境变量界面里删掉第一项 `<TOOLS_DIR>\poppler\bin`。

## 验证状态

| 项目 | 状态 |
| --- | --- |
| 新构建支持 `-jpeg`,手动渲染成功 | 已验证 |
| 新开进程中 `pdftoppm` 解析到新目录 | 已验证 |
| 只重启 Claude Code(VS Code 主进程未退出)后 Read 能读 PDF | **不行**,PATH 仍是旧的,见上一节 |
| 在 shell 里临时把新目录加到 PATH 后启动无界面 Claude Code,Read 能读 PDF | 已验证 |
| 在设置文件 `env.PATH` 里写字面量 PATH 后,Read 能读 PDF | 已验证 |
| 按所选做法让新 PATH 传到会话后,Read 能正常读 PDF | 已验证(最终使用者确认问题解决) |
| Codex 等其他 coding agent 是否同样受益 | **未验证**。取决于它们是否通过 PATH 调用 `pdftoppm`、用什么参数 |

## 注意点与可能的副作用

- 只加一个只含 poppler 文件的独立目录,影响范围小。不要把 conda 之类的 `Library\bin` 大目录放到 PATH 前面,里面的 DLL 可能覆盖别的程序依赖的版本。
- 之后其他调用 `pdftoppm` 的程序(例如 Python 的 `pdf2image`、Inkscape)也会改用新版本。不同版本输出差异一般很小,但不能完全排除。
- Claude Code 以后若改了调用参数或换了 PDF 后端,这个修复可能失效。
- 设置文件里的 `env.PATH` 是快照,用它的话,以后 PATH 有变化要同步更新;想免维护就走"彻底退出 VS Code 再重开"。
- 设置文件里通常还放着 API 地址、密钥等敏感信息。排查时不要整份打印或粘贴,更不要把含密钥的内容发布出去。如果不小心泄露过,应作废并重新生成。
- 这是一个**报错信息误导**的问题:Read 用"stderr 里出现 password"来判断加密,所以任何会让 `pdftoppm` 打印用法说明的原因(参数不被支持、版本过旧等)都会表现成同样的报错。以后再遇到,先手动运行 `pdftoppm -jpeg -r 100 -f 1 -l 1 x.pdf out` 看真实的 stderr。

## 没有修复时的临时办法

- 用 `pdftotext -layout file.pdf out.txt` 抽取文字,再读文本文件。
- 需要看图时用 `pdftoppm -png -r 100 -f N -l N file.pdf out`,再读生成的 png。
