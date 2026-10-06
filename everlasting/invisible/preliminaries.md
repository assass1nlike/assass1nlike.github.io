[TOC]

# opinions

**Autoresearch**

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

业界一般把 AI 工程的演进分成三个阶段：

**Phase 1（~2023）—— Prompt engineering**：瓶颈是怎么措辞。
**Phase 2（2024–2025）—— Context engineering**：模型能力上来了，瓶颈变成了信息——怎么把相关文件、项目规则、架构约束塞进 context window。MCP 和 RAG 让这件事更系统化。
**Phase 3（2026）—— Harness engineering**：现在的挑战是自主性、准确性和控制。

---



# areas

## optimizers

**Muon**

具体可以见 https://kellerjordan.github.io/posts/muon/

> 先用 SGD-Momentum 累积梯度，（走一步 Nesterov momentum 后）再用 Newton–Schulz 迭代把这个矩阵更新“正交化”，最后乘学习率更新参数。

Muon 的名字就是 **MomentUm Orthogonalized by Newton-Schulz**。
它主要用于神经网络中的二维权重矩阵，例如 Transformer 的线性层权重；偏置、Embedding、LayerNorm 参数等通常仍使用 AdamW。例如4D的卷积层通常需要先 flatten 后三维，把卷积核 reshape 成二维矩阵，再进行类似处理。

**梯度和动量**

设某个二维权重矩阵为 \(W_t\)，当前梯度为

\[
G_t = \nabla_W L(W_{t-1}).
\]

Muon 首先维护一个动量矩阵 \(M_t\)：

\[
M_t = \mu M_{t-1} + G_t,
\]

其中 \(\mu\) 通常取 \(0.95\)。这一步和 SGD with Momentum 基本一致。

如果启用 Nesterov momentum，则实际送入下一步的矩阵为：

\[
\widetilde M_t = G_t + \mu M_t.
\]

否则：

\[
\widetilde M_t = M_t.
\]

注意 Muon 的关键顺序是：

\[
\text{梯度}
\rightarrow
\text{动量}
\rightarrow
\text{正交化}
\rightarrow
\text{参数更新}.
\]

也就是说，它不是先正交化梯度再积累动量。原始 Muon 实验发现，把动量放在正交化之前效果更好。([kellerjordan.github.io](https://kellerjordan.github.io/posts/muon/))

**Newton–Schulz 正交化**

接下来对 \(\widetilde M_t\) 应用 Newton–Schulz 迭代：

\[
O_t = \operatorname{NS}_k(\widetilde M_t).
\]

实际计算前，通常会先归一化：

\[
X_0 =
\frac{\widetilde M_t}
{\|\widetilde M_t\|_F+\varepsilon}.
\]

来让矩阵的SVD分解中间的矩阵每个元素都处于[0,1]（$\widetilde M_t$ 不一定满足，但是归一化后的 $X_0$ 就可以了）（这样做是因为后面的多项式 $\varphi$ 只能对 [0,1] 中的数迭代后趋近 1）

然后重复 \(k\) 次：
\[
X_{i+1}
=
aX_i
+
b(X_iX_i^\top)X_i
+
c(X_iX_i^\top)^2X_i.
\]

也可以写成：

\[
X_{i+1}
=
aX_i+bX_iX_i^\top X_i
+cX_iX_i^\top X_iX_i^\top X_i.
\]

这个过程是这样作用的。假设动量矩阵的奇异值分解为：

\[
\widetilde M_t = U\Sigma V^\top.
\]

Newton–Schulz 迭代不会改变左右奇异向量 \(U,V\)，只会改变奇异值：

\[
\widetilde M_t
\longrightarrow
U\varphi(\Sigma)V^\top,
\]

其中

\[
\varphi(x)=ax+bx^3+cx^5.
\]

如果选择 Muon 当前常用的一组五次多项式系数

$$
(a,b,c)=(3.4445,-4.7750,2.0315),
$$

可以使得奇异值经过多次迭代后趋近于 \(1\)，逐渐变为
\[
O_t \approx UV^\top.
\]

若直接使用 SVD，这一步就是把

$$
U\Sigma V^\top
$$

替换成

$$
UV^\top.
$$

Muon 使用 Newton–Schulz，是因为它可以通过矩阵乘法高效实现，避免显式 SVD。

事实上，这等价于把原始动量矩阵替换为 Frobenius 范数意义下最近的半正交矩阵，这也是这个过程被称为正交化的原因。
\[
\operatorname{Ortho}(\widetilde M_t)
=
\arg\min_{O}\{
\|\ O-\widetilde M_t\ \|_F \quad\mathrm{s.t.\,either}\,OO^\top=I\,\mathrm{or}\,O^\top O=I\},
\]

这样做的原因是，原始动量矩阵可能在某几个奇异方向上特别大。正交化会压低过强的方向，同时增强原本较弱的方向，最终让不同矩阵方向获得更均衡的更新机会。

AdamW 主要对每个参数元素做独立的二阶矩归一化，而 Muon 把整个二维更新矩阵作为一个整体处理。

**最终参数更新**

加入解耦权重衰减后，典型更新可以写成：

\[
W_t
=
(1-\eta\lambda)W_{t-1}
-
\eta_{\text{adj}}O_t,
\]

其中：

- \(\eta\) 是基础学习率；
- \(\lambda\) 是 weight decay；
- \(O_t\) 是正交化后的更新；
- \(\eta_{\text{adj}}\) 是根据矩阵形状调整后的学习率。

原始实现对于形状为 \(A\times B\) 的矩阵，常使用：

\[
\eta_{\text{adj}}
=
\eta\sqrt{\max\left(1,\frac{A}{B}\right)}.
\]

现在的一些实现还提供其他缩放方式，例如用于匹配 AdamW RMS 的：

\[
\eta_{\text{adj}}
=
0.2\eta\sqrt{\max(A,B)}.
\]

不同 Muon 实现之间最容易出现差异的地方，就是这个学习率缩放规则。([github.com](https://github.com/pytorch/pytorch/blob/main/torch/optim/_muon.py))

这样跳转学习率的原因是，Newton–Schulz 正交化会把更新矩阵的奇异值重新变成接近 1，因此更新矩阵的整体大小不再由梯度大小决定，而主要由矩阵形状决定。学习率调整就是补偿这个形状带来的尺度差异。

设权重矩阵为
\[
W\in\mathbb{R}^{m\times n}.
\]
正交化后的更新矩阵近似为
\[
O=UV^\top,
\]
其中
\[
M=U\Sigma V^\top
\]
是动量矩阵的 SVD。

这样做完以后，Frobenius 范数就由形状决定了。假设 \(m\ge n\)，此时 \(O\) 有 \(n\) 个奇异值，并且每个奇异值约等于 1。因此：

\[
\|O\|_F^2
=\sum_{i=1}^{n}\sigma_i(O)^2
\approx n,
\]

所以

\[
\|O\|_F\approx\sqrt n.
\]

如果 \(m<n\)，同理有

\[
\|O\|_F\approx\sqrt m.
\]

统一写成：

\[
\|O\|_F\approx\sqrt{\min(m,n)}.
\]

因此，使用同一个学习率 \(\eta\) 时，矩阵更新

\[
\Delta W=-\eta O
\]

的 Frobenius 范数约为

\[
\|\Delta W\|_F
\approx
\eta\sqrt{\min(m,n)}.
\]

这说明：即使两个矩阵使用相同的 \(\eta\)，它们的整体更新量也会因为 \(m,n\) 不同而不同。

矩阵共有 \(mn\) 个元素。定义元素 RMS：

\[
\operatorname{RMS}(O)
=\frac{\|O\|_F}{\sqrt{mn}}.
\]

代入上面的结果：

\[
\operatorname{RMS}(O)
\approx
\frac{\sqrt{\min(m,n)}}{\sqrt{mn}}
=\frac{1}{\sqrt{\max(m,n)}}.
\]

因此，不做额外调整时：

\[
\operatorname{RMS}(\Delta W)
\approx
\frac{\eta}{\sqrt{\max(m,n)}}.
\]

矩阵越宽或越高，每个元素的平均更新就越小。这是正交化带来的结果：它把奇异值统一到 1，却没有保留原始梯度的绝对幅度。

因此，常见实现中使用：

\[
\eta_{\text{adj}}
=
\eta\sqrt{\max\left(1,\frac{m}{n}\right)}.
\]

于是更新为：

\[
\Delta W=-\eta_{\text{adj}}O.
\]

当 \(m=n\) 时：

\[
\eta_{\text{adj}}=\eta.
\]

方阵不需要调整。

当 \(m>n\) 时：

\[
\eta_{\text{adj}}=\eta\sqrt{\frac mn}.
\]

也就是高矩阵会提高学习率；当 \(m<n\) 时，这个公式给出的调整因子是 1，不会额外放大学习率。不过这个“不对称”似乎是具体 Muon 实现采用的约定，并不是正交化数学上唯一必然的选择。

这一设计：
\[
\eta_{\text{adj}}
=
0.2\eta\sqrt{\max(A,B)}.
\]
结果也差不多。

有关muon的work，认为原因一可能是其方法本身的正交性（这也是这一优化器本身 claim 的东西），二是一系列的附加操作，如更大的momentum beta、Nesterov 加速、因muon无法处理embedding和lm_head从而加入的额外参数。

最后一项引出了很多局部学习率。由于transformer不同模块的shapeness不同，需要的lr大小也不同（越小，需要的就越大），使用局部学习率后当然表现飙升。至于前两个，应用在adamW上同样能获得很好的加速效果。

https://arxiv.org/abs/2604.09258 的附录中有一些真实的ablation，可以得到结论：

1. Muon的优势，完全不来自于特殊的NS迭代 (Fig. 7, Sec 5.2)
2. Muon的优势，部分来自于MuP、large momentum等正交化操作之外的东西（Appendix H.7)

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

## embodied

### 触觉数据化

触觉数据化是把接触瞬间的物理量（压力、剪切力、滑移、振动、温度、形变、纹理）变成机器学习模型能吃进去的张量。

**一、视觉化触觉（Vision-based Tactile Sensing）—— 目前最主流**

最主流的是视觉化触觉，这是把触觉问题转成视觉问题的思路。传感器内部由一层柔性弹性体、内部光学系统和嵌入式相机组成，相机捕捉物体接触时弹性体表面的形变，从而推断高分辨率的接触几何。

也就是说，触觉信号最终以**RGB 图像或深度图**的形式输出，每秒几十到上百帧。后端再用计算机视觉的算法（CNN、ViT、扩散模型）从这些"触觉图像"里反推法向力、剪切力、滑移、物体形状、纹理。

**二、阵列式电子皮肤（E-skin）**

走的是"密集化生物皮肤"的路子，用电阻、电容、压电、磁性材料做成 N×M 的传感单元阵列，每个单元输出一个压力/形变值，整张皮肤就是一个二维（或带时间维度的三维）矩阵。优点是可以贴在大面积曲面上（手臂、躯干），缺点是空间分辨率远低于视觉触觉。

**三、多模态融合传感器**

新一代传感器直接在硬件层就把多种物理量并行采下来。比如 Sparsh-X 用 Digit 360 同时采集图像、音频、运动、压力四种核心触觉模态——按压时弹性体的形变图、滑动时的摩擦音、IMU 测的微小振动、底部的法向压力，全部对齐到同一时间戳。

但是，光有原始信号还不够，因为每家传感器的胶垫、灯光、标记点都不一样，模型迁移性很差。所以现在的核心思路是用自监督学习训"触觉基座模型"。

**最终怎么进入模型**

数据化后的触觉表征通常以 embedding 向量的形式喂给 VLA（Vision-Language-Action）或新提出的 **VTLA（Vision-Tactile-Language-Action）** 模型。基于世界模型及视觉-触觉-语言-动作（VTLA）等多模态输入输出，构建具备交互、预测与决策能力的具身智能基座大模型。

# math

## 统计

> 要评测一个模型（或者考一个学生）的准确率，需要出多少道题才"算得准"？

做完 n 题，算出正确率 p̂。但这个 p̂ 只是**估计值**，不是真实水平。题做得越多，估计越准。
衡量"准不准"用的是**95% 置信区间**：我有 95% 的把握，真实准确率落在 p̂ ± ME 这个范围里。ME 就是误差幅度（margin of error）。

对于比例（proportion）的置信区间：

$$\text{ME} = 1.96 \times \sqrt{\frac{p(1-p)}{n}}$$

其中 1.96 是 95% 置信水平对应的 z 值。反过来解出 n：

$$n = \frac{1.96^2 \cdot p(1-p)}{\text{ME}^2}$$

注意分子里有 p(1−p)。这个东西在 **p = 0.5 时取最大值 0.25**，远离 0.5（比如 0.9 或 0.1）时会变小。
也就是说：**真实准确率越接近 50%，估计起来越难，需要的样本越多**。所以在不知道真实 p 是多少的时候，就按最坏情况 p = 0.5 来算，这样无论实际情况如何都够用。

---

> 从散点数据中估计趋势的一种方式：

**Locally Weighted Scatterplot Smoothing（LOWESS，局部加权散点图平滑）**是一种用于从散点数据中估计平滑趋势的非参数回归方法。它不预先假设全局关系是线性的、二次的或其他固定形式，而是在每个位置附近使用局部数据拟合一个简单模型。

假设有一组数据：

$$
(x_1,y_1),(x_2,y_2),\ldots,(x_n,y_n)
$$

现在想估计某个位置 \(x_0\) 处的趋势值。

LOWESS 会：

1. 找出 \(x_0\) 附近的一部分数据；
2. 给距离 \(x_0\) 越近的数据更高权重；
3. 在这些局部数据上拟合一个简单的线性模型；
4. 用这个局部模型预测 \(x_0\) 处的值；
5. 对每个 \(x_0\) 重复上述过程，得到一条平滑曲线。

因此，它不是用一条全局曲线解释所有数据，而是让曲线在不同位置根据附近的数据形状灵活变化。

在点 \(x_0\) 附近，LOWESS 通常拟合：

$$
y_i \approx \beta_0+\beta_1(x_i-x_0)
$$

通过加权最小二乘估计参数：

$$
\min_{\beta_0,\beta_1}
\sum_{i=1}^{n} w_i(x_0)
\left[y_i-\beta_0-\beta_1(x_i-x_0)\right]^2
$$

其中：

- \(w_i(x_0)\) 是第 \(i\) 个样本对于位置 \(x_0\) 的权重；
- \(x_i\) 越接近 \(x_0\)，权重通常越大；
- 远处的点权重较小，甚至为零。

一种常用权重函数是三次核函数：

$$
w_i(x_0)
=
\left(1-\left|\frac{x_i-x_0}{d(x_0)}\right|^3\right)^3
$$

当 \(|x_i-x_0| > d(x_0)\) 时，权重设为 0。其中 \(d(x_0)\) 表示局部邻域的范围。

**重要的参数：平滑程度**

LOWESS 通常通过 `span` 或 `frac` 参数控制每次使用多少比例的数据。

例如：

- `span = 0.2`：每次只使用附近约 20% 的数据；
- `span = 0.7`：每次使用附近约 70% 的数据。

参数越小：

- 曲线更灵活；
- 能保留更多局部变化；
- 但容易受到噪声影响，出现过拟合。

参数越大：

- 曲线更平滑；
- 对噪声更稳定；
- 但可能抹掉真实的局部结构，出现欠拟合。

**LOWESS 的鲁棒版本**

普通 LOWESS 可能受到异常值影响。比如某个观测值远离其他数据点，它可能会拉动附近的局部回归线。

鲁棒 LOWESS 通常会进行多轮迭代：

1. 第一次使用距离权重拟合；
2. 计算每个点的残差；
3. 根据残差大小降低异常点的权重；
4. 重新拟合。

常见做法是使用双权重函数。残差越大的点，在后续迭代中影响越小。

因此，鲁棒 LOWESS 对离群点通常比普通多项式回归更加稳定。

---

> JS 散度是什么？

JS 散度（Jensen–Shannon divergence）和 KL 散度（Kullback–Leibler divergence）都用于衡量两个概率分布的差异。

**KL 散度**

对于分布 \(P\) 和 \(Q\)：

$$
D_{\mathrm{KL}}(P\|Q)
= \sum_x P(x)\log\frac{P(x)}{Q(x)}
$$

连续情形则将求和换成积分。它表示：*当真实分布是 \(P\) 时，用 \(Q\) 近似 \(P\) 所带来的额外信息损失。*

**JS 散度**

先定义混合分布：

$$
M=\frac{1}{2}(P+Q)
$$

然后：

$$
D_{\mathrm{JS}}(P\|Q)
=
\frac{1}{2}D_{\mathrm{KL}}(P\|M)
+
\frac{1}{2}D_{\mathrm{KL}}(Q\|M)
$$

因此，JS 散度本质上是两个 KL 散度的平均。

也可以使用带权版本：

$$
M=\alpha P+(1-\alpha)Q
$$

$$
D_{\mathrm{JS}}^{(\alpha)}(P,Q)
=
\alpha D_{\mathrm{KL}}(P\|M)
+
(1-\alpha)D_{\mathrm{KL}}(Q\|M)
$$

**核心区别**

| 性质             | KL 散度                                                      | JS 散度                                    |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------ |
| 是否对称         | 否，通常 \(D_{\mathrm{KL}}(P\|Q)\neq D_{\mathrm{KL}}(Q\|P)\) | 是                                         |
| 是否有上界       | 没有上界                                                     | 有上界                                     |
| 是否是真正的距离 | 不是                                                         | 不是，但 \(\sqrt{D_{\mathrm{JS}}}\) 是度量 |
| 对方向是否敏感   | 是                                                           | 否                                         |

如果对数底数为 2，则：

$$
0\le D_{\mathrm{JS}}(P,Q)\le 1
$$

如果使用自然对数，则：

$$
0\le D_{\mathrm{JS}}(P,Q)\le \ln 2
$$

**为什么 KL 散度不对称？**

例如：

$$
P=(1,0),\qquad Q=(0.5,0.5)
$$

则：

$$
D_{\mathrm{KL}}(P\|Q)=\log 2
$$

但：

$$
D_{\mathrm{KL}}(Q\|P)=\infty
$$

因为 \(Q\) 在第二个位置有正概率，而 \(P\) 在该位置概率为 0。

这说明 KL 散度对方向非常敏感：

- \(D_{\mathrm{KL}}(P\|Q)\)：要求 \(Q\) 覆盖 \(P\) 有概率质量的位置。
- \(D_{\mathrm{KL}}(Q\|P)\)：要求 \(P\) 覆盖 \(Q\) 有概率质量的位置。

**JS 散度为什么更稳定？**

JS 散度不直接计算 \(P\) 和 \(Q\) 之间的 KL，而是分别与混合分布

$$
M=\frac{P+Q}{2}
$$

比较。

由于 \(M\) 同时包含 \(P\) 和 \(Q\) 的支持集，只要 \(P\) 或 \(Q\) 在某处有正概率，\(M\) 通常也有正概率，因此不会轻易出现除以 0 导致的无穷大。

在上面的例子中：

$$
P=(1,0),\qquad Q=(0.5,0.5)
$$

JS 散度仍然是有限值。

如果两个分布完全不重叠，例如：

$$
P=(1,0),\qquad Q=(0,1)
$$

那么使用以 2 为底的对数时：

$$
D_{\mathrm{JS}}(P,Q)=1
$$

即达到最大值。

**直观理解**

- **KL 散度**：用 \(Q\) 去描述 \(P\)，会损失多少信息？强调“方向”。
- **JS 散度**：让 \(P\) 和 \(Q\) 都与它们的平均分布比较，得到一个对称、有限的差异度。

简单来说：

> KL 更适合有明确“真实分布”和“近似分布”角色的场景；JS 更适合对等地比较两个分布的相似程度。

需要注意的是，它们都满足非负性，并且都在 \(P=Q\) 时等于 0，但 KL 散度和 JS 散度本身都不满足普通距离所需的三角不等式。JS 散度的平方根则可以构成真正的距离度量。

---

> 有一个成功率，怎么估计其置信区间？

Wilson Score Interval 是用于估计二项分布成功率 \(p\) 的置信区间。例如，\(n\) 次试验中成功 \(x\) 次，样本比例为
\[
\hat p=\frac{x}{n}.
\]
在置信水平 \(1-\alpha\) 下，Wilson 区间为
\[
\frac{ \hat p+\frac{z^2}{2n} \pm z\sqrt{\frac{\hat p(1-\hat p)}{n}+\frac{z^2}{4n^2}} }{ 1+\frac{z^2}{n} }
\]
其中 \(z\) 是标准正态分布的分位数；例如 \(95\%\) 置信区间取 \(z\approx1.96\)。

它相比常见的 Wald 区间
\[
\hat p\pm z\sqrt{\frac{\hat p(1-\hat p)}{n}}
\]
更可靠，尤其是在样本量较小，或者成功率接近 \(0\%\) 或 \(100\%\) 时。Wilson 区间会自然地向区间中心收缩，并且不会轻易产生小于 \(0\%\) 或大于 \(100\%\) 的边界。

例如，\(10\) 次试验成功 \(8\) 次时，样本比例是 \(80\%\)，但这并不意味着真实成功率确定就是 \(80\%\)。Wilson 区间给出的是一个不确定性范围：如果反复进行同样的抽样并构造区间，约 \(95\%\) 的区间会覆盖真实成功率。

## 分析

> 求完整 hessian 太贵了，怎么办？

设 $f: \mathbb{R}^n \to \mathbb{R}$ 是二阶可微的标量函数（比如 loss），在点 $\theta \in \mathbb{R}^n$ 处：

- 梯度 $g(\theta) = \nabla f(\theta) \in \mathbb{R}^n$
- Hessian $H(\theta) = \nabla^2 f(\theta) \in \mathbb{R}^{n\times n}$，其中 $H_{ij} = \frac{\partial^2 f}{\partial \theta_i \partial \theta_j}$

对任意向量 $v \in \mathbb{R}^n$，**Hessian-vector product** 是 $$\text{HVP}(v) = H(\theta),v \in \mathbb{R}^n.$$

关键观察是：HVP 不需要先构造出 $H$ 再做矩阵乘法。注意到 $$H v = \nabla_\theta \big(g(\theta)^\top v\big),$$ 因为 $g(\theta)^\top v$ 是一个标量，对它再求一次梯度就得到 $Hv$。所以代价是"一次梯度 + 一次对标量的梯度" ≈ 2–3× 一次反向传播。这是所有现代 autodiff 框架里 `hvp` 的实现方式。

**用 HVP 能估计 Hessian 的哪些信息**

特征值与特征向量、迹、对角线

---

> 三层神经网络，怎么求梯度？

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



## 线代

> 什么是与矩阵相容的范数？

矩阵范数与向量范数之间满足

1. 

\[
\boxed{\|Ax\|\le \|A\|\,\|x\|}
\]

其中 \(A\) 是矩阵，\(x\) 是向量。直观上，这表示矩阵对向量的放大效果，不超过矩阵范数给出的上界。

2. 

$$
\boxed{
\|AB\|\le \|A\|\,\|B\|
}
$$

这使得对任意向量 \(x\)，有

$$
\|ABx\|
\le \|A\|\,\|Bx\|
\le \|A\|\,\|B\|\,\|x\|.
$$

因此矩阵 \(AB\) 的放大能力不会超过先由 \(B\) 放大、再由 \(A\) 放大的乘积上界。



常见的例子是诱导矩阵范数。给定一个向量范数 \(\|\cdot\|_v\)，可以定义相应的诱导矩阵范数：
\[
\boxed{
\|A\|=\max_{x\ne 0}\frac{\|Ax\|_v}{\|x\|_v}
}
\]

等价地，

\[
\|A\|=\max_{\|x\|_v=1}\|Ax\|_v.
\]

这个定义表示：矩阵 \(A\) 对单位向量的最大放大倍数。

由定义立即得到

\[
\|Ax\|_v\le \|A\|\|x\|_v.
\]

因此，诱导矩阵范数一定与对应的向量范数相容。

由向量 \(1\)-范数诱导的矩阵范数是矩阵的最大列和：
\[
\boxed{
\|A\|_1=\max_j\sum_i |a_{ij}|
}
\]

由向量无穷范数诱导的矩阵范数是最大行和：
\[
\boxed{
\|A\|_\infty=\max_i\sum_j |a_{ij}|
}
\]

由向量 \(2\)-范数诱导的矩阵范数为谱范数：
\[
\boxed{
\|A\|_2=\max_{x\ne 0}\frac{\|Ax\|_2}{\|x\|_2}
}
\]

它等于 \(A\) 的最大奇异值：

\[
\|A\|_2=\sigma_{\max}(A).
\]

**与谱半径的关系**

如果 \(\lambda\) 是 \(A\) 的特征值，\(x\ne 0\) 是对应特征向量，则

\[
Ax=\lambda x.
\]

利用范数相容性，

\[
\|Ax\|\le \|A\|\|x\|.
\]

另一方面，

\[
\|Ax\|=\|\lambda x\|=|\lambda|\|x\|.
\]

所以

\[
|\lambda|\|x\|\le \|A\|\|x\|.
\]

由于 \(x\ne 0\)，可以约去 \(\|x\|\)，得到

\[
|\lambda|\le \|A\|.
\]

对所有特征值取最大值，就有

\[
\boxed{\rho(A)\le \|A\|}.
\]

所以谱半径（所有特征值（视作复数）的模的最大值）不超过任意相容矩阵范数。

总的来说：

\[
\boxed{
\text{相容范数就是能够正确控制矩阵对向量或矩阵乘积放大作用的范数。}
}
\]
btw，谱半径具有性质：

\[
\rho(A)=\lim_{k\to\infty}\|A^k\|^{1/k}.
\]

这个公式说明，谱半径刻画了矩阵幂 \(A^k\) 的长期增长速度。

如果 \(A\) 可对角化，写成

\[
A=PDP^{-1},
\]

其中

\[
D=\operatorname{diag}(\lambda_1,\ldots,\lambda_n),
\]

那么

\[
A^k=PD^kP^{-1},
\]

而 \(D^k\) 中的元素是 \(\lambda_i^k\)。因此，当 \(k\) 很大时，模最大的特征值会主导 \(A^k\) 的行为。

**判断矩阵幂的收敛性**

谱半径常用于判断迭代过程：

- 若 \(\rho(A)<1\)，则
  \[
  A^k\to 0.
  \]
- 若 \(\rho(A)>1\)，则通常存在方向会指数增长。
- 若 \(\rho(A)=1\)，情况比较微妙，需要进一步检查单位圆上的特征值及其 Jordan 块结构。

**与稳定性的关系**

在线性离散系统

\[
x_{k+1}=Ax_k
\]

中，系统渐近稳定的典型条件是

\[
\rho(A)<1.
\]

连续时间系统

\[
\frac{dx}{dt}=Ax
\]

则对应的条件是所有特征值的实部都小于零：

\[
\operatorname{Re}(\lambda_i)<0.
\]

总的来说：

\[
\boxed{\text{谱半径是矩阵特征值在复平面中距离原点最远的距离。}}
\]

主要用于描述矩阵幂的长期增长、衰减以及线性系统的稳定性。

## MLDL

DPO 的常见损失函数设计是
\[
\mathcal L(\theta)
=
-\frac{2}{\beta}\log \sigma\left(\beta\left[
\log\frac{p_\theta(y'|x)}{p_{\rm ref}(y'|x)}
-
\log\frac{p_\theta(y|x)}{p_{\rm ref}(y|x)}
\right]\right).
\]

内部的
\[
\Delta_\theta=
\log\frac{p_\theta(y'|x)}{p_{\rm ref}(y'|x)}
-
\log\frac{p_\theta(y|x)}{p_{\rm ref}(y|x)}
=
\left(\log p_\theta(y'|x)-\log p_\theta(y|x)\right)
-
\left(\log p_{\rm ref}(y'|x)-\log p_{\rm ref}(y|x)\right)
\]
是当前模型对两个回答的偏好和 ref 模型的差距，或者说
\[
\left(\log p_\theta(y'|x)-\log p_{\rm ref}(y'|x)\right)
-
\left(\log p_\theta(y|x)-\log p_{\rm ref}(y|x)\right)
\]
是 $y'$ 偏好于 $y$ 的概率，要最大化它。

但是乘的 $\beta$，套的 $\sigma$，以及外面乘的 $-\frac{2}{\beta}$ 都是什么含义？

**从分数转化为概率**

把 $\left(\log p_\theta(y'|x)-\log p_{\rm ref}(y'|x)\right)
-
\left(\log p_\theta(y|x)-\log p_{\rm ref}(y|x)\right)$ 视作分数，\(\Delta_\theta\) 就是两个回答的相对分数差。考虑把这种分数差转为概率，后续就能优化 NLL 了。

考虑 Bradley–Terry 偏好模型：

$$
P(y'\succ y)
=
\frac{e^{s(y')}}{e^{s(y')}+e^{s(y)}}
=
\sigma(s(y')-s(y)).
$$

sigmoid 里面的是分数差。代入我们的分数
\[
P_\theta(y'\succ y\mid x)
=
\sigma(\Delta_\theta)
=
\frac{1}{1+e^{-\Delta_\theta}}.
\]

这样就把分数差解释成了“\(y'\) 优于 \(y\) 的概率”。

**从概率变成优化 NLL**

假设训练数据告诉我们 \(y'\succ y\)，模型给这个事件的概率是

\[
P_\theta(y'\succ y\mid x)
=
\sigma(\Delta_\theta).
\]

那么最大似然训练就是最大化这个概率，等价于最小化负对数似然：

\[
\mathcal L
=
-\log P_\theta(y'\succ y\mid x)
=
-\log\sigma(\Delta_\theta).
\]

它本质上就是一个二分类交叉熵。

**乘上 \(\beta\)**

把 \(\Delta_\theta\) 乘上 $\beta$，用 $\beta\Delta_\theta$ 替换原来式子里的 $\Delta_\theta$.

从 sigmoid 几何形状看，当 \(\beta\) 较大时，曲线更陡：

- 很小的正 \(\Delta\) 就会被判断为高概率偏好；
- 很小的负 \(\Delta\) 就会被判断为低概率偏好；
- 更接近“硬排序”。

当 \(\beta\) 较小时，曲线更平：

- 即便 \(\Delta\) 有一定差距，概率也不会立刻接近 0 或 1；
- 更接近“软偏好”。

因此 \(\beta\) 是一种偏好噪声尺度，改变了 sigmoid 几何形状。

但同时，这也改变了梯度大小。记
\[
\mathcal L(\Delta)
=
-\log\sigma(\beta\Delta).
\]

对 \(\Delta\) 求导：

\[
\frac{\partial \mathcal L}{\partial \Delta}
=
-\beta\sigma(-\beta\Delta)
=
-\frac{\beta}{1+e^{\beta\Delta}}.
\]

它说明：

若 \(\Delta\ll0\)：

\[
\frac{\partial \mathcal L}{\partial\Delta}
\approx -\beta.
\]

模型会获得较大的纠正梯度；

若 \(\Delta=0\)：
\[
\frac{\partial\mathcal L}{\partial\Delta}
=
-\frac{\beta}{2}.
\]

但是这里有一个问题，*改变 \(\beta\) 不仅改变了 sigmoid 的形状，同时也直接改变了梯度的整体大小。*

比如在 \(\Delta=0\) 附近：

\[
|\mathcal L'(0)|=\frac{\beta}{2}.
\]

于是把 \(\beta\) 从 0.1 改到 1，初始梯度直接放大 10 倍。*这会把“损失形状变化”和“有效学习率变化”混在一起。*这正是外面再乘 \(\frac{2}{\beta}\) 的一个主要动机。

**外面乘 $\frac{2}{\beta}$ 来消除梯度幅度影响**

此时，在模型刚好没有偏好时也即 \(\Delta=0\) 时，

\[
\frac{\partial\mathcal L}{\partial\Delta}
=
-2\cdot \frac12
=
-1.
\]

也就是说：

> 用 \(1/\beta\) 消除内层 \(\beta\) 对梯度整体尺度的影响，用系数 \(2\) 把零点附近的梯度归一化为 1。

这样，\(\beta\) 主要负责改变损失的曲率和饱和行为，而不再显著改变初始梯度尺度。

# hardware

**GPU 硬件与执行模型总结**

一块 GPU 由几十到一百多个 **SM（Streaming Multiprocessor）** 组成——SM 是真正干活的核心，A100 有 108 个，H100 有 132 个。每个 SM 内部有：

- **CUDA Core / Tensor Core**：算术执行单元
- **Warp Scheduler**（4 个）：指令发射器
- **寄存器堆**和 **Shared Memory**（局部 SRAM，比 HBM 快约 100 倍）

GPU 的总算力 = SM 数 × 每 SM 算力。**并行容量是硬上限**：每个 SM 能同时驻留的 warp 数和 block 数由寄存器、shared memory 等资源决定。

| 层级              | 角色                                                         | 解决的问题                                    |
| ----------------- | ------------------------------------------------------------ | --------------------------------------------- |
| **Kernel / Grid** | 一次 GPU 函数调用，撒出大量 block                            | 弹性适配不同规模 GPU                          |
| **Thread Block**  | 调度到 SM 的任务包，内部 thread 可共享 shared memory 和同步  | 局部协作 + 数据局部性                         |
| **Warp**          | **硬件真正的调度单位**：固定 32 个 thread 锁步执行同一条指令（SIMT） | 用一份控制电路驱动 32 条 lane，省下面积堆算力 |
| **Thread**        | 程序员看到的"最小一份工作"，本质是 warp 这条 SIMD 通道里的一根 lane | 描述海量数据并行                              |

**关键点**：thread 在逻辑上是最小单位，**物理上不是**——硬件最小调度单位是 warp。32 个 thread 共用一条指令流水线，因此走不同分支会触发 **warp divergence**（串行化所有分支）。

执行流程：

PyTorch 算子 → cuBLAS 把任务切成 tile → 每个 tile = 一个 **block** → kernel launch 把 N 个 block 撒到 GPU → 调度器分发到 SM → SM 把 block 拆成 warp → warp scheduler 每 cycle 发射一条指令给 32 个 thread。

---

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

# Applications

## LLM

**LLM 提示词设计**

1. 三个通用组织原则(业界广泛接受)

1. 区分"这个任务的指令"和"这个任务的背景资料" —— 指令说"做什么",资料说"用什么参考"。混在一起,模型容易把资料当指令,或把指令当资料。
2. 给不同内容不同标签/容器 —— 用结构化标记告诉模型"这是一块的边界"。这样即使顺序变了、多了少了,模型也知道谁是谁。
3. 把最重要的指令放最前或最显眼 —— 模型对开头和结尾注意力更强(primacy/recency effect)，中间容易"读过去就忘"。所以核心指令通常放 prompt 开头(system 或 user 首部),而不是埋在长资料中间。

2. 两种主流容器风格

风格A：XML 标签 / 自定义分隔符(你现在这个就是)

<INSTRUCTION>
指令
</INSTRUCTION>

<RESOURCE url="...">
资料
</RESOURCE>
- 代表：Anthropic 官方建议用 XML tag 把不同类型的内容分开;很多公司自己发明 <PLANNER_RESOURCES> 这种。
- 优点：结构清晰、可嵌套、能携带元信息(如 path/url)。
- 缺点：tags 本身占 token,且如果某个模型训练时没见过这种 tag 风格,理解会打折。

风格B：Markdown 标题分区

#Task

...

#Reference: paper 1

...
- 优点：极通用,任何模型都懂,零学习成本,可读性强。
- 缺点：没有"配对闭合标签",边界靠格式,容易在大段内容中糊掉。

现实中大多混用:顶层用 XML/自定义 tag 当"骨架",内部用 markdown 标题当"段落语义"。

---

**MCP**

MCP（Model Context Protocol，模型上下文协议）是一种开放协议，用于让 AI 应用以统一方式连接外部数据、工具和服务。

简单说，它像是 AI 与外部系统之间的“标准接口”：

- **MCP 客户端**：通常是聊天助手、IDE 或其他 AI 应用。
- **MCP 服务器**：提供文件访问、数据库查询、搜索、代码仓库、第三方 API 等能力。
- **工具（Tools）**：AI 可以调用的操作，例如查询数据库、创建工单或运行代码。
- **资源（Resources）**：AI 可以读取的上下文，例如文档、文件或接口返回的数据。
- **提示模板（Prompts）**：服务器提供的可复用提示或工作流。

使用 MCP 后，开发者不必为每个 AI 应用分别编写一套专用集成；只要实现 MCP 服务器，支持该协议的客户端就可以连接和使用它。

例如，一个代码编辑器接入 GitHub 的 MCP 服务器后，AI 可能能够读取仓库、查看 Issue、搜索代码并创建 Pull Request。实际使用时仍应配置权限和访问范围，避免向 AI 暴露不必要的数据或高风险操作。

# infs

**对于常见SFT和evaluation dataset的整理**

通用指令跟随

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

reasoning

- OpenThoughts3-1.2M
  850K 数学 + 250K 代码 + 100K 科学
  reasoning trace 由 QwQ-32B 生成，各方面都调优过，SOTA数据集。
- s1K-1.1 (1K)
  类似LIMA，精心挑选的高难度推理问题，1k数据就能让qwen-32B达到很高的推理性能
- MathInstruct (262K)
  混合了 13 个数学数据集（GSM8K、MATH、AQuA 等）+ 思维链 / 程序化推理两种格式，数学方向。
- NuminaMath-CoT (860K)
  含有CoT解题过程，质量比上一个高。

指令跟随/对话类评测

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

知识/综合能力

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

难题

- GPQA (Diamond)
  448 道博士级生物、物理、化学题，由领域专家撰写，Google-proof（搜不到答案）
- AIME 2024 / 2025
  高中数学奥林匹克难度，测高难数学推理
- LiveCodeBench
  持续更新的编程题集，按时间段切分，避免训练污染



**在 2026 五月，对前沿模型仍有显著区分度的一些难 benchmark**

- ARC-AGI-3

  2026 年 3 月 25 日由 ARC Prize Foundation 发布。人类解决了 100% 的环境，最好的前沿语言模型得分低于 0.4%。预览期表现最好的是一个专门构建的系统，达到 12.58%。GPT-5.4、Claude Opus 4.6、Grok 4.2 等前沿模型的分数在 0% 到 0.37% 之间。 

  设计思路是回合制游戏环境，没有明文规则、没有说明——纯粹考"流体智能"（fluid intelligence），即在零经验下学习新技能的能力。 [Medium](https://medium.com/@AdithyaGiridharan/arc-agi-3-dropped-and-frontier-ai-scored-less-than-1-90cd70e65a61)

- ARC-AGI-2

- 通过视觉网格谜题测量流体智能和新颖抽象推理。被认为是当前最难的公开推理 benchmark——人类个体平均表现 66%。截至 2026 年 5 月 25 日，GPT-5.5 以 85% 领先，GPT-5.4 Pro 83.3%，Gemini 3.1 Pro 77.1%。前沿模型刚刚开始追上人类，仍有较大区分度。 [BenchLM](https://benchlm.ai/benchmarks/arcAgi2)

- Humanity's Last Exam (HLE)

  这是目前最受关注的"通用难题"基准。大约 2,500 道极难题目跨越各学术领域，与 AI 安全中心合作，由近千位领域专家贡献。前沿模型得分在 20% 到 41% 之间。截至 2026 年 4 月，Gemini 3.1 Pro 以 41.0% 领先，Gemini 3 Flash 33.7%，Grok 4 24.0%。 [DemandSphere](https://www.demandsphere.com/research/ai-frontier-model-tracker/benchmarks/hle/)

  不过有意思的是，如果允许使用工具，Claude Opus 4.6 在 HLE with Tools 上能达到 53.0%，所以工具加持下分数会跳一大截。而且前沿模型在 HLE 上一年内提升了 30%——进步很快。 [Attainment](https://www.attainmentlabs.com/frontier-ai-report-march-2026)[VentureBeat](https://venturebeat.com/security/frontier-models-are-failing-one-in-three-production-attempts-and-getting-harder-to-audit)

- τ-bench / τ²-bench（真实世界 agent 任务）

  考察 agent 在真实场景下调用工具、与用户对话完成任务的能力。Claude Opus 4.5、GPT-5.2、Qwen3.5 等顶尖模型在 τ-bench 上得分介于 62.9% 到 70.2% 之间——这是个**生产可用性**而非纯推理的难点。 [VentureBeat](https://venturebeat.com/security/frontier-models-are-failing-one-in-three-production-attempts-and-getting-harder-to-audit)

- SWE-bench Pro（真实软件工程任务）

  GPT-5.4 是 2026 年 3 月的新编码领军者，在 SWE-bench Pro 上以 57.7% 领先。注意原版 SWE-bench Verified 已经被刷到 80%+，但 Pro 版本仍有较大空间。

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

**对于常见SFT和evaluation dataset的整理**

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

# Exps

## Tefig

进行SFT时不用base模型，就需要考虑到，Instruct 模型已经被 Anthropic / Meta / Qwen 团队用他们自己精心调过的 SFT mixture + DPO/RLHF 训过一遍。

在SFT Mistral-7B-Instruct-v0.3时，经常训了很少的步数就达到最佳评估性能，往后越训越差。原因可能是上述的性能已经提升得很好的原因；还可能是warmup时期有性能提升，之后lr到了正常值以后就开始破坏；
btw，mistral这个模型性能不行。

使用medqa_cot数据集sft，使用medqa评估，发现性能并没有提升。有可能是cot让模型学会了思考步骤，但是评测时是直接输出选项token，有一个偏移。

哪怕看到已有论文的setting，evaluation 也不应该自己一个个去拼，应该用统一的评测框架，后续还可以在里面选自己想要的eval指标

由于我的方法需要涉及ckpt参数相减，要记得保存ckpt0，或者进行一遍种子测试

## Recurrent-MoE

测试 MoE 模型的显存占用，直接使用伪造的 input_ids。但这会让激活的专家固定或者很少，与真实情况中激活很多专家不一致。

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

API 和 extra usage 都太坑了，非常费钱，是个商业手段逼着人升级方案

加载模型时使用device_map='auto'适用于模型太大，单卡放不下的情况，是朴素模型并行，很慢。如果模型能放进单卡，比如写 device_map="cuda:3" 就是单卡推理/训练。这是模型并行，而想要数据并行，需要各个GPU开进程，torchrun

## reviews

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

