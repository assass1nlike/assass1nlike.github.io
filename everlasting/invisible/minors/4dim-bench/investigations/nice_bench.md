下面是我为你挑选的一批近期较有代表性的 benchmark 论文,涵盖不同的设计范式和写作策略。建议你不要只读 paper 的方法部分,而是重点拆解它们的"动机叙事 → 设计原则 → 数据构造 → 质量控制 → 实验分析 → 局限性"这条主线是怎么组织的。

## 顶会获奖 / 高质量 D&B 类范本(必读)

**Artificial Hivemind: The Open-Ended Homogeneity of Language Models** (NeurIPS 2025 Best Paper, Datasets & Benchmarks Track) 作者团队来自 UW / CMU / AI2 / Stanford。该论文构建了 Infinity-Chat —— 一个由 26K 真实开放式查询和 31K 密集人类标注组成的严格基准,用于系统评估创意生成、构思与主观偏好对齐。论文不仅发布了有价值的数据集,还通过首个面向开放式 prompt 的全面分类法和对超过 70 个模型的大规模实证研究提供了深入分析,揭示出"Artificial Hivemind 效应"。 **学什么**:taxonomy 怎么从问题中"长"出来、如何把一个 dataset paper 写出 finding paper 的高度。arXiv: 2510.04618

**LLMs Get Lost In Multi-Turn Conversation** (ICLR 2026 Outstanding Paper) 这篇论文设计了一种可扩展的方法来评估多轮对话能力,并在交互是多轮且包含欠规约指令(real-world 中非常常见的情形)的设置下,测量到 LLM 能力和可靠性的显著下降。其实验设计与方法学被评委称为"exceptional",发现新颖有趣。 **学什么**:如何把"评测协议"本身当成贡献来写——不是堆数据,而是把"sharded simulation"这种 evaluation methodology 讲透。arXiv: 2505.06120

## Agent / 真实任务类(目前 ICLR/NeurIPS 投稿主流方向)

**SWE-bench** (Jimenez et al., ICLR 2024) agent benchmark 写作的"模板"。重点看它怎么把"从 GitHub PR 自动构造任务"这件事讲成一个 scalable + verifiable 的 pipeline,以及怎么用 unit test pass 把主观评测变客观。arXiv: 2310.06770

**GAIA: a benchmark for General AI Assistants** (Mialon et al., ICLR 2024) GAIA 测试通用助手能力,这些能力需要多步推理、网页浏览、工具使用和基本的多模态理解。GAIA 任务措辞看似简单,实际却需要一连串非平凡的操作才能正确完成——这正是真实助手在野外会遇到的复合任务。 **学什么**:难度分级(Level 1-3)如何论证、"google-proof"这种设计原则如何用一段话讲服审稿人。arXiv: 2311.12983

**τ-bench (tau-bench)** (Sierra, 2024) 评估 agent 在交互式真实场景中的一致性/可靠性,引入了 pass^k 指标(同一任务跑 k 次都过才算过)。 **学什么**:当你想测一个"老 benchmark 测不出来"的新维度时,如何论证这个维度的必要性。arXiv: 2406.12045

**OSWorld** (NeurIPS 2024 D&B) 真实操作系统环境中的 computer-use benchmark。 **学什么**:环境(environment)类 benchmark 与 dataset 类 benchmark 在写作结构上的差异——它的"基础设施贡献"部分写得很清楚。arXiv: 2404.07972

## 知识 / 推理类(经典写作范式)

**GPQA: A Graduate-Level Google-Proof Q&A Benchmark** (Rein et al., COLM 2024) 极简却写得很扎实的范本。重点看它的标注流程图(写问题 → 专家验证 → 非专家盲测筛选 → 难度分层)和如何用"PhD 65% vs 非专家 34%"这种对照数字来定义难度。arXiv: 2311.12022

**MMLU-Pro** (Wang et al., NeurIPS 2024 D&B) 本文介绍 MMLU-Pro,一个增强数据集,通过整合更具挑战性、推理导向的问题并将选项从 4 个扩展到 10 个,来扩展以知识为主的 MMLU 基准,同时消除 MMLU 中的琐碎和有噪声的问题。 **学什么**:如何写一个"升级版"benchmark——怎样定位前作不足、怎样量化"更难"和"更鲁棒"。arXiv: 2406.01574

**LiveBench** (White et al., ICLR 2025 Spotlight) 从近期出版物、arXiv 论文、新闻和竞赛平台抽题,每月在数学、编码、推理、数据分析等领域更新,直接对抗 contamination。 **学什么**:如何把"防污染"作为核心 contribution 来论证,以及动态 benchmark 的可持续性章节怎么写。arXiv: 2406.19314

**Humanity's Last Exam (HLE)** (Phan et al., 2025) 极端难度 benchmark 的范例,前沿模型在它上面也只能拿个位数到二十几分。 **学什么**:如何论证一个"绝大多数模型几乎全错"的 benchmark 仍然有意义——signal-to-noise、ceiling argument 怎么写。arXiv: 2501.14249

## 写作技巧总结建议

读这些 paper 时建议你专门做一张表,横向对比它们的:

- **introduction 第一段怎么讲"现有评测的缺口"**(几乎所有 benchmark paper 的成败都在这一段)
- **"design principles"小节是否独立成节**(优秀的 benchmark paper 通常会显式列出 3-5 条设计原则)
- **数据收集和质量控制怎么"讲故事"**而不是流水账(标注间一致性 IAA、专家校验环节)
- **contamination / data leakage 是怎么论证规避的**(ICLR 2027 审稿人几乎必问)
- **除了 leaderboard,做了什么 finding-level 的分析**(NeurIPS D&B 现在非常看重"benchmark + insights"的双重贡献,纯 leaderboard 容易被拒)

另外强烈建议你直接读一下 NeurIPS 2025 D&B Track 的 Call for Papers 和 reviewer guidelines —— 那里面写明了审稿人会按哪些维度打分,基本和 ICLR D&B 一致,对你设计 paper 结构非常有帮助。

需要我把上面任何一篇论文的具体写作结构(比如 SWE-bench 或 Infinity-Chat 的章节布局)拆给你看吗?