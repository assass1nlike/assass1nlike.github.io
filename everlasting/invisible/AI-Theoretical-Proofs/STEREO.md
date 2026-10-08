> 内容取自 https://arxiv.org/abs/2609.34137

我们希望从 text-to-image diffusion model 中移除一个目标概念，同时保留其他概念。例如，删除 horse 后，模型既不能被 jockey、saddle 等间接描述重新诱导出马，也应当继续正常生成 donkey. 论文尝试用内部 activation 的重叠解释这两个目标之间的冲突：如果目标概念与其他概念占用相近的表示区域，覆盖整个目标区域的修改，就可能同时影响其他概念。

这套论证的核心是 Theorem 4.6 及其 Corollary 4.8。不过，原证明有几处无法仅靠补齐计算步骤消除的缺口。我们先保留原命题并说明问题，再给出明确增加假设后能够成立的证明。

## 概念区域与 unlearning 的两个目标

设预训练模型为 $\mathcal{D}_{\theta}$，编辑后的模型为 $\mathcal{D}_{\hat{\theta}}$，其中 $\theta$ 与 $\hat{\theta}$ 分别表示编辑前后的模型状态。这里也允许把 inference-time intervention 纳入编辑后的模型，而不要求一定修改权重。文本 prompt 的空间为 $\mathcal{P}$，图像空间为 $\mathcal{X}$，考察的有限概念集合为 $\mathcal{C}$，要删除的概念为 $c_u\in\mathcal{C}$，且 $\left|\mathcal{C}\right|\geq 2$.

模型根据 prompt $p\in\mathcal{P}$ 生成图像的条件分布记为 $p_{\theta}\left(\cdot\mid p\right)$. 给定图像 $x\in\mathcal{X}$ 和概念 $c\in\mathcal{C}$，oracle $\mathbb{O}_{\mathcal{X}}\left(x,c\right)\in\{0,1\}$ 判断图像是否包含该概念。我们把概念的生成概率写为

$$
g_c\left(\theta',p\right)
=\Pr_{x\sim p_{\theta'}\left(\cdot\mid p\right)}
\left[\mathbb{O}_{\mathcal{X}}\left(x,c\right)=1\right],
\qquad \theta'\in\left\{\theta,\hat{\theta}\right\}.
$$

Diffusion model 从噪声开始逐步 denoise，并通过 cross-attention 让文本信息参与图像生成。按照正文及 Definition A.1，我们固定一个 cross-attention 层 $\ell^*$ 和 denoising timestep $t^*$。此时，该层在图像 latent 的每个空间位置都输出一个向量，向量的各个分量称为 channel。我们对所有空间位置的向量逐分量取平均，这就是 spatial mean-pooling；它将整张 latent 的空间信息汇总为一个向量，同时保留各个 channel。对 prompt $p$，得到的向量记为

$$
\mathbf{\Phi}_{\theta,\ell^*,t^*}\left(p\right)
=A_{\theta}\left(\mathbf{e}_p,\ell^*,t^*\right)
\in\mathcal{H},
\qquad
\mathbf{e}_p=f_{\psi}\left(p\right),
\qquad
\mathcal{H}=\mathbb{R}^{d_{\ell^*}}.
$$

这里 $f_{\psi}$ 是参数为 $\psi$ 的 text encoder，$\mathbf{e}_p$ 是 prompt 的文本表示。$A_{\theta}$ 表示在模型生成过程中，取出指定层、指定 timestep 的 cross-attention 输出并做上述平均的操作。$d_{\ell^*}$ 是该层的 channel 数，也就是平均后向量的维数；$\mathcal{H}$ 是这些向量所在的空间。依照原文，后续省略固定的层和 timestep，将这个向量简写为 $\mathbf{\Phi}_{\theta}\left(p\right)$；对编辑后的模型做相同操作，得到 $\mathbf{\Phi}_{\hat{\theta}}\left(p\right)$. 我们比较的是两个模型在同一层、同一步的内部表示，而不是整条生成轨迹。

Definition A.1 将概念 $c$ 的 activation region 定义为

$$
\mathcal{R}_c
=\left\{
\mathbf{\Phi}_{\theta}\left(p\right)
\;\middle|\;
p\in\mathcal{P},
\mathbb{O}_{\mathcal{X}}\left(x_{\theta}\left(p\right),c\right)=1
\right\}\subseteq\mathcal{H},
\qquad
x_{\theta}\left(p\right)\sim p_{\theta}\left(\cdot\mid p\right).
$$

这里 $x_{\theta}\left(p\right)$ 是一次生成的图像。因此，$\mathcal{R}_c$ 收集的是生成结果包含 $c$ 时对应的内部表示；它不要求 prompt 必须直接出现概念名称。

注意，原定义没有交代生成随机性如何进入 $\mathbf{\Phi}_{\theta}$，而筛选区域时又使用了一次随机生成的结果。我们不能因此把区域成员资格直接理解成 $g_c\left(\theta,p\right)=1$. 在后面的条件化命题中，我们会明确要求 activation 提取规则固定，并单独声明所需的生成概率条件。

对于半径 $\rho>0$，定义区域的闭 $\rho$-neighborhood：

$$
\mathcal{R}_c^{(\rho)}
=\left\{
h\in\mathcal{H}
\;\middle|\;
\inf_{r\in\mathcal{R}_c}\left\|h-r\right\|_2\leq\rho
\right\}.
$$

这里 $h$ 是任意 activation 空间中的点，$r$ 是概念区域中的点，$\left\|h-r\right\|_2$ 是 Euclidean distance. 扩张区域的作用是把“足够接近”也算作重叠，而不要求两个 activation 完全相等。

**Definition 4.1（entanglement coefficient）** 定义

$$
\kappa\left(c_u,\rho\right)
=
\frac{
\operatorname{vol}\left(
\mathcal{R}_{c_u}^{(\rho)}
\cap\displaystyle\bigcup_{c'\in\mathcal{C}\setminus\{c_u\}}
\mathcal{R}_{c'}^{(\rho)}
\right)
}{
\operatorname{vol}\left(\mathcal{R}_{c_u}^{(\rho)}\right)
}.
$$

这里 $c'$ 遍历非目标概念，$\operatorname{vol}$ 是 $\mathcal{H}$ 中的 $d_{\ell^*}$ 维 Lebesgue volume，即通常的长度、面积、体积在任意维空间中的推广。其定义从矩形盒子的体积开始：对第 $j$ 个盒子

$$
Q_j=\prod\limits_{i=1}^{d_{\ell^*}}\left(a_{ji},b_{ji}\right),
\qquad
\operatorname{vol}\left(Q_j\right)
=\prod\limits_{i=1}^{d_{\ell^*}}\left(b_{ji}-a_{ji}\right).
$$

这里 $i$ 是坐标编号，$a_{ji}<b_{ji}$ 是盒子在该坐标方向上的两个端点；$Q_j$ 包含每个坐标都落在相应区间内的点，其体积就是各边长度的乘积。对于任意集合 $E\subseteq\mathcal{H}$，用可数个这样的盒子覆盖它，并对覆盖所用盒子的总体积取下确界，得到 Lebesgue outer measure：

$$
\operatorname{vol}^{*}\left(E\right)
=\inf\left\{
\sum\limits_{j=1}^{\infty}
\prod\limits_{i=1}^{d_{\ell^*}}\left(b_{ji}-a_{ji}\right)
\;\middle|\;
E\subseteq\bigcup\limits_{j=1}^{\infty}Q_j
\right\}.
$$

这里的下确界遍历所有可数盒子覆盖，相当于寻找从外部覆盖 $E$ 所需的最小总体积。若 $E$ 对每个集合 $B\subseteq\mathcal{H}$ 都满足

$$
\operatorname{vol}^{*}\left(B\right)
=\operatorname{vol}^{*}\left(B\cap E\right)
+\operatorname{vol}^{*}\left(B\setminus E\right),
$$

就称 $E$ 为 Lebesgue 可测集，并定义 $\operatorname{vol}\left(E\right)=\operatorname{vol}^{*}\left(E\right)$. 这个条件要求按 $E$ 的内外拆分任意集合时，体积可以相加；开集、闭集以及它们的可数并与可数交都可测。这里使用的闭邻域及其有限并、交因而可测。要使 $\kappa$ 的比值有定义，我们还要求 $0<\operatorname{vol}\left(\mathcal{R}_{c_u}^{(\rho)}\right)<\infty$. 因为分子对应分母区域的子集，所以 $0\leq\kappa\left(c_u,\rho\right)\leq 1$.

这个比例回答的是：目标概念扩张后的区域中，有多少体积也属于其他概念的扩张区域。它的分母是目标区域的体积，不是非目标区域的总体积，也不是非目标 prompt 的数量；这一点对后面的证明很重要。

**Definition 4.2（$\varepsilon$-robust unlearning）** 要求

$$
\forall p\in\mathcal{P},\qquad
g_{c_u}\left(\hat{\theta},p\right)\leq\varepsilon,
\qquad 0\leq\varepsilon\leq 1.
$$

这里 $\varepsilon$ 是允许残留的目标生成概率上界。条件覆盖所有 prompt，所以既包括直接说 horse 的 prompt，也包括只提供相关情境的间接 prompt.$\varepsilon=0$ 表示任何 prompt 都不能再生成目标概念。

**Definition 4.3（$\gamma$-concept preservation）** 使用非目标 prompt 分布

$$
\mathcal{P}_{-u}
=\frac{1}{\left|\mathcal{C}\setminus\{c_u\}\right|}
\sum\limits_{c'\in\mathcal{C}\setminus\{c_u\}}
\mathcal{P}_{c'}.
$$

这里 $\mathcal{P}_{c'}$ 表示为概念 $c'$ 选定的 prompt 概率分布。原文同时把它写成 prompt 集合；要让混合分布和期望成立，我们必须明确每个集合上的抽样分布。$\mathcal{P}_{-u}$ 的抽样方式是先均匀选一个非目标概念，再按其分布选 prompt，并不意味着 activation 空间中的点均匀分布。

Preservation 的要求为

$$
\mathbb{E}_{p\sim\mathcal{P}_{-u}}
\left[
\left\|
\mathbf{\Phi}_{\hat{\theta}}\left(p\right)
-\mathbf{\Phi}_{\theta}\left(p\right)
\right\|_2
\right]<\gamma.
$$

这里 $\gamma$ 是非目标 prompt 上平均 activation 位移的上界。因此，本文的形式化 preservation 衡量的是内部表示的稳定性；它没有直接要求编辑前后图像相同，也没有直接定义生成质量损失。

**Assumption 4.4（Lipschitz continuity of generation）** 假设对每个概念 $c$，存在有限常数 $L>0$，使所有 $p,p'\in\mathcal{P}$ 和 $\theta',\theta''\in\{\theta,\hat{\theta}\}$ 都满足

$$
\left|g_c\left(\theta',p\right)-g_c\left(\theta'',p'\right)\right|
\leq
L\left\|
\mathbf{\Phi}_{\theta'}\left(p\right)
-\mathbf{\Phi}_{\theta''}\left(p'\right)
\right\|_2.
$$

Lipschitz 条件表示生成概率变化不能超过 activation 距离的 $L$ 倍。我们后面使用的是目标概念 $c_u$ 对应的常数，并保持原记号 $L$. 证明的想法是反过来使用这个上界：如果必须让生成概率下降一大截，那么 activation 就必须移动足够远。

注意，这比通常所说的“网络是光滑的”更强。若两个 prompt 或两种模型状态有完全相同的 probe activation，上式就要求它们生成 $c$ 的概率相同。其他层或 skip connections 的变化，并不能自动被一个有限的 $L$ 吸收。论文在同一未编辑模型上改变 prompt 得到的经验结果，也不能单独验证编辑前后模型之间所需的这个条件。

**Assumption 4.5（minimum displacement for erasure）** 假设存在 $\Delta>0$，使实现 $\varepsilon$-robust unlearning 的编辑满足

$$
\forall p\in\mathcal{P}\text{ with }
\mathbf{\Phi}_{\theta}\left(p\right)\in\mathcal{R}_{c_u},
\qquad
\left\|
\mathbf{\Phi}_{\hat{\theta}}\left(p\right)
-\mathbf{\Phi}_{\theta}\left(p\right)
\right\|_2\geq\Delta.
$$

这里 $\Delta$ 是目标区域上逐个 prompt 都成立的位移下界。它不是平均位移，也不是只在若干测量样本上成立的下界。这个假设还没有对 $\mathcal{R}_{c_u}^{(\rho)}\setminus\mathcal{R}_{c_u}$ 中的 activation 作出要求。

## Theorem 4.6

原命题声称：在 Assumptions 4.4 和 4.5 下，如果 $\mathcal{D}_{\hat{\theta}}$ 实现 $\varepsilon$-robust unlearning，则

$$
\mathbb{E}_{p\sim\mathcal{P}_{-u}}
\left[
\left\|
\mathbf{\Phi}_{\hat{\theta}}\left(p\right)
-\mathbf{\Phi}_{\theta}\left(p\right)
\right\|_2
\right]
\geq\kappa\left(c_u,\rho\right)\Delta.
$$

并且，若同时满足 $\gamma$-concept preservation，则

$$
\gamma\geq\kappa\left(c_u,\rho\right)\frac{1-\varepsilon}{L}.
$$

当 $\kappa\left(c_u,\rho\right)>0$ 时，可以等价地改写为

$$
\varepsilon\geq 1-\frac{L\gamma}{\kappa\left(c_u,\rho\right)}.
$$

这个证明希望把两件事连接起来：删除目标要求目标区域中的 activation 至少移动一定距离；如果足够多非目标 prompt 的 activation 也落在必须移动的区域，它们的平均位移就有正下界。关键不只是几何上的“靠近”，而是这些非目标 prompt 确实承受同样的位移约束。

### 原证明中的缺口

首先，原证明把 $\mathbb{O}_{\mathcal{X}}\left(x_{\theta}\left(p\right),c_u\right)=1$ 当成 $g_{c_u}\left(\theta,p\right)=1$. 前者只说一次图像生成成功，后者说每次生成几乎必然成功。二者不同。仅由 robustness 和 Lipschitz 条件，我们能直接得到的是

$$
\begin{aligned}
g_{c_u}\left(\theta,p\right)-\varepsilon
&\leq g_{c_u}\left(\theta,p\right)-g_{c_u}\left(\hat{\theta},p\right)\\
&\leq\left|g_{c_u}\left(\theta,p\right)-g_{c_u}\left(\hat{\theta},p\right)\right|\\
&\leq L\left\|
\mathbf{\Phi}_{\hat{\theta}}\left(p\right)-\mathbf{\Phi}_{\theta}\left(p\right)
\right\|_2.
\end{aligned}
$$

要把第一项写成 $1-\varepsilon$，需要另加原模型在相关 prompt 上以概率 $1$ 生成目标的条件。

其次，原证明从“每个位移都至少为 $\Delta$，也至少为 $(1-\varepsilon)/L$”推出 $\Delta\geq(1-\varepsilon)/L$. 这并不成立：同一个数的两个下界之间没有这种大小关系。正确做法是分别保留两个下界，或者明确把 $\Delta$ 定义为所有相关位移的下确界；原 Assumption 4.5 并没有作后一种定义。

接着，依照附录 G，令重叠区域为

$$
O:=\mathcal{R}_{c_u}^{(\rho)}
\cap\displaystyle\bigcup_{c'\in\mathcal{C}\setminus\{c_u\}}
\mathcal{R}_{c'}^{(\rho)}.
$$

由 $\mathbf{\Phi}_{\theta}\left(p\right)\in O$，只能知道它属于扩张区域 $\mathcal{R}_{c_u}^{(\rho)}$，不能知道它属于 $\mathcal{R}_{c_u}$. 原证明试图用“位移随 activation 连续变化”来说明：目标区域中的位移都至少为 $\Delta$，那么扩张区域中的位移也都至少为 $\Delta$. 但连续性只保证相近位置的位移接近，允许位移在离开目标区域后逐渐降到 $\Delta$ 以下，并不保证同一个下界保持不变。

只有当一个点能被目标区域内的点任意逼近时，我们才能取极限，把这些点上的 $\Delta$ 下界传到该点。这些点构成目标区域的闭包。闭 $\rho$-neighborhood 则还包含与目标区域相隔正距离的点，无法通过上述取极限得到下界；这里的“闭”只表示邻域包含自身的边界，不表示它等于目标区域的闭包。

此外，“位移随原 activation 连续变化”首先要求位移能够由原 activation 唯一确定。若两个 prompt 的原 activation 相同，编辑后的 activation 却不同，它们的位移大小就可能不同，此时我们连“这个 activation 对应多大位移”都不能唯一指定，更不能直接把位移视为 activation 空间上的连续函数。

最后，原证明需要

$$
\Pr_{p\sim\mathcal{P}_{-u}}
\left[\mathbf{\Phi}_{\theta}\left(p\right)\in O\right]
\geq\kappa\left(c_u,\rho\right).
$$

附录 G 把它额外称为 mass-volume regularity，但主定理的条件没有列出。我们必须把它当作一个独立假设。这里所谓 push-forward measure，就是先按 $\mathcal{P}_{-u}$ 抽取 prompt，再把它映射成 $\mathbf{\Phi}_{\theta}\left(p\right)$，从而在 activation 空间得到的概率分布。上式要求这个分布落在 $O$ 中的概率，至少等于以目标体积为分母的几何重叠比例。

即使非目标 activation 均匀分布，这个条件也不会自动成立。例如目标扩张区域为 $[0,1]$，唯一非目标扩张区域为 $[0,100]$，那么 $O=[0,1]$ 且 $\kappa=1$；但在后一个区域均匀抽样，落入 $O$ 的概率只有 $1/100$. 均匀性不能消除两个比例分母的差异。

因此，原命题列出的两个假设不足以支撑上述证明。下面把所需条件完整地放到命题前面。

### 补充假设下的命题与证明

我们固定非空目标区域 $\mathcal{R}_{c_u}$、半径 $\rho>0$ 和前述重叠区域 $O$，要求集合与 activation 映射可测，且 $0<\operatorname{vol}\left(\mathcal{R}_{c_u}^{(\rho)}\right)<\infty$. 区域筛选使用的生成样本以及 activation 提取时的随机性事先固定，使 $\mathbf{\Phi}_{\theta}$ 与 $\mathbf{\Phi}_{\hat{\theta}}$ 是确定的 prompt 映射；生成概率 $g_c$ 仍对生成图像的随机性取概率。

除 $\varepsilon$-robust unlearning、Assumption 4.4 和 Assumption 4.5 外，我们明确增加以下三个条件。这些是条件化论证所需的假设，不是论文已经证明或通过实验完整验证的性质。

1. 原模型在所有映射到目标区域的 prompt 上都必然生成目标：

   $$
   \forall q\in\mathcal{P}\text{ with }
   \mathbf{\Phi}_{\theta}\left(q\right)\in\mathcal{R}_{c_u},
   \qquad g_{c_u}\left(\theta,q\right)=1.
   $$

   这里 $q$ 是用于考察目标区域的 prompt. 这个条件把“目标区域”与后面需要的概率降幅联系起来。

2. 在重叠区域上的位移，不小于目标区域上位移的下确界：

   $$
   \forall p\in\mathcal{P}\text{ with }
   \mathbf{\Phi}_{\theta}\left(p\right)\in O,
   \qquad
   \left\|
   \mathbf{\Phi}_{\hat{\theta}}\left(p\right)
   -\mathbf{\Phi}_{\theta}\left(p\right)
   \right\|_2
   \geq
   \inf_{\substack{q\in\mathcal{P}\\
   \mathbf{\Phi}_{\theta}\left(q\right)\in\mathcal{R}_{c_u}}}
   \left\|
   \mathbf{\Phi}_{\hat{\theta}}\left(q\right)
   -\mathbf{\Phi}_{\theta}\left(q\right)
   \right\|_2.
   $$

   这个条件明确要求：编辑对目标区域施加的最小位移，也延伸到了涉及非目标概念的重叠区域。它是实质性的编辑行为约束，不能由区域距离或连续性单独推出。我们直接对 prompt 的位移作要求，因此不需要额外假定编辑后 activation 只由编辑前 activation 决定。

3. 非目标 prompt 在重叠区域中具有足够的概率质量：

   $$
   \Pr_{p\sim\mathcal{P}_{-u}}
   \left[\mathbf{\Phi}_{\theta}\left(p\right)\in O\right]
   \geq\kappa\left(c_u,\rho\right).
   $$

   这正是附录 G 使用的 mass-volume regularity，负责把几何重叠转换成平均位移中的权重。

在这些条件下，Theorem 4.6 的两个位移下界成立；更具体地，有

$$
\mathbb{E}_{p\sim\mathcal{P}_{-u}}
\left[
\left\|
\mathbf{\Phi}_{\hat{\theta}}\left(p\right)
-\mathbf{\Phi}_{\theta}\left(p\right)
\right\|_2
\right]
\geq
\kappa\left(c_u,\rho\right)
\max\left\{\Delta,\frac{1-\varepsilon}{L}\right\}.
$$

**证明。** 我们先在目标区域取得逐点下界，再对非目标 prompt 求平均。对任何满足 $\mathbf{\Phi}_{\theta}\left(q\right)\in\mathcal{R}_{c_u}$ 的 prompt $q$，条件 1、robustness 和 Lipschitz 条件给出

$$
\begin{aligned}
1-\varepsilon
&\leq g_{c_u}\left(\theta,q\right)-g_{c_u}\left(\hat{\theta},q\right)\\
&=\left|g_{c_u}\left(\theta,q\right)-g_{c_u}\left(\hat{\theta},q\right)\right|\\
&\leq L\left\|
\mathbf{\Phi}_{\hat{\theta}}\left(q\right)
-\mathbf{\Phi}_{\theta}\left(q\right)
\right\|_2.
\end{aligned}
$$

中间的等号成立，是因为 $g_{c_u}\left(\theta,q\right)=1$ 而生成概率不超过 $1$. 除以 $L>0$，再结合 Assumption 4.5，就得到

$$
\left\|
\mathbf{\Phi}_{\hat{\theta}}\left(q\right)
-\mathbf{\Phi}_{\theta}\left(q\right)
\right\|_2
\geq\max\left\{\Delta,\frac{1-\varepsilon}{L}\right\}.
$$

右侧不依赖 $q$，所以对所有目标区域 prompt 的位移取下确界后，这个下界依然成立。条件 2 进而保证，对于每个满足 $\mathbf{\Phi}_{\theta}\left(p\right)\in O$ 的 prompt $p$，同样有

$$
\left\|
\mathbf{\Phi}_{\hat{\theta}}\left(p\right)
-\mathbf{\Phi}_{\theta}\left(p\right)
\right\|_2
\geq\max\left\{\Delta,\frac{1-\varepsilon}{L}\right\}.
$$

这一步才真正把删除目标所需的位移传给了重叠区域中的非目标 prompt. 接下来用 $\mathbf{1}\{\cdot\}$ 表示 indicator：括号内事件成立时取 $1$，否则取 $0$. 因为位移非负，我们可以只保留落入 $O$ 的那部分期望：

$$
\begin{aligned}
&\mathbb{E}_{p\sim\mathcal{P}_{-u}}
\left[
\left\|\mathbf{\Phi}_{\hat{\theta}}\left(p\right)
-\mathbf{\Phi}_{\theta}\left(p\right)\right\|_2
\right]\\
&\quad\geq
\mathbb{E}_{p\sim\mathcal{P}_{-u}}
\left[
\mathbf{1}\left\{\mathbf{\Phi}_{\theta}\left(p\right)\in O\right\}
\left\|\mathbf{\Phi}_{\hat{\theta}}\left(p\right)
-\mathbf{\Phi}_{\theta}\left(p\right)\right\|_2
\right]\\
&\quad\geq
\mathbb{E}_{p\sim\mathcal{P}_{-u}}
\left[
\mathbf{1}\left\{\mathbf{\Phi}_{\theta}\left(p\right)\in O\right\}
\right]
\max\left\{\Delta,\frac{1-\varepsilon}{L}\right\}\\
&\quad=
\Pr_{p\sim\mathcal{P}_{-u}}
\left[\mathbf{\Phi}_{\theta}\left(p\right)\in O\right]
\max\left\{\Delta,\frac{1-\varepsilon}{L}\right\}\\
&\quad\geq
\kappa\left(c_u,\rho\right)
\max\left\{\Delta,\frac{1-\varepsilon}{L}\right\}.
\end{aligned}
$$

最后一步使用条件 3。这就同时得到原命题中的 $\kappa\left(c_u,\rho\right)\Delta$ 下界和 $\kappa\left(c_u,\rho\right)(1-\varepsilon)/L$ 下界，而无需声称 $\Delta\geq(1-\varepsilon)/L$.

如果还满足 Definition 4.3，那么

$$
\gamma>
\mathbb{E}_{p\sim\mathcal{P}_{-u}}
\left[
\left\|\mathbf{\Phi}_{\hat{\theta}}\left(p\right)
-\mathbf{\Phi}_{\theta}\left(p\right)\right\|_2
\right]
\geq\kappa\left(c_u,\rho\right)\frac{1-\varepsilon}{L}.
$$

因而也得到原文较弱的非严格不等式 $\gamma\geq\kappa\left(c_u,\rho\right)(1-\varepsilon)/L$. 当 $\kappa\left(c_u,\rho\right)>0$ 时，将其乘以 $L/\kappa\left(c_u,\rho\right)$ 并移项，就得到 $\varepsilon\geq1-L\gamma/\kappa\left(c_u,\rho\right)$. $\square$

这个证明使用的是一个简单而常见的平均值下界：按 $\mathcal{P}_{-u}$ 抽取 prompt 时，至少有 $\kappa\left(c_u,\rho\right)$ 的概率落入重叠区域，而这些 prompt 的 activation 位移都至少为 $(1-\varepsilon)/L$. 即使其余 prompt 完全不移动，总体平均位移也至少为 $\kappa\left(c_u,\rho\right)(1-\varepsilon)/L$. 三个补充条件分别保证：目标区域需要这么大的位移，这个位移下界同样适用于重叠区域，以及非目标 prompt 落入重叠区域的概率足够大。

## Remark 4.7

结论不依赖生成 $\hat{\theta}$ 的具体算法。证明只使用编辑前后的生成概率、activation 位移以及 prompt 分布，因此可以涵盖 closed-form weight editing、gradient-based fine-tuning 和 inference-time intervention.

不过，“不依赖算法形式”不等于“无条件适用于所有算法”。一种编辑方法只有满足前述全部条件时，才能代入这个下界；尤其需要验证跨模型的 Lipschitz 条件，以及位移从目标区域传到重叠区域的条件。

## Corollary 4.8

原推论声称：若 $\kappa\left(c_u,\rho\right)>0$，就不可能同时实现 $\varepsilon=0$ 的 perfect erasure 和 $\gamma=0$ 的 perfect preservation.

注意，Definition 4.3 使用严格不等式“平均位移 $<\gamma$”，所以把 $\gamma=0$ 直接代入，即使完全不修改模型也无法满足。为了表达原推论实际要讨论的性质，我们把 perfect preservation 明确写为

$$
\mathbb{E}_{p\sim\mathcal{P}_{-u}}
\left[
\left\|\mathbf{\Phi}_{\hat{\theta}}\left(p\right)
-\mathbf{\Phi}_{\theta}\left(p\right)\right\|_2
\right]=0.
$$

在 Theorem 4.6 的上述补充条件下，若 $\kappa\left(c_u,\rho\right)>0$，则 perfect erasure 与这个零位移条件不能同时成立。

**证明。** 把 $\varepsilon=0$ 代入已证明的平均位移下界，得到

$$
\mathbb{E}_{p\sim\mathcal{P}_{-u}}
\left[
\left\|\mathbf{\Phi}_{\hat{\theta}}\left(p\right)
-\mathbf{\Phi}_{\theta}\left(p\right)\right\|_2
\right]
\geq\frac{\kappa\left(c_u,\rho\right)}{L}>0,
$$

与平均位移为 $0$ 矛盾。$\square$

这个结论排除的是“彻底删除目标，同时所有非目标 prompt 的内部表示在平均意义下完全不动”。它尚未排除“内部表示发生变化，但非目标图像的生成质量保持不变”。Assumption 4.4 给的是概率变化的上界；即使 activation 位移很大，概率变化仍然可以为零。因此，不能把内部位移的正下界直接当作生成质量下降的正下界。

对固定的 $L$、$c_u$ 与 $\rho$，不等式 $\gamma\geq\kappa\left(c_u,\rho\right)(1-\varepsilon)/L$ 给出一个必要的可行性边界：越严格地限制目标残留概率，允许的非目标平均位移上界就不能越过这条边界。注意，下界本身不证明边界上的每个点都能实现，因此不能直接把这条直线认作已经刻画完整的 Pareto frontier.

## Definition C.1 与经验重叠指标

为了理解论文怎样把上述几何对象用于实验，我们还需要区分理论中的 $\kappa$ 与样本统计量 $\hat{\kappa}$. Definition A.1 的 activation region 已在前面引入；Definition C.1 进一步定义实际估计时使用的 semantic neighborhood.

对于目标 $c_u$，候选集合为

$$
\mathcal{C}_{c_u}
=\{c_u\}\cup\mathcal{C}_{c_u}^{\mathrm{cand}}
\cup\mathcal{C}_{c_u}^{\mathrm{ctrl}}.
$$

这里 $\mathcal{C}_{c_u}^{\mathrm{cand}}$ 包含十个可能相关的候选概念，$\mathcal{C}_{c_u}^{\mathrm{ctrl}}$ 包含三个不相关的 control 概念。对每个概念 $c$，以五十个 prompt $p_i$ 提取 activation 样本

$$
\mathcal{S}_c=\left\{\mathbf{\Phi}_{\theta}\left(p_i\right)\right\}_{i=1}^{50},
\qquad
\bar{\mathbf{a}}_c
=\frac{1}{\left|\mathcal{S}_c\right|}
\sum\limits_{\mathbf{a}\in\mathcal{S}_c}\mathbf{a}.
$$

这里 $i$ 是 prompt 编号，$\mathbf{a}$ 是样本 activation，$\bar{\mathbf{a}}_c$ 是样本 centroid. 对非零向量 $\mathbf{a},\mathbf{b}$，cosine distance 定义为

$$
d_{\cos}\left(\mathbf{a},\mathbf{b}\right)
=1-\frac{\left\langle\mathbf{a},\mathbf{b}\right\rangle}
{\left\|\mathbf{a}\right\|_2\left\|\mathbf{b}\right\|_2}.
$$

这里 $\left\langle\mathbf{a},\mathbf{b}\right\rangle$ 是 Euclidean inner product. 这个距离比较向量的方向，不比较其长度。

令 $\delta_{c_u}$ 为 $\mathcal{C}_{c_u}$ 内所有不同概念对的 centroid cosine distance 的第 $25$ 百分位数，Definition C.1 将 semantic neighborhood 定义为

$$
\mathcal{N}\left(c_u\right)
=\left\{
c\in\mathcal{C}_{c_u}^{\mathrm{cand}}
\;\middle|\;
d_{\cos}\left(\bar{\mathbf{a}}_{c_u},\bar{\mathbf{a}}_c\right)
<\delta_{c_u}
\right\}.
$$

Control 概念用于比较编辑对不相关概念的影响，论文要求 $\mathcal{C}_{c_u}^{\mathrm{ctrl}}\cap\mathcal{N}\left(c_u\right)=\varnothing$. 从上面的定义看，neighbor 只从候选集合 $\mathcal{C}_{c_u}^{\mathrm{cand}}$ 中选取，因此只要 control 与候选集合分开，这个要求就自动满足。它本身不保证 control 在 activation 空间中距离目标较远。Centroid 只用于筛选接下来考察哪些概念，重叠比例则通过逐个样本计算：

$$
\hat{\kappa}\left(c_u\right)
=\frac{1}{\left|\mathcal{S}_{c_u}\right|}
\sum\limits_{\mathbf{a}\in\mathcal{S}_{c_u}}
\mathbf{1}\left[
\min_{c'\in\mathcal{N}\left(c_u\right)}
\min_{\mathbf{b}\in\mathcal{S}_{c'}}
d_{\cos}\left(\mathbf{a},\mathbf{b}\right)
\leq\rho
\right],
\qquad \rho=\rho_{c_u},
$$

$$
\rho_{c_u}
=\operatorname{median}\left\{
d_{\cos}\left(\mathbf{a},\mathbf{a}'\right)
\;\middle|\;
\mathbf{a},\mathbf{a}'\in\mathcal{S}_{c_u},
\mathbf{a}\ne\mathbf{a}'
\right\}.
$$

这里 $\mathbf{b}$ 是 neighbor 概念的 activation 样本，$\mathbf{a}'$ 是另一个目标样本，$\operatorname{median}$ 表示中位数。我们先计算目标概念内部所有不同样本对的 cosine distance，取其中位数作为 $\rho_{c_u}$. 这个半径用目标概念自身的样本分散程度，规定“多近才算接近”。

然后逐个检查目标样本 $\mathbf{a}$. 公式内层的 $\min_{\mathbf{b}\in\mathcal{S}_{c'}}$ 找到概念 $c'$ 中离它最近的样本；外层的 $\min_{c'\in\mathcal{N}\left(c_u\right)}$ 再比较所有 neighbor 概念，得到 $\mathbf{a}$ 到全部 neighbor 样本的最近距离。如果这个距离不超过 $\rho_{c_u}$，indicator 就记为 $1$，否则记为 $0$. 因此，只要有一个 neighbor 样本足够近，就把 $\mathbf{a}$ 算作被覆盖；附近有多个 neighbor 样本也只计一次。

最后，把这些 $0$ 或 $1$ 相加，再除以目标样本总数 $\left|\mathcal{S}_{c_u}\right|$，就得到 $\hat{\kappa}\left(c_u\right)$：目标样本中，被 neighbor 样本覆盖的比例。它衡量的是有多少目标样本与至少一个 neighbor 接近，不是它们到 neighbor 的平均距离。

原文把 $\hat{\kappa}$ 称为理论 $\kappa$ 的 lower-bound estimator，其理由是只统计部分非目标概念，应当少算重叠。我们先在原本的体积定义中检查这个理由：$\kappa$ 统计目标区域与所有非目标概念区域的重叠；如果只保留 $\mathcal{N}\left(c_u\right)$ 中的概念，有些原来计入的重叠点可能不再计入，却不会增加新的重叠点。因此，在区域、半径和体积定义均不变的条件下，确实有

$$
\frac{
\operatorname{vol}\left(
\mathcal{R}_{c_u}^{(\rho)}
\cap\displaystyle\bigcup_{c'\in\mathcal{N}\left(c_u\right)}
\mathcal{R}_{c'}^{(\rho)}
\right)
}{\operatorname{vol}\left(\mathcal{R}_{c_u}^{(\rho)}\right)}
\leq\kappa\left(c_u,\rho\right).
$$

**证明。** 左侧分子中的每个点都同时属于目标扩张区域和某个 neighbor 的扩张区域。由于 neighbor 也是非目标概念，这个点必然也被 $\kappa$ 的分子计入。于是左侧分子的集合是右侧分子的子集，体积不超过后者；两侧再除以相同的正数 $\operatorname{vol}\left(\mathcal{R}_{c_u}^{(\rho)}\right)$，不等式仍成立。$\square$

但是，实际 $\hat{\kappa}$ 的分母是目标 activation 样本数，抽样也不是在整个扩张区域上按体积均匀进行。样本可以集中在一个体积很小的重叠部分，使样本覆盖率高于体积重叠率。因此，上面的集合不等式并不能证明观测到的 $\hat{\kappa}\leq\kappa$；原文没有给出消除这项差异的抽样条件或统计误差界。

原文还用单位向量之间的恒等式说明 cosine distance 与 Euclidean distance 的关系。当 $\left\|\mathbf{a}\right\|_2=\left\|\mathbf{b}\right\|_2=1$ 时，

$$
\begin{aligned}
\left\|\mathbf{a}-\mathbf{b}\right\|_2^2
&=\left\|\mathbf{a}\right\|_2^2
+\left\|\mathbf{b}\right\|_2^2
-2\left\langle\mathbf{a},\mathbf{b}\right\rangle\\
&=2\left(1-\left\langle\mathbf{a},\mathbf{b}\right\rangle\right)
=2d_{\cos}\left(\mathbf{a},\mathbf{b}\right).
\end{aligned}
$$

因此，在单位球面上，cosine distance 不超过 $\rho$ 与 Euclidean distance 不超过 $\sqrt{2\rho}$ 等价。$\square$ 注意，这个恒等式的前提是两个向量都已经归一化。把原 activation 除以自身长度，会将同方向、不同长度的向量压到同一个点，丢掉长度信息；它并不是单纯更换距离的写法。因此，原空间中两个区域各有多大、重叠比例是多少，不能由归一化后的距离判定直接恢复。

归一化还把所有非零向量放到了单位球面上。这个球面虽然有表面积，但在 $d_{\ell^*}$ 维空间中没有厚度，$d_{\ell^*}$ 维 Lebesgue volume 为零。所以，若要比较球面上的区域大小，就需要改用球面上的 $(d_{\ell^*}-1)$ 维面积，即 surface measure；用面积算出的重叠比例，与原来用空间体积算出的 $\kappa$ 是不同的定义，不能直接视为相等。

同样，Assumption 4.4 中的 $L$ 约束的是原始 activation 距离与生成概率变化的关系。归一化可能把原来不同的 activation 变成同一个向量，却不改变它们对应的生成概率。因此，原来的 Lipschitz 不等式不能直接沿用到归一化后的距离上，需要另外验证。

所以，实验中的 $\hat{\kappa}$ 可以描述样本的 neighbor 覆盖程度，但要把它直接代入 Theorem 4.6 的定量下界，还缺少从样本分布、归一化空间到理论体积测度的联系。

## Remark F.1

原文认为：当重叠区域占目标扩张区域的 $\kappa\left(c_u,\rho\right)$ 比例，并且编辑在目标扩张区域上产生均匀位移时，下界是 tight 的。

但第一个条件其实已经包含在 $\kappa$ 的定义中，而均匀位移也没有约束非目标 prompt 落入 $O$ 的概率，或者 $O$ 之外的位移。要说明何时取等，我们应当逐项检查证明中丢掉的量。

对于下界

$$
\mathbb{E}_{p\sim\mathcal{P}_{-u}}
\left[
\left\|\mathbf{\Phi}_{\hat{\theta}}\left(p\right)
-\mathbf{\Phi}_{\theta}\left(p\right)\right\|_2
\right]
\geq\kappa\left(c_u,\rho\right)\Delta,
\qquad\Delta>0,
$$

在前述条件下，一组充分且必要的取等条件是：非目标 activation 落入 $O$ 的概率恰好为 $\kappa\left(c_u,\rho\right)$，并且对 $\mathcal{P}_{-u}$ 下几乎所有 prompt，

$$
\left\|\mathbf{\Phi}_{\hat{\theta}}\left(p\right)
-\mathbf{\Phi}_{\theta}\left(p\right)\right\|_2
=
\begin{cases}
\Delta,&\mathbf{\Phi}_{\theta}\left(p\right)\in O,\\
0,&\mathbf{\Phi}_{\theta}\left(p\right)\notin O.
\end{cases}
$$

这里“几乎所有”允许例外 prompt 存在，但这些例外在 $\mathcal{P}_{-u}$ 下的总概率必须为零。这个条件的实际含义是：只有重叠区域承受修改，且每个受影响的非目标 prompt 都恰好移动到所需下界。

**证明。** 充分性可以直接代入期望：位移以概率 $\kappa\left(c_u,\rho\right)$ 等于 $\Delta$，其余时候为 $0$，因此平均值正好为 $\kappa\left(c_u,\rho\right)\Delta$.

反过来，证明中的三个非负贡献分别是：$O$ 外的位移，$O$ 内超过 $\Delta$ 的位移，以及重叠事件概率超过 $\kappa\left(c_u,\rho\right)$ 的部分乘以 $\Delta$. 如果最后取等，它们必须全为零。又因为一个非负随机量的期望为零当且仅当它几乎处处为零，我们便得到上述逐点条件；$\Delta>0$ 则保证重叠事件概率必须恰好等于 $\kappa\left(c_u,\rho\right)$.

我们也可以直接验证刚才使用的概率事实：如果一个非负量在正概率的样本上严格大于零，那么在某个正整数 $n$ 下，它至少为 $1/n$ 的事件必有正概率，否则对这些事件取可数并，仍不可能得到正概率。它的期望于是至少为该正概率乘以 $1/n$，不可能等于零。$\square$

若讨论的是 $\kappa\left(c_u,\rho\right)(1-\varepsilon)/L$ 这个下界，并且 $\varepsilon<1$，则相同分析中应将 $\Delta$ 换成 $(1-\varepsilon)/L$. 这要求重叠事件上的位移恰好达到这个概率降幅对应的下界，而不仅仅是“位移均匀”。这些条件说明何时能够取等，本身并没有构造出满足条件的实际 unlearning 方法。

## Remark F.2

论文用 STEREO 说明为什么强 erasure 可能伴随明显的 neighbor 损伤。其机制解释是：STEREO 学习 adversarial token embeddings $v_1^*,v_2^*$，寻找不易被删除的目标表达，再用 compositional objective 同时压制这些表达及其组合。这里 $v_1^*,v_2^*$ 是在文本 embedding 空间中学习的两个 adversarial 表示，用来覆盖更难压制的目标生成方式。

论文把这种训练解释为对目标 activation 区域更广泛、更强的抑制，并观察到删除 horse 后 donkey、zebra 的生成也受损。若这种修改确实在目标区域上建立更大的统一位移下界 $\Delta$，又满足 Theorem 4.6 的其余条件，那么 $\kappa\left(c_u,\rho\right)\Delta$ 会给出更大的非目标平均位移下界。

注意，这条 Remark 没有证明 compositional objective 必然压制整个相关子空间，也没有证明每个 neighbor 都必须受损。Theorem 4.6 约束的是非目标分布的总体平均位移，不能仅凭 $\kappa\left(c_u,\rho\right)>0$ 就给每个单独的 neighbor 推出正位移下界。STEREO 的具体生成质量变化仍属于实验观察。

## Remark F.3

论文用 SAeUron 说明另一种行为：对其他概念的保留较好，但目标仍可能通过间接 prompt 恢复。

SAeUron 用 sparse autoencoder 把内部 activation 表示为少数 feature 方向的组合，寻找与目标概念密切相关的 feature，并在 inference 时抑制其中的 $\tau_c$ 个。这里 $\tau_c$ 是对概念 $c$ 选出的 feature 数量。与覆盖整个目标区域的干预相比，这种方法只改变选中的 feature 分量，因此可能避开其他概念依赖的表示。

论文的解释是，间接 prompt 仍可能利用未被抑制的 feature 组合生成目标，于是方法表现为较小的非目标变化与较大的目标残留。不过，feature 数量少本身既不证明位移小，也不证明一定存在 leakage；feature 的幅度及其对生成结果的作用同样重要。这里给出的是对实验现象的机制解释，没有独立的数学证明。

在条件化定理适用时，我们能严格说的是：如果 $\kappa\left(c_u,\rho\right)>0$，并且非目标平均位移可以被很小的 $\gamma$ 控制，那么 $\varepsilon$ 必须满足 $\varepsilon\geq1-L\gamma/\kappa\left(c_u,\rho\right)$. 这限制了能够同时达到的 robustness，但不指定实际泄漏发生在哪个 prompt 上。

## Remark F.4

论文最后把这些方法放到同一个比较中：影响 trade-off 的是编辑在目标及重叠区域上产生了什么位移，而不只是它属于 weight editing 还是 inference-time intervention. 两类方法都可能广泛修改表示，也都可能只修改很少的 feature.

Theorem 4.6 对此提供的是条件性的必要约束：如果编辑必须在目标区域上产生至少 $\Delta$ 的位移，并且这项约束传到了具有足够非目标概率质量的重叠区域，那么非目标平均位移至少为 $\kappa\left(c_u,\rho\right)\Delta$. 它没有给出“增大位移就一定改善 erasure”的充分条件，也没有保证不同概念上的实际损伤随 $\kappa$ 单调增加；不同概念还可能具有不同的 $L$、不同的实际残留概率，以及不同程度的额外位移。

因此，这篇论文的可证明部分描述的是：在明确的概率、位移传递和分布条件下，robust erasure 对非目标内部表示的稳定性施加一个下界约束。STEREO、SAeUron 等方法的实验表现为这种解释提供现象上的支持，但不替代上述条件，也不把 activation 位移下界自动变成生成质量损失下界。
