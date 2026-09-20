# SSH 登录后 Conda 初始化卡顿排查记录

记录日期：2026-09-16（本机日期）  
目标主机：`zangyihe@100.88.94.46`  
远程系统：Ubuntu 22.04 系列，Linux 6.8.0-111-generic，Bash  
Conda 安装目录：`/data1/zangyihe/miniconda3`

> 本文中的 `~/.bashrc`、`/proc`、`/sys` 等路径均指远程服务器。本文档保存在本机 Windows 桌面。备份文件名使用远程服务器当时的时间，因此日期与本机记录日期不同。

## 1. 问题与最终结论

SSH 登录后，Conda 初始化经常卡住。用户将 `~/.bashrc` 中整个 `conda initialize` 区块注释后，可以正常连接。

本次排查确认：**主要原因是账号内存用量达到 cgroup 的 `memory.high` 软阈值，触发持续内存回收与分配限流，拖慢了 Conda 所依赖的 Python 启动。** `.bashrc` 中同步执行 Conda hook，使这个底层问题表现为 SSH 登录卡顿。

关键事实：

- 账号的 `memory.high` 为 **760 GiB**，当时账号用量约为 **760 GiB**。
- 三个 EvaluationClaw 验证进程占用约 **746 GiB RSS**，其中最大的一个约 **488 GiB**。
- `conda --version`、`conda shell.bash hook` 都超过 20 秒仍未完成。
- 独立启动 Conda Python 也会超时，系统 `strace` 工具同样出现启动超时。
- 经用户授权，仅终止最大的那个 Python 进程后，账号内存降至约 **281 GiB**，Conda 查询、hook 和激活均恢复到一秒以内。

本次没有重装 Conda，也没有调整服务器的内存限制。

## 2. 初始连接与启动配置检查

先使用非交互式 SSH 命令确认连接可用：

```bash
ssh -o BatchMode=yes -o ConnectTimeout=12 zangyihe@100.88.94.46
```

实际检查确认当前账号为 `zangyihe`，默认 shell 为 `/bin/bash`。

随后检查 `~/.bashrc`、`~/.profile` 及其他可能的 Bash 登录配置，发现：

1. `~/.profile` 会加载 `~/.bashrc`。
2. `~/.bashrc` 开头有标准的非交互式提前返回逻辑。
3. Conda 初始化区块已经用 `# TEMP_DISABLED_CONDA` 整体注释。
4. 原初始化使用以下方式同步生成 shell hook：

```bash
__conda_setup="$('/data1/zangyihe/miniconda3/bin/conda' 'shell.bash' 'hook' 2> /dev/null)"
```

该命令需要启动 Conda Python，完成之前 shell 会一直等待。它解释了为什么注释这个区块后能够恢复登录，但当时还不足以判断 Conda 为什么慢。

初始检查中，Windows PowerShell 直接向远端传递多行脚本时出现过 CRLF 干扰。后续统一将脚本转换为 LF、编码为 Base64，再在远端解码交给 Bash，以排除命令传输带来的影响。配置中与本问题无关的内容及凭据不收录到本文。

## 3. 将 Conda 初始化拆开测试

为避免诊断命令一直挂起，分别为测试设置超时。以下命令均在远端执行：

```bash
C=/data1/zangyihe/miniconda3

time timeout -k 2s 15s "$C/bin/python" -V
time timeout -k 2s 20s "$C/bin/conda" --version
time timeout -k 2s 20s "$C/bin/conda" shell.bash hook >/dev/null
time timeout -k 2s 10s "$C/bin/python" -I -S -c 'print("OK")'
```

测试结果：

| 测试 | 观察结果 | 意义 |
| --- | --- | --- |
| Conda Python `-V` | Python 3.14.6，约 3.44 秒 | 连版本查询也明显偏慢 |
| `conda --version` | 20 秒超时，退出码 124 | 卡顿不限于 shell hook |
| `conda shell.bash hook` | 20 秒超时，退出码 124 | 可直接复现登录初始化的阻塞点 |
| Conda Python `-I -S` 执行最小语句 | 10 秒超时 | 跳过用户环境及 `site` 初始化仍不能解决 |
| 系统 `/usr/bin/python3 -S` 执行最小语句 | 约 0.06 秒 | 系统 Python 当时能够快速启动 |
| `PYTHONMALLOC=malloc` 启动 Conda Python | 12 秒超时 | 该分配器覆盖未解决问题 |
| 设置 512 MiB 虚拟内存上限后启动 Conda Python | 8 秒超时 | 单个新进程的内存上限未解决问题 |
| `strace -V` / `strace --help` | 分别在 5 秒 / 8 秒超时 | 问题并不只影响 Conda |

超时命令的大部分 CPU 时间消耗在内核态，例如一次 Conda 版本查询耗时约 20 秒，其中 `sys` 约 18 秒。这个现象提示应继续检查系统资源压力，而不是只检查 Python 包或 Conda 插件。

尝试用 `strace` 跟踪 Conda Python 时，追踪文件未生成，随后确认 `strace` 自身启动也会超时，因此本次没有取得可用于定位的系统调用追踪。

另外确认：

- Conda 位于 `/data1` 的本地 ext4 文件系统，不是网络挂载。
- `bin/python` 指向 `python3.14`。
- Conda 安装历史显示曾安装 `gh`，但未发现足以解释本次卡顿的配置证据；后续未通过回滚包来处理。

## 4. 检查整机资源与大内存进程

检查命令包括：

```bash
uptime
free -h
cat /proc/pressure/cpu /proc/pressure/io /proc/pressure/memory
vmstat 1 3
ps -eo user,pid,ppid,stat,rss,pcpu,comm --sort=-rss | head -20
```

当时整机约有 1 TiB 内存，`free -h` 显示：

- 已用约 878 GiB；
- 可用约 116 GiB；
- 2 GiB swap 已用满。

整机内存压力指标较高，`vmstat` 也显示大量读入和较高的内核 CPU 消耗。不过，**整机仍有可用内存，不能仅根据 `free -h` 排除账号受到内存限制的可能性。**

进一步检查当前账号的大内存进程：

| PID | 当时 RSS | 父进程 PID | 用途 |
| --- | ---: | ---: | --- |
| `729297` | 约 487.62 GiB | `1` | EvaluationClaw 的 `02-computer-science` 验证任务，执行 `_verify/run_one.py` |
| `1238496` | 约 130.90 GiB | `1237702` | EvaluationClaw 的 `07-least-privilege` 验证任务，执行 `files/harness/tests/run_eval.py` |
| `1268931` | 约 127.62 GiB | `1` | 同一类 `07-least-privilege` 验证任务 |

这些进程通过 EvaluationClaw 的 `.venv/bin/python` 启动，实际可执行文件均指向 Conda 安装中的 `python3.14`。其中两个进程的父进程已经退出，进程被 PID 1 接管。

RSS 加总可能包含共享页，因此它用于识别主要内存占用者；判断账号是否触发限制，以 cgroup 的统计为准。仅凭父进程退出也不能认定任务可以终止，因此最初按用户要求保留了全部三个进程。

## 5. 关键定位：账号 cgroup 内存软阈值

检查当前 SSH 会话所属 cgroup 及其上级限制：

```bash
cat /proc/self/cgroup

for cg in /sys/fs/cgroup/user.slice \
          /sys/fs/cgroup/user.slice/user-1015.slice; do
    for f in memory.current memory.max memory.high memory.events memory.pressure; do
        printf '\n%s/%s\n' "$cg" "$f"
        cat "$cg/$f"
    done
done
```

当时采样结果：

| 范围 | `memory.current` | `memory.high` | `memory.max` |
| --- | ---: | ---: | ---: |
| 当前账号 `user-1015.slice` | 816,076,316,672 字节，约 760.03 GiB | 816,043,786,240 字节，760 GiB | 858,993,459,200 字节，800 GiB |
| 上级 `user.slice` | 911,278,665,728 字节，约 848.7 GiB | 912,680,550,400 字节，850 GiB | 944,892,805,120 字节，880 GiB |

进一步的证据：

- 账号 `memory.events` 的 `high` 计数很高，并持续增长。
- 一次相隔约 2 秒的采样，`high` 从 **162,177,155** 增至 **162,195,071**，增加 **17,916**。
- 账号内存压力的 `full avg10` 一度约为 **45%**，表明该 cgroup 内的任务因内存压力受到严重停顿影响。
- 账号的匿名内存约 813 GB，而文件缓存仅约 2.6 MB；结合很高的文件页重新读入计数，符合文件页被反复回收、重新加载的现象。
- `oom` 和 `oom_kill` 计数为 0：系统没有直接 OOM 杀进程，不代表没有内存限流。

`memory.high` 是软阈值。超过它时，内核会让该 cgroup 的任务承担内存回收并受到限流；这不要求整机内存耗尽，也不要求达到 `memory.max`。

因此，本次故障链路可以解释为：

```text
验证进程占用大量内存
  → 账号达到 760 GiB 的 memory.high
  → 持续回收内存、任务受限流
  → Conda Python 启动严重变慢
  → .bashrc 同步等待 conda shell.bash hook
  → SSH 登录看起来卡在初始化
```

## 6. 先缓解登录阻塞：直接加载 conda.sh

在保留验证进程期间，先验证不启动 Python 的 shell 初始化方式：

```bash
time bash --noprofile --norc -c '
    . /data1/zangyihe/miniconda3/etc/profile.d/conda.sh
    type -t conda
    printf "CONDA_SHLVL=%s\n" "$CONDA_SHLVL"
'
```

该测试约 **0.07 秒**完成，`conda` 注册为 shell 函数，`CONDA_SHLVL=0`。

随后只替换 `~/.bashrc` 中已被注释的 Conda 初始化区块，改为：

```bash
# >>> conda initialize >>>
# Load shell functions only: avoid starting Python during SSH login.
# Activate environments explicitly with: conda activate <environment>
if [ -r "/data1/zangyihe/miniconda3/etc/profile.d/conda.sh" ]; then
    . "/data1/zangyihe/miniconda3/etc/profile.d/conda.sh"
fi
# <<< conda initialize <<<
```

修改前完成 Bash 语法检查，并备份原文件到：

```text
/home/zangyihe/.bashrc.backup-conda-20260915-231827
```

修改后验证交互式登录 shell：

```bash
time timeout -k 2s 10s bash -lic '
    printf "LOGIN_OK\n"
    type -t conda
    printf "CONDA_EXE=%s\nCONDA_SHLVL=%s\n" "$CONDA_EXE" "$CONDA_SHLVL"
'
```

约 **1.1 秒**完成，输出 `LOGIN_OK`、`function` 及正确的 Conda 路径。测试没有分配终端，因此 Bash 提示无法设置终端进程组、没有 job control；这是测试方式导致的提示，不是本次故障。

这项修改使登录不再等待 Conda Python，也不自动激活 base。需要使用环境时手动执行 `conda activate <环境名>`。它缓解登录阻塞，但在内存压力尚未解除时，实际执行 Conda 命令仍可能卡顿。

## 7. 用户授权后，仅终止最大的一个进程

用户最初要求保留三个进程，随后明确授权终止其中内存占用最大的一个。

执行前重新检查了进程排名、账号归属、可执行文件和工作目录，确认目标仍是：

```text
PID: 729297
RSS: 约 487.62 GiB
EXE: /data1/zangyihe/miniconda3/bin/python3.14
CWD: /data1/zangyihe/EvaluationClaw/benchmark-output/batch-7-20260915/02-computer-science/assets/task-builder/dimension_1__dimension_1_task_design_1
```

终止过程：

1. 使用 `pidfd_open` 锁定目标进程，避免 PID 复用导致误操作。
2. 发送 `SIGTERM`，等待 10 秒。
3. 目标尚未退出，向同一进程发送 `SIGKILL`。
4. 再等待 10 秒时退出仍未完成，继续检查状态，没有操作其他任务。
5. 观察到该进程 RSS 降为 0，账号内存逐步下降；随后确认 `/proc/729297` 已不存在。

大内存进程收到强制终止信号后，内核清理资源仍可能需要时间。此次先观察到账号内存降至约 409 GiB，最终降至约 **281.39 GiB**。

另外两个进程 `1238496`、`1268931` 始终保留，最终检查时仍存在。

## 8. 内存释放后的复测

再次执行版本查询、hook 生成及实际环境激活：

```bash
time timeout -k 2s 20s /data1/zangyihe/miniconda3/bin/conda --version

time timeout -k 2s 20s \
    /data1/zangyihe/miniconda3/bin/conda shell.bash hook >/dev/null

time timeout -k 2s 20s bash --noprofile --norc -c '
    . /data1/zangyihe/miniconda3/etc/profile.d/conda.sh
    conda activate base && printf "ACTIVATED=%s\n" "$CONDA_PREFIX"
'
```

| 操作 | 处理前 | 处理后 |
| --- | --- | --- |
| `conda --version` | 超过 20 秒，超时 | **0.098 秒**，输出 `conda 26.7.0` |
| `conda shell.bash hook` | 超过 20 秒，超时 | **0.573 秒**，成功 |
| `conda activate base` | 未单独取得处理前耗时 | **0.449 秒**，成功 |
| 账号 cgroup 内存用量 | 约 760 GiB | 最终约 **281.39 GiB** |

激活结果：

```text
ACTIVATED=/data1/zangyihe/miniconda3
```

没有更换 Conda 包或 Python 版本，仅释放主要内存占用后，原先超时的 Conda 操作就迅速恢复。这为内存限流导致本次卡顿提供了直接的前后对照证据。

## 9. 当前状态与后续使用

- SSH 登录初始化已改为直接加载 `conda.sh`。
- 登录时不自动激活 base；需要时执行 `conda activate base` 或其他环境名。
- 新 SSH 会话自动加载修改；当前终端可以执行 `source ~/.bashrc`。
- 最大的验证进程已经终止，另外两个进程保留。
- Conda 版本查询、hook 生成、base 激活均已验证成功。
- 账号和上级 cgroup 的内存限制保持原值。

若之后再次卡顿，优先查看账号 `memory.current`、`memory.high`、`memory.events` 和大内存进程，不要只依据整机 `free -h` 判断。运行验证任务时，可考虑为单个任务设置内存和运行时限，避免一个任务占满账号额度。

若业务确实需要更多内存，应由管理员结合整机余量，同时评估账号和上级 `user.slice` 的限制；仅提高账号限制可能仍受上级限制影响。

如需恢复本次修改前的 `.bashrc`，先确认没有需要保留的后续编辑，再执行：

```bash
cp -p ~/.bashrc.backup-conda-20260915-231827 ~/.bashrc
```

注意：备份保留的是用户已经注释 Conda 初始化的状态，恢复后不会自动注册 Conda shell 函数。
