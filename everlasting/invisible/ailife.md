[TOC]

# Talks

## X

Karpathy的Autoresearch：开源仓库，核心是一个"agent loop"：

1. 给cc或Codex一个完整的nanochat训练repo
2. 给它一个写了实验规则的markdown文件作为"研究指引"
3. agent自己开branch、改代码、跑5分钟训练、记录loss、决定保留或丢弃修改、循环

在单GPU上跑了大约两天，结果：

- agent自主进行了**约700次实验**
- 发现了**约20个**能改进validation loss的修改
- 这些修改是additive的（能叠加），并且能从depth-12模型transfer到depth-24模型
- 最终把"达到GPT-2质量"的训练时间从2.02小时压缩到1.80小时（11%提升）



Jack Clark（Anthropic联合创始人、Import AI作者）的一个判断：**60%+概率，到2028年底之前会出现no-human-involved AI R&D**——即一个AI系统能够基本独立地训练出它的后继者。

他用一系列benchmark趋势作为证据：

**SWE-Bench**（解决真实GitHub issue的能力）：

- 2023年末：Claude 2约2%
- 2026年：Claude Mythos Preview达到93.9%，本质上saturated了

**METR时间长度评测**（AI能50%可靠完成的任务的人类耗时）：

- 2022 GPT-3.5: ~30秒
- 2023 GPT-4: 4分钟
- 2024 o1: 40分钟
- 2025 GPT-5.2 High: ~6小时
- 2026年初 Opus 4.6: ~12小时
- Ajeya Cotra（METR）预测2026年底可达**100小时**

**CORE-Bench**（复现学术论文实验）：

- 2024年9月：GPT-4o + CORE-Agent得分21.5%
- 2025年12月：Opus 4.5得分95.5%，作者宣布benchmark "solved"

**MLE-Bench**（在75个Kaggle竞赛上从头建ML系统）：

- 2024年10月：o1 + scaffold = 16.9%
- 2026年2月：Gemini 3 + agent harness = 64.4%

---

goodhart 定律：当一个指标变成目标，它就不再是好指标

# Exps

## Tefig

进行SFT时不用base模型，就需要考虑到，Instruct 模型已经被 Anthropic / Meta / Qwen 团队用他们自己精心调过的 SFT mixture + DPO/RLHF 训过一遍。

在SFT Mistral-7B-Instruct-v0.3时，经常训了很少的步数就达到最佳评估性能，往后越训越差。原因可能是上述的性能已经提升得很好的原因；还可能是warmup时期有性能提升，之后lr到了正常值以后就开始破坏；
btw，mistral这个模型性能不行。

使用medqa_cot数据集sft，使用medqa评估，发现性能并没有提升。有可能是cot让模型学会了思考步骤，但是评测时是直接输出选项token，有一个偏移。

哪怕看到已有论文的setting，evaluation 也不应该自己一个个去拼，应该用统一的评测框架，后续还可以在里面选自己想要的eval指标

由于我的方法需要涉及ckpt参数相减，要记得保存ckpt0

## Recurrent-MoE

测试MoE模型的显存占用，直接使用伪造的input_ids。但这会让激活的专家固定或者很少，与真实情况中激活很多专家不一致。

看到olmoe-instruct的dataset used to train是https://huggingface.co/datasets/allenai/RLVR-GSM，就直接拿去做FT。但这个是用来做RL的，正确用法是：

    1. 把few-shot + question作为prompt输入给模型
    2. 模型自由生成答案
    3. 用规则验证答案里的数字是否等于ground_truth
    4. 对/错作为reward信号，用REINFORCE或PPO更新模型

olmoe-instruct的model card也说了，which has undergone supervised finetuning on an OLMo-specific variant of the [Tülu 3 dataset](https://huggingface.co/allenai/OLMoE-1B-7B-0125-Instruct/blob/main/allenai/tulu-3-sft-olmo-2-mixture) and further DPO training on [this dataset](https://huggingface.co/datasets/allenai/olmo-2-1124-13b-preference-mix), and finally RLVR training using [this data](https://huggingface.co/datasets/allenai/RLVR-GSM).最后的 this data就是上面说的用于RLVR的data.强制用这个训练，就是让模型预测数据中的所有文本，在学few-shot prompt的格式和答案，而few-shot内容在所有样本里一模一样，导致模型把那段固定文本背得很熟，过拟合严重。下次要看准，使用SFT应该用的data.

对于显著变慢的速度，尝试减少专家，查看变慢倍数的变化，从而观察规律。

## Engiworld-Benchmark

GPT-5.5 在GUI操作测试时仍然会hack。

指令不跟随：哪怕prompt里已经写了不能让它写代码，进行non-GUI操作，它也会做
**聪明的hack**：加入了一些eval的限制，比如如果检测到代码文件就判false，GPT5.5还是会以非常诡异的方式使用代码完成任务：把内容写在剪贴板，然后用ctrl+v这种“GUI操作”

## Evalclaw

在给了jailbreakbench和MHJ作为jailbreak参考语料，想让auditor学习里面的话术，却发现结果不如直接让模型用已有知识。

petri和bloom作为agent场景式测评框架，scalability会差，因为构建一个场景就要多轮对话和大量资源消耗，不能测试大量的多样内容。而一个检测不一定必须每个项目都用上这种大资源消耗的方式，可能有些就是单纯的QA.

## ulars

来自WMDP训练时使用open-unlearning框架的教训：有的方法还是要看好原论文的超参选择，框架提供的可能跟最佳的差很多（RMU对retain loss的系数）

repetition是一个语言能力退化现象，强制修改权重的方法中都容易造成，比如unlearning, knowledge editing

## others

floccinaucinihilipilification 这个单词很适合测试模型由于tokenize而不能处理字母计数问题的测试

API 和 extra usage 都太坑了，非常费钱，是个商业手段逼着人升级方案

加载模型时使用device_map='auto'适用于模型太大，单卡放不下的情况，是朴素模型并行，很慢。如果模型能放进单卡，比如写 device_map="cuda:3" 就是单卡推理/训练。这是模型并行，而想要数据并行，需要各个GPU开进程，torchrun

# Areas

## GNN

**GNN（Graph Neural Network，图神经网络）** 是专门处理"图结构数据"的神经网络。图是由**节点（node）**和**边（edge）**组成的数据结构。例子：

- 社交网络：用户是节点，好友关系是边
- 分子：原子是节点，化学键是边
- 论文引用网络：论文是节点，引用关系是边
- 知识图谱：实体是节点，关系是边

这类数据用普通的 CNN、Transformer 不好处理。CNN 假设数据有规则的网格结构（图像的像素），Transformer 假设是序列。而图是**不规则的**——每个节点的邻居数量都不一样，邻居之间也没有"顺序"。

GNN 的核心机制可以用一句话概括：**每个节点反复地从邻居那里聚合信息，更新自己的表示**。
形式化一点，一个 GNN 层做三件事：

1. **Message**：每个节点向它的邻居"发消息"（消息内容通常是节点自己的特征，可能经过一个变换）
2. **Aggregate**：每个节点把收到的所有邻居消息**聚合**起来（求和、求平均、求最大值，或更复杂的 attention 加权）
3. **Update**：节点用聚合后的信息 + 自己原本的特征，更新自己的新表示

堆 K 层 GNN，每个节点就能"看到" K 跳之外的邻居信息。这跟 CNN 堆层数扩大感受野的思路类似。

GNN 主要解决三类问题：

- **节点分类**：给一个节点打标签。例：判断社交网络里的用户是不是机器人。
- **链接预测**：预测两个节点之间是否应该有边。例：推荐系统里"用户会不会买这个商品"。
- **图分类/回归**：把整张图当成一个样本预测属性。例：给一个分子图，预测它的溶解度或毒性。



## ASR

输入一段音频波形，输出对应的文字。Siri、小爱、会议转录、YouTube 自动字幕、电话客服质检背后都是 ASR。

原始音频是一维波形（比如 16kHz 采样 = 每秒 16000 个浮点数）。实际喂给模型前，一般会先做特征提取，转成二维的"频谱图"——横轴时间、纵轴频率，每个点是该时刻该频段的能量。这一步把音频问题变成了一个"长得像图像的序列问题"。

**核心难点**：

- **长度不对齐**：一句 3 秒的话可能有 300 帧频谱、对应 8 个汉字。模型不知道哪一帧对应哪个字，而且同一句话不同人说，时间拉伸完全不同。
- **同音字、口音、噪声**：声学信号到文字是多对一的映射。
- **流式 vs 离线**：实时字幕要求边说边出字（流式），录音转写可以拿到完整音频再处理（离线），架构选择不同。

## OCR

输入一张图像，输出图中的文字。扫描件数字化、车牌识别、拍照翻译、PDF 解析（包括给 LLM 喂文档前的预处理）都是 OCR。

**典型流程（两阶段）**：

1. **文字检测（Text Detection）**：先找到图像中"哪里有文字"，输出一堆框（矩形或多边形）。代表方法：DBNet、CRAFT、EAST。这一步类似目标检测，但目标是文字行/词。
2. **文字识别（Text Recognition）**：对每个框裁出来的小图，识别出里面具体写了什么字。这一步的输入是一张"长条图"（一行文字），输出是字符串——**和 ASR 的"频谱图 → 文字串"在数学结构上几乎一模一样**，所以技术也通用：CTC、Attention、Transformer。

**为什么 ASR 和 OCR 技术栈通用**：两者都是"二维输入序列 → 一维文字序列"的对齐问题，长度不固定、不对齐，所以 CTC 和 seq2seq 这套工具同时统治了两个领域。

# Papers

Gradient norm is inversely correlated with data length (Liu et al.,2025b; Xia et al., 2024a)

local loss landscape as exhibiting high quadraticity, at least along most directions[^1][^2][^3]，这个结论可以帮助一些放缩，比如忽略三次项、固定二阶导

Several works (Needell et al.,2014; Zhao & Zhang, 2015; Alain et al., 2015) have shown the optimal distribution to be proportional to the per-sample gradient norm. 
这里的optimal distribution是让梯度方差最小的分布。

从meta unlearning[^4]得到启发，可以在训练一个东西的时候就预测后续事情的性能，加meta learning项.比如在pretrain的时候就预测SFT,RL的性能，在unlearn的时候就考虑relearn的表现

deep neural networks memorize specific training examples and that parameters in later layers are highly specialized to specific features[^5][^6]

# preliminaries

**要评测一个模型（或者考一个学生）的准确率，需要出多少道题才"算得准"？**

做完 n 题，算出正确率 p̂。但这个 p̂ 只是**估计值**，不是真实水平。题做得越多，估计越准。
衡量"准不准"用的是**95% 置信区间**：我有 95% 的把握，真实准确率落在 p̂ ± ME 这个范围里。ME 就是误差幅度（margin of error）。

对于比例（proportion）的置信区间：

$$\text{ME} = 1.96 \times \sqrt{\frac{p(1-p)}{n}}$$

其中 1.96 是 95% 置信水平对应的 z 值。反过来解出 n：

$$n = \frac{1.96^2 \cdot p(1-p)}{\text{ME}^2}$$

注意分子里有 p(1−p)。这个东西在 **p = 0.5 时取最大值 0.25**，远离 0.5（比如 0.9 或 0.1）时会变小。
也就是说：**真实准确率越接近 50%，估计起来越难，需要的样本越多**。所以在不知道真实 p 是多少的时候，就按最坏情况 p = 0.5 来算，这样无论实际情况如何都够用。



# Reviews

## ICML 2026

**方法**

为了凑先前工作的不足，说之前的筛选有mutual interference，但它甚至从未被严谨定义，更别提量化；
更低的ali对应着更好的diversity，这件事只是直觉上成立，没有理论分析或经验结果。而且对于是否diversity collapse，应该给出定性分析，举个例子，表示分析。
为什么选择alignment score相近的数据能加速？要给出分析。
整个方法设计都是motivational knowledge，而不是形式化的数学框架

并不知道所谓的“high”，“mid”有没有意义。至少应该加上对ali的实际分布图，这样才知道筛选区间都选了些什么
三个区间的设置能不能扩展？能不能把区间三划分变成更加理论上根据模型状态决定区间的方式？
有关最佳的区间选择，没有 grounded in a fundamental paradigm，说得很勉强

使用tolerance机制转变策略太脆弱了，必须证明其广泛应用性和鲁棒性
超参设置太启发式了

alignment score指标本身没有novelty，和directional consistency和gradient signal-to-noise ratio相似，与influence functions和gradient matching的工作相似

**实验**

nanoGPT和openwebtext不能论证在现代的7B+模型上，更多架构上，所谓的两个问题会不会出现
不止要测试pretrain val loss，还要考虑下游任务上的性能

2NMD的计算量能不能真的带来效率；wall-clock 时间怎么样

baseline要加上现代筛选方法

# Infs

**机器学习通用类**：NeurIPS、ICML、ICLR 是公认三大。NeurIPS 历史最长、规模最大；ICML 偏理论与方法；ICLR 完全开放评审（OpenReview 上能看到全部 review 和 rebuttal），是它的鲜明特色。COLT、UAI、AISTATS 略低一档但仍是好会。

**自然语言处理**：ACL 系（ACL、EMNLP、NAACL、EACL、AACL）是核心，其中 ACL 最权威，EMNLP 次之但近年差距很小，NAACL/EACL/AACL 是区域性会议。COLING 是老牌但近年地位下降（隔年办，与 ACL 错开）。期刊方面 TACL（Transactions of ACL）和 Computational Linguistics 是顶刊，TACL 论文可以选择在 ACL/EMNLP 现场展示。

**计算机视觉**：CVPR、ICCV、ECCV 是三大，CVPR 每年办、ICCV 与 ECCV 隔年交替。三者地位接近，CVPR 投稿量最大。

**人工智能综合**：AAAI 和 IJCAI 覆盖面广，CV/NLP/ML/规划/知识表示等都收，因为规模大、口径宽，单篇论文的"含金量"通常被认为略低于上面那些垂直顶会，但仍是 CCF-A。

---

几乎所有大会议都有以下几类轨道，名字略有差异：

**主会（Main / Research Track）**：会议核心，长文（一般 8 页正文）和短文（4 页）。Long paper 含金量高于 short paper，但 short paper 也算正式主会论文。

**Findings（ACL 系独有）**：2020 年 ACL 首创，给那些"质量过关但没能进主会的论文"一个去处。Findings 论文有正式 DOI、被 ACL Anthology 收录、可以查重引用，但**不在现场口头宣讲**（只能 poster 或不展示）。地位介于主会和 workshop 之间——很多人把它当作"主会短文"档次。其他会议没有官方的 Findings，但 NeurIPS/ICML 的 "poster"、ICLR 的 "poster" 在某种意义上承担了类似过滤作用。

**Industry / Applied Track**：面向工业界、强调系统部署和实际落地，评审标准更看重"是否解决真实问题、是否上线、规模如何"，而不是新颖性。ACL Industry Track、NAACL Industry、KDD ADS（Applied Data Science）、SIGIR Industry、CIKM Applied 都是这一类。CV 会议传统上没有独立 industry track（因为本身就工业味儿浓）。**地位差异很大**：KDD ADS 在工业界极受重视，论文同样进 KDD proceedings；ACL Industry 的学术声誉则不如主会，但在工业界招聘时被认可。

**System Demonstrations / Demo Track**：演示系统、工具、平台，论文较短（4 页左右），不要求新方法，要求可用性和影响力。HuggingFace Transformers、Stanford CoreNLP 这类工具最初都是 demo 论文。

**Workshop**：与主会同时举办的专题研讨会，由社区组织。Workshop 论文通常**不是正式发表**，也**不计入 proceedings**（少数 workshop 例外，如 NeurIPS 的一些 workshop 会出 PMLR 卷），可以之后再投正式会议。地位最低，但顶会的 workshop 影响力可能比二流会议正刊更大——尤其是 NeurIPS、ICML 的热门 workshop。

**Tutorial**：受邀或申请的教程，不是论文，但讲者通常是领域名人，是了解前沿的好途径。

---

Proceedings 是会议的正式论文集，**包含哪些 track 是会议自己规定的**。以 ACL 为例：

- **Proceedings of ACL（主册）**：主会长文 + 短文。
- **Findings of ACL**：单独一册。
- **Proceedings of ACL: Industry Track**：单独一册，明确标注。
- **Proceedings of ACL: System Demonstrations**：单独一册。
- **Proceedings of ACL: Student Research Workshop**：单独一册。
- 各 workshop 各自有 proceedings（也都在 ACL Anthology 上）。

NeurIPS 的做法不同：所有被接收的论文（无论 oral/spotlight/poster）都在同一本 proceedings 里，不做 track 区分，但论文页上会显示展示形式。Oral > Spotlight > Poster 是展示规格，不影响论文"录用"的等价性，但 oral 含金量更高（往往 <1%）。CVPR 类似，近年新增"Highlight"档位。

同一会议里：主会 oral / spotlight ≳ 主会常规 > Industry Track（视会议而定）≈ Findings（仅 ACL 系）> Workshop ≈ Demo > Shared task system paper

---

**CCF（中国计算机学会）推荐目录**是国内最常用的：A/B/C 三档，A 是顶会顶刊。例如 NeurIPS、ICML、ICLR、ACL、EMNLP、CVPR、ICCV、AAAI、IJCAI、KDD、SIGIR 都是 CCF-A；NAACL、COLING、ECCV（2022 起升 A）、WSDM、ECML 是 CCF-B。**但 CCF 列表更新滞后**，比如 ICLR 早年只是 B、ECCV 长期是 B，现实学术地位远高于这个评级。

**CORE Ranking**（澳大利亚）是另一套，分 A*/A/B/C，被国际上更多使用。

**Google Scholar 的 h5-index** 是数据驱动的指标，每年更新，能反映动态变化。AI 领域可以直接看 [Engineering & Computer Science → Artificial Intelligence](https://scholar.google.com/citations?view_op=top_venues&hl=en&vq=eng_artificialintelligence) 那个榜单。



ARC-AGI-3 回合制游戏环境，没有明文规则、没有说明——纯粹考"流体智能"（fluid intelligence），即在零经验下学习新技能的能力。这正好打中了 LLM 的死穴。

ARC-AGI-2 通过视觉网格谜题测量流体智能和新颖抽象推理。被认为是当前最难的公开推理 benchmark——人类个体平均表现 66%。截至 2026 年 5 月 25 日，GPT-5.5 以 85% 领先，GPT-5.4 Pro 83.3%，Gemini 3.1 Pro 77.1%。

Humanity's Last Exam (HLE) 大约 2,500 道极难题目跨越各学术领域，与 AI 安全中心合作，由近千位领域专家贡献。前沿模型得分在 20% 到 41% 之间。截至 2026 年 4 月，Gemini 3.1 Pro 以 41.0% 领先，Gemini 3 Flash 33.7%，Grok 4 24.0%。如果允许使用工具，Claude Opus 4.6 在 HLE with Tools 上能达到 53.0%，所以工具加持下分数会跳一大截。

τ-bench / τ²-bench（真实世界 agent 任务） 考察 agent 在真实场景下调用工具、与用户对话完成任务的能力。Claude Opus 4.5、GPT-5.2、Qwen3.5 等顶尖模型在 τ-bench 上得分介于 62.9% 到 70.2% 之间——这是个**生产可用性**而非纯推理的难点。

SWE-bench Pro（真实软件工程任务） GPT-5.4 是 2026 年 3 月的新编码领军者……在 SWE-bench Pro 上以 57.7% 领先。注意原版 SWE-bench Verified 已经被刷到 80%+，但 Pro 版本仍有较大空间。

|    Benchmark     | SOTA（2026.5） |            性质            |
| :--------------: | :------------: | :------------------------: |
|    ARC-AGI-3     |      <1%       |    流体智能/未明示规则     |
|  HLE (no tools)  |      ~41%      |      跨领域专家级问答      |
| HLE (with tools) |      ~53%      |         同上+工具          |
|  SWE-bench Pro   |      ~57%      |        真实软件工程        |
|     τ-bench      |     63-70%     |      Agent + 工具调用      |
|    ARC-AGI-2     |      ~85%      |        视觉抽象推理        |
|   GPQA Diamond   |   高 70s—94%   | 研究生科学问答（接近饱和） |



很多 CUDA/cuDNN 算子默认会选择"最快"的实现，而最快的实现往往是非确定的，为了做到bit-wise的实验复现，需要显示开启确定性模式。通常还要进行操作如

```python
torch.backends.cudnn.deterministic = True
torch.backends.cudnn.benchmark = False
torch.use_deterministic_algorithms(True)
# 并设置环境变量
os.environ["CUBLAS_WORKSPACE_CONFIG"] = ":4096:8"
```

但是，`use_deterministic_algorithms(True)` 会让一些没有确定性实现的算子直接报错。那么，不同训练常用的算子：

**几乎所有训练**

- `torch.mm / bmm / mv` ——只要做 matmul 就会用，但设一个环境变量 `CUBLAS_WORKSPACE_CONFIG=:4096:8` 就行
- 卷积的反向（cuDNN）——CNN/U-Net/扩散模型必用，但开 `cudnn.deterministic=True` 后有确定性实现，代价是慢一些。

**特定任务必踩**

- `embedding_bag` 反向 → 推荐系统、NLP 里 bag-of-words 类模型必用。**没有确定性实现**。
- `ctc_loss` 反向 → 语音识别（ASR）、OCR 必用。**没有确定性实现**。
- `F.interpolate` 反向（双线性/三线性等模式）→ 分割模型（U-Net、DeepLab）、超分、检测里的 FPN、扩散模型的上采样都用得很多。**部分模式没有确定性实现**。

**只有写特殊代码才会踩**

`index_add_` / `scatter_add_` / `bincount` → 图神经网络（GNN 的消息传递核心就是 scatter_add）、point cloud（PointNet++）、稀疏操作、自定义 loss 才会显式调用。普通 ResNet、Transformer 训练基本不碰。没有确定性实现。

纯 Transformer 训练（BERT、GPT、ViT 这类） → 主要就是 matmul + LayerNorm + softmax + embedding 查表，**很少触发上面的非确定算子**。把 matmul 的环境变量设好、cuDNN 设确定，基本能严格复现。标准 ResNet/ViT 图像分类同上，比较干净。

**几乎必踩中的**

- 语义分割、目标检测、超分、扩散模型 → `interpolate` 反向几乎跑不掉。
- ASR、OCR → `ctc_loss` 跑不掉。
- GNN（PyG、DGL） → `scatter_add` 是核心算子，跑不掉。
- 推荐系统（DLRM 类） → `embedding_bag` 跑不掉。





[^1]:Huanran Chen, Yinpeng Dong, Zeming Wei, Yao Huang, Yichi Zhang, Hang Su, and Jun Zhu. Understanding pre-training and fine-tuning from loss landscape perspectives. arXiv preprint arXiv:2505.17646, 2025.
[^2]: Hao Li, Zheng Xu, Gavin Taylor, Christoph Studer, and Tom Goldstein. Visualizing the loss landscape of neural nets. Advances in Neural Information Processing Systems, 31, 2018.
[^3]: Kaiyue Wen, Tengyu Ma, and Zhiyuan Li. How does sharpness-aware minimization minimize sharpness? arXiv preprint arXiv:2211.05729, 2022.
[^4]: https://arxiv.org/abs/2410.12777
[^5]: Feldman, V. 2020. Does learning require memorization? a short tale about a long tail. In Proceedings of the 52nd Annual ACM SIGACT Symposium on Theory of Computing, 954-959
[^6]: Stephenson, C.; Padhy, S.; Ganesh, A.; Hui, Y.; Tang, H.; and Chung, S. 2021. On the geometry of generalization and memorization in deep neural networks. arXiv preprint arXiv:2105.14602.
