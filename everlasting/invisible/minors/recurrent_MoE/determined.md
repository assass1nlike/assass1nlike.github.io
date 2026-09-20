[TOC]

# Related works

https://arxiv.org/pdf/2511.20639
latent collaboration MAS

现有的文本通信MAS的问题：信息损失（token不能完整表达内部语义）、效率低（生成、解析长文本占用大量token和推理时间）、文本表述误差在多智能体中累计。

本文给出的方法是，直接在隐空间协作。
单个智能体，直接用transformer最后一层隐状态作为思考载体。输入文本，前向传播得到last hidden state，经过![image-20260513130533402](/assets/blog/recurrent-moe/image-20260513130533402.png)对齐嵌入层后再转一圈去思考，最后得到一串连续的隐思考序列。至于MAS的协作：
![image-20260513130932626](/assets/blog/recurrent-moe/image-20260513130932626.png)

把单个智能体的连续思考结果连同前面的文本一起，计算每层的KV cache，都填到后面的agent中。



https://arxiv.org/pdf/2401.06066
DeepSeekMoE

传统的 MoE 会出现问题：

1. 知识混杂。每个专家被分到的职责非常宽泛，一个专家可能同时处理代码、诗歌、数学、对话；
2. 知识冗余。不同专家会重复学习“通识知识”，比如基本语法、常用词汇、基础推理。

对此 DeepSeekMoE的解决方案：

1. Fine-Grained Expert Segmentation
   把每个专家分成m份（做法是让中间维度变成原来的$\frac{1}{m}$）
   专家更专精，同时有更多的组合数，表达更细粒度的任务特征
2. Shared Expert Isolation
   设置一些共享专家，无需路由，每个token都必经过所有共享专家
   （激活的专家相应减少，加上前面的修改，是top k——top mk——top mk-k_s）

**路由机制**

每个专家都有一个centriod，可学习的小向量。

在路由时，token-to-expert，对于每个token的隐状态，和centroid求内积，然后通过score函数得到affinity score. 后续的加权系数就是对选择的experts的亲和度分数再归一化的结果。

score函数的选择发生了改变：DeepSeekMoE原始使用softmax（对所有专家），v3使用sigmoid，v4改成了$\sqrt{\log(1+e^x)}$

v3的理由是，专家数很多（256），如果softmax，每个分数会接近0，区分度变差。而sigmoid让每个专家独立判断
v4是，不像sigmoid限制在(0,1)，从而多了表达力（可以是任意正数），开根号则让输出尺度更温和，梯度更平稳。

**负载均衡**

MoE的负载均衡问题，常见的做法是

还有一个修改是“初始层使用Hash路由”。这个意思是，tokenID通过预定义的哈希函数映射到目标专家，纯确定性。

这么做的原因是，模型在最开始的几层，token的语义还没有充分形成，embedding还很原始，路由的优势还发挥不出来，反而引入不稳定性。

# tests

## 结构测试

### olmoe 的 1layer 用时测试

预热 3steps，测试5steps训练需要的时间

bs=16 gc=1 expert=false
8.6s(base)
155.4s 
57.6s (for_loop)

bs=1 gc=16 expert=false
62.8s(base)
287.6s
590.7s(for_loop)

bs=1 gc=16 expert=true
91.2s(base)
381.6s
697.5s(for)

bs=2 gc=8 expert=true
53.0s(base)
236.8s
410.9s(for)

上面的两种策略，一个是Olmoe的for循环，一种是token_dispatch策略。

## Olmoe warmup (续用pretrain好的权重，看性能)

### 主要结论

1. 单层 recurrent 不是完全不可训练，最朴素的olmoe全部拉成单层然后全量参数 FT 可从 `43.5703` 降到 `23.3981`。
2. 只加 step-aware、router tricks 不够，真正重要的是 depth locality。
3. 保留 per-layer attention/LN、只局部共享 experts 明显优于全局 expert pool。
4. `ver11` same-layer-only 训练 loss 好，但 full eval 不如 `ver10`；说明“更容易优化”不等于“泛化更好”。
5. 这条 warm-start compression 线最好的 early PPL 仍在 `16.x`，和 baseline `11.x` 差距很大。

# trains



# prompts

\# 背景

这里是1layermoe，一个研究新MoE结构的科研项目的repo。我们现在在yanch分支，这是我合作者那边做的一系列实验，现在把所有内容都push过来了。

\# 要求

请你帮我看一下目前目录里的全部内容，然后给我一个总结好的文档，要求列举出所有进行过的实验。最好是带点逻辑地向我整理一下再展示，从而让我能方便理解一整套实验思路。在整体理得比较清楚的同时，每个单独实验的内容应该包含：

- 做法。比如是怎么进行训练的，模型结构是怎么改的，总之就是让我明确这个实验的做法。这些做法设置和做这个实验的目的、动机、想要探究的insight，甚至是预期结果有关，它们也要被提及。

- setting. 在什么数据集上训练什么模型、超参设置、以及一些你觉得很重要的训练setting细节等。

- 结果。包括raw的指标上的结果，也包括这个实验的结果说明了什么内容，得到了什么结论。

\## 小小tips

你不需要为了满足上述格式而对一些没什么好讲的实验强硬添加内容。如果一些内容没什么说法，简略地表达是完全OK的。而且，你的详略得当也能让我更能抓住重点。

万一有些内容是残缺的，比如找不到结果、不清楚实际具体setting等等，或者因为什么原因你不能给出上述的理想中的报告，那就只把上述要求中你已知的内容写好，剩余未知又很重要的，就直接说还未知。

\# 输出

把你的文档写在0514overview.md中。

