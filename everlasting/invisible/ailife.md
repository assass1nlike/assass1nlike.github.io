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

# Papers

Gradient norm is inversely correlated with data length (Liu et al.,2025b; Xia et al., 2024a)

local loss landscape as exhibiting high quadraticity, at least along most directions[^1][^2][^3]，这个结论可以帮助一些放缩，比如忽略三次项、固定二阶导

Several works (Needell et al.,2014; Zhao & Zhang, 2015; Alain et al., 2015) have shown the optimal distribution to be proportional to the per-sample gradient norm. 
这里的optimal distribution是让梯度方差最小的分布。

# Usages

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



[^1]:Huanran Chen, Yinpeng Dong, Zeming Wei, Yao Huang, Yichi Zhang, Hang Su, and Jun Zhu. Understanding pre-training and fine-tuning from loss landscape perspectives. arXiv preprint arXiv:2505.17646, 2025.
[^2]: Hao Li, Zheng Xu, Gavin Taylor, Christoph Studer, and Tom Goldstein. Visualizing the loss landscape of neural nets. Advances in Neural Information Processing Systems, 31, 2018.
[^3]: Kaiyue Wen, Tengyu Ma, and Zhiyuan Li. How does sharpness-aware minimization minimize sharpness? arXiv preprint arXiv:2211.05729, 2022.
