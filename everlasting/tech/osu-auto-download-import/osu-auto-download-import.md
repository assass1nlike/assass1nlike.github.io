# osu! 谱面批量下载与导入到 lazer

本文档讲两件相关的事：

1. 从 osu! 官网按"游玩次数"降序批量下载 ranked 谱面到本地（`osu_top_downloader.py`）。
2. 把下载好的 `.osz` 文件批量导入到 osu!lazer（`build_fake_stable.py`）。

两个脚本独立可用，但合起来构成"从零到 lazer 里能玩"的完整链路。

---

## 1. 背景与设计权衡

### 为什么不能用官方 API 直接下载

osu! 官方 API v2 提供了 `/beatmapsets/{id}/download` 端点，但这个端点**仅供 lazer 客户端使用**——普通的 client credentials OAuth token 调用会返回 403。这是 osu! 的策略选择，绕不过去。

所以"批量下载"的策略只能是：

- **用官方 API 拿元数据**（按 `plays_desc` 翻页得到 beatmapset ID 列表）
- **用社区镜像站下载 `.osz` 文件**（catboy.best、nerinyan.moe、beatconnect.io）

镜像站是免费公益服务，**并发数和请求速率必须克制**，否则 IP 会被封。

### 为什么不直接"自动打开 .osz"导入 lazer

最早的想法是写个脚本一批一批用 `os.startfile` 或 `subprocess` 把 `.osz` 喂给 lazer 进程触发导入。这条路实测有几个问题：

- lazer 没有外部接口让你查询"队列里还剩多少没消化"，脚本只能盲喂、靠 `sleep` 估算
- 偶尔会丢导入（lazer 一次接的参数过多时会跳过部分）
- 慢——10000 张谱面这种规模要好几小时

更稳的方案是把所有 `.osz` 解压成 **osu!stable 那种目录布局**（`Songs/<id>/<map>.osu`），然后用 lazer 自带的 "Run setup wizard" 假装从 stable 导入。这是社区公认最可靠的路径，10000 张谱面规模通常 30 分钟到 2 小时一次性完成。

> **关于"lazer 设置里有按钮直接选 .osz 文件夹批量导入"**：**这个按钮并不存在**。
> lazer 的设置只有"Run setup wizard"，它读的是 osu!stable 安装目录的结构。
> 把整个 `.osz` 文件夹拖进 lazer 窗口确实管用，但 10000 张这种规模并不实际。
> `build_fake_stable.py` 就是来填补这个空缺的。

---

## 2. 准备工作

### Python 和依赖

需要 Python 3.9+。下载脚本需要 `requests`：

```bash
pip install requests
```

`build_fake_stable.py` 只用标准库，不需要额外依赖。

### 申请 osu! OAuth 凭据

下载脚本需要 osu! API 凭据来获取 beatmapset 元数据。

1. 登录 [https://osu.ppy.sh/home/account/edit](https://osu.ppy.sh/home/account/edit)
2. 拉到底，找到 **OAuth** 区块 → **New OAuth Application**
3. 应用名随意，**Application Callback URL 留空**
4. 创建后会得到 `Client ID`（数字）和 `Client Secret`（字符串）

把这两个值填进配置文件（见下一节）。OAuth 用的是 `client_credentials` flow + `public` scope，只能读公开数据，不能代表任何用户操作。

### 磁盘空间估算

- 10000 张 `.osz`：**150–400 GB**（视频/storyboard 谱面单个可达 100+ MB）
- 解压成伪 stable 结构后**再占 150–400 GB**（你可以解压完导入完就删 `.osz`，但过程中需要同时存在）
- **总峰值约 300–800 GB**。空间紧的话分批做（见后面"分批工作流"）

---

## 3. 第一步：下载

### 配置 `config.[json]`

复制 `config.example.[json]` 为 `config.[json]` 并填写：

```json
{
  "client_id": "12345",
  "client_secret": "abcdef...",
  "download_dir": "D:/osu_beatmaps",
  "target_count": 10000,
  "mode": 0,
  "download_concurrency": 4,
  "download_delay": 0.5,
  "skip_existing": true,
  "mirrors": [
    "https://catboy.best/d/{id}",
    "https://api.nerinyan.moe/d/{id}",
    "https://beatconnect.io/b/{id}"
  ]
}
```

| 字段 | 含义 |
|---|---|
| `client_id` / `client_secret` | osu! OAuth 凭据 |
| `download_dir` | 下载目标目录。Windows 路径用正斜杠或双反斜杠 |
| `target_count` | 要下多少张（默认 10000）|
| `mode` | 0=osu! / 1=taiko / 2=catch / 3=mania |
| `download_concurrency` | 同时下载几张。**建议 3–5，不要更高** |
| `download_delay` | 每次下载任务前最小等待秒数 |
| `skip_existing` | 跳过已存在的 `.osz` |
| `mirrors` | 镜像站列表，按顺序尝试。前一个失败自动 fallback |

### 运行

```bash
python osu_top_downloader.[py]
# 只抓 ID 列表不下载（用于先快速看看能拿到多少张）
python osu_top_downloader.[py] --ids-only
# 用其他配置文件
python osu_top_downloader.[py] --config /path/to/my_config.[json]
```

按 `Ctrl+C` 会优雅退出：正在下载的任务完成，未开始的取消。再次运行从断点继续。

### 输出结构

```
D:/osu_beatmaps/
├── 12345.osz                    # 谱面文件，文件名就是 beatmapset ID
├── 67890.osz
├── ...
├── beatmapset_ids.[json]        # ID 抓取进度（含 API cursor，支持续传）
├── failed.[json]                # 下载失败的 ID 和失败原因
└── downloader.[log]             # 完整日志
```

### 关于"游玩次数最多的 10000 张"

osu! 的搜索 API 用游标分页（`cursor_string`），按 `plays_desc` 翻页时**理论上**可以一直翻下去。实测能稳定拿到大量结果，但 osu! 没有官方文档承诺最大数量。

- 如果某天 API 返回提前结束，脚本会停止翻页并报告实际拿到的数量
- 抓 ID 列表本身很快（10000 张大概几分钟），下载才是大头

---

## 4. 第二步：解压成伪 stable 结构

下载完成后，运行：

```bash
python build_fake_stable.[py] --src D:/osu_beatmaps --dst D:/fake_stable
```

参数：

| 参数 | 默认 | 含义 |
|---|---|---|
| `--src` | 必填 | 装 `.osz` 的目录（下载脚本的 `download_dir`）|
| `--dst` | 必填 | 输出目录，会创建 `Songs/` 子目录 |
| `--workers` | 4 | 并行解压进程数 |
| `--no-marker` | off | 不创建 `osu!.cfg` 占位文件 |

**`--src` 目录里有 `beatmapset_ids.[json]` / `failed.[json]` / `downloader.[log]` 这些非 `.osz` 文件没关系**——脚本只匹配 `*.osz`，其他文件原地不动。

### 输出结构

```
D:/fake_stable/
├── osu!.[cfg]                   # 占位文件，让 lazer 的 wizard 更愿意识别这是 stable
├── build_fake_stable.[log]
├── extract_failed.[json]        # 解压失败的 .osz 列表（如有）
└── Songs/
    ├── 12345/
    │   ├── xxx.osu
    │   ├── audio.mp3
    │   └── bg.jpg
    ├── 67890/
    │   └── ...
    └── ...
```

### 安全与健壮性

- **断点续传**：已经解压完整（包含 `.osu` 文件）的目录会跳过。Ctrl+C 安全
- **损坏的 `.osz`**：不会让整个流程崩，只会记入 `extract_failed.[json]`
- **zip-slip 攻击防御**：恶意 zip 里包含 `../../etc/passwd` 这种路径会被检测并拒绝

---

## 5. 第三步：让 lazer 一口气导入

1. 启动 osu!lazer
2. 进入 **Settings**，搜索 `setup` 或滚到 **Maintenance** 区块
3. 点 **Run setup wizard**
4. 选 **"Locate osu!(stable) installation"** → 选 `D:/fake_stable`
5. 点 **Import beatmaps**，等它跑完

具体菜单文本可能随 lazer 版本而变（"Maintenance"/"Debug"/"General" 区块名都出现过）。**搜索框搜 "setup" 是最稳的找法**。

导入完成后，`D:/fake_stable` 和 `D:/osu_beatmaps` 都可以删——lazer 已经把谱面拷进自己的内部存储了。

---

## 6. 分批工作流（磁盘空间紧的话）

如果你的可用空间装不下完整的"原始 `.osz` + 解压副本"，按批走：

1. 下载脚本设 `target_count: 1000`，跑一轮，得到 1000 张 `.osz`
2. `build_fake_stable.[py]` 解压
3. lazer 导入
4. 导入成功后，删 `D:/fake_stable` 和那 1000 个 `.osz`
5. 回到第 1 步，下载脚本接着跑下一批 1000 张（断点续传会自动从第 1001 张开始）

如果想一次跑完，但还是想节省空间：在解压后、导入前，可以删掉 `.osz`（解压副本里已经有完整内容），但要小心如果 lazer 导入失败你就得重新下载了。

---

## 7. 失败与重试

下载失败列表写在 `D:/osu_beatmaps/failed.[json]`：

```json
{
  "12345": "https://catboy.best/d/12345 -> 404",
  "67890": "https://beatconnect.io/b/67890 -> ConnectionError: ..."
}
```

最常见的原因：

- **404**：谱面在所有镜像站都没有副本（罕见但有，通常是因为 DMCA 下架）
- **三个镜像同时挂**：等几小时再跑一次
- **网络抽风**：再跑一次脚本，已下载的会跳过，失败的会重试

解压失败列表写在 `D:/fake_stable/extract_failed.[json]`，最常见的是 `.osz` 文件本身在下载过程中损坏（很少见，但发生时把对应的 `.osz` 删了重新跑下载脚本就行）。

---

## 8. 礼仪与法律

- **镜像站是公益服务**。`download_concurrency` 不要超过 5，`download_delay` 不要低于 0.5 秒。被封 IP 你三个站一起没了
- **遵守 osu! 服务条款和镜像站使用条款**。这套工具适合用于个人备份、本地练习等合理用途
- **不要把大批量下载的谱面公开重分发**

---

## 9. 文件清单

| 文件 | 作用 |
|---|---|
| `osu_top_downloader.[py]` | 下载脚本 |
| `config.example.[json]` | 下载脚本的配置文件模板 |
| `build_fake_stable.[py]` | 把 `.osz` 解压成 stable 结构的脚本 |

下载脚本运行时会产生：

| 文件 | 在哪里 | 作用 |
|---|---|---|
| `beatmapset_ids.[json]` | `download_dir/` | ID 抓取进度，断点续传用 |
| `failed.[json]` | `download_dir/` | 下载失败列表 |
| `downloader.[log]` | `download_dir/` | 运行日志 |
| `*.osz` | `download_dir/` | 下载的谱面文件 |

解压脚本运行时会产生：

| 文件 | 在哪里 | 作用 |
|---|---|---|
| `osu!.[cfg]` | `--dst/` | 占位文件，让 lazer wizard 识别 |
| `Songs/<id>/...` | `--dst/Songs/` | 解压后的谱面目录 |
| `extract_failed.[json]` | `--dst/` | 解压失败列表（如有）|
| `build_fake_stable.[log]` | `--dst/` | 运行日志 |
