[TOC]

# Exps

## Tefig

进行SFT时不用base模型，就需要考虑到，Instruct 模型已经被 Anthropic / Meta / Qwen 团队用他们自己精心调过的 SFT mixture + DPO/RLHF 训过一遍。

在SFT Mistral-7B-Instruct-v0.3时，经常训了很少的步数就达到最佳评估性能，往后越训越差。原因可能是上述的性能已经提升得很好的原因；还可能是warmup时期有性能提升，之后lr到了正常值以后就开始破坏；
btw，mistral这个模型性能不行。

使用medqa_cot数据集sft，使用medqa评估，发现性能并没有提升。有可能是cot让模型学会了思考步骤，但是评测时是直接输出选项token，有一个偏移。

哪怕看到已有论文的setting，evaluation 也不应该自己一个个去拼，应该用统一的评测框架，后续还可以在里面选自己想要的eval指标

由于我的方法需要涉及ckpt参数相减，要记得保存ckpt0，或者进行一遍种子测试

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

在大家设计 engiworld 的 tasks 时，各自的 AI 加了很多无用字段

## Evalclaw

在给了jailbreakbench和MHJ作为jailbreak参考语料，想让auditor学习里面的话术，却发现结果不如直接让模型用已有知识。

petri和bloom作为agent场景式测评框架，scalability会差，因为构建一个场景就要多轮对话和大量资源消耗，不能测试大量的多样内容。而一个检测不一定必须每个项目都用上这种大资源消耗的方式，可能有些就是单纯的QA.

## ulars

来自WMDP训练时使用open-unlearning框架的教训：有的方法还是要看好原论文的超参选择，框架提供的可能跟最佳的差很多（RMU对retain loss的系数）

repetition是一个语言能力退化现象，强制修改权重的方法中都容易造成，比如unlearning, knowledge editing

尝试复现 ETW，但是基本的数值都相差很多；想使用 G-effect（WGA）的代码跑复现，但是 repo 内很多东西都是错的

## others

floccinaucinihilipilification 这个单词很适合测试模型由于tokenize而不能处理字母计数问题的测试

API 和 extra usage 都太坑了，非常费钱，是个商业手段逼着人升级方案

加载模型时使用device_map='auto'适用于模型太大，单卡放不下的情况，是朴素模型并行，很慢。如果模型能放进单卡，比如写 device_map="cuda:3" 就是单卡推理/训练。这是模型并行，而想要数据并行，需要各个GPU开进程，torchrun







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

## DB

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





## 行业

从 `tamlhp/awesome-machine-unlearning` 抓了完整数据,加上比较活跃的 LLM unlearning 子集仓库 `chrisliu298/awesome-llm-unlearning`(其 README 自报截至最新提交,有 407 篇论文、15 篇综述/立场论文、3 个框架和 2 篇博客),把两边交叉对照后估算出一份按会议·按年份的统计。

注意:**这两个仓库都是策展性的,不是穷尽性的**(尤其 tamlhp 对 2024 之后更新偏慢,chrisliu298 只聚焦 LLM unlearning),所以下面的数字偏保守,可以理解为下界。

| 会议 / 年份                        | 2021 | 2022 | 2023 | 2024  | 2025      |
| ---------------------------------- | ---- | ---- | ---- | ----- | --------- |
| **NeurIPS**                        | 3–4  | 4–5  | 5–7  | 10–15 | **40–60** |
| **ICLR**                           | 2–3  | 2–3  | 3–5  | 8–12  | **30–50** |
| **ICML**                           | 1–2  | 1–2  | 2–4  | 5–10  | **25–40** |
| **CVPR**                           | 1    | 2    | 2–3  | 5–8   | **15–25** |
| **AAAI**                           | 2    | 4    | 3    | 6–8   | **15–20** |
| **ACL / EMNLP / NAACL 合计**       | 0–1  | 1–2  | 3–5  | 10–15 | **30–50** |
| **USENIX / S&P / CCS / NDSS 合计** | 1–2  | 3–5  | 4–6  | 6–10  | **15–25** |

2023 之前每个顶会基本是个位数水平,2024 LLM unlearning(TOFU、WMDP、MUSE 等基准 / NPO 等方法)出来后,数量直接翻倍跳。

- NeurIPS 2023 还专门办过 unlearning 比赛,作为"新方向"看待;
- 到 NeurIPS 2025 / ICLR 2025,unlearning 已经是 LLM safety、diffusion concept erasure、graph unlearning、federated unlearning 多条线一起在投。
- chrisliu298 的统计里,407 篇 LLM unlearning 论文中**绝大多数集中在 2024–2025**,2025 单年差不多就有 200+ 篇 arXiv 论文(其中很多投到了顶会)。



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

## tools

### API

chat completion 里，推理模型的cot在多轮对话是不传的，模型只能看到历史的信息，但是看不到历史的思考过程。response API能传。客户端可以存储cot，但是是加密的，用户看不到内容，不过可以传上去在调用api时让模型看到历史的推理过程。

KVcache是在服务端的内存中存储的，可能存储5min,1h这种。客户端仍然发完整文本，而服务端会用前缀hash去查缓存。

openai的openai response和Google的gemini interactions基本概念上完全对应，比如store=true,previous_response_id。

claude memory会摘要对话，形成一份类似"人物画像/上下文摘要"，为每个新独立对话提供上下文

工具调用结果，模型看对话历史是能看到的。
