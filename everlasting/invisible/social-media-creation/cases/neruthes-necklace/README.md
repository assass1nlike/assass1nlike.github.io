以 Manim 制作的约 9 分钟中文讲解视频，讲 Neruthes 项链：一个每层黑色总长恒为 1/2、却完全不嵌套的二进制递归分形。叙事主轴是测度、维数、欧氏几何，不按「Cantor / Sierpinski / Thue–Morse 关键词」做综述。

成片：`out/neruthes-necklace.mp4`（1920×1080，30 fps，字幕 + 背景音乐，无旁白）。

## 素材与依据

`src/paper.typ`、`src/note.typ` 是原始材料（作者 Neruthes 2026 的论文与小红书短文），从原链接下载后原样保存。所有结论、数值和公式都以下载的 `paper.typ` 为准；`note.typ` 只用于确认哪些点作者认为「说人话」讲得通。

## 数学内容的落点

`src/necklace.py` 是唯一的数学实现，严格按论文的 Expand 规则：

- 第 $n$ 层有 $2^{n-1}$ 个父对，第 $j$ 对读 $\sigma_{2^{n-1}+j}$；$01 \to 1001/0110$，$10 \to 0110/1001$。
- 一个等价改写：每个格子把颜色复制到左半（$\sigma=0$）或右半（$\sigma=1$），另一子格取反。用它来说明「一个黑格恰好生出一个黑格」，从而测度守恒。
- 连通块数 $R_{n+1} = 2^{n-1} + \sum_j c_{n,j} - \sum_j c_{n,j}c_{n,j+1}$；交替序列 $R_n=2^{n-2}$，全 1 序列 $R_n=(2^n+(-1)^{n-1})/3$。
- 维数族：解 $\sum_{j=1}^{k}2^{-jd}=1$，即 $d_k=\log_2\lambda_k$，$k=2,3,4,5$ 时 $d_k\approx0.694,0.879,0.947,0.975$。

已核对的项目：`tools/` 里没有单独的测试，验证脚本在开发时一次性跑过（平衡性、每层测度、五种 Coin sequence 的 $R_n$ 与论文表格逐项比对、$d_k$ 与论文表格逐项比对）。`s6b_five.py` 里的表格由 `necklace.py` 现场计算，不是手写数字。

## 分镜

场景文件在 `src/scenes/`，`tools/assemble.py` 的 `ORDER` 决定顺序：

| 文件 | 内容 | 时长 |
| --- | --- | --- |
| `s0_hook.py` | 逐层长出来，黑色总长恒为 1/2，抛出「极限是什么」 | 24 s |
| `s1_rule.py` | Expand 规则；「颜色交给一侧」的等价看法 | 49 s |
| `s2_move.py` | 黑色在平移、不嵌套；limsup / liminf | 36 s |
| `s2b_cantor.py` | 与 Cantor 集对照：包含定义极限 vs 守恒定义每层 | 35 s |
| `s3_indep.py` | 三角表示 $Y_n=x_n\oplus\varphi_n$，确定性的独立公平序列 | 51 s |
| `s4_countable.py` | liminf 至多可数；全 1 时 liminf 为空 | 39 s |
| `s7_tree.py` | 树自同构与精确共轭；投影到区间后失效（1/3→1/6） | 47 s |
| `s4b_dim_intro.py` | 盒维数的定义：小格子数按 $\varepsilon^{-d}$ 增长 | 32 s |
| `s5_dimension.py` | 禁字约束、自相似方程、$d_k$ 表、盒计数斜率 | 74 s |
| `s5b_count_vs_closure.py` | 可数集的正盒维数；$\dim_H=0$ 但盒维数 $=d_k$ | 37 s |
| `s6_components.py` | 同测度、同树结构，连通块数不同 | 45 s |
| `s6b_five.py` | 五种 Coin sequence 并排；模 4 巧合（conjecture） | 24 s |
| `s8_open.py` | 未解问题与结束卡 | 37 s |

合计约 529 s。

## 制作

环境用本机 base conda（Python 3.13，manim 0.22.1，LaTeX 走 TeX Live 2026，ffmpeg 用 imageio-ffmpeg 自带的）。中文字体 Noto Serif SC（思源宋体），与公式里的 Computer Modern 同为衬线风格。视觉语言在 `src/theme.py`：暗底、暖白格、三种强调色，字幕固定在底部。

```bash
python -m manim -ql --media_dir build/tmp/media src/scenes/s5_dimension.py S5Dimension
python tools/assemble.py --render          # 1080p 渲染全部场景并拼接配乐
python tools/assemble.py --quality l       # 用已有的低清片段快速试拼
```

配乐是 Kevin MacLeod 的《Ambiment》（incompetech.com，CC BY 4.0），放在 `build/music/bgm.mp3`，压到 −22 dB，首尾淡入淡出；片尾卡与本节都保留了署名。`build/` 是中间产物，可删；`src/paper.typ`、`src/note.typ` 保留原始材料。

## 已知的简化

- 全 1 情形的 liminf 为空，视频只给了结论和一句解释（规范展开排除尾部全 1），没有展开论文 4.6 节的推导。
- 模 4 巧合按论文的处理方式，明确标为 conjecture，画面里的数字只到第 9 层。
- 树共轭只用了 $\sigma$ 全 1、$\tau$ 全 0 的例子，没有讲一般的 $H_{\sigma,\tau}$ 构造。
