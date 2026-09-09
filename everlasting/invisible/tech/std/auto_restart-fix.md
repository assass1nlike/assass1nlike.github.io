# 蓝屏事件原因与修复记录

> 设备：Lenovo ThinkBook 14 G8+ IPH（21VG）  
> 系统：Windows 11 家庭版 25H2，Build 26200.9168  
> 事件日期：2026-09-01（Asia/Shanghai）  
> 当前状态：故障路径已隔离，BIOS 已更新，自动重启限制已生效

## 一、结论摘要

之前的多次蓝屏由 **Intel NPU 内核驱动 `npu_kmd.sys` 挂死**引起。

该驱动故障首先触发图形设备超时 `LiveKernelEvent 141`。Windows 尝试重置设备但未能恢复，随后视频内存管理器 `dxgmms2.sys` 进入无法恢复的内部状态，最终产生停止码：

```text
0x0000010E VIDEO_MEMORY_MANAGEMENT_INTERNAL
参数 1：0x37
```

蓝屏发生时，Windows 的 `CrashControl\AutoReboot` 原值为 `1`。因此系统写入内存转储后自动重启，用户看到的现象就是：没有预兆地显示“你的电脑遇到问题，需要重启”，随后电脑自行重启。

这次事件不是普通 Windows 更新主动重启，也没有证据表明是断电导致。

## 二、故障证据

### 1. Windows 事件日志

系统连续记录了相同的蓝屏：

| 时间 | 事件 | 结果 |
| --- | --- | --- |
| 2026-09-01 03:06:55 左右 | 首次异常关闭 | 随后产生 `0x10E/0x37` 蓝屏报告 |
| 2026-09-01 03:27 左右 | 再次蓝屏 | 停止码及参数完全相同 |
| 2026-09-01 03:33 左右 | 再次蓝屏 | 停止码及参数完全相同 |
| 2026-09-01 03:45 左右 | 再次蓝屏 | 停止码及参数完全相同 |

相关事件包括：

- `WER-SystemErrorReporting 1001`：记录实际停止码 `0x10E` 和转储位置。
- `Kernel-Power 41`：表示系统没有正常关机，是蓝屏后的结果，不是根因。
- `EventLog 6008`：表示上一次关闭是意外关闭，同样是结果而不是根因。
- 多个 `LiveKernelEvent 141`：表示图形或计算引擎未在规定时间内响应。

### 2. WinDbg 蓝屏转储分析

蓝屏转储 `090126-19562-01.dmp` 的关键结果为：

```text
VIDEO_MEMORY_MANAGEMENT_INTERNAL (10e)
Arg1: 0000000000000037
Failure bucket:
0x10e_37_dxgmms2!VIDMM_GLOBAL::EnsureLockedPages
```

故障栈位于 Windows 视频内存管理路径：

```text
dxgmms2!VIDMM_GLOBAL::EnsureLockedPages
dxgmms2!VIDMM_GLOBAL::UnlockAllocation
dxgmms2!VIDMM_SEGMENT::UnlockAllocationBackingStore
dxgmms2!VIDMM_PHYSICAL_ADAPTER::EvictResources
```

这说明 Windows 在回收或解锁图形/共享内存资源时遇到了无法恢复的内部状态。

### 3. GPU 看门狗转储分析

看门狗转储 `WATCHDOG-20260901-0332.dmp` 给出了更具体的责任模块：

```text
VIDEO_ENGINE_TIMEOUT_DETECTED (141)
Failure bucket: LKD_0x141_IMAGE_npu_kmd.sys
Faulting address: npu_kmd.sys+0x2910
```

故障设备及驱动为：

```text
设备：Intel(R) NPU
设备 ID：PCI\VEN_8086&DEV_B03E&SUBSYS_381517AA
驱动版本：32.0.100.4512
驱动日期：2025-12-09
驱动模块：npu_kmd.sys
```

因此，`dxgmms2.sys` 是最终执行蓝屏的 Windows 图形内存管理模块，但更上游、最具体的故障模块是 Intel NPU 驱动 `npu_kmd.sys`。

## 三、蓝屏如何进一步导致自动重启

完整故障链如下：

```text
Intel NPU 内核任务停止响应
        |
        v
Windows TDR 看门狗检测到超时（0x141）
        |
        v
系统尝试重置图形/计算引擎，但恢复失败
        |
        v
dxgmms2 视频内存管理器进入不可恢复状态
        |
        v
内核调用 KeBugCheckEx，产生 0x10E 蓝屏
        |
        v
系统写入 MEMORY.DMP 和 Minidump
        |
        v
AutoReboot=1，Windows 自动重启
```

当时没有对应的 `User32 1074` 计划重启事件，因此不是某个正常程序或 Windows 更新通过标准关机接口发起的重启。

## 四、实施的修复措施

### 1. 立即隔离故障设备

已禁用 `Intel(R) NPU`：

```text
设备状态：CM_PROB_DISABLED
```

这会暂停本机 NPU AI 加速功能，但不影响 CPU、Intel Arc 显卡、网络和普通应用。禁用后没有再出现新的 `LiveKernelEvent 141` 或 `0x10E` 蓝屏。

### 2. 更新联想系统组件和 BIOS

通过 Windows Update 的联想设备通道安装了：

| 更新 | 版本 |
| --- | --- |
| Lenovo System Driver Update | 26.7.0.7 |
| Lenovo SoftwareComponent Driver Update | 26.9.0.20 |
| Lenovo ThinkBook 14/16 G8+ IPH System Firmware | 1.22.0.0 |

经过用户明确批准后执行了一次受控重启。BIOS 已从：

```text
SWCN19WW -> SWCN22WW
```

### 3. 降低图形调度路径风险

设置了：

```text
HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers
HwSchMode = 1
```

该设置关闭硬件加速 GPU 调度，减少 NPU 与显卡共享调度路径再次触发问题的可能性。

### 4. 禁止蓝屏后自动重启

设置了：

```text
HKLM\SYSTEM\CurrentControlSet\Control\CrashControl
AutoReboot = 0
```

以后如果再次发生蓝屏，系统应停留在蓝屏界面并显示停止码，而不是写完转储后立即自行重启。

### 5. 限制 Windows 更新自动重启

设置了以下 Windows Update 策略：

```text
AUOptions = 2
NoAutoRebootWithLoggedOnUsers = 1
AlwaysAutoRebootAtScheduledTime = 0
```

含义：

- 更新下载和安装前通知用户。
- 用户登录期间不因更新自动重启。
- 不在预定时间强制自动重启。

### 6. 修复系统文件

重启后运行了 `sfc /scannow`。SFC 完成检查，并修复了以下蓝牙驱动文件：

```text
BthA2dp.sys
BthHfEnum.sys
bthmodem.sys
```

这些文件损坏不是本次 NPU/图形蓝屏的直接根因，但修复后可以降低其他系统异常的风险。

## 五、修复后的验证结果

重启完成后核验结果如下：

| 检查项 | 当前结果 |
| --- | --- |
| BIOS | `SWCN22WW`，更新成功 |
| Intel NPU | 已禁用，`CM_PROB_DISABLED` |
| Intel Arc B370 GPU | 状态 `OK` |
| 蓝屏自动重启 | `AutoReboot=0` |
| 更新自动重启限制 | 已生效 |
| 硬件加速 GPU 调度 | 已关闭 |
| Windows Update 待重启 | 无 |
| CBS 待重启 | 无 |
| 新的 `0x10E` 蓝屏 | 无 |
| 新的 `LiveKernelEvent 141` | 无 |
| 新的 WHEA 硬件错误 | 无 |

启动日志中仍有 `VBoxNetLwf` 网络过滤器错误和一次 VBS 策略检查错误，但二者没有出现在本次蓝屏的故障栈或责任模块中，暂不视为本次蓝屏根因。

## 六、后续注意事项

1. 在联想或 Intel 发布比 `32.0.100.4512` 更新的 NPU 驱动前，保持 Intel NPU 禁用。
2. 以后需要恢复 NPU 时，应先安装新版 OEM 驱动，再手动启用并观察稳定性。
3. 不要直接重新启用当前版本的 NPU 驱动，否则可能再次触发同类故障。
4. 保留当前 BIOS 和 Windows Update 策略，不要恢复 `AutoReboot=1`。
5. 如果再次蓝屏，记录屏幕上的停止码，并保留新的 `C:\Windows\Minidump\*.dmp` 供对比分析。

## 七、自动重启限制的边界

目前已经阻止或限制以下软件层面的自动重启：

- 蓝屏写完转储后的自动重启。
- 用户登录时的 Windows 更新自动重启。
- Windows 更新按预定时间强制自动重启。

但 Windows 策略无法阻止以下情况：

- 物理断电或电池/电源故障。
- 主板、CPU 或固件级硬件复位。
- 固件 watchdog 强制复位。
- 长按电源键。

## 八、诊断资料位置

原始内核转储副本、WinDbg 分析所用文件及操作日志保存在：

```text
C:\Users\15951\gpu-crash-diagnostics\
```

其中包括蓝屏 Minidump、WATCHDOG 转储、管理员操作日志和 SFC 检查记录。

## 九、进一步根因诊断（补充）

### 1. 可以确认的根因层级

现有证据可以确认：故障触发源是 Intel NPU5 子系统，而不是普通应用、Windows Update 或 `dxgmms2.sys` 本身。

更完整的故障过程是：

```text
NPU5 固件或驱动中的命令/同步/电源状态操作未完成
        |
        v
npu_kmd.sys 未能在规定时间内完成或恢复该操作
        |
        v
TDR 记录 LiveKernelEvent 141（npu_kmd.sys+0x2910）
        |
        v
共享内存、fence 或资源锁状态未能正确恢复
        |
        v
dxgmms2 在 EnsureLockedPages 中发现不可恢复状态
        |
        v
产生 0x10E/0x37 蓝屏
```

`npu_kmd.sys+0x2910` 是看门狗捕获到的 NPU 驱动处理路径，并不等同于该指令本身发生了非法内存访问。反汇编中没有看到典型的访问冲突或除零指令，因此更符合“等待 NPU 固件/硬件响应超时”的表现。

### 2. WHEA 原始记录提供的新增证据

`Microsoft-Windows-Kernel-WHEA/Errors` 中存在以下 Event ID 20：

```text
2026-06-26 14:05:42
2026-08-17 19:11:43
2026-08-20 13:44:56
2026-09-01 03:27:40
2026-09-01 03:33:17
2026-09-01 03:45:28
```

六条记录具有相同特征：

- CPER 原始记录长度均为 27,640 字节。
- Section 数量均为 4。
- `ErrorSeverity=1`，对应 Fatal 级别。
- 使用相同的通知 GUID：`3d61a466-ab40-409a-a698-f362d464b38f`。
- 记录包含 Intel 平台/NPU 相关的厂商自定义数据，但公开符号无法将这些 section 解码为具体命令、引擎或硬件地址。

这说明故障不只是 Windows 图形管理器内部的软件异常，而是曾进入 Intel 平台固件/硬件错误上报路径。不过，WHEA 记录本身没有公开指出“具体是 NPU 芯片损坏”，因此不能单独据此判定物理硬件故障。

### 3. 驱动和固件版本线索

故障涉及的 NPU 驱动包为：

```text
npu_kmd.sys       32.0.100.4512（2025-12-09）
npu5_firmware.bin 2025-11-13 构建
固件构建标识：ci_tag_ud202548_vpu_rc_20251112_1901-1-g72f907ffc78
```

该驱动包的 INF 明确为 NPU5（设备 ID `DEV_B03E`）下载 `npu5_firmware.bin`。固件字符串中包含 watchdog、fence、资源释放、D0i3/D3 电源状态和 DMA 错误处理路径，这与当前观察到的“命令或资源状态未完成”相符，但这些只是固件能力和错误处理字符串，不能当作某一次故障的运行时错误码。

### 4. 当前最合理的根因排序

根据重复的 `npu_kmd.sys+0x2910`、相同的 141/10E 故障模式、WHEA Fatal 记录以及禁用 NPU 后故障停止，当前判断为：

1. Intel NPU 驱动与 NPU5 固件之间的命令完成、fence 或资源回收缺陷（最可能）。
2. 旧 BIOS（故障时为 `SWCN19WW`）与 NPU 电源状态/内存映射路径的兼容性问题。
3. NPU、集成 GPU、IOMMU 与 Hyper-V/VBS 共享路径的交互缺陷。
4. NPU 硬件本身的间歇性故障（目前证据较弱，但由于存在 Fatal WHEA，不能完全排除）。

现有转储没有保存具体 NPU 命令 ID、固件 assert 文本或可公开解析的硬件寄存器状态，所以无法仅凭本机数据在第 1 项内部进一步区分“驱动逻辑 bug”和“固件 bug”。

### 5. 修复结果的解释

禁用 NPU 是有效的因果隔离：在 `2026-09-01 03:54` 左右禁用后，之后没有新的实际 Kernel-Power 41、WHEA 或蓝屏。稍后出现的部分 WER 事件是系统启动后整理之前的崩溃报告，不代表新的蓝屏。

因此，当前状态应表述为“故障路径已成功隔离并停止复现”，而不是“已经证明 NPU 硬件永久损坏”或“已经证明某一条驱动指令存在缺陷”。要最终区分软件缺陷与硬件故障，需要在最新联想 OEM NPU 驱动/固件和最新 BIOS 下，经用户明确批准后进行受控启用测试；在此之前保持 NPU 禁用是风险最低的做法。
