# AutoZhihu

自动发现知乎问题、用大模型写高质量回答并发布。

## 用法

环境是 conda 环境 `autozhihu`（python 3.11，playwright、openai、markdown），浏览器用本机 Chrome。

```bash
conda activate autozhihu
python -m autozhihu login              # 首次使用：在弹出的 Chrome 里登录知乎
python -m autozhihu run -n 3           # 抓问题 → 选 3 个写 → 依次发布
```

也可以分步执行：

```bash
python -m autozhihu discover           # 抓热榜、邀请回答、创作中心推荐，合并进候选池
python -m autozhihu write -n 3         # 模型选题并写作；--qid 可指定问题
python -m autozhihu publish --dry-run  # 走完发布流程但不点发布，截图检查
python -m autozhihu publish            # 发布所有已写好未发布的回答
```

## 流程

选题时，模型从候选池里挑出能在“不编造经历、不依赖实时信息”的前提下写出明显优于已有回答的问题。每个问题的写作分四步：读问题和前 5 个高赞回答，制定写作计划（真实需求、已有回答的不足、自己的角度、结构）；按计划写初稿；以挑剔编辑的身份审稿（事实、编造、空话、AI 味）；根据审稿意见修订成终稿。所有步骤共用 `autozhihu/prompts/style.md` 中的身份和文风规则。

发布时把终稿转成 HTML 粘贴进知乎编辑器（公式、标题、列表、代码块都会转成原生格式），按配置勾选“包含 AI 辅助创作”，两篇之间随机间隔。

## 文件

- `config.toml`：模型、每次篇数、发布间隔、抓取来源、最低关注数等。
- `.env`：模型接口地址和 key。
- `autozhihu/`：代码；`prompts/` 是各步骤的提示词。
- `data/candidates.json`：候选问题池，`status` 记录每个问题的进度（new / written / published / skipped / failed）。
- `data/answers/<问题id>/`：每篇回答的全部中间产物（context、plan、draft、review、final）和 `meta.json`。
- `browser/`：Chrome 登录态。

`.env`、`browser/`、`data/` 都不进 git。
