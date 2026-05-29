# 从 osu! 谱面中提取"诗意类"难度名

本文档讲 `find_poetic_diffs.[py]` 这个脚本：在指定时间范围内，从 ranked + loved 谱面里挑出"诗意短语类"的难度名。

---

## 1. 这个脚本想解决什么问题

osu! 的难度名（每张谱面里每个难度的 `version` 字段）大致分这么几类：

1. **标准难度词**：`Easy` / `Normal` / `Hard` / `Insane` / `Expert` / `Extra` / `Another` …
2. **标准词 + 修饰**：`Hard+` / `Light Insane` / `Expert++` …
3. **GD 署名**：`Wispy's Extra` / `Crystal's Hard` / `add222 - Insane`（"Guest Difficulty"，客串作者署名）
4. **mania 键数前缀**：`[4K] Hard` / `7K SHD`
5. **诗意/短语类**——这就是脚本想找的：
   - `Echoes of the Forgotten`
   - `Till The Epilogue Of Time`
   - `Primordial Nucleosynthesis`
   - `Vesperal Singularity`
   - `Breaking Into a Final Crescendo`

注意第 3 类和第 5 类可以叠加：`Crystal's Nervous Breakdown` 就是"GD 署名 + 诗意名"，去掉 `Crystal's` 后剩下的 `Nervous Breakdown` 是诗意类。

---

## 2. 方法论：反向匹配 + 多重过滤

"什么算诗意"很难直接定义。所以脚本反过来做："**什么明显不是诗意**"很好定义，把这些剔除掉后，剩下的就是候选。

流程：

1. 从 osu! API v2 抓 ranked + loved 谱面，记录每个难度的 `version`、创建者、模式、星数、上架日期
2. 对每个 `version` 做预处理：剥掉键数前缀（`[4K]`）、剥掉 GD 署名（`XX's`、`XX - `）、剥掉末尾括号注释（`(NSV)`、`[Marathon]`）
3. **硬过滤**（直接判为非诗意）：
   - 剥完后是标准难度词或它们的组合 → `standard` / `gd_standard`
   - 单 token → 几乎不可能是诗意短语
   - 含数字或非常规标点（`!@#$%^&*=/\[]{}<>+`）→ 不是诗意
   - 长度 < 8 字符 → 太短
4. **加分项**（决定"诗意分"）：
   - 单词数越多分越高（上限）
   - 标题大小写比例（Title Case Bonus）
   - 命中"诗意词汇表"（`of` / `the` / `eternal` / `forgotten` / `crescendo` / …）
   - 句子里有标准难度词 → 扣分（混合命名扣一点点，避免误判）
5. 分数过阈值的进 `poetic.[csv]`，按分数降序排列。同时可以导出**全量分类审计 CSV**，让你看每个被判为非诗意的为什么被排除

### 为什么用启发式而不是 LLM/ML

- 数据规模：一两年的 ranked + loved 大约几万条难度。LLM 调用既慢又贵
- 启发式可解释：每条结果都附带"判断理由"，你能看出为什么这条被收/被剔
- 易于调优：词表和阈值都是显式参数，发现误判可以直接加规则

代价是：**非英语难度名几乎拿不到**（词表和"标题大小写"都是英语习惯）、**有假阳性和假阴性**（这是规则系统的本质）。最终结果建议人眼扫一遍，不要直接当成"完美答案"使用。

---

## 3. 用法

### 准备

需要的 OAuth 凭据和下载脚本一样（`client_id` / `client_secret`）。可以复用同一个 `config.[json]`。

```bash
pip install requests
```

### 运行

```bash
python find_poetic_diffs.[py] \
    --config config.[json] \
    --from 2024-01-01 --to 2024-12-31 \
    --statuses ranked,loved \
    --modes 0,1,2,3 \
    --out poetic_diffs.[csv]
```

参数：

| 参数 | 默认 | 含义 |
|---|---|---|
| `--config` | `config.[json]` | 含 `client_id` / `client_secret` 的配置文件 |
| `--from` / `--to` | 必填 | 上架日期范围（`YYYY-MM-DD`），按 `ranked_date` 过滤 |
| `--statuses` | `ranked,loved` | 想查哪些状态 |
| `--modes` | `0,1,2,3` | 哪些模式（0=osu / 1=taiko / 2=catch / 3=mania）|
| `--out` | `poetic_diffs.[csv]` | 主输出 CSV（只含被判为 poetic 的）|
| `--out-all` | (off) | 可选：导出**全部**难度的分类审计 CSV |
| `--cache` | `diffs_cache.[json]` | 原始 API 数据缓存。重跑分类时不用再请求 API |
| `--no-fetch` | off | 不请求 API，只用缓存重新分类 |
| `--min-score` | 2.0 | 诗意分阈值 |

### 典型工作流

1. 第一次跑：拿一个比较短的时间窗口（比如 2024 一年）+ 加 `--out-all` 审计文件
   ```bash
   python find_poetic_diffs.[py] --config config.[json] \
       --from 2024-01-01 --to 2024-12-31 \
       --out poetic_diffs.[csv] --out-all all_diffs_audit.[csv]
   ```
2. 看主输出 `poetic_diffs.[csv]` 的头几十行——分数高的应该都是漂亮的诗意名
3. 看尾部低分的——是不是有应该被排除的（假阳性）？
4. 看审计 CSV `all_diffs_audit.[csv]` 里 `category=trivial` 但 `version` 看起来其实挺诗意的（假阴性）——这些是漏判
5. 根据观察调整阈值（`--min-score`）或修改脚本里的词表，再跑一遍。这次加 `--no-fetch` 直接用缓存，几秒钟就出新结果

---

## 4. 输出格式

### `poetic_diffs.[csv]`（主输出）

按 `score` 降序，列：

| 列名 | 含义 |
|---|---|
| `score` | 诗意分（越高越像诗意名）|
| `version` | 原始难度名（API 返回的 `version` 字段）|
| `cleaned` | 剥掉键数前缀 / GD 署名 / 末尾括号后剩下的纯名 |
| `gd_owner` | 如果是 GD，客串作者名；否则空 |
| `mode` | osu / taiko / fruits / mania |
| `stars` | 难度星数 |
| `artist` / `title` / `creator` | 谱面元信息 |
| `set_id` / `diff_id` | beatmapset 和 diff 的 osu! ID |
| `ranked_date` | 上架日期 |
| `url` | 直接打开这个难度的 osu! 网页链接 |

### `all_diffs_audit.[csv]`（审计输出，可选）

每个被分类的难度一行（无论判为哪一类），列：

| 列名 | 含义 |
|---|---|
| `category` | `poetic` / `standard` / `gd_standard` / `mania_keys` / `trivial` |
| `score` | 诗意分（除 poetic 外通常是 0）|
| `version` / `cleaned` / `gd_owner` | 同上 |
| `reasons` | 判断时记下的理由（逗号分隔）|
| `set_id` / `diff_id` | 谱面引用 |

`reasons` 列特别有用——你能看到比如 `'contains_digit'` / `'all_tokens_standard'` / `'single_word_nonstandard'` / `'low_score'`，从而判断是规则太严了还是太松了。

---

## 5. 调优指南

### 假阳性（不该被收的进了诗意列表）

最常见情况：

- **两词标题大小写但其实是常见叫法**，比如 `Final Boss`、`Last Stand`
  - 修复：脚本里的 `DENYLIST_PHRASES` 集合可以加这些（小写形式）
- **GD 署名没被识别出来**（作者名格式不常规）
  - 修复：看 `reasons` 列是否有 `gd_apostrophe` / `gd_dash`，如果没有但应该有，可能是因为脚本对"`<名字> - `"形式比较保守（避免把诗意名里合法的破折号误判成 GD 分隔符）。可以放宽 `GD_DASH` 的正则，但要小心副作用

### 假阴性（该被收的没收）

- **非英语难度名**：词表和大小写规则都是英语习惯，这是根本局限
- **两词诗意但词不在 hint 词表里**（比如 `Anima Eterna`、`Nocturne Hyperboréen`）：扩充 `POETIC_HINT_WORDS`
- **分数刚好低于阈值**：降 `--min-score`，比如从 2.0 降到 1.5

### 调阈值的快速循环

```bash
# 第一次跑（请求 API，缓存数据）
python find_poetic_diffs.[py] --config config.[json] \
    --from 2024-01-01 --to 2024-12-31 \
    --out poetic_diffs.[csv] --out-all all_diffs.[csv]

# 改 --min-score / 修改脚本词表后，用缓存重跑
python find_poetic_diffs.[py] --config config.[json] \
    --from 2024-01-01 --to 2024-12-31 \
    --no-fetch --min-score 1.5 \
    --out poetic_diffs.[csv] --out-all all_diffs.[csv]
```

`--no-fetch` 模式下不请求 API，只重新分类已缓存数据，几秒钟出结果。

---

## 6. 结果示例

16.73,from the end of the beach to the bottom of the ocean,from the end of the beach to the bottom of the ocean,*,*taiko,*1.19445,*Sato Hitomi,Sazanami Town (Aki ~ Haru),Slyme,1850069,3800365,2023-05-29T11:43:25Z,https://osu.ppy.sh/beatmapsets/1850069#osu/3800365

15.63,Forgotten Dreams in the Endless Maze of Lies,Forgotten Dreams in the Endless Maze of Lies,*,*taiko,*4.51526,*Tsukuyomi,Hana to Chiru,arcpotato,2097800,4399916,2023-12-31T15:03:16Z,https://osu.ppy.sh/beatmapsets/2097800#osu/4399916

15.54,The Song of Our Love Story Resonates Beyond the Night,The Song of Our Love Story Resonates Beyond the Night,*,*osu,*7.0286,*-LostFairy-,Ataraxia ~Shijun no Uta~,Nevertary,2180094,4605017,2024-06-24T04:46:11Z,https://osu.ppy.sh/beatmapsets/2180094#osu/4605017

---

## 7. 已知限制

1. **启发式必然有误差**——脚本目标是"减少人工扫描量"，不是"完美分类"
2. **非英语难度名几乎全部漏判**——词表和大小写规则都是英语习惯
3. **osu! API 的搜索分页对单次查询有结果上限**——脚本按 `ranked_date` 升序翻页，时间窗口太大时翻不完。建议每次跑一年左右，跨多年的话分多次跑后合并
4. **API 速率**：脚本会自动处理 429 限流，但跑大时间窗口仍可能花几分钟到几十分钟
5. **缓存格式**：`diffs_cache.[json]` 的有效性靠 `(date_from, date_to, statuses, modes)` 四元组判断。任何一个变了就会重新请求

---

## 8. 文件清单

| 文件 | 作用 |
|---|---|
| `find_poetic_diffs.[py]` | 主脚本 |
| `config.[json]` | OAuth 配置（可复用下载脚本的同一个）|

运行时产生：

| 文件 | 作用 |
|---|---|
| `poetic_diffs.[csv]` | 主输出，按诗意分降序排列 |
| `all_diffs_audit.[csv]` | 全量分类审计（如果加了 `--out-all`）|
| `diffs_cache.[json]` | API 原始数据缓存，调参重跑用 |
| `poetic_diffs.[log]` | 运行日志 |
