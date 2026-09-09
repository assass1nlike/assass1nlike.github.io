[TOC]

### 2026.5.13

#### LangGPT

https://github.com/langgptai/LangGPT/blob/main/README_zh.md https://arxiv.org/pdf/2402.16929

```markdown
# Role: 你的角色名称

## Profile
- Author: 你的名字
- Version: 1.0
- Language: 中文
- Description: 清晰的角色描述和核心能力

### Skill-1
1. 具体技能描述
2. 预期行为和输出

## Rules
1. 在任何情况下都不要打破角色设定
2. 不要编造事实或产生幻觉

## Workflow
1. 分析用户输入并识别意图
2. 系统性地应用相关技能
3. 提供结构化、可操作的输出

## Initialization
作为 <Role>，你必须遵守 <Rules>，你必须用默认 <Language> 与用户对话，你必须向用户问好。然后介绍自己并介绍 <Workflow>。
```

一些提示词设计原则：

**规范化格式**：让 LLM 容易识别意图。
**结构可扩展**：用户能按自己的领域定制。
**要求清晰完整**：避免歧义和偏差。
**语言保持灵活**：方便学习和跨领域复用。

模块代表提示词的某个方面，常见模块有：

**Profile**：LLM 扮演的角色（如"你是杂志编辑"）
**Goal**：目标任务
**Constraint**：约束条件（如字数限制）
**Workflow**：执行流程（类似 CoT 思维链）
**Skill**：可用技能/工具
**Suggestion**：建议与行为规划
**Background**：背景信息
**Style**：输出风格
**Output Format**：输出格式
**Initialization**：初始化对话
**Examples**：示例（Few-shot）

实验中，LangGPT驱动LLM能在任务上有性能提升。在不同scale的qwen模型上测试，0.5B的用了更差，主要实验的bloomz也是更差了，因此怀疑模型越弱，复杂格式的收益越低。

对“LangGPT prompt 生成任务”进行SFT，微调后模型在各项任务上的整体性能也有提升。

#### 有关 Muon 优化器

https://spaces.ac.cn/archives/10592
https://www.zhihu.com/question/1910001570080359694/answer/1916050159411893853

- 先清楚 msign 这个东西：在m*n矩阵的SVD![image-20260513103241168](C:\Users\15951\AppData\Roaming\Typora\typora-user-images\image-20260513103241168.png)中，把中间的对角矩阵的奇异值全部换成1![image-20260513103323972](C:\Users\15951\AppData\Roaming\Typora\typora-user-images\image-20260513103323972.png)
  这件事情是“保留方向，抹平幅度”。往什么方向施加变换是保持不变的，但是缩放强度都统一了。这就解决了神经网络中奇异值分布不平衡，直接使用梯度会让模型只在少数方向上学习的问题。

- 在实现上，根据缩放因子的不同，有四种版本：![image-20260513103724943](C:\Users\15951\AppData\Roaming\Typora\typora-user-images\image-20260513103724943.png)

  至于它们的存在，是因为 msign 抹平了所有奇异值但带来一个新问题：msign(M) 矩阵的更新幅度跟矩阵形状强相关。
  ![image-20260513104513385](C:\Users\15951\AppData\Roaming\Typora\typora-user-images\image-20260513104513385.png)由此可见输出幅度和最后一项成正比，需要缩放。

- 此外，还有一些有关msign的结论![image-20260513104151502](C:\Users\15951\AppData\Roaming\Typora\typora-user-images\image-20260513104151502.png)

- 有关muon的work

  认为原因一可能是其方法本身的正交性，二是一系列的附加操作，如更大的momentum beta、Nesterov 加速、因muon无法处理embedding和lm_head从而加入的额外参数。

  最后一项引出了很多局部学习率。由于transformer不同模块的shapeness不同，需要的lr大小也不同（越小，需要的就越大），使用局部学习率后当然表现飙升。至于前两个，应用在adamW上同样能获得很好的加速效果。

  https://arxiv.org/abs/2604.09258 的附录中有一些真实的ablation，可以得到结论：

  1. Muon的优势，完全不来自于特殊的NS迭代 (Fig. 7, Sec 5.2)
  2. Muon的优势，部分来自于MuP、large momentum等正交化操作之外的东西（Appendix H.7)

#### [Recurrent MoE] latent collaboration MAS

https://arxiv.org/pdf/2511.20639

现有的文本通信MAS的问题：信息损失（token不能完整表达内部语义）、效率低（生成、解析长文本占用大量token和推理时间）、文本表述误差在多智能体中累计。

本文给出的方法是，直接在隐空间协作。
单个智能体，直接用transformer最后一层隐状态作为思考载体。输入文本，前向传播得到last hidden state，经过![image-20260513130533402](C:\Users\15951\AppData\Roaming\Typora\typora-user-images\image-20260513130533402.png)对齐嵌入层后再转一圈去思考，最后得到一串连续的隐思考序列。至于MAS的协作：
![image-20260513130932626](C:\Users\15951\AppData\Roaming\Typora\typora-user-images\image-20260513130932626.png)

把单个智能体的连续思考结果连同前面的文本一起，计算每层的KV cache，都填到后面的agent中。

#### [Tefig] Intrinsic dimensionality explains the effectiveness of LM FT

https://arxiv.org/abs/2012.13255

**为什么FT如此effective?** pretrain的LLM参数量巨大，但在下游任务上往往只用几千条样本FT就能有很好的效果。通常来说，参数远多于样本应该严重过拟合啊，为什么微调有效？本文答案是，微调过程实际发生在一个极低维度的子空间里。

**测量这个子空间大小的方法**是：假设原来参数$\theta$有D维，我们只训练一个$d<<D$维的向量，之后它投影到D维来作为参数更新。
这里投影如果直接使用稠密矩阵$d*D$，存储消耗太大。文中的fastfood变换是取一个D*D矩阵的前d列：![image-20260514010332812](C:\Users\15951\AppData\Roaming\Typora\typora-user-images\image-20260514010332812.png)
这里B是对角线元素等概率取正负1的对角矩阵，H是递归定义得到的hadamard矩阵![image-20260514010541523](C:\Users\15951\AppData\Roaming\Typora\typora-user-images\image-20260514010541523.png)![image-20260514010547264](C:\Users\15951\AppData\Roaming\Typora\typora-user-images\image-20260514010547264.png)，$\prod$是每行每列恰有一个1，其余为0的置换矩阵、G是从标准正态分布独立采样的对角矩阵，在它们的计算中，除了H，都是$O(D)$的复杂度，而H有加速方法：![image-20260514010848581](C:\Users\15951\AppData\Roaming\Typora\typora-user-images\image-20260514010848581.png)
解复杂度的递推关系式![image-20260514010912952](C:\Users\15951\AppData\Roaming\Typora\typora-user-images\image-20260514010912952.png)，得![image-20260514010923893](C:\Users\15951\AppData\Roaming\Typora\typora-user-images\image-20260514010923893.png)

**感知结构。**刚刚的投影方法吧所有层有一视同仁地摊平，但实际上不同层有不同的功能特化。所以，把之前的d维预算分出m个，用来作为每层一个的标量可学习参数，也即图中的$\lambda_i$![image-20260514011518383](C:\Users\15951\AppData\Roaming\Typora\typora-user-images\image-20260514011518383.png)

**测试NLP任务的维度**。在MRPC和QQP上，roberta只需要几百，bert也是几千即可。roberta虽然参数多，但是d稳定优于bert；加入每一层的学习参数是额外有效的。

**预训练是学习通用压缩框架**。from scratch训练了roberta-base，发现随着pretrain，需要的d单调降。并且难的任务需要的维度始终更高。
**与参数量的关系**：参数量越大，下游任务的内在维度越低。
**内在维度和泛化的关系**。内在维度越低，eval acc越高；训练和测试的acc之差越小。

### 2026.5.14

#### [Tefig] LIMA: Less Is More for Alignment

认为，**模型的知识和能力几乎完全是在预训练中学到的；对齐只是在教模型从已经会的格式分布里挑出哪个子分布用于和用户交互。**

**数据集构建**：在多个来源（stach exchange, reddit）、主题和任务（除了常见的问题以外，还有有毒或恶意然后answer中给出拒绝的、还有自然语言生成任务、...）

**结果**：用LIMA和其它baseline，比如用52k alpaca数据集SFT的llama-65B，比较，表现很好。（绝对质量分析结果也不错）
一些有趣的结果是，val_ppl的更好结果不代表更高的生成质量，所以ckpt是手动挑的；在SFT后，OOD的任务（比如买披萨、讲脱口秀）也表现不错，进一步证实能力是pretrain学的

**ablations** SFT的diversity和quality带来显著优势；数量增大并没有带来改善。

**多轮对话验证‘浅层对齐’假设** LIMA全是单轮交互，所以一开始尝试对话时，很快就跟丢了。但是加入30条对话样本后，显著性能提升。

#### [Tefig] URIAL The Unlocking Spell on Base LLMs: Rethinking Alignment via In-Context Learning

认为完全不FT也能对齐。对齐可能只是token分布的一个shift

**一个实验**：把初始prompt和

#### [Recurrent MoE] DeepSeekMoE

https://arxiv.org/pdf/2401.06066

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

### 2026.5.15

#### [Tefig] 对于常见SFT和evaluation dataset的整理

##### 通用指令跟随

- alpaca(52K) 
  基于175个种子任务，让GPT自己扩展出52k instruction, input, output三元组
  单源、自蒸馏、质量参差
  有一些简单的泛化指令，也有GPT幻觉，太小太老
- Alpaca-GPT4
  指令和上面一样，但是response用GPT-4重新生成
- WizardLM Evol-Instruct (70k / 196k V2)
  用 Evol-Instruct 方法把 Alpaca 指令"进化"得更复杂——加约束、加深度、加广度。比如 "写一首诗" 进化成 "用十四行诗格式写一首关于量子纠缠的诗，并解释每行的隐喻"
  适合测试复杂指令
- LIMA (1K)
  人工精选 1000 条高质量样本（750 来自论坛、250 自写），当时用来证明"少量高质量数据 SFT 就能很好"
  作为质量上限
- FLAN v2 (~89K 在 Tulu 版本里)
  把上百个 NLP 任务（分类、QA、摘要、翻译...）模板化成指令格式。
  更多是对传统NLP的覆盖，对开放式对话能力提升有限

- Tulu 3 SFT Mixture (939K) 
  混合了 CoCoNot（拒绝有害请求）、FLAN v2、No Robots、OpenAssistant、NuminaMath-TIR、Persona-driven 合成数据、WildGuardMix、WildJailbreak 等十几个源，共 939,344 条，是通用SFT池。
  异质性强、规模大、社区也有ckpt可以作为full-data对照

##### reasoning

- OpenThoughts3-1.2M
  850K 数学 + 250K 代码 + 100K 科学
  reasoning trace 由 QwQ-32B 生成，各方面都调优过，SOTA数据集。
- s1K-1.1 (1K)
  类似LIMA，精心挑选的高难度推理问题，1k数据就能让qwen-32B达到很高的推理性能
- MathInstruct (262K)
  混合了 13 个数学数据集（GSM8K、MATH、AQuA 等）+ 思维链 / 程序化推理两种格式，数学方向。
- NuminaMath-CoT (860K)
  含有CoT解题过程，质量比上一个高。

##### 指令跟随/对话类评测

- AlpacaEval (2.0)
  用 GPT-4 Turbo 作为 judge 比较你的模型 vs baseline 模型（GPT-4 Turbo）的回答，输出胜率。
  存在judge bias，偏好GPT系风格回答。
- MT-Bench
  80 个多轮问题（会注重对话深度），覆盖 8 个类别（写作、角色扮演、提取、推理、数学、编程、STEM 知识、人文），GPT-4 打分 1-10。
  题目少，GPT-4 judge有偏差。
- Arena-Hard
  从 Chatbot Arena 的真实用户对话里挖出 500 个高区分度难题，GPT-4 judge
- IFEval (Google)
  约 500 条带"可验证约束"的指令，比如"回答必须包含关键词 X，不超过 200 字，结尾用感叹号"。
  测试严格指令跟随能力

##### 知识/综合能力

- MMLU
  57 个学科、约 14000 道四选一题，覆盖人文、STEM、社科、专业领域（法律、医学等）。
  测试广覆盖的事实性知识和学科推理
  有些饱和明显
- MMLU-Pro
  10选1，并且过滤掉trivial题、加强推理题占比
  区分度更好
- BBH (Big-Bench Hard)
  在big-bench中挑出的23个对LLM来说最难的任务
- GSM8K
  8500小学数学应用题，测基础数学推理
- MATH / MATH-500
  12500/500道高中竞赛数学题，测高难度数学推理
- HumanEval
  python 编程题，给函数签名和 docstring，让模型写实现，用单元测试判断 pass@1。
  基础代码生成
- MBPP
  974 道入门级 Python 题，比 HumanEval 简单些但题量大。
- TydiQA
  11 种类型多样语言的 QA（涵盖阿拉伯、孟加拉、芬兰、印尼、俄、斯瓦希里等）
  也涉及长上下文阅读
- TruthfulQA
  817道针对常见误解的问题，诱导模型说常见的错误信念（"打雷时为什么会下雨？"——常见错误答案 vs 真实物理原因）
  评测真实性、抗误导能力

##### 难题

- GPQA (Diamond)
  448 道博士级生物、物理、化学题，由领域专家撰写，Google-proof（搜不到答案）
- AIME 2024 / 2025
  高中数学奥林匹克难度，测高难数学推理
- LiveCodeBench
  持续更新的编程题集，按时间段切分，避免训练污染

### 2026.5.16

#### DeepSeek v4 

https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro/blob/main/DeepSeek_V4.pdf

2.2 mHC

CSA和HCA

- CSA：每m个token压成一个，再叠加稀疏选择
- HCA：激进地压缩，但是不稀疏选择

c为注意力头维度，通过四个$\mathbb{R}^{d\times c}$投影矩阵让$H\in\mathbb{R}^{n\times d}$得到两个KV和两个权重logits![image-20260516045312806](C:\Users\15951\AppData\Roaming\Typora\typora-user-images\image-20260516045312806.png)
权重logits到真实使用的权重，还需要加上可学习偏置向量再softmax。



### 2026.7.9

https://arxiv.org/pdf/1312.6120
Exact solutions to the nonlinear dynamics of learning in deep linear neural networks
optimizations

**三层神经网络求梯度**
$$
E^\mu=\left\|y^\mu-W^{32}W^{21}x^\mu\right\|^2
$$

先对模长平方求导，记

$$
e^\mu=y^\mu-W^{32}W^{21}x^\mu
$$

$$
dE^\mu = 2(e^\mu)^T de^\mu
$$

考虑内部，对 W21求导时把d放至W21处

$$
de^\mu=-W^{32}\,dW^{21}\,x^\mu
$$

$$
dE^\mu
=
-2(e^\mu)^T W^{32} dW^{21} x^\mu
$$

*由于是单个值，将其写成 trace 形式*
$$
dE^\mu
=
-2\operatorname{tr}\left((e^\mu)^T W^{32} dW^{21} x^\mu\right)
$$

**利用 trace 循环性质：**
$$
dE^\mu
=
-2\operatorname{tr}\left(x^\mu (e^\mu)^T W^{32} dW^{21}\right)
$$

由迹的求导法则

$$
\frac{\partial E^\mu}{\partial W^{21}}
=
-2(W^{32})^T e^\mu (x^\mu)^T
$$

$$
\frac{\partial E^\mu}{\partial W^{21}}
=
-2(W^{32})^T
\left(
y^\mu-W^{32}W^{21}x^\mu
\right)
(x^\mu)^T
$$

$$
\frac{\partial E^\mu}{\partial W^{21}}
=
-2(W^{32})^T
\left(
y^\mu (x^\mu)^T
-
W^{32}W^{21}x^\mu (x^\mu)^T
\right)
$$

梯度下降更新为

$$
\Delta W^{21}
=
-\eta \frac{\partial E}{\partial W^{21}}
$$

所以

$$
\Delta W^{21}
=
2\eta\sum_{\mu=1}^P
(W^{32})^T
\left(
y^\mu (x^\mu)^T
-
W^{32}W^{21}x^\mu (x^\mu)^T
\right)
$$

对W32求导时，d放在W32

$$
dE^\mu
=
-2(e^\mu)^T dW^{32}W^{21}x^\mu
$$

*写成 trace 形式：*
$$
dE^\mu
=
-2\operatorname{tr}\left((e^\mu)^T dW^{32}W^{21}x^\mu\right)
$$

*循环移动：*
$$
dE^\mu
=
-2\operatorname{tr}\left(W^{21}x^\mu (e^\mu)^T dW^{32}\right)
$$

因此

$$
\frac{\partial E^\mu}{\partial W^{32}}
=
-2 e^\mu (x^\mu)^T (W^{21})^T
$$

$$
\frac{\partial E^\mu}{\partial W^{32}}
=
-2
\left(
y^\mu (x^\mu)^T
-
W^{32}W^{21}x^\mu (x^\mu)^T
\right)
(W^{21})^T
$$

梯度下降：

$$
\Delta W^{32}
=
-\eta \frac{\partial E}{\partial W^{32}}
$$

$$
\Delta W^{32}
=
2\eta
\sum_{\mu=1}^P
\left(
y^\mu (x^\mu)^T
-
W^{32}W^{21}x^\mu (x^\mu)^T
\right)
(W^{21})^T
$$

1. 把d放到要求导的地方
2. 单个值就套tr，然后用 $dE=\operatorname{tr}(A^T dW), \frac{\partial E}{\partial W}=A$

