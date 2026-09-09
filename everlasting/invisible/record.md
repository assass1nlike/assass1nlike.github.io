### 2026.7.10

想测试一下在各层个模块的F/R gradient，彼此的内积，以及在训练不同阶段的F/R 2*2内积。三个 benchmark, 2个方法

### 2026.7.11

跑了 rho-loss 的 baseline

### 2026.7.12

创建了我需要的论文阅读的 skill，未来可以用它进行更高效的论文内容叙述生成，不必再手动修改和语句打磨。未来可能会在实际使用中持续编辑。

### 2026.7.13

筛选不再是计算和上一波参数更新的相似度，而是和平均val梯度的相似度



研究一下unlearning中effective bs为什么会导致不同的训练结果

### 2026.7.14

清晰了 muon 优化器的设计

和焕然、高宁讨论研究方向的问题

- 语言模型因为实施容易，会比较卷；而 CV，具身等，实际上还有很多可以做的点
- 很难在一个比较重要的问题上做出定义问题的工作，因为肯定会有人想到。哪怕能做，也肯定是一个无聊的方向
- 投稿多的

看到比较符合 research taste 的 huanran,温凯越主页，以及相应的有价值的论文
gpt5.6-sol 给出的好的方向

搜索了 meta-alignment, language-loss 的内容

meta-unlearning 中的NSFW数据集

---

---

### 2026.7.16

**evalclaw 阶段性汇报**

1. 有关框架设计，对标 autoresearch，对于 work 的、有用的模块进行参考，集成到 evalclaw 里。
2. 做几个 case，看看和人做的相比如何：
   - repoMirage
   - 在医疗场景下的欺骗行为，要求数据集必须来自真实场景
   - Engiworld

**新的 ulars 筛选的想法**

按照内容依赖层级进行选择性遗忘，编辑了新的 `determined.md`

**复现 ETW（ACL2026）的实验**

让 codex 自动化推进，希望能刷过它。

### 2026.7.17

**继续进行正确的复现**

ETW 的复现，模型实现方法了以后就停止了；在看 G-effect 的仓库时，又认为不行（可是在新开 codex 对话中是可以用的）；让它自己选择一个已有论文进行复现时，可能是没表述清楚或它自身能力问题，找到的 open-unlearning 原论文里是没有 FQ 的记录的。

后来基于 G-effect 的开源仓库实现了正确的复现

**总结自己过去狗屎一样的tefig, ulars研究**

根据 detailed 记录复原了 ulars 先前的所有研究，并且进一步把之前重跑过的 nanoSFT 研究整理成了文档+src+results大文件。

重要的是，

1. 可以把所有历史结论全都提取出来，放到 determined.md 中；
2. 确保了每个实验都是可复现的（文档里有记录）

**系统化整体工作流**

在 assassinlike.github.io/everlasting/everlasting.md 中有完整介绍，重构了不少东西

**evalclaw 对于涉及自定义 VM任务的自动化推进** 

自己烧了几个小时

### 2026.7.18

**跑自己方法的 ulars1**

跑梯度内积加权的实验，有直接选取 retain 的，也有自蒸馏的。零点的时候 codex 断了，白天正常跑起来

**给自己 AAAI 论文加理论部分**

推了一些

### 2026.7.20

**使用 autoresearch 看我的方法**

`uditgoenka/autoresearch` 和 `leo-lilinxiao/codex-autoresearch` 还是面向数值目标的，需要明确 set a goal. 

**想清楚 ulars1 的逻辑**

一些 retain set 不能很好代表 D 时，L(D)上升的理论证明；

“依赖”的形式化定义

**Evalclaw 来做医学和工业软件场景**

### 2026.7.21

**方法逻辑**

完成‘依赖’的形式化定义和由此得出的加权的理论推导，确认投稿 AAAI2027

### 2026.7.22

调超参，整理 determined.md 中零散的内容，论文的一些组件开始成型

### 2026.8.3

入坑 self-evolve，尝试5个自动化 idea

---

### 2026.8.10

**std**

- `pretrain/data selection/OPUS`
- `optimization/basin like loss landscape`
- Unlearn Arena
- Sexual Bot

**evalclaw**

明确框架详细流程

---

### 2026.8.17

- `optimization/optimizer/HGM`
- `posttrain/SFT/DFT`
- Unlearn Arena

**evalclaw**

编辑框架详细流程文档，修改不合理位置

**cybergym**

整理过程和最终代码与结果

---

### 2026.8.19

- `safety/self-evolve/w.EMA/ATP`

---

---

---

### 2026.9.8

前一天组会所讲的内容基本都很平常。可以说，EvalClaw 的设计是没有创新点的，各个模块都做的非常 normal.

---



董老师说的一种研究方式
