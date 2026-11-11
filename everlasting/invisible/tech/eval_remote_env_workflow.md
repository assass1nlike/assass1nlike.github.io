# 基于火山云平台、OSWorld 的标准化评估环境工作流

包含自动新建实例、运行初始化命令、进行远程GUI操作几项内容的完整工作流程指导。

[TOC]

---

## 环境构建

```bash
git clone https://github.com/assassinlike/OSWorld.git
cd OSWorld
```

下面所有命令都假设当前目录是 OSWorld 仓库根目录。

切换到工作环境，运行

```bash
pip install -e .
```

如果国内下载较慢，可以使用清华源：

```bash
pip install -e . -i https://pypi.tuna.tsinghua.edu.cn/simple --timeout 120 --retries 8
```

如果运行时出现类似 `RequestsDependencyWarning: urllib3 (...) or chardet (...) doesn't match a supported version` 的警告，或者访问火山 OpenAPI 时出现 SSL/HTTPS 不稳定问题，可以修正 HTTP 依赖版本：

```bash
pip install "urllib3==1.26.18" "chardet==5.2.0" -i https://pypi.tuna.tsinghua.edu.cn/simple
```

## 配置 `.env`

需要获取一些信息：

1. AccessKeyID和SecretAccessKey：

   访问 https://console.volcengine.com/iam/keymanage ，创建密钥

2. subnet-id
   访问 https://console.volcengine.com/resourcemanager/resource_center/my_resource，看“资源类型”为“私有网络 - 子网”的，前面的“资源ID”即为。

3. Security Group ID
   访问 https://console.volcengine.com/ecs/region:ecs+cn-beijing/securityGroup?projectName=default，复制Default下面的ID，除非你用的不是default，这种时候需要复制相应的ID。

4. Instance Type
   选择想要的实例规格，如 ecs.g4i.large

5. VOLCENGINE_IMAGE_ID_MAP
   把镜像下面的ID复制。

6. VOLCENGINE_REGION
   看你镜像的所在地，比如 cn-beijing

在 `OSWorld/.env` 中配置下面这些变量。可用配置如下：

```bash
VOLCENGINE_ACCESS_KEY_ID=你的AccessKeyID
VOLCENGINE_SECRET_ACCESS_KEY=你的SecretAccessKey

VOLCENGINE_REGION=你的镜像地区
VOLCENGINE_SUBNET_ID=你的subnet-id
VOLCENGINE_SECURITY_GROUP_ID=你的security-group-id
VOLCENGINE_INSTANCE_TYPE=你的实例规格

VOLCENGINE_IMAGE_ID_MAP={"snapshot":"ID"}
# json 中的snapshot字段名和镜像ID；多个的话用逗号分隔
# 如果 .env 对 JSON 的解析不稳定，可以写成带引号的一行

VOLCENGINE_DEFAULT_PASSWORD=Password.
# 可以自己改成其它
```

建议添加的可选配置：

为了 GUI 实操测试更稳定，建议额外配置：

```bash
VOLCENGINE_VOLUME_SIZE_GB=50
VOLCENGINE_EIP_BANDWIDTH_MBPS=5
VOLCENGINE_INSTANCE_NAME_PREFIX=osworld
VOLCENGINE_INSTANCE_READY_TIMEOUT=600
VOLCENGINE_OSWORLD_READY_TIMEOUT=900
VOLCENGINE_OSWORLD_READY_INTERVAL=10
```

如果某些 Windows / CAD / 3D 镜像启动较慢，可以把等待 OSWorld server 的时间调大：

```bash
VOLCENGINE_OSWORLD_READY_TIMEOUT=1200
```

调试时如果需要保留创建出的实例，可以临时设置：

```bash
VOLCENGINE_KEEP_INSTANCE_ON_STOP=true
```

但批量测试时不要开启这个变量，否则 ECS 实例会保留并持续计费。

## 创建实例

选择镜像和其OS：

```bash
python scripts/python/volcengine_smoke_test.py \
  --snapshot xxx \
  --os_type Windows \
  --keep
```

不加 `--keep` 时，smoke test 结束后会自动删除测试实例。这里保留了，所以后续要删除该实例，避免继续计费。成功时会看到类似输出：

```text
resolved image: image-id
Volcengine noVNC URL: http://124.xxx.xxx.xxx:5910/vnc.html
endpoint: 124.xxx.xxx.xxx:5000:9222:5910:8080
instance_id: i-xxxxxxxx
```

记录后三条，后续把 `<generated_ip>` 当作 `$HostIp` 使用。这个 IP 是本次自动创建实例得到的。

建议在终端中约定这些变量，后续命令直接复用：

```powershell
$HostIp = "<generated_ip>"
$TaskJson = "<含有初始化命令的json路径>"
$OutDir = "<本次测试的输出目录>"
```

检查自动创建的 OSWorld server 是否可用，并保存初始截图：

```powershell
python scripts/python/sanity_check_remote_osworld.py `
  --host $HostIp `
  --task-json $TaskJson `
  --skip-config `
  --out-dir "$OutDir/connect"
```

检查输出里应看到：

```text
[ok] platform: ...
[ok] screen_size: ...
[ok] screenshot saved: ...
```

可同时打开 noVNC 观察桌面：

```text
http://<generated_ip>:5910/vnc.html
```

如果 noVNC 打不开但 `/screenshot` 可用，仍然可以继续用截图和 pyautogui 操作。

## 运行 config 初始化

运行 JSON 里的 `config`。这一步会上传初始文件、启动软件、打开需要打开的工程文件、处理欢迎页或弹窗等。

```powershell
python scripts/python/sanity_check_remote_osworld.py `
  --host $HostIp `
  --task-json $TaskJson `
  --out-dir "$OutDir/setup"
```

这条命令不加 `--evaluate`，也不加 `--gt-check`。它只做环境 setup，并保存 `before_setup.png` / `after_setup.png`。

如果 setup 后软件没有正常启动，先观察截图和 noVNC。常见情况是软件仍在启动中，等待 30-120 秒后再截图。

## 远程操作

保存当前截图：

```powershell
New-Item -ItemType Directory -Force "$OutDir/manual" | Out-Null
Invoke-WebRequest "http://$HostIp`:5000/screenshot" -OutFile "$OutDir/manual/obs.png"
```

发送 GUI 操作时，推荐使用 `/run_python` 发送短小的 pyautogui 操作。它的用途是驱动 GUI，例如点击、按键、输入、拖拽、等待 UI 稳定。

通用形式：

```powershell
$Code = @'
import pyautogui, time
pyautogui.FAILSAFE = False

# 在这里写 GUI 操作，例如：
# pyautogui.click(x, y)
# pyautogui.hotkey("ctrl", "s")
# pyautogui.write("text", interval=0.02)
# pyautogui.dragTo(x, y, duration=0.5, button="left")

time.sleep(1)
'@

Invoke-RestMethod `
  -Uri "http://$HostIp`:5000/run_python" `
  -Method Post `
  -ContentType "application/json" `
  -Body (@{ code = $Code } | ConvertTo-Json)
```

## 清理实例

按照流程，创建实例时使用了 `--keep`，所以实例会一直保留。正因为如此，测试结束后必须主动释放实例，避免继续计费。

释放实例需要用第四步创建实例时记录下来的 `instance_id`，例如：

```text
instance_id: i-xxxxxxxx
```

用火山 API 删除。下面的命令需要在 OSWorld 仓库根目录运行，并且 `.env` 中已经配置好 `VOLCENGINE_ACCESS_KEY_ID`、`VOLCENGINE_SECRET_ACCESS_KEY` 和 `VOLCENGINE_REGION`：

```powershell
$InstanceId = "i-xxxxxxxx"

$Code = @"
import os
import dotenv
import volcenginesdkcore
import volcenginesdkecs.models as ecs_models
from volcenginesdkecs.api import ECSApi

dotenv.load_dotenv()
cfg = volcenginesdkcore.Configuration()
cfg.ak = os.environ["VOLCENGINE_ACCESS_KEY_ID"]
cfg.sk = os.environ["VOLCENGINE_SECRET_ACCESS_KEY"]
cfg.region = os.environ["VOLCENGINE_REGION"]
cfg.host = f"ecs.{cfg.region}.volcengineapi.com"
volcenginesdkcore.Configuration.set_default(cfg)

api = ECSApi()
api.delete_instance(ecs_models.DeleteInstanceRequest(instance_id="$InstanceId"))
print("deleted", "$InstanceId")
"@

python -c $Code
```

如果这里因为 PowerShell 对多行 `python -c` 参数的解析而失败，可以改用临时脚本文件：

```powershell
$Code | Set-Content -Encoding UTF8 .\delete_instance.py
python .\delete_instance.py
Remove-Item .\delete_instance.py
```

无论用控制台还是 API 删除，都要确认当前 task 的测试实例已经释放。不要只关闭 noVNC 页面或终端窗口；这不会释放 ECS 实例。
