在给了jailbreakbench和MHJ作为jailbreak参考语料，想让auditor学习里面的话术，却发现结果不如直接让模型用已有知识。

可以考虑把之前运行的transcript作为资源

petri和bloom作为agent场景式测评框架，scalability会差，因为构建一个场景就要多轮对话和大量资源消耗，不能测试大量的多样内容。而一个检测不一定必须每个项目都用上这种大资源消耗的方式，可能有些就是单纯的QA.

看到olmoe-instruct的dataset used to train是https://huggingface.co/datasets/allenai/RLVR-GSM，就直接拿去做FT。但这个是用来做RL的，正确用法是：

  1. 把few-shot + question作为prompt输入给模型
  2. 模型自由生成答案
  3. 用规则验证答案里的数字是否等于ground_truth
  4. 对/错作为reward信号，用REINFORCE或PPO更新模型

olmoe-instruct的model card也说了，which has undergone supervised finetuning on an OLMo-specific variant of the [Tülu 3 dataset](https://huggingface.co/allenai/OLMoE-1B-7B-0125-Instruct/blob/main/allenai/tulu-3-sft-olmo-2-mixture) and further DPO training on [this dataset](https://huggingface.co/datasets/allenai/olmo-2-1124-13b-preference-mix), and finally RLVR training using [this data](https://huggingface.co/datasets/allenai/RLVR-GSM).最后的 this data就是上面说的用于RLVR的data.强制用这个训练，就是让模型预测数据中的所有文本，在学few-shot prompt的格式和答案，而few-shot内容在所有样本里一模一样，导致模型把那段固定文本背得很熟，过拟合严重。下次要看准，使用SFT应该用的data.

2026.3.24sonnet4.6让cc写一个olmoe和1lmoe的训练速度测试脚本，结果它没公平比较，olmoe只有一层参数不是冻结的。code review真有必要

使用for

加载模型时使用device_map='auto'适用于模型太大，单卡放不下的情况，是朴素模型并行，很慢。如果模型能放进单卡，比如写 device_map="cuda:3" 就是单卡推理/训练。想要数据并行，需要各个GPU开进程，torchrun

不清楚日志的含义不要瞎猜（然后苦等），可以问问claude现在是什么进度

测试MoE模型的显存占用，直接使用伪造的input_ids。但这会让激活的专家固定或者很少，与真实情况中激活很多专家不一致。

对于显著变慢的速度，尝试减少专家，查看变慢倍数的变化

计算qwen cluster相关实验的时候，8卡运行就OOM，4卡没事，不知道为什么

## ICML 2026

### 1

为了凑先前工作的不足，说之前的筛选有mutual interference，但它甚至从未被严谨定义，更别提量化。

为什么选择alignment score相近的数据能加速？要给出分析。
应该加上对ali的实际分布图，这样才知道筛选区间有没有意义

更低的ali对应着更好的diversity，这件事只是直觉上成立，没有理论分析或经验结果。而且对于是否diversity collapse，应该给出定性分析，比如表示分析

有关最佳的区间选择，没有 grounded in a fundamental paradigm，说得很勉强

整个方法设计都是motivational knowledge，而不是形式化的数学框架

nanoGPT和openwebtext不能论证在现代的7B+模型上，更多架构上，所谓的两个问题会不会出现

2NMD的计算量能不能真的带来效率；wall-clock 时间怎么样

alignment score指标本身没有novelty，和directional consistency和gradient signal-to-noise ratio相似，与influence functions和gradient matching的工作相似

目标要明确

超参设置太启发式了

baseline要加上现代筛选方法

L31-L35加上引用

### 2.

三个区间的设置能不能扩展
能不能把区间三划分变成更加理论上根据模型状态决定区间的方式

使用tolerance机制转变策略太脆弱了，必须证明其广泛应用性和鲁棒性

下游任务上的性能

end ICML2026

记得保存ckpt0

goodhart 定律：当一个指标变成目标，它就不再是好指标

来自WMDP训练时使用open-unlearning框架的教训：有的方法还是要看好原论文的超参选择，框架提供的可能跟最佳的差很多（RMU对retain loss的系数）

不要使用device_map='auto'，会导致严重跨卡通信开销，巨慢

做的领域不同的话，进度汇报彼此是很难听懂的

API 和 extra usage 都太坑了，非常费钱，是个商业手段逼着人升级方案

mistral模型很容易训一些就达到最佳性能了
有的时候还训也不提点/方法不work，师兄解释是这东西性能不行

# paper learned

Previous studies have observed that the gradient norm is inversely correlated with data length (Liu et al.,2025b; Xia et al., 2024a)
